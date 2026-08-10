"use client";

import { Suspense, useEffect } from "react";
import { EmptyLibrary } from "@/components/empty-library";
import { StationList } from "@/components/station-list";
import { useLibraryStore } from "@/lib/library-store";
import { usePageParam } from "@/lib/use-url-state";
import { useViewStore } from "@/lib/view-store";

function RecentsPage() {
  const recents = useLibraryStore((s) => s.recents);
  const [page, setPage] = usePageParam();
  const setStations = useViewStore((s) => s.setStations);
  useEffect(() => setStations(recents), [recents, setStations]);

  if (recents.length === 0) {
    return <EmptyLibrary kind="recents" />;
  }
  return (
    <section aria-label="Stations" className="pt-7">
      <div className="mb-2 flex items-baseline justify-between px-9 sm:px-13">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-faint">Recents</h2>
        <span className="font-mono text-xs tabular-nums text-faint">{recents.length}</span>
      </div>
      <StationList stations={recents} page={page} onPageChange={setPage} />
    </section>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RecentsPage />
    </Suspense>
  );
}
