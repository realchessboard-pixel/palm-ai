import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { SECTION_IDS } from "@/lib/schemas/palm-interpretation";
import { projectInterpretation } from "@/lib/readings/projection";
import { isSameOriginRequest } from "@/lib/security/same-origin";
import { proxy } from "@/proxy";

function headers(values: Record<string, string>) {
  return new Headers(values);
}

describe("same-origin (CSRF) check", () => {
  it("allows same-origin browser requests", () => {
    expect(
      isSameOriginRequest(
        headers({ host: "palm.app", origin: "https://palm.app", "sec-fetch-site": "same-origin" }),
      ),
    ).toBe(true);
  });
  it("allows non-browser clients without Origin", () => {
    expect(isSameOriginRequest(headers({ host: "palm.app" }))).toBe(true);
  });
  it.each([
    [{ host: "palm.app", origin: "https://evil.example" }],
    [{ host: "palm.app", origin: "null" }],
    [{ host: "palm.app", "sec-fetch-site": "cross-site" }],
    [{ host: "palm.app", origin: "not a url" }],
  ])("rejects cross-site requests %#", (h) => {
    expect(isSameOriginRequest(headers(h))).toBe(false);
  });
  it("honours configured app origins behind proxies", () => {
    expect(
      isSameOriginRequest(headers({ host: "internal:3000", origin: "https://palm.app" }), [
        "https://palm.app",
      ]),
    ).toBe(true);
  });
});

describe("proxy", () => {
  it("blocks cross-site state-changing API calls", async () => {
    const res = proxy(
      new NextRequest("https://palm.app/api/readings/abc", {
        method: "DELETE",
        headers: { host: "palm.app", origin: "https://evil.example" },
      }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("CSRF_REJECTED");
  });

  it("does not apply the origin check to signed webhooks", () => {
    const res = proxy(
      new NextRequest("https://palm.app/api/payments/webhook/stripe", {
        method: "POST",
        headers: { host: "palm.app", origin: "https://stripe.com" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("sets a nonce-based CSP on pages", () => {
    const res = proxy(new NextRequest("https://palm.app/read", { headers: { host: "palm.app" } }));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-eval");
  });
});

describe("entitlement projection", () => {
  const full = composeRuleBasedReading(sampleAnalysis());

  it("free projection carries the main reading and locks the whole detailed reading", () => {
    const { interpretation, locked } = projectInterpretation(full, false);
    expect(interpretation.narrative).toEqual(full.narrative);
    expect(interpretation.sections).toEqual([]);
    expect(interpretation.lines).toEqual([]);
    expect(interpretation.mounts).toEqual([]);
    expect(interpretation.fingers).toBeNull();
    expect(interpretation.markings).toBeNull();
    expect(locked?.sections).toEqual(
      full.sections
        .map((s) => s.id)
        .sort((a, b) => SECTION_IDS.indexOf(a) - SECTION_IDS.indexOf(b)),
    );
    expect(locked?.lines).toEqual(full.lines.map((l) => l.line));
    expect(locked?.mountCount).toBe(full.mounts.length);
    const payload = JSON.stringify(interpretation);
    for (const s of full.sections) expect(payload).not.toContain(`"title":"${s.title}"`);
  });

  it("readings written before the main reading existed keep their original free split", () => {
    const { narrative: _ignored, ...legacy } = full;
    void _ignored;
    const { interpretation, locked } = projectInterpretation(legacy, false);
    expect(interpretation.narrative).toBeNull();
    expect(interpretation.sections.map((s) => s.id).sort()).toEqual(["career", "personality"]);
    expect(interpretation.sections.every((s) => s.details === null && s.points.length === 0)).toBe(
      true,
    );
    expect(interpretation.lines.every((l) => l.details === null)).toBe(true);
    expect(interpretation.lines.map((l) => l.line)).not.toContain("fate");
    expect(interpretation.mounts).toEqual([]);
    expect(interpretation.fingers).toBeNull();
    expect(locked).toMatchObject({ lines: ["fate"], fingers: true });
    // No premium prose (section details, mount readings) leaks into the free payload.
    const payload = JSON.stringify(interpretation);
    for (const s of full.sections) expect(payload).not.toContain(s.details.slice(0, 80));
    for (const m of full.mounts) expect(payload).not.toContain(m.details.slice(0, 80));
  });

  it("premium projection returns everything", () => {
    const { interpretation, locked } = projectInterpretation(full, true);
    expect(locked).toBeNull();
    expect(interpretation.sections).toHaveLength(full.sections.length);
  });
});
