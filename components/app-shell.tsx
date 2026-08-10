"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { LibraryMenu } from "@/components/library-menu";
import { PlayerBar } from "@/components/player-bar";
import { ShortcutsHelp } from "@/components/shortcuts-help";
import { useLibraryStore } from "@/lib/library-store";
import { usePlayerStore } from "@/lib/player-store";
import { useShortcuts } from "@/lib/use-shortcuts";
import { useViewStore } from "@/lib/view-store";

const TABS = [
  { href: "/browse", label: "Browse" },
  { href: "/", label: "Focus" },
  { href: "/favourites", label: "Favourites" },
  { href: "/recents", label: "Recents" },
];

// Search lives in the shell so `/` works everywhere; typing routes to /browse
// with the query in the URL (debounced — the URL is the single source of truth).
function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = pathname === "/browse" ? (searchParams.get("q") ?? "") : "";
  const [value, setValue] = useState(urlQ);

  // Adopt outside URL changes (back/forward, palette navigation).
  // biome-ignore lint/correctness/useExhaustiveDependencies: urlQ is the sync signal
  useEffect(() => setValue(urlQ), [urlQ]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (value === urlQ) return;
      const params = new URLSearchParams(pathname === "/browse" ? searchParams : undefined);
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      params.delete("page");
      router.replace(`/browse${params.size ? `?${params}` : ""}`);
    }, 300);
    return () => clearTimeout(t);
  }, [value, urlQ, pathname, searchParams, router]);

  return (
    <div className="relative hidden sm:block">
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
        id="station-search"
        type="search"
        placeholder="Search stations"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-10 w-52 rounded-full border border-edge bg-surface pl-9 pr-4 text-[13px] transition-all placeholder:text-faint hover:border-faint/50 focus:w-72 focus:border-faint/60"
      />
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
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-5 border-b border-edge/60 px-6 sm:px-10">
          <Link href="/browse" className="text-xl font-semibold tracking-tight">
            static<span className="text-accent">.</span>
          </Link>
          <nav aria-label="Views" className="flex gap-1">
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition-colors ${
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
          <div className="ml-auto flex items-center gap-3">
            <Suspense fallback={null}>
              <HeaderSearch />
            </Suspense>
            <div className="hidden md:block">
              <LibraryMenu />
            </div>
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
