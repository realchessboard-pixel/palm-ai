import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BalanceUnlock } from "@/components/payments/balance-unlock";
import { BuyButton } from "@/components/payments/buy-button";
import { PendingWriter } from "@/components/results/detailed-pending";
import { Prose } from "@/components/results/section-card";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { MILAN_SECTIONS, describeMoon, getMilanView } from "@/lib/kundli/milan-service";
import { getAccountBalances } from "@/lib/monetization/account";
import { PRODUCTS, formatInr, priceWithGst, toPaise } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";
import { IdSchema } from "@/lib/schemas/api";

export const metadata: Metadata = { title: "Your Kundli Milan", robots: { index: false } };

const KOOTA_NAMES = ["Varna", "Vashya", "Tara", "Yoni", "Graha Maitri", "Gana", "Bhakoot", "Nadi"];

export default async function MilanResultPage({ params }: { params: Promise<{ id: string }> }) {
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
  const price = priceWithGst(product);
  const balances = actor.user && !view.unlocked ? await getAccountBalances(actor.user.id) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <section className="paper-card p-6 sm:p-8">
        <p className="eyebrow">Ashtakoota Guna Milan</p>
        <h1 className="mt-1 text-5xl">
          {view.total} <span className="text-2xl text-mist">/ 36 gunas</span>
        </h1>
        <p className="mt-3 max-w-2xl">{view.summary}</p>
        <p className="mt-3 text-sm text-mist">
          {view.nameA}: {describeMoon(view.moonA)} · {view.nameB}: {describeMoon(view.moonB)}
        </p>
      </section>

      {view.kootas ? (
        <div className="paper-card overflow-x-auto p-2">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-mist">
              <tr>
                {["Koota", view.nameA, view.nameB, "Points"].map((h) => (
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
                    <span className="font-medium">{k.name}</span>
                    <span className="block text-xs text-mist">{k.meaning}</span>
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
          <h2 className="text-3xl text-gold-200">{view.report.headline}</h2>
          {MILAN_SECTIONS.map((s) => {
            const x = view.report!.sections.find((r) => r.id === s.id);
            return x ? (
              <section key={s.id} className="space-y-3">
                <h3 className="text-2xl">{s.title}</h3>
                <Prose text={x.text} />
              </section>
            ) : null;
          })}
        </article>
      ) : view.unlocked ? (
        <PendingWriter
          endpoint={`/api/milan/${view.id}/report`}
          title="Writing your detailed Milan…"
          body="Thank you — it's unlocked. Both charts are being read side by side. This takes about a minute."
          retryMessage="Your detailed Milan is unlocked and saved — it just needs another moment. Tap “Try again”."
        />
      ) : (
        <section className="space-y-5" aria-labelledby="locked-title">
          <h2 id="locked-title" className="text-2xl">
            Inside your detailed Kundli Milan
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              ...KOOTA_NAMES.map((k) => `${k} — your points and what they mean`),
              ...MILAN_SECTIONS.filter((s) => s.id !== "kootas").map((s) => s.title),
            ].map((t) => (
              <li key={t} className="paper-card flex items-center gap-3 p-3 text-sm">
                <span aria-label="Locked">🔒</span>
                {t}
              </li>
            ))}
          </ul>
          <div className="paper-card space-y-3 p-6 sm:p-8">
            {paymentsEnabled() ? (
              <>
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl">{price.headline}</span>
                  <span className="text-sm text-mist">{price.total} · one-time</span>
                </p>
                <BuyButton
                  order={{ product: "MILAN_REPORT", milanId: view.id }}
                  label={`Open my detailed Milan — ${formatInr(product.priceInr)}`}
                />
                {balances ? (
                  <BalanceUnlock
                    order={{ product: "MILAN_REPORT", milanId: view.id }}
                    credits={0}
                    canPayFromWallet={balances.walletPaise >= toPaise(product.priceInr)}
                    walletLabel={`${formatInr(balances.walletPaise / 100)} available`}
                  />
                ) : null}
              </>
            ) : (
              <p className="text-sm text-mist">Not available for purchase right now.</p>
            )}
            <p className="text-xs text-mist">
              Included with membership. Guna Milan is one traditional lens — it doesn&apos;t decide
              a relationship. No dosha scares, no remedies to buy.
            </p>
          </div>
        </section>
      )}

      <div className="paper-card flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="text-lg">Questions about the two of you?</p>
        <Link href="/readers" className="btn-primary">
          Ask a reader
        </Link>
      </div>
    </div>
  );
}
