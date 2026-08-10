"use client";

import { useQuery } from "@tanstack/react-query";
import type { Station } from "./types";

export interface FocusStation extends Station {
  tier: "core" | "solid";
  flavours: string[];
}

export type FocusFlavour = "" | "ambient" | "piano" | "lofi" | "jazz";

export const FLAVOURS: { key: FocusFlavour; label: string; blurb: string }[] = [
  { key: "", label: "Everything", blurb: "all 235 wordless streams" },
  { key: "ambient", label: "Ambient", blurb: "drone · space · sleep" },
  { key: "piano", label: "Piano & Classical", blurb: "solo piano · orchestral" },
  { key: "lofi", label: "Lo-fi", blurb: "beats · chillhop · study" },
  { key: "jazz", label: "Jazz & Lounge", blurb: "smooth · bossa · late night" },
];

export function useFocusStations(flavour: FocusFlavour, initial?: FocusStation[]) {
  return useQuery({
    queryKey: ["focus", flavour],
    queryFn: async () => {
      const qs = flavour ? `?flavour=${flavour}` : "";
      const res = await fetch(`/api/focus${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as FocusStation[];
    },
    // The full catalog ships with the server-rendered page; flavours filter
    // from it locally so switching them never waits on the network either.
    initialData: initial
      ? flavour
        ? initial.filter((s) => s.flavours.includes(flavour))
        : initial
      : undefined,
    staleTime: 60 * 60 * 1000, // the catalog changes on redeploy, not per-session
  });
}
