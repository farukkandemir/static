"use client";

const SHORTCUTS: [string, string][] = [
  ["Space", "Play / pause"],
  ["J", "Next station"],
  ["K", "Previous station"],
  ["S", "Shuffle current filter"],
  ["F", "Favourite current station"],
  ["/", "Focus search"],
  ["⌘K / Ctrl+K", "Command palette"],
  ["?", "This help"],
  ["Esc", "Close overlays"],
];

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="w-full max-w-sm rounded-lg border border-edge bg-raised p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-semibold">Keyboard shortcuts</h2>
        <dl className="space-y-1.5">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-baseline justify-between gap-4">
              <dt className="rounded border border-edge bg-surface px-1.5 py-0.5 font-mono text-[11px]">
                {key}
              </dt>
              <dd className="text-sm text-faint">{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
