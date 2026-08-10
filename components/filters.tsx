"use client";

import type { StationFilters } from "@/lib/use-stations";
import { useCountries, useLanguages, useTags } from "@/lib/use-stations";
import { Dropdown } from "./dropdown";

// Search lives in the header; this row is the browse toolbar.
export function Filters({
  filters,
  onChange,
  onShuffle,
}: {
  filters: StationFilters;
  onChange: (next: StationFilters) => void;
  onShuffle: () => void;
}) {
  const tags = useTags();
  const countries = useCountries();
  const languages = useLanguages();

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Dropdown
        label="Genre"
        value={filters.tag}
        onChange={(tag) => onChange({ ...filters, tag })}
        searchable
        options={[
          { value: "", label: "All genres" },
          ...(tags.data?.slice(0, 120).map((t) => ({ value: t.name, label: cap(t.name) })) ?? []),
        ]}
      />
      <Dropdown
        label="Country"
        value={filters.country}
        onChange={(country) => onChange({ ...filters, country })}
        searchable
        options={[
          { value: "", label: "All countries" },
          ...(countries.data?.map((c) => ({ value: c.iso_3166_1, label: c.name })) ?? []),
        ]}
      />
      <Dropdown
        label="Language"
        value={filters.language}
        onChange={(language) => onChange({ ...filters, language })}
        searchable
        options={[
          { value: "", label: "All languages" },
          ...(languages.data?.slice(0, 100).map((l) => ({ value: l.name, label: cap(l.name) })) ??
            []),
        ]}
      />
      <Dropdown
        label="Sort"
        value={filters.order}
        active={filters.order !== "clickcount"}
        onChange={(order) => onChange({ ...filters, order: order as StationFilters["order"] })}
        options={[
          { value: "clickcount", label: "Most popular" },
          { value: "clicktrend", label: "Trending" },
          { value: "votes", label: "Most voted" },
          { value: "bitrate", label: "Highest quality" },
          { value: "name", label: "A–Z" },
        ]}
      />
      <button
        type="button"
        onClick={onShuffle}
        title="Shuffle within current filter (S)"
        className="h-10 rounded-full border border-edge bg-surface px-4 text-[13px] text-faint transition-colors hover:border-faint/50 hover:text-ink"
      >
        Shuffle
      </button>
      {(filters.tag || filters.country || filters.language) && (
        <button
          type="button"
          onClick={() => onChange({ ...filters, tag: "", country: "", language: "" })}
          className="h-10 px-2 text-[13px] text-faint transition-colors hover:text-ink"
        >
          Clear
        </button>
      )}
    </div>
  );
}
