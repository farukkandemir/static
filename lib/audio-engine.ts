"use client";

import type { Station } from "./types";

// Singleton audio engine. The <audio> element lives at module level, outside
// React, so re-renders and route changes never interrupt playback.
//
// Note on visualizers: AnalyserNode needs crossOrigin="anonymous", and setting
// it breaks playback on the many stations that send no CORS headers. Any
// visual feedback must be driven from playback state, never from audio data.

export type EngineStatus = "idle" | "tuning" | "buffering" | "playing" | "paused" | "failed";

export type TuneFailure = "error" | "timeout" | "stalled" | "interrupted";

export type TuneResult = { ok: true } | { ok: false; reason: TuneFailure };

export interface EngineEvents {
  status: (status: EngineStatus) => void;
  // Fired when an established stream drops mid-play (stalled > 12s).
  dropout: (station: Station) => void;
  // Fired once per successful connect; the store forwards it to /api/click
  // and (later) station_health.
  connected: (station: Station) => void;
  failed: (station: Station, reason: TuneFailure) => void;
}

const TUNE_TIMEOUT_MS = 8_000;
const STALL_LIMIT_MS = 12_000;

type Listeners = { [K in keyof EngineEvents]: Set<EngineEvents[K]> };

const listeners: Listeners = {
  status: new Set(),
  dropout: new Set(),
  connected: new Set(),
  failed: new Set(),
};

let audio: HTMLAudioElement | null = null;
let hls: import("hls.js").default | null = null;
let currentStation: Station | null = null;
let status: EngineStatus = "idle";
// Each tune() call takes a new token; stale async callbacks (a slow failure,
// a late `playing` event) compare against it and no-op instead of clobbering
// a newer station.
let tuneToken = 0;
let stallTimer: ReturnType<typeof setTimeout> | null = null;
let userVolume = 0.8;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = "none";
    applyVolume();
    wireWatchdog(audio);
  }
  return audio;
}

function emit<K extends keyof EngineEvents>(event: K, ...args: Parameters<EngineEvents[K]>) {
  for (const fn of listeners[event]) {
    (fn as (...a: Parameters<EngineEvents[K]>) => void)(...args);
  }
}

function setStatus(next: EngineStatus) {
  if (status === next) return;
  status = next;
  emit("status", next);
}

function clearStallTimer() {
  if (stallTimer) {
    clearTimeout(stallTimer);
    stallTimer = null;
  }
}

// Mid-play watchdog: if the stream stalls and doesn't recover within the
// limit, report a dropout so the store can record it and auto-advance.
function wireWatchdog(el: HTMLAudioElement) {
  const onStall = () => {
    if (status !== "playing") return;
    const token = tuneToken;
    clearStallTimer();
    stallTimer = setTimeout(() => {
      if (token !== tuneToken || !currentStation) return;
      const station = currentStation;
      setStatus("failed");
      emit("dropout", station);
    }, STALL_LIMIT_MS);
  };
  const onRecover = () => clearStallTimer();
  el.addEventListener("stalled", onStall);
  el.addEventListener("waiting", onStall);
  el.addEventListener("timeupdate", onRecover);
  el.addEventListener("playing", onRecover);
}

function isHlsUrl(station: Station): boolean {
  return station.hls || /\.m3u8(\?|$)/i.test(station.streamUrl);
}

function destroyHls() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

// Detach the current source completely. Skipping this races two streams into
// the speakers when the old source is still buffering.
function detach(el: HTMLAudioElement) {
  el.pause();
  destroyHls();
  el.removeAttribute("src");
  el.load();
}

async function attachSource(el: HTMLAudioElement, station: Station, token: number): Promise<void> {
  if (isHlsUrl(station) && !el.canPlayType("application/vnd.apple.mpegurl")) {
    // hls.js is ~180kB — load it only when an HLS station is actually tuned.
    // Safari plays m3u8 natively and never reaches this branch.
    const { default: Hls } = await import("hls.js");
    if (token !== tuneToken) return;
    if (!Hls.isSupported()) throw new Error("HLS not supported");
    hls = new Hls({ enableWorker: false });
    hls.attachMedia(el);
    hls.loadSource(station.streamUrl);
  } else {
    el.src = station.streamUrl;
  }
}

