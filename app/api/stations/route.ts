import { type NextRequest, NextResponse } from "next/server";
import { searchStations } from "@/lib/radio-browser";
import type { StationSearchParams } from "@/lib/types";

const ORDERS = new Set(["clickcount", "clicktrend", "bitrate", "votes", "name"]);

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const params: StationSearchParams = {};

  const q = sp.get("q")?.trim();
  if (q) params.name = q;
  const tags = sp.get("tags")?.trim();
  if (tags) params.tagList = tags;
  const country = sp.get("country")?.trim();
  if (country) params.countrycode = country.toUpperCase();
  const language = sp.get("language")?.trim();
  if (language) params.language = language;

  const bitrateMin = Number(sp.get("bitrateMin"));
  if (Number.isFinite(bitrateMin) && bitrateMin > 0) params.bitrateMin = bitrateMin;

  const order = sp.get("order");
  if (order && ORDERS.has(order)) {
    params.order = order as StationSearchParams["order"];
    // "name" sorts ascending; every popularity-style order sorts descending.
    params.reverse = order !== "name";
  }

  const limit = Number(sp.get("limit"));
  if (Number.isFinite(limit) && limit > 0) params.limit = Math.min(limit, 400);
  const offset = Number(sp.get("offset"));
  if (Number.isFinite(offset) && offset > 0) params.offset = offset;

  try {
    const stations = await searchStations(params);
    return NextResponse.json(stations, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    console.error("stations search failed:", err);
    return NextResponse.json({ error: "directory unavailable" }, { status: 502 });
  }
}
