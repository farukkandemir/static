import { NextResponse } from "next/server";
import { getCountries, getLanguages, getTags } from "@/lib/radio-browser";

// One endpoint for the three browse dimensions; all cached 24h upstream.
// /api/tags            -> genre tags
// /api/tags?kind=countries
// /api/tags?kind=languages
export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind") ?? "tags";
  try {
    const data =
      kind === "countries"
        ? await getCountries()
        : kind === "languages"
          ? await getLanguages()
          : await getTags();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("tags fetch failed:", err);
    return NextResponse.json({ error: "directory unavailable" }, { status: 502 });
  }
}
