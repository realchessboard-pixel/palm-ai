import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NorthIndianChart } from "@/components/astro/north-chart";
import { BalanceUnlock } from "@/components/payments/balance-unlock";
import { BuyButton } from "@/components/payments/buy-button";
import { PendingWriter } from "@/components/results/detailed-pending";
import { Prose } from "@/components/results/section-card";
import { NAKSHATRAS, RASHIS } from "@/lib/astro/constants";
import { currentDasha } from "@/lib/astro/chart";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { KUNDLI_SECTIONS, getKundliView } from "@/lib/kundli/service";
import { getAccountBalances } from "@/lib/monetization/account";
import { PRODUCTS, formatInr, toPaise } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";
import { IdSchema } from "@/lib/schemas/api";

export const metadata: Metadata = { title: "Your Kundli reading", robots: { index: false } };

export default async function KundliReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) notFound();
  const actor = await getActor();
  let view;
  try {
    view = await getKundliView(id, actor);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { chart, birth } = view;
  const lagnaRashi = birth.timeKnown ? chart.lagna.rashi : chart.moon.rashi;
  const planets = chart.planets.map((p) => ({
    ...p,
    house: ((p.rashi - lagnaRashi + 12) % 12) + 1,
  }));
  const now = currentDasha(chart.dasha);
  const price = PRODUCTS.KUNDLI_REPORT.priceInr;
  const balances = actor.user && !view.unlocked ? await getAccountBalances(actor.user.id) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-2">
        <p className="eyebrow">Kundli reading</p>
        <h1 className="text-4xl">{view.name}</h1>
        <p className="text-mist">
          {RASHIS[chart.moon.rashi]!.name} Moon · {NAKSHATRAS[chart.moon.nakshatra]} nakshatra
          {birth.timeKnown ? ` · ${RASHIS[chart.lagna.rashi]!.name} Lagna` : ""}
          {now.maha ? ` · ${now.maha.lord} mahadasha` : ""} · {birth.placeName}
        </p>
      </header>
      <div className="paper-card flex justify-center p-4">
        <NorthIndianChart lagnaRashi={lagnaRashi} planets={planets} />
      </div>

      {view.report ? (
        <article className="space-y-10">
          <h2 className="text-3xl text-gold-200">{view.report.headline}</h2>
          {KUNDLI_SECTIONS.map((s) => {
            const section = view.report!.sections.find((x) => x.id === s.id);
            return section ? (
              <section key={s.id} className="space-y-3">
                <h3 className="text-2xl">{s.title}</h3>
                <Prose text={section.text} />
              </section>
            ) : null;
          })}
          <div className="paper-card flex flex-wrap items-center justify-between gap-4 p-6">
            <p className="text-lg">Questions about your chart?</p>
            <Link href="/readers" className="btn-primary">
              Ask a reader
            </Link>
          </div>
        </article>
      ) : view.unlocked ? (
        <PendingWriter
          endpoint={`/api/kundli/${view.id}/report`}
          title="Writing your Kundli reading…"
          body="Thank you — it's unlocked. Your chart is being read house by house. This usually takes about 30 seconds."
          retryMessage="Your Kundli reading is unlocked and saved — it just needs another moment. Tap “Try again”."
        />
      ) : (
        <section className="paper-card space-y-5 p-6 sm:p-8" aria-labelledby="unlock-title">
          <p className="eyebrow">Full Kundli reading · {formatInr(price)}</p>
          <h2 id="unlock-title" className="text-3xl">
            Read what this chart says about you
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {KUNDLI_SECTIONS.map((s) => (
              <li key={s.id} className="flex gap-2">
                <span aria-hidden="true" className="text-gold-400">
                  ✓
                </span>
                {s.title}
              </li>
            ))}
          </ul>
          {paymentsEnabled() ? (
            <div className="space-y-3">
              <BuyButton
                order={{ product: "KUNDLI_REPORT", kundliId: view.id }}
                label={`Unlock my Kundli reading — ${formatInr(price)}`}
              />
              {balances ? (
                <BalanceUnlock
                  order={{ product: "KUNDLI_REPORT", kundliId: view.id }}
                  credits={0}
                  canPayFromWallet={balances.walletPaise >= toPaise(price)}
                  walletLabel={`${formatInr(balances.walletPaise / 100)} available`}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-mist">Not available for purchase right now.</p>
          )}
          <p className="text-xs text-mist">
            One-time payment. Included with PalmAI membership. Traditional Jyotish for reflection —
            no predictions, no fear, no remedies to buy.
          </p>
        </section>
      )}
    </div>
  );
}