export function tune(station: Station): Promise<TuneResult> {
  const el = getAudio();
  const token = ++tuneToken;
  clearStallTimer();
  detach(el);
  currentStation = station;
  setStatus("tuning");

  return new Promise<TuneResult>((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("error", onError);
    };

    const settle = (result: TuneResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      // A newer tune() superseded us; report interrupted and touch nothing.
      if (token !== tuneToken) {
        resolve({ ok: false, reason: "interrupted" });
        return;
      }
      if (result.ok) {
        setStatus("playing");
        emit("connected", station);
      } else {
        detach(el);
        setStatus("failed");
        emit("failed", station, result.reason);
      }
      resolve(result);
    };

    const onPlaying = () => settle({ ok: true });
    const onError = () => settle({ ok: false, reason: "error" });

    el.addEventListener("playing", onPlaying);
    el.addEventListener("error", onError);
    timeout = setTimeout(() => settle({ ok: false, reason: "timeout" }), TUNE_TIMEOUT_MS);

    attachSource(el, station, token)
      .then(() => {
        if (token !== tuneToken) return settle({ ok: false, reason: "interrupted" });
        setStatus("buffering");
        // play() rejects on interruption (a new load, an OS-level pause) —
        // always catch it or the console fills with unhandled rejections.
        el.play().catch(() => settle({ ok: false, reason: "error" }));
      })
      .catch(() => settle({ ok: false, reason: "error" }));
  });
}

export function stop() {
  const el = getAudio();
  tuneToken++;
  clearStallTimer();
  detach(el);
  currentStation = null;
  setStatus("idle");
}

export function pause() {
  if (!audio || status !== "playing") return;
  // Live streams can't resume from a pause buffer hours later; a full detach
  // and re-tune on resume is the honest model. Here we just pause.
  audio.pause();
  setStatus("paused");
}

export function resume(): Promise<TuneResult> | undefined {
  if (!currentStation) return;
  const el = getAudio();
  if (el.src || hls) {
    setStatus("buffering");
    const token = tuneToken;
    return el
      .play()
      .then(() => {
        if (token === tuneToken) setStatus("playing");
        return { ok: true } as TuneResult;
      })
      .catch(() => {
        // Paused long enough that the connection died — re-tune from scratch.
        if (token !== tuneToken || !currentStation) {
          return { ok: false, reason: "interrupted" } as TuneResult;
        }
        return tune(currentStation);
      });
  }
  return tune(currentStation);
}

// Volume on a squared curve: perceived loudness tracks the slider far better
// than the linear default.
export function setVolume(v: number) {
  userVolume = Math.min(1, Math.max(0, v));
  applyVolume();
}

function applyVolume() {
  if (audio) audio.volume = userVolume * userVolume;
}

export function getVolume(): number {
  return userVolume;
}

export function getStatus(): EngineStatus {
  return status;
}

export function getCurrentStation(): Station | null {
  return currentStation;
}

export function on<K extends keyof EngineEvents>(event: K, fn: EngineEvents[K]): () => void {
  listeners[event].add(fn);
  return () => listeners[event].delete(fn);
}

// ---------------------------------------------------------------------------
// Prevalidation: quietly probe upcoming stations with a detached, muted Audio
// element so auto-advance lands on a stream we already know answers. One probe
// at a time, results cached for the session. HLS streams are skipped (probing
// them would mean loading hls.js and a manifest round-trip).

const probeCache = new Map<string, boolean>();
let probing = false;
const probeQueue: Station[] = [];

export function probeResult(uuid: string): boolean | undefined {
  return probeCache.get(uuid);
}

export function prevalidate(stations: Station[]) {
  for (const s of stations) {
    if (probeCache.has(s.uuid) || isHlsUrl(s)) continue;
    if (!probeQueue.some((q) => q.uuid === s.uuid)) probeQueue.push(s);
  }
  drainProbeQueue();
}

function drainProbeQueue() {
  if (probing) return;
  const next = probeQueue.shift();
  if (!next) return;
  probing = true;
  const el = new Audio();
  el.muted = true;
  el.preload = "auto";
  let done = false;
  const finish = (ok: boolean) => {
    if (done) return;
    done = true;
    probeCache.set(next.uuid, ok);
    el.removeAttribute("src");
    el.load();
    probing = false;
    drainProbeQueue();
  };
  el.addEventListener("canplay", () => finish(true));
  el.addEventListener("error", () => finish(false));
  setTimeout(() => finish(false), 6_000);
  el.src = next.streamUrl;
  el.load();
}
