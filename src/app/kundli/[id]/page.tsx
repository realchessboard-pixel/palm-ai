import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadButton } from "@/components/ui/download-button";
import { NorthIndianChart } from "@/components/astro/north-chart";
import { BalanceUnlock } from "@/components/payments/balance-unlock";
import { BuyButton } from "@/components/payments/buy-button";
import { PendingWriter } from "@/components/results/detailed-pending";
import { Prose } from "@/components/results/section-card";
import { currentDasha } from "@/lib/astro/chart";
import { NAKSHATRAS, RASHIS } from "@/lib/astro/constants";
import { getActor } from "@/lib/auth/actor";
import { getLanguage } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/ui";
import { isAppError } from "@/lib/http/errors";
import { LIFE_AREAS, lifeArea } from "@/lib/kundli/areas";
import { getKundliView } from "@/lib/kundli/service";
import { getAccountBalances } from "@/lib/monetization/account";
import { PRODUCTS, formatInr, priceWithGst, toPaise } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";
import { IdSchema } from "@/lib/schemas/api";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return { title: tx("Your Mahakundli"), robots: { index: false } };
}

export default async function MahakundliReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tx = await getT();
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
  const tr = translator(await getLanguage());

  const buy = paymentsEnabled() ? (
    <div className="space-y-3">
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl">{price.headline}</span>
        <span className="text-sm text-mist">
          <T s={price.total} /> · {tr("pay.oneTime")}
        </span>
      </p>
      <BuyButton
        order={{ product: "KUNDLI_REPORT", kundliId: view.id }}
        label={`${tr("maha.openAll")} (${LIFE_AREAS.length}) — ${formatInr(product.priceInr)}`}
      />
      {balances ? (
        <BalanceUnlock
          order={{ product: "KUNDLI_REPORT", kundliId: view.id }}
          credits={0}
          canPayFromWallet={balances.walletPaise >= toPaise(product.priceInr)}
          walletLabel={tx("{0} available", [formatInr(balances.walletPaise / 100)])}
        />
      ) : null}
    </div>
  ) : (
    <p className="text-sm text-mist">{tr("pay.notAvailable")}</p>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-2">
        <p className="eyebrow">{tr("maha.yourMaha")}</p>
        <h1 className="text-4xl">{view.name}</h1>
        <p className="text-mist">
          <T
            s="{0} Moon · {1} nakshatra{2}{3} · {4}"
            v={[
              RASHIS[chart.moon.rashi]!.name,
              NAKSHATRAS[chart.moon.nakshatra],
              birth.timeKnown ? ` · ${RASHIS[chart.lagna.rashi]!.name} Lagna` : "",
              now.maha ? ` · ${now.maha.lord} mahadasha` : "",
              birth.placeName,
            ]}
          />
        </p>
      </header>

      {view.report ? (
        <article className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-3xl text-gold-200">{view.report.headline}</h2>
            <DownloadButton label={tr("dl.download")} />
          </div>
          {LIFE_AREAS.map((a) => {
            const x = view.report!.areas.find((r) => r.id === a.id);
            return x ? (
              <section key={a.id} className="paper-card space-y-3 p-6">
                <h3 className="text-2xl">
                  <span aria-hidden="true" className="mr-2 text-gold-400">
                    {a.icon}
                  </span>
                  {tr(`area.${a.id}.title`)}
                </h3>
                <p className="text-sm text-mist">{tr(`area.${a.id}.question`)}</p>
                <Prose text={x.text} />
              </section>
            ) : null;
          })}
        </article>
      ) : (
        <>
          {view.teaser && free ? (
            <section className="paper-card space-y-3 p-6 sm:p-8" aria-labelledby="free-answer">
              <p className="eyebrow">{tr("maha.freeAnswer")}</p>
              <h2 id="free-answer" className="text-2xl">
                <span aria-hidden="true" className="mr-2 text-gold-400">
                  {free.icon}
                </span>
                {tr(`area.${free.id}.title`)}
              </h2>
              <p className="text-sm text-mist">{tr(`area.${free.id}.question`)}</p>
              <Prose text={view.teaser.text} />
            </section>
          ) : null}
          {view.unlocked ? (
            <PendingWriter
              endpoint={`/api/kundli/${view.id}/report`}
              title={tr("maha.writing")}
              body={tx(
                "Thank you — it's unlocked. All {0} life areas are being read from your chart. This takes about a minute.",
                [LIFE_AREAS.length],
              )}
              retryMessage={tx(
                "Your Mahakundli is unlocked and saved — it just needs another moment. Tap “Try again”.",
              )}
            />
          ) : (
            <section className="space-y-5" aria-labelledby="locked-title">
              <h2 id="locked-title" className="text-2xl">
                {LIFE_AREAS.length - 1} {tr("maha.moreAnswers")}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {LIFE_AREAS.filter((a) => a.id !== view.teaser?.area).map((a) => (
                  <li key={a.id} className="paper-card flex items-start gap-3 p-4 opacity-90">
                    <span aria-hidden="true" className="text-xl text-gold-400">
                      {a.icon}
                    </span>
                    <span>
                      <span className="font-semibold">{tr(`area.${a.id}.title`)}</span>
                      <span className="block text-sm text-mist">{tr(`area.${a.id}.question`)}</span>
                    </span>
                    <span aria-label={tx("Locked")} className="ml-auto text-mist">
                      🔒
                    </span>
                  </li>
                ))}
              </ul>
              <div className="paper-card p-6 sm:p-8">{buy}</div>
              <p className="text-xs text-mist">{tr("maha.included")}</p>
            </section>
          )}
        </>
      )}

      <div className="paper-card flex justify-center p-4">
        <NorthIndianChart lagnaRashi={lagnaRashi} planets={planets} />
      </div>
      <div className="paper-card flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="text-lg">{tr("ask.question")}</p>
        <Link href="/readers" className="btn-primary">
          <T s="Ask a reader" />
        </Link>
      </div>
    </div>
  );
}
