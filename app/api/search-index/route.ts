import { NextResponse } from "next/server";
import { searchStations } from "@/lib/radio-browser";

// The instant-search index: the top stations by popularity, already run
// through the health + music filters, slimmed to what the client needs to
// filter locally and to play a result. Edge-cached for an hour — one small
// download per visitor, then search costs zero network.
export async function GET() {
  try {
    const stations = await searchStations({ order: "clickcount", reverse: true, limit: 2000 });
    // Keep the Station shape but drop payload the search UI never reads.
    const slim = stations.map((s) => ({
      ...s,
      homepage: "",
      state: "",
      language: "",
      tags: s.tags.slice(0, 4),
      geoLat: null,
      geoLong: null,
    }));
    return NextResponse.json(slim, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("search index failed:", err);
    return NextResponse.json({ error: "directory unavailable" }, { status: 502 });
  }
}
