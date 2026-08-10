"use client";

import { useRef, useState } from "react";
import { useLibraryStore } from "@/lib/library-store";

// Export / import the library as JSON. Lives in the header next to the tabs.
export function LibraryMenu() {
  const exportJson = useLibraryStore((s) => s.exportJson);
  const importJson = useLibraryStore((s) => s.importJson);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "static-library.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const result = importJson(await file.text());
    setMessage(result.message);
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-[11px] text-faint">{message}</span>}
      <button
        type="button"
        onClick={download}
        title="Export favourites and recents as JSON"
        className="h-8 rounded-full border border-edge bg-surface px-3 text-xs text-faint transition-colors hover:border-faint/50 hover:text-ink"
      >
        Export
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Import a Static library JSON file"
        className="h-8 rounded-full border border-edge bg-surface px-3 text-xs text-faint transition-colors hover:border-faint/50 hover:text-ink"
      >
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
