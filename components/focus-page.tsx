"use client";

import { Suspense, useEffect } from "react";
import { FocusView } from "@/components/focus-view";
import { type FocusFlavour, type FocusStation, FLAVOURS, useFocusStations } from "@/lib/focus";
import { usePageParam, useUrlParams } from "@/lib/use-url-state";
import { useViewStore } from "@/lib/view-store";

// URL state: /?f=ambient&page=2
function FocusPageInner({ initialStations }: { initialStations: FocusStation[] }) {
  const { searchParams, setParams } = useUrlParams();
  const [page, setPage] = usePageParam();
  const rawFlavour = searchParams.get("f") ?? "";
  const flavour = (FLAVOURS.some((fl) => fl.key === rawFlavour) ? rawFlavour : "") as FocusFlavour;

  // The default view is server-rendered: the full catalog arrives with the
  // page, so the list paints immediately instead of behind a loading state.
  const { data: stations, isLoading, isError } = useFocusStations(flavour, initialStations);
  const setStations = useViewStore((s) => s.setStations);
  useEffect(() => setStations(stations ?? []), [stations, setStations]);

  return (
    <FocusView
      flavour={flavour}
      onFlavourChange={(f) => setParams({ f: f || null, page: null })}
      stations={stations}
      isLoading={isLoading}
      isError={isError}
      page={page}
      onPageChange={setPage}
    />
  );
}

export function FocusPageClient({ initialStations }: { initialStations: FocusStation[] }) {
  return (
    <Suspense fallback={null}>
      <FocusPageInner initialStations={initialStations} />
    </Suspense>
  );
}
