import { NextResponse } from "next/server";
import focusStations from "@/data/focus-stations.json";

// The curated Focus catalog: instrumental/no-lyrics stations, every stream
// probed at curation time. Tiers: core (wordless by format, known brands)
// and solid (wordless-genre tags, verified alive). Regenerate the JSON from
// the curation scripts when refreshing against the directory.
export function GET(request: Request) {
  const flavour = new URL(request.url).searchParams.get("flavour");
  const stations = flavour
    ? focusStations.filter((s) => s.flavours.includes(flavour))
    : focusStations;
  return NextResponse.json(stations, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
