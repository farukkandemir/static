"use client";

import { useEffect, useMemo, useState } from "react";
import { useLibraryStore } from "@/lib/library-store";
import { usePlayerStore } from "@/lib/player-store";
import type { Station } from "@/lib/types";
import { StationFavicon } from "./station-favicon";

const PAGE_SIZE = 24;

// Directory names often carry codec suffixes ("(128k MP3)") and countries the
// long way round ("The United States Of America") — trim both for scanning.
// The full name still lives in the data; this is display only.
function displayName(name: string): string {
  return name.replace(/\s*[([](?=[^)\]]*(?:\d{2,3}\s?k|mp3|aac|flac|ogg|opus|hls))[^)\]]*[)\]]\s*$/i, "").trim() || name;
}

function displayCountry(country: string): string {
  return country
    .replace(/^The\s+/i, "")
    .replace("United States Of America", "United States")
    .replace("United Kingdom Of Great Britain And Northern Ireland", "United Kingdom")
    .replace("Russian Federation", "Russia")
    .replace("Islamic Republic Of Iran", "Iran");
}

// Layout C — the ledger: one row per station with the data in fixed, aligned
// columns (name · place · genres · bitrate). Each fact is always in the same
// x-position, separated by faint hairlines; hover is a soft fill only.
function StationRow({
  station,
  active,
  favourite,
  onPlay,
  onToggleFavourite,
}: {
  station: Station;
  active: boolean;
  favourite: boolean;
  onPlay: () => void;
  onToggleFavourite: () => void;
}) {
  return (
    <li
      className={`group flex items-center border-b border-edge/55 transition-colors last:border-b-0 hover:rounded-[10px] hover:border-transparent hover:bg-surface ${
        active ? "rounded-[10px] border-transparent bg-surface" : ""
      }`}
    >
      <button
        type="button"
        onClick={onPlay}
        aria-current={active ? "true" : undefined}
        className="grid min-w-0 flex-1 grid-cols-[30px_minmax(0,1.1fr)_3.5rem] items-center gap-x-4 px-3 py-3 text-left sm:grid-cols-[30px_minmax(14rem,1.1fr)_7rem_minmax(0,1fr)_3.5rem]"
      >
        <StationFavicon name={station.name} url={station.favicon} size={30} />
        <span className={`truncate text-[14.5px] font-medium ${active ? "text-accent" : ""}`}>
          {displayName(station.name)}
        </span>
        <span className="hidden truncate text-[12.5px] text-faint sm:block">
          {displayCountry(station.country || station.countryCode)}
        </span>
        <span className="hidden truncate text-[12.5px] text-faint sm:block">
          {station.tags.slice(0, 3).join(" · ")}
        </span>
        <span className="text-right font-mono text-[11px] tabular-nums text-faint">
          {station.bitrate > 0 ? `${station.bitrate}k` : station.codec.toLowerCase() || ""}
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleFavourite}
        aria-label={favourite ? `Unfavourite ${station.name}` : `Favourite ${station.name}`}
        aria-pressed={favourite}
        className={`px-3 py-3 text-[14px] transition-opacity ${
          favourite
            ? "text-accent"
            : "text-faint opacity-0 focus-visible:opacity-100 group-hover:opacity-60 hover:!opacity-100"
        }`}
      >
        {favourite ? "★" : "☆"}
      </button>
    </li>
  );
}

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const around = [current - 1, current, current + 1].filter((p) => p > 1 && p < total);
  const out: (number | "…")[] = [1];
  if (around[0] && around[0] > 2) out.push("…");
  out.push(...around);
  if (around.length && (around.at(-1) as number) < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function StationList({
  stations,
  page: controlledPage,
  onPageChange,
}: {
  stations: Station[];
  // When provided, pagination is URL-driven by the route; otherwise internal.
  page?: number;
  onPageChange?: (page: number) => void;
}) {
  const activeUuid = usePlayerStore((s) => s.station?.uuid);
  const play = usePlayerStore((s) => s.play);
  const favourites = useLibraryStore((s) => s.favourites);
  const toggleFavourite = useLibraryStore((s) => s.toggleFavourite);
  const favouriteSet = new Set(favourites.map((f) => f.uuid));

  const [internalPage, setInternalPage] = useState(1);
  const page = controlledPage ?? internalPage;
  const setPage = onPageChange ?? setInternalPage;
  const totalPages = Math.max(1, Math.ceil(stations.length / PAGE_SIZE));
  // A new result set (filter/search change) starts back at page 1.
  // biome-ignore lint/correctness/useExhaustiveDependencies: stations identity is the reset signal
  useEffect(() => setInternalPage(1), [stations]);
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => stations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [stations, safePage],
  );

  const goTo = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    document.querySelector("[aria-label='Stations']")?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="px-6 sm:px-10">
      <ul>
        {pageItems.map((s) => (
          <StationRow
            key={s.uuid}
            station={s}
            active={s.uuid === activeUuid}
            favourite={favouriteSet.has(s.uuid)}
            // Queue is the full filtered list, not just this page.
            onPlay={() => play(s, stations)}
            onToggleFavourite={() => toggleFavourite(s)}
          />
        ))}
      </ul>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => goTo(safePage - 1)}
            disabled={safePage === 1}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-edge text-faint transition-colors hover:text-ink disabled:opacity-30"
            aria-label="Previous page"
          >
            ‹
          </button>
          {pageNumbers(safePage, totalPages).map((p, i) =>
            p === "…" ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis slots are positional
              <span key={`e${i}`} className="px-1.5 text-sm text-faint">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goTo(p)}
                aria-current={p === safePage ? "page" : undefined}
                className={`h-9 min-w-9 rounded-full px-2 text-sm tabular-nums transition-colors ${
                  p === safePage ? "bg-ink font-medium text-bg" : "text-faint hover:text-ink"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => goTo(safePage + 1)}
            disabled={safePage === totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-edge text-faint transition-colors hover:text-ink disabled:opacity-30"
            aria-label="Next page"
          >
            ›
          </button>
        </nav>
      )}
    </div>
  );
}
