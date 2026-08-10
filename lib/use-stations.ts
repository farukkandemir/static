"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { CountryEntry, LanguageEntry, Station, TagEntry } from "./types";

export interface StationFilters {
  q: string;
  tag: string;
  country: string;
  language: string;
  order: "clickcount" | "clicktrend" | "bitrate" | "votes" | "name";
}

export const DEFAULT_FILTERS: StationFilters = {
  q: "",
  tag: "",
  country: "",
  language: "",
  order: "clickcount",
};

// 300ms debounce on the search term — per-keystroke requests to a
// donation-funded API is abuse, even through our cache.
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

export function useStations(filters: StationFilters) {
  const q = useDebounced(filters.q);
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (filters.tag) params.set("tags", filters.tag);
  if (filters.country) params.set("country", filters.country);
  if (filters.language) params.set("language", filters.language);
  params.set("order", filters.order);
  params.set("limit", "400");
  const qs = params.toString();
  return useQuery({
    queryKey: ["stations", qs],
    queryFn: () => fetchJson<Station[]>(`/api/stations?${qs}`),
    placeholderData: (prev) => prev, // keep the list up while a new search loads
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => fetchJson<TagEntry[]>("/api/tags"),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: () => fetchJson<CountryEntry[]>("/api/tags?kind=countries"),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useLanguages() {
  return useQuery({
    queryKey: ["languages"],
    queryFn: () => fetchJson<LanguageEntry[]>("/api/tags?kind=languages"),
    staleTime: 24 * 60 * 60 * 1000,
  });
}
