"use client";

import { useEffect, useState } from "react";

// Many favicon values in the directory are dead links or http:// — render a
// generated fallback tile (hashed hue + initial) whenever the image can't load.
// Scales from list-row chips to large artwork tiles.
export function StationFavicon({
  name,
  url,
  size = 28,
  fill = false,
  className = "",
}: {
  name: string;
  url: string;
  size?: number;
  // fill: size to the parent (fluid tiles) instead of a fixed pixel box.
  fill?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  const rounded = fill || size >= 48 ? "rounded-xl" : "rounded-md";
  const box = fill ? { width: "100%", height: "100%" } : { width: size, height: size };
  const usable = url && url.startsWith("https://") && !failed;
  if (!usable) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    const hue = ((hash % 360) + 360) % 360;
    return (
      <span
        aria-hidden
        className={`inline-flex shrink-0 select-none items-center justify-center font-mono font-semibold uppercase ${
          fill ? "text-4xl" : ""
        } ${rounded} ${className}`}
        style={{
          ...box,
          fontSize: fill ? undefined : Math.max(9, Math.round(size / 2.4)),
          background: `linear-gradient(135deg, oklch(0.32 0.055 ${hue}), oklch(0.2 0.045 ${(hue + 40) % 360}))`,
          color: `oklch(0.88 0.05 ${hue})`,
        }}
      >
        {name.trim().charAt(0) || "?"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote favicons are
    // arbitrary hosts; next/image would need a wildcard remotePatterns entry.
    <img
      src={url}
      alt=""
      width={fill ? undefined : size}
      height={fill ? undefined : size}
      loading="lazy"
      className={`shrink-0 bg-surface object-cover ${rounded} ${className}`}
      style={box}
      onError={() => setFailed(true)}
    />
  );
}
