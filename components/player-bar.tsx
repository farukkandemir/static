"use client";

import { useLibraryStore } from "@/lib/library-store";
import { usePlayerStore } from "@/lib/player-store";
import { StationFavicon } from "./station-favicon";

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <rect x="2.5" y="1.5" width="3.2" height="11" rx="1" />
      <rect x="8.3" y="1.5" width="3.2" height="11" rx="1" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <path d="M4 1.8v10.4a.6.6 0 0 0 .9.5l8-5.2a.6.6 0 0 0 0-1L4.9 1.3a.6.6 0 0 0-.9.5z" />
    </svg>
  );
}

function SkipIcon({ dir }: { dir: 1 | -1 }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden
      style={dir === -1 ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M8.8 1.2h1.7v9.6H8.8zM1.5 1.6v8.8a.5.5 0 0 0 .8.4l6-4.4a.5.5 0 0 0 0-.8l-6-4.4a.5.5 0 0 0-.8.4z" />
    </svg>
  );
}

const STATUS_LABEL: Record<string, string> = {
  idle: "off air",
  tuning: "tuning…",
  buffering: "buffering…",
  playing: "on air",
  paused: "paused",
  failed: "no signal",
};

export function PlayerBar() {
  const {
    station,
    status,
    volume,
    notice,
    sleepMinutes,
    togglePlay,
    next,
    prev,
    setVolume,
    setSleepTimer,
    dismissNotice,
  } = usePlayerStore();
  const favourites = useLibraryStore((s) => s.favourites);
  const toggleFavourite = useLibraryStore((s) => s.toggleFavourite);
  const isFavourite = station ? favourites.some((f) => f.uuid === station.uuid) : false;
  const live = status === "playing" || status === "buffering";

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-edge/80 bg-raised/95 backdrop-blur-xl">
      {notice && (
        <div className="mx-auto flex max-w-screen-2xl items-center gap-2 px-6 py-1.5 text-[13px] text-faint sm:px-10">
          <span aria-live="polite">{notice}</span>
          <button
            type="button"
            onClick={dismissNotice}
            className="ml-auto rounded px-1.5 text-faint hover:text-ink"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}
      <div className="mx-auto grid h-[5.5rem] max-w-screen-2xl grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-10 md:grid-cols-[1fr_auto_1fr] md:gap-4">
        {/* Now playing */}
        <div className="flex min-w-0 items-center gap-4">
          {station && <StationFavicon name={station.name} url={station.favicon} size={56} />}
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold leading-tight sm:text-base">
              {station ? station.name : "Pick a station"}
            </div>
            <div className="mt-1 flex items-center gap-2.5 text-xs text-faint">
              <span
                className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide ${
                  status === "playing" ? "text-accent" : ""
                }`}
              >
                {status === "playing" && (
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                )}
                {STATUS_LABEL[status]}
              </span>
              {station && (
                <span className="hidden truncate sm:inline">
                  {[station.country || station.countryCode, station.bitrate > 0 ? `${station.bitrate} kbps` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Transport — dead centre */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous station (K)"
            className="rounded-full p-2.5 text-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <SkipIcon dir={-1} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={status === "playing" ? "Pause (Space)" : "Play (Space)"}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
              live
                ? "bg-accent text-accent-contrast hover:brightness-105"
                : "bg-ink text-bg hover:bg-ink/90"
            }`}
          >
            <PlayIcon playing={live} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next station (J)"
            className="rounded-full p-2.5 text-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <SkipIcon dir={1} />
          </button>
        </div>

        {/* Extras — right aligned */}
        <div className="flex items-center justify-end gap-4">
          {station && (
            <button
              type="button"
              onClick={() => toggleFavourite(station)}
              aria-label={isFavourite ? "Unfavourite (F)" : "Favourite (F)"}
              aria-pressed={isFavourite}
              className={`text-lg transition-colors ${
                isFavourite ? "text-accent" : "text-faint/60 hover:text-ink"
              }`}
            >
              {isFavourite ? "★" : "☆"}
            </button>
          )}
          <select
            aria-label="Sleep timer"
            title="Sleep timer — fades out, then stops"
            value={sleepMinutes ?? 0}
            onChange={(e) => setSleepTimer(Number(e.target.value) || null)}
            className={`hidden h-8 cursor-pointer appearance-none rounded-full border px-3 text-xs transition-colors lg:block ${
              sleepMinutes !== null
                ? "border-faint/50 bg-surface text-ink"
                : "border-edge bg-surface text-faint hover:text-ink"
            }`}
          >
            <option value={0}>Sleep</option>
            {sleepMinutes !== null && ![15, 30, 60, 90].includes(sleepMinutes) && (
              <option value={sleepMinutes}>{sleepMinutes}m left</option>
            )}
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
          </select>
          <label className="hidden items-center gap-2.5 md:flex">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden className="text-faint">
              <path d="M2 5v4h2.5L8 11.5v-9L4.5 5H2z" />
              <path
                d="M9.7 4.8a3 3 0 0 1 0 4.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="h-1 w-28 cursor-pointer accent-(--accent)"
              aria-label="Volume"
            />
          </label>
        </div>
      </div>
    </footer>
  );
}
