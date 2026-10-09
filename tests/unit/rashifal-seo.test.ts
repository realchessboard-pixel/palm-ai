import { describe, expect, it } from "vitest";
import { SEO_LANGUAGES, SIGN_NAMES, TODAY_PHRASE, seoTitle } from "@/lib/horoscope/seo";

describe("search rashifal pages", () => {
  it("has 12 distinct sign names and a title phrase for every language", () => {
    for (const lang of SEO_LANGUAGES) {
      expect(SIGN_NAMES[lang]).toHaveLength(12);
      expect(new Set(SIGN_NAMES[lang]).size).toBe(12);
      expect(TODAY_PHRASE[lang].length).toBeGreaterThan(0);
    }
  });

  it("builds the titles people search for", () => {
    expect(seoTitle("hi", 0)).toBe("मेष राशिफल आज");
    expect(seoTitle("en", 11)).toBe("Pisces Horoscope Today");
  });
});
