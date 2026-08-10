"use client";

import Link from "next/link";

// Empty state as a ghost of the ledger itself: three fading placeholder rows
// show what will live here, with the real keys inline. Left-aligned, no icon,
// no big button — the page teaches its own layout.
function GhostRow({ opacity, nameWidth, tagWidth }: { opacity: string; nameWidth: string; tagWidth: string }) {
  return (
    <li
      aria-hidden
      className="flex items-center gap-4 border-b border-edge/40 px-3 py-3.5 last:border-b-0"
      style={{ opacity }}
    >
      <span className="h-[30px] w-[30px] shrink-0 rounded-[7px] bg-surface" />
      <span className={`h-3 ${nameWidth} rounded-full bg-surface`} />
      <span className={`hidden h-2.5 ${tagWidth} rounded-full bg-surface/70 sm:block`} />
      <span className="ml-auto text-[14px] text-faint/40">☆</span>
    </li>
  );
}

export function EmptyLibrary({ kind }: { kind: "favourites" | "recents" }) {
  return (
    <div className="mx-auto max-w-lg px-6 pt-14 sm:px-0">
      <ul>
        <GhostRow opacity="0.55" nameWidth="w-40" tagWidth="w-28" />
        <GhostRow opacity="0.35" nameWidth="w-52" tagWidth="w-20" />
        <GhostRow opacity="0.18" nameWidth="w-36" tagWidth="w-32" />
      </ul>
      <div className="mt-8 px-3 text-[14px] leading-relaxed text-faint">
        {kind === "favourites" ? (
          <p>
            Stations you save land here. Tap the{" "}
            <span className="mx-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-edge bg-surface px-1.5 text-[12px] text-ink">
              ☆
            </span>{" "}
            on any row — or press{" "}
            <kbd className="mx-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-edge bg-surface px-1.5 font-mono text-[11px] text-ink">
              F
            </kbd>{" "}
            while listening.
          </p>
        ) : (
          <p>Everything you tune in shows up here, newest first.</p>
        )}
        <p className="mt-3">
          <Link
            href="/browse"
            className="text-ink underline decoration-edge underline-offset-4 transition-colors hover:decoration-faint"
          >
            Find something in Browse
          </Link>
          <span className="px-2 text-faint/50">·</span>
          <Link
            href="/"
            className="text-ink underline decoration-edge underline-offset-4 transition-colors hover:decoration-faint"
          >
            or start with Focus
          </Link>
        </p>
      </div>
    </div>
  );
}
