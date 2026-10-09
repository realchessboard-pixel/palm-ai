import { localeFor } from "@/lib/i18n/languages";
import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BalanceUnlock } from "@/components/payments/balance-unlock";
import { BuyButton } from "@/components/payments/buy-button";
import { PendingWriter } from "@/components/results/detailed-pending";
import { Prose } from "@/components/results/section-card";
import { DownloadButton } from "@/components/ui/download-button";
import { RASHIS } from "@/lib/astro/constants";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { getLanguage } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/ui";
import { getRashifalView } from "@/lib/kundli/rashifal-service";
import { getAccountBalances } from "@/lib/monetization/account";
import { PRODUCTS, formatInr, priceWithGst, toPaise } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";
import { IdSchema } from "@/lib/schemas/api";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Your Detailed Rashifal"),
    robots: { index: false },
  };
}

export default async function RashifalReportPage({ params }: { params: Promise<{ id: string }> }) {
  const tx = await getT();
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) notFound();
  const actor = await getActor();
  let view;
  try {
    view = await getRashifalView(id, actor, localeFor(await getLanguage()));
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const tr = translator(await getLanguage());
  const product = PRODUCTS.RASHIFAL_REPORT;
  const price = priceWithGst(product);
  const balances = actor.user && !view.unlocked ? await getAccountBalances(actor.user.id) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-2">
        <p className="eyebrow">
          <T s="Detailed Rashifal" />
        </p>
        <h1 className="text-4xl">{view.name}</h1>
        <p className="text-mist">
          <T s="{0} Moon · next 12 months" v={[RASHIS[view.moonRashi]!.name]} />
        </p>
      </header>

      {view.report ? (
        <article className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-3xl text-gold-200">{view.report.headline}</h2>
            <DownloadButton label={tr("dl.download")} />
          </div>
          <Prose text={view.report.overview} />
          {view.report.months.map((m) => (
            <section key={m.month} className="paper-card space-y-2 p-6">
              <p className="eyebrow">{m.month}</p>
              {m.title ? (
                <h3 className="text-2xl">
                  <T s={m.title} />
                </h3>
              ) : null}
              <Prose text={m.text} />
              {m.focus ? <p className="note">{m.focus}</p> : null}
            </section>
          ))}
        </article>
      ) : view.unlocked ? (
        <PendingWriter
          endpoint={`/api/kundli/${view.id}/rashifal`}
          title={tx("Writing your Detailed Rashifal…")}
          body={tx(
            "Thank you — it's unlocked. Your 12 months are being read from your chart. This takes about a minute.",
          )}
          retryMessage={tx(
            "Your Detailed Rashifal is unlocked and saved — it just needs another moment. Tap “Try again”.",
          )}
        />
      ) : (
        <section className="space-y-5" aria-labelledby="offer">
          <h2 id="offer" className="text-2xl">
            <T s="Want your detailed rashifal for the next 12 months?" />
          </h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {view.months.map((m) => (
              <li key={m} className="paper-card flex items-center gap-2 p-3 text-sm">
                <span aria-label={tx("Locked")}>🔒</span>
                {m}
              </li>
            ))}
          </ul>
          <div className="paper-card space-y-3 p-6 sm:p-8">
            {paymentsEnabled() ? (
              <>
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl">{price.headline}</span>
                  <span className="text-sm text-mist">
                    <T s={price.total} /> · {tr("pay.oneTime")}
                  </span>
                </p>
                <BuyButton
                  order={{ product: "RASHIFAL_REPORT", kundliId: view.id }}
                  label={tx("Get my Detailed Rashifal — {0}", [formatInr(product.priceInr)])}
                />
                {balances ? (
                  <BalanceUnlock
                    order={{ product: "RASHIFAL_REPORT", kundliId: view.id }}
                    credits={0}
                    canPayFromWallet={balances.walletPaise >= toPaise(product.priceInr)}
                    walletLabel={tx("{0} available", [formatInr(balances.walletPaise / 100)])}
                  />
                ) : null}
              </>
            ) : (
              <p className="text-sm text-mist">{tr("pay.notAvailable")}</p>
            )}
            <p className="text-xs text-mist">
              <T s="Month-by-month themes from the real planet positions and your own Moon sign. Included with membership. For reflection — no predictions, no remedies to buy." />
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
