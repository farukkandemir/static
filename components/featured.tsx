"use client";

import { useQuery } from "@tanstack/react-query";
import { usePlayerStore } from "@/lib/player-store";
import type { Station } from "@/lib/types";
import { StationFavicon } from "./station-favicon";

// "Popular this week" — Radio Browser's clicktrend. A global signal that
// works from day one; our own live counts join it (clearly separated) once
// the community layer ships. Never blend the two.
export function Featured() {
  const { data } = useQuery({
    queryKey: ["featured"],
    queryFn: async () => {
      const res = await fetch("/api/stations?order=clicktrend&limit=60");
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as Station[];
    },
    staleTime: 10 * 60 * 1000,
  });
  const play = usePlayerStore((s) => s.play);
  const activeUuid = usePlayerStore((s) => s.station?.uuid);

  if (!data || data.length === 0) return null;
  // Artwork carries the section — prefer stations that actually have some.
  const withArt = data.filter((s) => s.favicon.startsWith("https://")).slice(0, 12);
  const tiles = withArt.length >= 6 ? withArt : data.slice(0, 12);

  return (
    <section aria-label="Popular this week" className="px-6 pt-8 sm:px-10">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-faint">
        Popular this week
      </h2>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {tiles.map((s) => {
          const active = s.uuid === activeUuid;
          return (
            <button
              key={s.uuid}
              type="button"
              onClick={() => play(s, tiles)}
              className="group min-w-0 text-left"
            >
              <div
                className={`relative aspect-square w-full overflow-hidden rounded-xl transition-shadow ${
                  active
                    ? "ring-2 ring-accent"
                    : "ring-1 ring-edge group-hover:ring-2 group-hover:ring-faint/40"
                }`}
              >
                <StationFavicon
                  name={s.name}
                  url={s.favicon}
                  fill
                  className="transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                />
                {active && (
                  <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] font-semibold uppercase text-accent-contrast">
                    on air
                  </span>
                )}
              </div>
              <div
                className={`mt-2.5 truncate text-sm font-medium leading-snug ${
                  active ? "text-accent" : ""
                }`}
              >
                {s.name}
              </div>
              <div className="truncate text-xs text-faint">
                {[s.country || s.countryCode, s.tags[0]].filter(Boolean).join(" · ")}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
