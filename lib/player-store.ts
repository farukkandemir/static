"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EngineStatus } from "./audio-engine";
import * as engine from "./audio-engine";
import { useLibraryStore } from "./library-store";
import type { Station } from "./types";

const MAX_AUTO_SKIPS = 5;

interface PlayerState {
  station: Station | null;
  status: EngineStatus;
  volume: number;
  // The list the current station was tuned from — auto-advance and J/K
  // navigate within it.
  queue: Station[];
  // Quiet inline notice, e.g. "KEXP didn't respond — skipped".
  notice: string | null;
  // Minutes remaining on the sleep timer, null when off.
  sleepMinutes: number | null;
  play: (station: Station, queue?: Station[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  dismissNotice: () => void;
}

// Stations that failed this session; auto-advance skips them.
const failedThisSession = new Set<string>();
let autoSkipsRemaining = MAX_AUTO_SKIPS;

function neighbour(queue: Station[], current: Station | null, dir: 1 | -1): Station | null {
  if (queue.length === 0) return null;
  const idx = current ? queue.findIndex((s) => s.uuid === current.uuid) : -1;
  for (let step = 1; step <= queue.length; step++) {
    const candidate = queue[(idx + dir * step + queue.length * step) % queue.length];
    if (!candidate || candidate.uuid === current?.uuid) continue;
    if (failedThisSession.has(candidate.uuid)) continue;
    if (engine.probeResult(candidate.uuid) === false) continue;
    return candidate;
  }
  return null;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      station: null,
      status: "idle",
      volume: engine.getVolume(),
      queue: [],
      notice: null,
      sleepMinutes: null,

      play: (station, queue) => {
        autoSkipsRemaining = MAX_AUTO_SKIPS;
        set({ station, notice: null, ...(queue ? { queue } : {}) });
        void engine.tune(station);
        const q = queue ?? get().queue;
        const idx = q.findIndex((s) => s.uuid === station.uuid);
        if (idx >= 0) engine.prevalidate(q.slice(idx + 1, idx + 4));
      },

      togglePlay: () => {
        const { status, station } = get();
        if (status === "playing") engine.pause();
        else if (station) {
          // After a reload the engine has no source yet; resume() falls back
          // to a fresh tune of the restored station. Never autoplays — this
          // only runs from a user gesture.
          if (engine.getCurrentStation()) void engine.resume();
          else void engine.tune(station);
        }
      },

      next: () => {
        const { queue, station, play } = get();
        const target = neighbour(queue, station, 1);
        if (target) play(target);
      },

      prev: () => {
        const { queue, station, play } = get();
        const target = neighbour(queue, station, -1);
        if (target) play(target);
      },

      setVolume: (v) => {
        engine.setVolume(v);
        set({ volume: engine.getVolume() });
      },

      setSleepTimer: (minutes) => {
        set({ sleepMinutes: minutes });
        armSleepTimer(minutes);
      },

      dismissNotice: () => set({ notice: null }),
    }),
    {
      name: "static-player",
      // Restore last station and volume on load — but never autoplay;
      // browser policy blocks it and surprise audio is hostile anyway.
      partialize: (s) => ({ station: s.station, volume: s.volume }),
      onRehydrateStorage: () => (state) => {
        if (state) engine.setVolume(state.volume);
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Sleep timer: fade to silence over the last 15 seconds, then stop and
// restore the user's volume for next time.

let sleepTimeout: ReturnType<typeof setTimeout> | null = null;
let sleepCountdown: ReturnType<typeof setInterval> | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;

function clearSleepTimers() {
  if (sleepTimeout) clearTimeout(sleepTimeout);
  if (sleepCountdown) clearInterval(sleepCountdown);
  if (fadeInterval) clearInterval(fadeInterval);
  sleepTimeout = sleepCountdown = fadeInterval = null;
}

function armSleepTimer(minutes: number | null) {
  clearSleepTimers();
  if (minutes === null || minutes <= 0) return;
  const fadeMs = 15_000;
  const untilFade = Math.max(0, minutes * 60_000 - fadeMs);
  sleepCountdown = setInterval(() => {
    const current = usePlayerStore.getState().sleepMinutes;
    if (current !== null && current > 1) {
      usePlayerStore.setState({ sleepMinutes: current - 1 });
    }
  }, 60_000);
  sleepTimeout = setTimeout(() => {
    const originalVolume = engine.getVolume();
    const steps = 30;
    let step = 0;
    fadeInterval = setInterval(() => {
      step++;
      engine.setVolume(originalVolume * (1 - step / steps));
      if (step >= steps) {
        clearSleepTimers();
        engine.stop();
        engine.setVolume(originalVolume);
        usePlayerStore.setState({ sleepMinutes: null });
      }
    }, fadeMs / steps);
  }, untilFade);
}

// ---------------------------------------------------------------------------
// Health + directory writeback

async function recordHealth(station: Station, ok: boolean) {
  // Community health writeback lands with the Supabase milestone; the click
  // registration below is what keeps the public directory honest today.
  // Custom pasted URLs aren't directory stations — nothing to report.
  if (station.uuid.startsWith("custom-")) return;
  if (ok) {
    fetch("/api/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uuid: station.uuid }),
    }).catch(() => {});
  }
}

function handleFailure(station: Station, kind: "failed" | "dropout") {
  failedThisSession.add(station.uuid);
  void recordHealth(station, false);
  const state = usePlayerStore.getState();
  // Only react if the failure is about the station the user is tuned to.
  if (state.station?.uuid !== station.uuid) return;
  const verb = kind === "dropout" ? "dropped" : "didn't respond";
  if (autoSkipsRemaining <= 0) {
    usePlayerStore.setState({
      notice: `${station.name} ${verb}. Several stations in a row failed — pick another.`,
    });
    return;
  }
  const target = neighbour(state.queue, station, 1);
  if (!target) {
    usePlayerStore.setState({ notice: `${station.name} ${verb}.` });
    return;
  }
  autoSkipsRemaining--;
  usePlayerStore.setState({
    station: target,
    notice: `${station.name} ${verb} — skipped to ${target.name}.`,
  });
  void engine.tune(target);
}

// ---------------------------------------------------------------------------
// MediaSession: OS media keys and lock-screen controls.

function updateMediaSession(station: Station | null) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  if (!station) {
    navigator.mediaSession.metadata = null;
    return;
  }
  // Track metadata is not readable in a browser (ICY headers never reach
  // <audio>), so the station itself is the "track".
  navigator.mediaSession.metadata = new MediaMetadata({
    title: station.name,
    artist: [station.country, station.tags.slice(0, 2).join(", ")].filter(Boolean).join(" — "),
    artwork: station.favicon.startsWith("https://")
      ? [{ src: station.favicon, sizes: "96x96" }]
      : [],
  });
}

if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
  const s = () => usePlayerStore.getState();
  navigator.mediaSession.setActionHandler("play", () => s().togglePlay());
  navigator.mediaSession.setActionHandler("pause", () => s().togglePlay());
  navigator.mediaSession.setActionHandler("nexttrack", () => s().next());
  navigator.mediaSession.setActionHandler("previoustrack", () => s().prev());
}

// ---------------------------------------------------------------------------
// Wire engine events once at module scope; the store is itself a singleton.

engine.on("status", (status) => {
  usePlayerStore.setState({ status });
  if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
    navigator.mediaSession.playbackState =
      status === "playing" || status === "buffering" ? "playing" : "paused";
  }
});

// Note: the skip notice deliberately survives the fallback station's
// successful connect — it's the only explanation the user gets for why the
// station changed. It clears on the next user-initiated play or dismiss.
engine.on("connected", (station) => {
  void recordHealth(station, true);
  useLibraryStore.getState().pushRecent(station);
  updateMediaSession(station);
});
engine.on("failed", (station) => handleFailure(station, "failed"));
engine.on("dropout", (station) => handleFailure(station, "dropout"));
