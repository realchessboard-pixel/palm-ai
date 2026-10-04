// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdSlot } from "@/components/ads/ad-slot";
import { PremiumPanel } from "@/components/results/premium-panel";
import { computeEconomics, type EconomicsAssumptions } from "@/lib/monetization/economics";
import {
  EXTENDED_READING_PRICE_INR,
  EXTENDED_READING_PRICE_MINOR,
  formatInr,
} from "@/lib/monetization/price";

vi.mock("next/navigation", () => {
  const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() };
  return { useRouter: () => router };
});

afterEach(cleanup);

const LOCKED = {
  detailedSections: ["personality" as const],
  sections: ["money" as const],
  lines: ["fate" as const],
  mountCount: 7,
  fingers: true,
  markings: false,
};

describe("price", () => {
  it("is ₹35, stored in paise for providers", () => {
    expect(EXTENDED_READING_PRICE_INR).toBe(35);
    expect(EXTENDED_READING_PRICE_MINOR).toBe(3500);
    expect(formatInr(35)).toBe("₹35");
    expect(formatInr(35.5)).toBe("₹35.50");
  });

  it("is defined in one place only (no hardcoded ₹35 elsewhere in the app)", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name)) files.push(path);
      }
    };
    walk(join(process.cwd(), "src"));
    const offenders = files.filter(
      (f) =>
        !f.endsWith(join("monetization", "price.ts")) &&
        /₹\s?35\b|(price|amount)\w*\s*[:=]\s*(35|3500)\b/i.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});

describe("unit economics", () => {
  const base: EconomicsAssumptions = {
    priceInr: 35,
    basicAiCostInr: 4,
    extendedAiCostInr: 0,
    paymentFeePercent: null,
    paymentFeeFixedInr: null,
    adRevenuePer1000BasicReadingsInr: null,
  };

  it("computes revenue, AI cost, contribution and conversion per 1,000 users", () => {
    const e = computeEconomics({ users: 2000, basicReadings: 1600, extendedPurchases: 80 }, base);
    expect(e.conversionRate).toBe(0.05);
    expect(e.totals).toEqual({
      revenueInr: 2800,
      aiCostInr: 6400,
      paymentFeesInr: null,
      adRevenueInr: null,
      grossContributionInr: -3600,
    });
    expect(e.per1000Users).toMatchObject({
      revenueInr: 1400,
      aiCostInr: 3200,
      grossContributionInr: -1800,
    });
    // Fees and ad revenue are never assumed.
    expect(e.missing).toEqual(["payment_fees", "ad_revenue"]);
  });

  it("includes payment fees, ad revenue and a separate extended AI cost once configured", () => {
    const e = computeEconomics(
      { users: 1000, basicReadings: 1000, extendedPurchases: 100 },
      {
        ...base,
        extendedAiCostInr: 2,
        paymentFeePercent: 2,
        paymentFeeFixedInr: 1,
        adRevenuePer1000BasicReadingsInr: 500,
      },
    );
    expect(e.totals).toEqual({
      revenueInr: 3500,
      aiCostInr: 4200,
      paymentFeesInr: 170,
      adRevenueInr: 500,
      grossContributionInr: -370,
    });
    expect(e.missing).toEqual([]);
  });

  it("handles an empty funnel", () => {
    const e = computeEconomics({ users: 0, basicReadings: 0, extendedPurchases: 0 }, base);
    expect(e.conversionRate).toBe(0);
    expect(e.per1000Users.revenueInr).toBe(0);
  });
});

describe("ad slot", () => {
  it("renders nothing when ads are off", () => {
    const { container } = render(<AdSlot placement="free-reading-result" mode="off" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a clearly-marked development placeholder, never an ad", () => {
    render(<AdSlot placement="free-reading-result" mode="placeholder" />);
    const slot = screen.getByRole("complementary", { name: "Advertisement placeholder" });
    expect(slot).toHaveTextContent("Development placeholder");
    expect(slot).toHaveAttribute("data-ad-placement", "free-reading-result");
    expect(slot.querySelector("script, iframe, img")).toBeNull();
  });
});

describe("detailed-reading offer", () => {
  it("shows the copy, the price and what's included", () => {
    render(<PremiumPanel readingId="r1" locked={LOCKED} priceLabel="₹35" paymentsEnabled />);
    expect(screen.getByText("Your Basic Reading Is Ready")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Want the complete picture?" })).toBeInTheDocument();
    expect(screen.getByText(/detailed line, mount, finger and interpretation/)).toBeInTheDocument();
    expect(screen.getByText("₹35")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unlock Detailed Reading — ₹35" }),
    ).toBeInTheDocument();
    expect(screen.getByText("7 palm mounts interpreted")).toBeInTheDocument();
  });

  it.each([
    ["PAYMENT_FAILED", /didn't go through/],
    ["PAYMENT_CANCELLED", /cancelled and you have not been charged/],
    ["PAYMENT_INITIATED", /hasn't been confirmed yet/],
  ] as const)("explains the %s state and keeps the offer available", (state, message) => {
    render(
      <PremiumPanel
        readingId="r1"
        locked={LOCKED}
        priceLabel="₹35"
        paymentsEnabled
        paymentState={state}
      />,
    );
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Unlock Detailed Reading/ })).toBeEnabled();
  });
});
