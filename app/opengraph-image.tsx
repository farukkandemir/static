import { ImageResponse } from "next/og";

// The link-preview card: wordmark on the app's own dark, one quiet line.
export const alt = "staticfm — internet radio for getting things done";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        background: "#151515",
        padding: "0 96px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 118, fontWeight: 700, letterSpacing: "-0.03em" }}>
        <span style={{ color: "#f1f1f0" }}>static</span>
        <span style={{ color: "#ffb454" }}>fm.</span>
      </div>
      <div style={{ marginTop: 18, fontSize: 34, color: "#a6a6a3" }}>
        Internet radio for getting things done.
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: 96,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 24,
          color: "#a6a6a3",
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 12, background: "#ffb454" }} />
        live stations from all over the world
      </div>
    </div>,
    size,
  );
}
