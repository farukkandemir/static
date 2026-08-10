"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Station } from "./types";

const MAX_RECENTS = 30;

interface LibraryState {
  favourites: Station[];
  recents: Station[];
  toggleFavourite: (station: Station) => void;
  isFavourite: (uuid: string) => boolean;
  pushRecent: (station: Station) => void;
  exportJson: () => string;
  importJson: (json: string) => { ok: boolean; message: string };
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favourites: [],
      recents: [],

      toggleFavourite: (station) =>
        set((s) => ({
          favourites: s.favourites.some((f) => f.uuid === station.uuid)
            ? s.favourites.filter((f) => f.uuid !== station.uuid)
            : [...s.favourites, station],
        })),

      isFavourite: (uuid) => get().favourites.some((f) => f.uuid === uuid),

      pushRecent: (station) =>
        set((s) => ({
          recents: [station, ...s.recents.filter((r) => r.uuid !== station.uuid)].slice(
            0,
            MAX_RECENTS,
          ),
        })),

      exportJson: () =>
        JSON.stringify(
          { app: "static", version: 1, favourites: get().favourites, recents: get().recents },
          null,
          2,
        ),

      importJson: (json) => {
        try {
          const data = JSON.parse(json) as { favourites?: Station[]; recents?: Station[] };
          const valid = (s: unknown): s is Station =>
            typeof s === "object" &&
            s !== null &&
            typeof (s as Station).uuid === "string" &&
            typeof (s as Station).name === "string" &&
            typeof (s as Station).streamUrl === "string";
          const favourites = (data.favourites ?? []).filter(valid);
          const recents = (data.recents ?? []).filter(valid);
          // Merge, keeping existing entries — an import should never wipe a library.
          set((s) => ({
            favourites: [
              ...s.favourites,
              ...favourites.filter((f) => !s.favourites.some((x) => x.uuid === f.uuid)),
            ],
            recents: [
              ...recents.filter((r) => !s.recents.some((x) => x.uuid === r.uuid)),
              ...s.recents,
            ].slice(0, MAX_RECENTS),
          }));
          return { ok: true, message: `Imported ${favourites.length} favourites.` };
        } catch {
          return { ok: false, message: "That file isn't a Static library export." };
        }
      },
    }),
    { name: "static-library" },
  ),
);

// A pasted stream URL becomes a synthetic station so the whole player path
// (engine, recents, favourites) treats it like any other.
export function stationFromUrl(url: string): Station | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  return {
    uuid: `custom-${btoa(url)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 24)}`,
    name: parsed.hostname,
    streamUrl: url,
    homepage: "",
    favicon: "",
    tags: ["custom"],
    countryCode: "",
    country: "",
    state: "",
    language: "",
    votes: 0,
    codec: "",
    bitrate: 0,
    hls: /\.m3u8(\?|$)/i.test(url),
    clickCount: 0,
    clickTrend: 0,
    geoLat: null,
    geoLong: null,
  };
}
