import type { LineName, MountName } from "@/lib/schemas/palm-analysis";

/**
 * Generic, stylised palm geometry (viewBox 0 0 300 400), drawn as a LEFT palm
 * seen face-on (thumb on the viewer's left). Mirror it for a right hand.
 * This is an illustration, not a measurement of anyone's hand.
 */
export const PALM_VIEWBOX = "0 0 300 400";

export const PALM_OUTLINE =
  "M108 398 C104 360 96 330 90 305 C70 290 50 265 38 236 C30 218 34 198 50 194 C62 191 70 200 78 214 C84 224 88 226 92 220 L90 92 C90 70 122 70 122 92 L125 168 C126 172 128 172 128 166 L128 64 C128 40 162 40 162 64 L164 170 C165 174 167 174 168 170 L169 84 C169 62 201 62 201 84 L202 180 C203 184 205 184 206 180 L209 128 C209 108 236 108 236 128 L238 214 C242 250 240 290 232 320 C226 350 214 375 208 398";

export const PALM_LINES: Record<LineName, { d: string; label: { x: number; y: number } }> = {
  heart: { d: "M238 224 C205 214 170 230 130 198", label: { x: 244, y: 214 } },
  head: { d: "M94 234 C130 240 175 254 222 280", label: { x: 228, y: 290 } },
  life: { d: "M94 238 C152 268 150 344 126 394", label: { x: 70, y: 372 } },
  fate: { d: "M170 392 C167 330 160 272 152 214", label: { x: 176, y: 360 } },
};

export const PALM_MOUNTS: Record<MountName, { x: number; y: number }> = {
  jupiter: { x: 106, y: 204 },
  saturn: { x: 146, y: 198 },
  apollo: { x: 186, y: 204 },
  mercury: { x: 222, y: 222 },
  mars: { x: 212, y: 262 },
  venus: { x: 104, y: 324 },
  moon: { x: 208, y: 342 },
};

export const LINE_COLORS: Record<LineName, string> = {
  heart: "#f2a7a0",
  head: "#9fc3ff",
  life: "#efcb83",
  fate: "#b9a6ff",
};
