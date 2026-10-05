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
        background: "radial-gradient(circle at 80% 20%, #2a2240 0%, #07060c 60%)",
        color: "#f5efe4",
      }}
    >
      <div style={{ fontSize: 30, color: "#efcb83", letterSpacing: 6, textTransform: "uppercase" }}>
        {siteConfig.name}
      </div>
      <div style={{ fontSize: 76, marginTop: 24, lineHeight: 1.05, maxWidth: 900 }}>
        Discover What Your Palm Reveals
      </div>
      <div style={{ fontSize: 30, marginTop: 28, color: "#b8b0c4", maxWidth: 860 }}>
        A personalized palmistry reading powered by AI — for reflection and fun.
      </div>
    </div>,
    size,
  );
}
