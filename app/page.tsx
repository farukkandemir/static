"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Featured } from "@/components/featured";
import { Filters } from "@/components/filters";
import { StationList } from "@/components/station-list";
import { usePlayerStore } from "@/lib/player-store";
import { mergeResults, searchLocal, useSearchIndex } from "@/lib/use-search-index";
import { type StationFilters, useStations } from "@/lib/use-stations";
import { usePageParam, useUrlParams } from "@/lib/use-url-state";
import { useViewStore } from "@/lib/view-store";

const ORDERS = new Set(["clickcount", "clicktrend", "votes", "bitrate", "name"]);

// Browse is the front door. URL state: /?q=jazz&genre=jazz&country=JP&sort=votes&page=2
function BrowsePage() {
  const { searchParams, setParams } = useUrlParams();
  const [page, setPage] = usePageParam();

  const rawSort = searchParams.get("sort") ?? "clickcount";
  const filters: StationFilters = {
    q: searchParams.get("q") ?? "",
    tag: searchParams.get("genre") ?? "",
    country: searchParams.get("country") ?? "",
    language: searchParams.get("lang") ?? "",
    order: (ORDERS.has(rawSort) ? rawSort : "clickcount") as StationFilters["order"],
  };

  const { data: remote, isLoading, isError, isFetching } = useStations(filters);
  const { data: index } = useSearchIndex();

  // Search-as-you-type: with a plain text query (no other filters), results
  // come instantly from the local index; the directory search runs behind it
  // and appends anything the index didn't know. With other filters active,
  // combinations are the server's job.
  const q = filters.q.trim();
  const localMode = Boolean(q) && !filters.tag && !filters.country && !filters.language && !!index;
  const stations = useMemo(() => {
    if (!localMode) return remote;
    // While the directory query is still in flight its data belongs to the
    // previous keystrokes — never mix it in. Local results carry the frame.
    return mergeResults(searchLocal(index ?? [], q), isFetching ? undefined : remote);
  }, [localMode, index, q, remote, isFetching]);

  const setStations = useViewStore((s) => s.setStations);
  useEffect(() => setStations(stations ?? []), [stations, setStations]);

  const onFiltersChange = (next: StationFilters) =>
    setParams({
      genre: next.tag || null,
      country: next.country || null,
      lang: next.language || null,
      sort: next.order === "clickcount" ? null : next.order,
      page: null,
    });

  const play = usePlayerStore((s) => s.play);
  const shuffle = () => {
    if (!stations?.length) return;
    const target = stations[Math.floor(Math.random() * stations.length)];
    play(target, stations);
  };

  const isDefaultBrowse =
    !filters.q.trim() &&
    !filters.tag &&
    !filters.country &&
    !filters.language &&
    filters.order === "clickcount";

  return (
    <>
      {isDefaultBrowse && <Featured />}

      <div className="px-6 pt-8 sm:px-10">
        <Filters filters={filters} onChange={onFiltersChange} onShuffle={shuffle} />
      </div>

      {isError && (
        <p className="px-6 py-10 text-[15px] text-faint sm:px-10">
          The station directory is unreachable right now. Try again in a minute.
        </p>
      )}
      {isLoading && !stations && (
        <p className="px-6 py-10 text-sm text-faint sm:px-10" aria-live="polite">
          Tuning the directory…
        </p>
      )}
      {stations && stations.length === 0 && (!localMode || !isFetching) && (
        <p className="px-6 py-10 text-[15px] text-faint sm:px-10">
          {q
            ? `Nothing for “${q}”. Try a station name, a genre, or a country.`
            : "No stations match. Loosen a filter."}
        </p>
      )}
      {stations && stations.length > 0 && (
        <section aria-label="Stations" className="pt-7">
          <div className="mb-2 flex items-baseline justify-between gap-4 px-6 sm:px-13">
            <h2 className="min-w-0 truncate text-xs font-medium uppercase tracking-[0.18em] text-faint">
              {isDefaultBrowse ? "Top stations" : q ? `Results for “${q}”` : "Results"}
            </h2>
            <span className="shrink-0 font-mono text-xs tabular-nums text-faint">
              {localMode
                ? `${stations.length}${isFetching ? " +" : ""}`
                : isFetching
                  ? "searching…"
                  : stations.length}
            </span>
          </div>
          <StationList stations={stations} page={page} onPageChange={setPage} />
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BrowsePage />
    </Suspense>
  );
}
