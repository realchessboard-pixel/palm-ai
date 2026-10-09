import { msg } from "@/lib/i18n/msg";
import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadButton } from "@/components/ui/download-button";
import { getLanguage } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/ui";
import { BalanceUnlock } from "@/components/payments/balance-unlock";
import { BuyButton } from "@/components/payments/buy-button";
import { WhatsAppShare } from "@/components/share/whatsapp-share";
import { siteConfig } from "@/lib/config/site";
import { PendingWriter } from "@/components/results/detailed-pending";
import { Prose } from "@/components/results/section-card";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { MILAN_SECTIONS, describeMoon, getMilanView } from "@/lib/kundli/milan-service";
import { getAccountBalances } from "@/lib/monetization/account";
import { PRODUCTS, formatInr, priceWithGst, toPaise } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";
import { IdSchema } from "@/lib/schemas/api";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return { title: tx("Your Kundli Milan"), robots: { index: false } };
}

const KOOTA_NAMES = [
  msg("Varna"),
  msg("Vashya"),
  msg("Tara"),
  msg("Yoni"),
  msg("Graha Maitri"),
  msg("Gana"),
  msg("Bhakoot"),
  msg("Nadi"),
];

export default async function MilanResultPage({ params }: { params: Promise<{ id: string }> }) {
  const tx = await getT();
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) notFound();
  const actor = await getActor();
  let view;
  try {
    view = await getMilanView(id, actor);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const product = PRODUCTS.MILAN_REPORT;
  const tr = translator(await getLanguage());
  const price = priceWithGst(product);
  const balances = actor.user && !view.unlocked ? await getAccountBalances(actor.user.id) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <section className="paper-card p-6 sm:p-8">
        <p className="eyebrow">
          <T s="Ashtakoota Guna Milan" />
        </p>
        <h1 className="mt-1 text-5xl">
          {view.total}{" "}
          <span className="text-2xl text-mist">
            <T s="/ 36 gunas" />
          </span>
        </h1>
        <p className="mt-3 max-w-2xl">{view.summary}</p>
        <p className="mt-3 text-sm text-mist">
          {view.nameA}: {describeMoon(view.moonA)} · {view.nameB}: {describeMoon(view.moonB)}
        </p>
        <WhatsAppShare
          className="no-print mt-5"
          context="milan"
          // Only the score is shared — never names or birth details; the link opens the free tool.
          text={tx("Our Kundli Milan: {0} / 36 gunas ✨ Check your own match free:", [view.total])}
          url={`${siteConfig.url}/kundli-milan`}
          label={tx("Share score on WhatsApp")}
        />
      </section>

      {view.kootas ? (
        <div className="paper-card overflow-x-auto p-2">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-mist">
              <tr>
                {[tx("Koota"), view.nameA, view.nameB, tx("Points")].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule)]">
              {view.kootas.map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      <T s={k.name} />
                    </span>
                    <span className="block text-xs text-mist">
                      <T s={k.meaning} />
                    </span>
                  </td>
                  <td className="px-4 py-3">{k.a}</td>
                  <td className="px-4 py-3">{k.b}</td>
                  <td className="px-4 py-3 font-medium">
                    {k.score} / {k.max}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {view.report ? (
        <article className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-3xl text-gold-200">{view.report.headline}</h2>
            <DownloadButton label={tr("dl.download")} />
          </div>
          {MILAN_SECTIONS.map((s) => {
            const x = view.report!.sections.find((r) => r.id === s.id);
            return x ? (
              <section key={s.id} className="space-y-3">
                <h3 className="text-2xl">
                  <T s={s.title} />
                </h3>
                <Prose text={x.text} />
              </section>
            ) : null;
          })}
        </article>
      ) : view.unlocked ? (
        <PendingWriter
          endpoint={`/api/milan/${view.id}/report`}
          title={tr("milan.writing")}
          body={tx(
            "Thank you — it's unlocked. Both charts are being read side by side. This takes about a minute.",
          )}
          retryMessage={tx(
            "Your detailed Milan is unlocked and saved — it just needs another moment. Tap “Try again”.",
          )}
        />
      ) : (
        <section className="space-y-5" aria-labelledby="locked-title">
          <h2 id="locked-title" className="text-2xl">
            {tr("milan.inside")}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              ...KOOTA_NAMES.map((k) => tx("{0} — your points and what they mean", [tx(k)])),
              ...MILAN_SECTIONS.filter((s) => s.id !== "kootas").map((s) => tx(s.title)),
            ].map((t) => (
              <li key={t} className="paper-card flex items-center gap-3 p-3 text-sm">
                <span aria-label={tx("Locked")}>🔒</span>
                {t}
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
                  order={{ product: "MILAN_REPORT", milanId: view.id }}
                  label={`${tr("milan.open")} — ${formatInr(product.priceInr)}`}
                />
                {balances ? (
                  <BalanceUnlock
                    order={{ product: "MILAN_REPORT", milanId: view.id }}
                    credits={0}
                    canPayFromWallet={balances.walletPaise >= toPaise(product.priceInr)}
                    walletLabel={tx("{0} available", [formatInr(balances.walletPaise / 100)])}
                  />
                ) : null}
              </>
            ) : (
              <p className="text-sm text-mist">
                <T s="Not available for purchase right now." />
              </p>
            )}
            <p className="text-xs text-mist">
              <T s="Included with membership. Guna Milan is one traditional lens — it doesn't decide a relationship. No dosha scares, no remedies to buy." />
            </p>
          </div>
        </section>
      )}

      <div className="paper-card flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="text-lg">
          <T s="Questions about the two of you?" />
        </p>
        <Link href="/readers" className="btn-primary">
          <T s="Ask a reader" />
        </Link>
      </div>
    </div>
  );
}
