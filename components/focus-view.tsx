"use client";

import type { FocusFlavour, FocusStation } from "@/lib/focus";
import { FLAVOURS } from "@/lib/focus";
import { StationList } from "./station-list";

// Flavour tints, in the band style: quiet gradients, amber edge when active.
const TINTS: Record<string, string> = {
  "": "linear-gradient(150deg, #26262e, #131318 65%)",
  ambient: "linear-gradient(150deg, #14312c, #0a1513 65%)",
  piano: "linear-gradient(150deg, #2a2440, #131020 65%)",
  lofi: "linear-gradient(150deg, #33241a, #170f0a 65%)",
  jazz: "linear-gradient(150deg, #3d2817, #170e08 65%)",
};

export function FocusView({
  flavour,
  onFlavourChange,
  stations,
  isLoading,
  isError,
  page,
  onPageChange,
}: {
  flavour: FocusFlavour;
  onFlavourChange: (f: FocusFlavour) => void;
  stations: FocusStation[] | undefined;
  isLoading: boolean;
  isError: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
}) {

  return (
    <div>
      <div className="px-6 pt-7 sm:px-10">
        <p className="max-w-xl text-[15px] leading-relaxed text-faint">
          Music without words. Every stream here is instrumental by format —
          curated and checked, made for working.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5" role="tablist" aria-label="Focus flavours">
          {FLAVOURS.map((f) => {
            const active = f.key === flavour;
            return (
              <button
                key={f.key || "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onFlavourChange(f.key)}
                className={`relative flex h-[4.5rem] flex-col justify-end overflow-hidden rounded-2xl border p-3 text-left transition-colors ${
                  active ? "border-accent" : "border-edge hover:border-faint/50"
                }`}
                style={{ background: TINTS[f.key] }}
              >
                {active && (
                  <span className="absolute right-2.5 top-2 text-[8px] text-accent">●</span>
                )}
                <span className="text-[13.5px] font-semibold leading-tight">{f.label}</span>
                <span className="text-[10.5px] text-faint">{f.blurb}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isError && (
        <p className="px-6 py-10 text-[15px] text-faint sm:px-10">
          The Focus catalog didn't load. Refresh to try again.
        </p>
      )}
      {isLoading && !stations && (
        <p className="px-6 py-10 text-sm text-faint sm:px-10" aria-live="polite">
          Loading the catalog…
        </p>
      )}
      {stations && stations.length > 0 && (
        <section aria-label="Stations" className="pt-7">
          <div className="mb-2 flex items-baseline justify-between px-9 sm:px-13">
            <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-faint">
              {flavour ? FLAVOURS.find((f) => f.key === flavour)?.label : "Everything"}
            </h2>
            <span className="font-mono text-xs tabular-nums text-faint">{stations.length}</span>
          </div>
          <StationList stations={stations} page={page} onPageChange={onPageChange} />
        </section>
      )}
    </div>
  );
}
