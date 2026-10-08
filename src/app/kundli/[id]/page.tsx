import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NorthIndianChart } from "@/components/astro/north-chart";
import { BalanceUnlock } from "@/components/payments/balance-unlock";
import { BuyButton } from "@/components/payments/buy-button";
import { PendingWriter } from "@/components/results/detailed-pending";
import { Prose } from "@/components/results/section-card";
import { currentDasha } from "@/lib/astro/chart";
import { NAKSHATRAS, RASHIS } from "@/lib/astro/constants";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { LIFE_AREAS, lifeArea } from "@/lib/kundli/areas";
import { getKundliView } from "@/lib/kundli/service";
import { getAccountBalances } from "@/lib/monetization/account";
import { PRODUCTS, formatInr, priceWithGst, toPaise } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";
import { IdSchema } from "@/lib/schemas/api";

export const metadata: Metadata = { title: "Your Mahakundli", robots: { index: false } };

export default async function MahakundliReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const product = PRODUCTS.KUNDLI_REPORT;
  const price = priceWithGst(product);
  const balances = actor.user && !view.unlocked ? await getAccountBalances(actor.user.id) : null;
  const free = view.teaser ? lifeArea(view.teaser.area) : null;

  const buy = paymentsEnabled() ? (
    <div className="space-y-3">
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl">{price.headline}</span>
        <span className="text-sm text-mist">{price.total} · one-time</span>
      </p>
      <BuyButton
        order={{ product: "KUNDLI_REPORT", kundliId: view.id }}
        label={`Open all ${LIFE_AREAS.length} life areas — ${formatInr(product.priceInr)}`}
      />
      {balances ? (
        <BalanceUnlock
          order={{ product: "KUNDLI_REPORT", kundliId: view.id }}
          credits={0}
          canPayFromWallet={balances.walletPaise >= toPaise(product.priceInr)}
          walletLabel={`${formatInr(balances.walletPaise / 100)} available`}
        />
      ) : null}
    </div>
  ) : (
    <p className="text-sm text-mist">Not available for purchase right now.</p>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-2">
        <p className="eyebrow">Your Mahakundli</p>
        <h1 className="text-4xl">{view.name}</h1>
        <p className="text-mist">
          {RASHIS[chart.moon.rashi]!.name} Moon · {NAKSHATRAS[chart.moon.nakshatra]} nakshatra
          {birth.timeKnown ? ` · ${RASHIS[chart.lagna.rashi]!.name} Lagna` : ""}
          {now.maha ? ` · ${now.maha.lord} mahadasha` : ""} · {birth.placeName}
        </p>
      </header>

      {view.report ? (
        <article className="space-y-8">
          <h2 className="text-3xl text-gold-200">{view.report.headline}</h2>
          {LIFE_AREAS.map((a) => {
            const x = view.report!.areas.find((r) => r.id === a.id);
            return x ? (
              <section key={a.id} className="paper-card space-y-3 p-6">
                <h3 className="text-2xl">
                  <span aria-hidden="true" className="mr-2 text-gold-400">
                    {a.icon}
                  </span>
                  {a.title}
                </h3>
                <p className="text-sm text-mist">{a.question}</p>
                <Prose text={x.text} />
              </section>
            ) : null;
          })}
        </article>
      ) : (
        <>
          {view.teaser && free ? (
            <section className="paper-card space-y-3 p-6 sm:p-8" aria-labelledby="free-answer">
              <p className="eyebrow">Your free answer</p>
              <h2 id="free-answer" className="text-2xl">
                <span aria-hidden="true" className="mr-2 text-gold-400">
                  {free.icon}
                </span>
                {free.title}
              </h2>
              <p className="text-sm text-mist">{free.question}</p>
              <Prose text={view.teaser.text} />
            </section>
          ) : null}
          {view.unlocked ? (
            <PendingWriter
              endpoint={`/api/kundli/${view.id}/report`}
              title="Writing your Mahakundli…"
              body={`Thank you — it's unlocked. All ${LIFE_AREAS.length} life areas are being read from your chart. This takes about a minute.`}
              retryMessage="Your Mahakundli is unlocked and saved — it just needs another moment. Tap “Try again”."
            />
          ) : (
            <section className="space-y-5" aria-labelledby="locked-title">
              <h2 id="locked-title" className="text-2xl">
                {LIFE_AREAS.length - 1} more answers in your Mahakundli
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {LIFE_AREAS.filter((a) => a.id !== view.teaser?.area).map((a) => (
                  <li key={a.id} className="paper-card flex items-start gap-3 p-4 opacity-90">
                    <span aria-hidden="true" className="text-xl text-gold-400">
                      {a.icon}
                    </span>
                    <span>
                      <span className="font-semibold">{a.title}</span>
                      <span className="block text-sm text-mist">{a.question}</span>
                    </span>
                    <span aria-label="Locked" className="ml-auto text-mist">
                      🔒
                    </span>
                  </li>
                ))}
              </ul>
              <div className="paper-card p-6 sm:p-8">{buy}</div>
              <p className="text-xs text-mist">
                Includes your running dasha, life-area timing and the next 3 years of major
                transits. Included with AstroVidya membership. Traditional Jyotish for reflection —
                no fear, no remedies to buy.
              </p>
            </section>
          )}
        </>
      )}

      <div className="paper-card flex justify-center p-4">
        <NorthIndianChart lagnaRashi={lagnaRashi} planets={planets} />
      </div>
      <div className="paper-card flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="text-lg">A question about your chart?</p>
        <Link href="/readers" className="btn-primary">
          Ask a reader
        </Link>
      </div>
    </div>
  );
}
