"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
// import { LibraryMenu } from "@/components/library-menu";
import { PlayerBar } from "@/components/player-bar";
import { ShortcutsHelp } from "@/components/shortcuts-help";
import { useLibraryStore } from "@/lib/library-store";
import { usePlayerStore } from "@/lib/player-store";
import { useSearchIndex } from "@/lib/use-search-index";
import { useShortcuts } from "@/lib/use-shortcuts";
import { useViewStore } from "@/lib/view-store";

const TABS = [
  { href: "/", label: "Browse" },
  { href: "/focus", label: "Focus" },
  { href: "/favourites", label: "Favourites" },
  { href: "/recents", label: "Recents" },
];

// Search lives in the shell so `/` works everywhere; typing routes to the
// Browse home with the query in the URL (debounced — the URL is the single
// source of truth).
function HeaderSearch() {
  // Warm the local search index the moment the app loads, from any route —
  // by the first keystroke it's already in memory.
  useSearchIndex();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = pathname === "/" ? (searchParams.get("q") ?? "") : "";
  const [value, setValue] = useState(urlQ);
  const inputRef = useRef<HTMLInputElement>(null);
  // The last query THIS box pushed into the URL. URL changes matching it are
  // our own echo and must never touch the input — that echo arriving late is
  // what was eating letters mid-typing.
  const lastSent = useRef(urlQ);

  useEffect(() => {
    if (urlQ === lastSent.current) return; // our own write coming back
    lastSent.current = urlQ;
    // External change (back/forward, a link): adopt it — but never while the
    // user is actively typing in the box.
    if (document.activeElement !== inputRef.current) setValue(urlQ);
  }, [urlQ]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = value.trim();
      if (next === lastSent.current) return;
      const params = new URLSearchParams(pathname === "/" ? searchParams : undefined);
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("page");
      lastSent.current = next;
      router.replace(`/${params.size ? `?${params}` : ""}`);
    }, 250);
    return () => clearTimeout(t);
  }, [value, pathname, searchParams, router]);

  return (
    <div className="relative">
      <svg
        aria-hidden="true"
        width="13"
        height="13"
        viewBox="0 0 13 13"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
      >
        <circle cx="5.5" cy="5.5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="m9 9 3 3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <input
        ref={inputRef}
        id="station-search"
        type="search"
        placeholder="Search stations or genres"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-10 w-44 rounded-full border border-edge bg-surface pl-9 pr-8 text-[13px] transition-colors placeholder:text-faint hover:border-faint/50 focus:border-faint sm:w-64 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-faint transition-colors hover:text-ink"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const play = usePlayerStore((s) => s.play);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const currentStation = usePlayerStore((s) => s.station);
  const toggleFavourite = useLibraryStore((s) => s.toggleFavourite);
  const viewStations = useViewStore((s) => s.stations);

  const shuffle = useCallback(() => {
    if (viewStations.length === 0) return;
    const target = viewStations[Math.floor(Math.random() * viewStations.length)];
    play(target, viewStations);
  }, [viewStations, play]);

  useShortcuts({
    togglePlay,
    next,
    prev,
    shuffle,
    favourite: () => currentStation && toggleFavourite(currentStation),
    focusSearch: () => document.getElementById("station-search")?.focus(),
    openPalette: () => setPaletteOpen(true),
    toggleHelp: () => setHelpOpen((h) => !h),
    closeOverlays: () => {
      setPaletteOpen(false);
      setHelpOpen(false);
    },
  });

  const favourites = useLibraryStore((s) => s.favourites);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl">
        {/* One row on desktop; on phones the tabs drop to a second,
            horizontally scrollable line and search stays beside the logo. */}
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-edge/60 px-4 py-2.5 sm:h-16 sm:flex-nowrap sm:px-10 sm:py-0">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            static<span className="text-accent">fm.</span>
          </Link>
          <nav
            aria-label="Views"
            className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 [scrollbar-width:none] sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0"
          >
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors sm:px-4 ${
                    active ? "bg-raised text-ink" : "text-faint hover:text-ink"
                  }`}
                >
                  {t.label}
                  {t.href === "/favourites" && favourites.length > 0
                    ? ` · ${favourites.length}`
                    : ""}
                </Link>
              );
            })}
          </nav>
          <div className="order-2 ml-auto flex items-center gap-3 sm:order-none">
            <Suspense fallback={null}>
              <HeaderSearch />
            </Suspense>
            {/* Library export/import parked for now — bring back when someone
                actually asks for portability.
            <div className="hidden md:block">
              <LibraryMenu />
            </div> */}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-2xl flex-1 pb-36">{children}</main>

      <PlayerBar />
      <CommandPalette
        open={paletteOpen}
        stations={viewStations}
        onClose={() => setPaletteOpen(false)}
        onPlay={play}
        onShuffle={shuffle}
      />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
