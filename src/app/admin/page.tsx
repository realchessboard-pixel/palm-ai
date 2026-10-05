import type { Metadata } from "next";
import type { ProductKind } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReadingsChart } from "@/components/admin/readings-chart";
import { Card } from "@/components/ui/misc";
import { getAdminStats } from "@/lib/admin/stats";
import { getCurrentUser } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { isRazorpayTestMode } from "@/lib/payments";
import { PRODUCTS } from "@/lib/monetization/price";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const PRODUCT_LABELS: Record<ProductKind, string> = {
  ...Object.fromEntries(Object.entries(PRODUCTS).map(([k, p]) => [k, p.name])),
  WALLET_TOPUP: "Wallet top-ups",
  READER_QUESTIONS: "Ask a Reader (AI)",
} as Record<ProductKind, string>;

function money(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** digits);
}

function inr(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card rounded-2xl p-5">
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-1 font-display text-3xl text-parchment">{value}</p>
      {hint ? <p className="mt-1 text-xs text-mist-dim">{hint}</p> : null}
    </div>
  );
}

/**
 * Admin dashboard. Access requires a signed-in user with the ADMIN role (or an
 * email listed in ADMIN_EMAILS). Others get a 404 so the page isn't discoverable.
 */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) notFound();

  const stats = await getAdminStats();
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  const e = stats.economics;
  const razorpayTest = getEnv().PAYMENT_PROVIDER === "razorpay" && isRazorpayTestMode();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pt-10 pb-20 sm:px-6">
      <div>
        <h1 className="text-4xl">Admin</h1>
        <p className="mt-2 text-mist">Aggregate metrics only — no personal data is shown here.</p>
        <Link href="/admin/beta" className="mt-2 inline-block text-sm text-gold-300 underline">
          Beta report (per-reading timings, hands, retries, cost) →
        </Link>
      </div>

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total users" value={stats.totalUsers.toLocaleString()} />
        <Stat label="Total readings" value={stats.totalReadings.toLocaleString()} />
        <Stat
          label="Free readings"
          value={stats.freeReadings.toLocaleString()}
          hint="Completed, not unlocked"
        />
        <Stat label="Premium readings" value={stats.premiumReadings.toLocaleString()} />
        <Stat
          label="Conversion rate"
          value={pct(stats.conversionRate)}
          hint="Premium ÷ completed readings"
        />
        <Stat label="AI errors (30 days)" value={stats.aiErrors30d.toLocaleString()} />
        <Stat label="Rejected photos (30 days)" value={stats.rejectedPhotos30d.toLocaleString()} />
        <Stat
          label="Revenue"
          value={
            stats.revenue.length
              ? stats.revenue.map((r) => money(r.amount, r.currency)).join(" · ")
              : "—"
          }
          hint={`Verified real payments, all time${stats.testPayments ? ` · ${stats.testPayments} test payment(s) excluded` : ""}${razorpayTest ? " · Razorpay is in TEST mode: these are test payments" : ""}`}
        />
      </section>

      {stats.revenueByProduct.length ? (
        <section aria-labelledby="products-title" className="space-y-4">
          <h2 id="products-title" className="text-2xl">
            Revenue by product
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.revenueByProduct.map((r) => (
              <Stat
                key={`${r.product}-${r.currency}`}
                label={PRODUCT_LABELS[r.product]}
                value={money(r.amount, r.currency)}
                hint={`${r.count.toLocaleString()} paid`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="growth-title" className="space-y-4">
        <h2 id="growth-title" className="text-2xl">
          Growth: wallet, credits, gifts, referrals, couples
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Wallet balance outstanding"
            value={inr(stats.growth.walletLiabilityPaise / 100)}
            hint="Prepaid, not yet spent (closed-loop)"
          />
          <Stat
            label="Unused reading credits"
            value={stats.growth.unusedReadingCredits.toLocaleString()}
          />
          <Stat
            label="Active memberships"
            value={stats.growth.activeMemberships.toLocaleString()}
          />
          <Stat
            label="Gifts sold / redeemed"
            value={`${stats.growth.giftsSold} / ${stats.growth.giftsRedeemed}`}
          />
          <Stat
            label="Referrals joined / qualified"
            value={`${stats.growth.referralsJoined} / ${stats.growth.referralsQualified}`}
          />
          <Stat
            label="Couple readings started / unlocked"
            value={`${stats.growth.coupleReadings} / ${stats.growth.coupleReadingsUnlocked}`}
          />
          <Stat label="Shares (30 days)" value={stats.growth.shares30d.toLocaleString()} />
        </div>
      </section>

      <section aria-labelledby="economics-title" className="space-y-4">
        <div>
          <h2 id="economics-title" className="text-2xl">
            Detailed-reading funnel &amp; unit economics
          </h2>
          <p className="mt-1 text-sm text-mist">
            Real (non-demo) readings only. AI costs are configured estimates (
            {inr(e.assumptions.basicAiCostInr)} per basic reading,{" "}
            {inr(e.assumptions.extendedAiCostInr)} extra per detailed reading), not measured spend.
            Internal — never shown to customers.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Readings started" value={stats.funnel.reading_started.toLocaleString()} />
          <Stat
            label="Basic readings completed"
            value={stats.funnel.basic_reading_completed.toLocaleString()}
          />
          <Stat label="Offer viewed" value={stats.funnel.extended_offer_viewed.toLocaleString()} />
          <Stat
            label="Checkout started"
            value={stats.funnel.extended_checkout_started.toLocaleString()}
          />
          <Stat
            label="Detailed readings unlocked"
            value={stats.funnel.extended_reading_unlocked.toLocaleString()}
          />
          <Stat
            label="Failed or cancelled payments"
            value={stats.funnel.extended_payment_failed.toLocaleString()}
          />
          <Stat
            label="Purchase conversion"
            value={pct(e.conversionRate)}
            hint={`Paid at ${inr(e.assumptions.priceInr)} ÷ basic readings`}
          />
          <Stat label="Gross contribution" value={inr(e.totals.grossContributionInr)} />
        </div>
        <Card as="div" className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-mist">
              <tr>
                <th className="py-2 pr-4 font-normal">Metric</th>
                <th className="py-2 pr-4 font-normal">Total</th>
                <th className="py-2 font-normal">Per 1,000 users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-parchment/90">
              {(
                [
                  ["Revenue", e.totals.revenueInr, e.per1000Users.revenueInr],
                  ["AI cost (estimated)", e.totals.aiCostInr, e.per1000Users.aiCostInr],
                  ["Payment fees", e.totals.paymentFeesInr, e.per1000Users.paymentFeesInr],
                  ["Ad revenue", e.totals.adRevenueInr, e.per1000Users.adRevenueInr],
                  [
                    "Gross contribution",
                    e.totals.grossContributionInr,
                    e.per1000Users.grossContributionInr,
                  ],
                ] as const
              ).map(([label, total, per1000]) => (
                <tr key={label}>
                  <td className="py-2 pr-4">{label}</td>
                  <td className="py-2 pr-4">{total === null ? "not configured" : inr(total)}</td>
                  <td className="py-2">{per1000 === null ? "not configured" : inr(per1000)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {e.missing.length ? (
            <p className="mt-3 text-xs text-mist-dim">
              Not yet configured, so excluded from the contribution:{" "}
              {e.missing.map((m) => m.replace("_", " ")).join(", ")}. Set PAYMENT_FEE_PERCENT /
              PAYMENT_FEE_FIXED_INR and AD_REVENUE_PER_1000_READINGS_INR once known.
            </p>
          ) : null}
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card as="section">
          <h2 className="text-xl">Readings, last 7 days</h2>
          <div className="mt-6">
            <ReadingsChart data={stats.readingsLast7Days} />
          </div>
        </Card>
        <Card as="section">
          <h2 className="text-xl">Recent activity</h2>
          {stats.recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-mist">No events yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5 text-sm">
              {stats.recentActivity.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-mono text-parchment/90">{e.name}</span>
                  <span className="text-xs text-mist">
                    {e.signedIn ? "member · " : "guest · "}
                    {new Date(e.createdAt).toLocaleString("en", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
