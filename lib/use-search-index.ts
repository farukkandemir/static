"use client";

import { useQuery } from "@tanstack/react-query";
import type { Station } from "./types";

// The local search index: top stations, downloaded once and cached. Typing
// filters this in memory — instant, no network, no stale results. The full
// directory search runs behind it and appends what the index doesn't know.
export function useSearchIndex() {
  return useQuery({
    queryKey: ["search-index"],
    queryFn: async () => {
      const res = await fetch("/api/search-index");
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as Station[];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

// Rank local matches: name prefix beats name substring beats genre beats
// country, popularity breaks ties.
export function searchLocal(index: Station[], query: string): Station[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: [number, Station][] = [];
  for (const s of index) {
    const name = s.name.toLowerCase();
    let score = -1;
    if (name.startsWith(q)) score = 3;
    else if (name.includes(q)) score = 2;
    else if (s.tags.some((t) => t.toLowerCase().includes(q))) score = 1;
    else if ((s.country || s.countryCode).toLowerCase().includes(q)) score = 0.5;
    if (score >= 0) scored.push([score, s]);
  }
  scored.sort((a, b) => b[0] - a[0] || b[1].clickCount - a[1].clickCount);
  return scored.map(([, s]) => s);
}

// Local results first (instant), then whatever the directory found that the
// index didn't already cover.
export function mergeResults(local: Station[], remote: Station[] | undefined): Station[] {
  if (!remote || remote.length === 0) return local;
  const seen = new Set(local.map((s) => s.uuid));
  return [...local, ...remote.filter((s) => !seen.has(s.uuid))];
}
