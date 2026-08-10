"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { stationFromUrl } from "@/lib/library-store";
import type { Station } from "@/lib/types";

interface PaletteAction {
  label: string;
  hint?: string;
  run: () => void;
}

// ⌘K palette: fuzzy-ish match over the current station list, plus a "play
// this URL" action when the query looks like a stream address.
export function CommandPalette({
  open,
  stations,
  onClose,
  onPlay,
  onShuffle,
}: {
  open: boolean;
  stations: Station[];
  onClose: () => void;
  onPlay: (station: Station, queue: Station[]) => void;
  onShuffle: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      // Focus after the dialog paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const actions = useMemo<PaletteAction[]>(() => {
    const q = query.trim().toLowerCase();
    const out: PaletteAction[] = [];
    if (/^https?:\/\//i.test(query.trim())) {
      const custom = stationFromUrl(query.trim());
      if (custom) {
        out.push({
          label: `Play stream: ${custom.streamUrl}`,
          hint: "custom URL",
          run: () => onPlay(custom, [custom]),
        });
      }
      return out;
    }
    if (!q || "shuffle".includes(q)) {
      out.push({ label: "Shuffle current list", hint: "S", run: onShuffle });
    }
    const matches = q
      ? stations.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.tags.some((t) => t.includes(q)) ||
            s.country.toLowerCase().includes(q),
        )
      : stations;
    for (const s of matches.slice(0, 12)) {
      out.push({
        label: s.name,
        hint: [s.countryCode, s.bitrate > 0 ? `${s.bitrate}k` : ""].filter(Boolean).join(" · "),
        run: () => onPlay(s, stations),
      });
    }
    return out;
  }, [query, stations, onPlay, onShuffle]);

  const choose = (action: PaletteAction | undefined) => {
    if (!action) return;
    action.run();
    onClose();
  };

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-edge bg-raised shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelected((s) => Math.min(s + 1, actions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelected((s) => Math.max(s - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(actions[selected]);
          }
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          placeholder="Station, genre, country — or paste a stream URL"
          className="w-full border-b border-edge bg-transparent px-4 py-3 text-sm outline-none placeholder:text-faint"
        />
        <ul className="max-h-80 overflow-y-auto py-1">
          {actions.length === 0 && (
            <li className="px-4 py-3 text-sm text-faint">Nothing matches.</li>
          )}
          {actions.map((a, i) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => choose(a)}
                onMouseEnter={() => setSelected(i)}
                className={`flex w-full items-baseline gap-3 px-4 py-2 text-left text-sm ${
                  i === selected ? "bg-surface text-accent" : ""
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{a.label}</span>
                {a.hint && <span className="font-mono text-[10px] text-faint">{a.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
