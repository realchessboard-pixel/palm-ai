import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config/site";

export const alt = `${siteConfig.name} — AI palm reading`;
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
        justifyContent: "center",
        padding: "80px",
        background: "#f4ecdd",
        color: "#2a1e17",
      }}
    >
      <div style={{ fontSize: 30, color: "#b8471f", letterSpacing: 6, textTransform: "uppercase" }}>
        {siteConfig.name}
      </div>
      <div style={{ fontSize: 76, marginTop: 24, lineHeight: 1.05, maxWidth: 900 }}>
        What does your palm say about you?
      </div>
      <div style={{ fontSize: 30, marginTop: 28, color: "#5f4d40", maxWidth: 860 }}>
        A warm palm reading in the Indian tradition, in your language. Free.
      </div>
    </div>,
    size,
  );
}
