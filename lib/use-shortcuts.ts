"use client";

import { useEffect } from "react";

export interface ShortcutHandlers {
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  shuffle: () => void;
  favourite: () => void;
  focusSearch: () => void;
  openPalette: () => void;
  toggleHelp: () => void;
  closeOverlays: () => void;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function useShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K works everywhere, including inside inputs.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlers.openPalette();
        return;
      }
      if (e.key === "Escape") {
        handlers.closeOverlays();
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case " ":
          e.preventDefault(); // keep the page from scrolling
          handlers.togglePlay();
          break;
        case "j":
        case "J":
          handlers.next();
          break;
        case "k":
        case "K":
          handlers.prev();
          break;
        case "s":
        case "S":
          handlers.shuffle();
          break;
        case "f":
        case "F":
          handlers.favourite();
          break;
        case "/":
          e.preventDefault();
          handlers.focusSearch();
          break;
        case "?":
          handlers.toggleHelp();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
