"use client";

import type { FocusFlavour, FocusStation } from "@/lib/focus";
import { FLAVOURS } from "@/lib/focus";
import { StationList } from "./station-list";

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
          Music without words — curated instrumental stations, made for working.
        </p>
        {/* Same pill language as the header tabs and browse filters. */}
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Focus flavours">
          {FLAVOURS.map((f) => {
            const active = f.key === flavour;
            return (
              <button
                key={f.key || "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onFlavourChange(f.key)}
                className={`h-10 rounded-full border px-4 text-[13px] transition-colors ${
                  active
                    ? "border-faint/50 bg-raised font-medium text-ink"
                    : "border-edge bg-surface text-faint hover:border-faint/50 hover:text-ink"
                }`}
              >
                {f.label}
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
          <div className="mb-2 flex items-baseline justify-between px-6 sm:px-13">
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
