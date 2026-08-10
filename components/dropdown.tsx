"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

// Custom dropdown: a pill trigger opening a styled popover, replacing the
// native <select> whose OS-rendered option list can't be themed.
export function Dropdown({
  label,
  value,
  options,
  onChange,
  searchable = false,
  active,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const highlighted = active ?? Boolean(value);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    requestAnimationFrame(() => searchRef.current?.focus());
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 max-w-48 items-center gap-2 rounded-full border px-4 text-[13px] transition-colors ${
          highlighted
            ? "border-faint/50 bg-raised font-medium text-ink"
            : "border-edge bg-surface text-faint hover:border-faint/50 hover:text-ink"
        }`}
      >
        <span className="truncate">{current && value ? current.label : label}</span>
        <svg
          aria-hidden="true"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-edge bg-raised shadow-2xl shadow-black/40">
          {searchable && (
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filter ${label.toLowerCase()}…`}
              className="w-full border-b border-edge bg-transparent px-4 py-2.5 text-[13px] outline-none placeholder:text-faint"
            />
          )}
          <ul role="listbox" aria-label={label} className="max-h-72 overflow-y-auto py-1.5">
            {visible.length === 0 && (
              <li className="px-4 py-2.5 text-[13px] text-faint">No matches.</li>
            )}
            {visible.map((o) => {
              const selected = o.value === value;
              return (
                <li key={o.value || "__all"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[13px] transition-colors hover:bg-surface ${
                      selected ? "font-medium text-accent" : ""
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {selected && (
                      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
                        <path
                          d="M2 6.5 4.8 9 10 3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
