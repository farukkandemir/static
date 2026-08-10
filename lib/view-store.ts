"use client";

import { create } from "zustand";
import type { Station } from "./types";

// The station list currently on screen, registered by whichever route is
// active. Shuffle (S) and the command palette read from here so they always
// act on what the user is looking at.
interface ViewState {
  stations: Station[];
  setStations: (stations: Station[]) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  stations: [],
  setStations: (stations) => set({ stations }),
}));
