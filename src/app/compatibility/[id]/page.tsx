import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompatibilityReadingView } from "@/components/compatibility/compatibility-view";
import { DownloadButton } from "@/components/ui/download-button";
import { BalanceUnlock } from "@/components/payments/balance-unlock";
import { BuyButton } from "@/components/payments/buy-button";
import { PendingWriter } from "@/components/results/detailed-pending";
import { WhatsAppShare } from "@/components/share/whatsapp-share";
import { ButtonLink } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { Alert } from "@/components/ui/misc";
import { getActor } from "@/lib/auth/actor";
import { getCompatibilityView } from "@/lib/compatibility/service";
import { getEnv } from "@/lib/config/env";
import { isAppError } from "@/lib/http/errors";
import { getAccountBalances } from "@/lib/monetization/account";
import { PRODUCTS, formatInr } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";
import { IdSchema } from "@/lib/schemas/api";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Your couple reading"),
    robots: { index: false, follow: false },
  };
}

export default async function CompatibilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const tx = await getT();
  const { id } = await params;
  const { checkout } = await searchParams;
  if (!IdSchema.safeParse(id).success) notFound();
  const actor = await getActor();
  let view;
  try {
    view = await getCompatibilityView(id, actor);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const product = PRODUCTS.COUPLE_COMPATIBILITY;
  const balances = actor.user && !view.unlocked ? await getAccountBalances(actor.user.id) : null;
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <header className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
          <T s="Couple reading" />
        </p>
        <h1 className="text-4xl text-parchment sm:text-5xl">
          <T s="Two palms, read together" />
        </h1>
      </header>

      {view.isDemo ? (
        <Alert tone="warning" title={tx("Demo mode")}>
          <T s="This couple reading uses built-in sample palm features, not your photos, because no AI provider is configured on this server." />
        </Alert>
      ) : null}
      {checkout === "cancelled" && !view.unlocked ? (
        <Alert tone="info">
          <T s="Checkout was cancelled. You have not been charged." />
        </Alert>
      ) : null}

      {view.reading ? (
        <>
          <div className="flex justify-end">
            <DownloadButton label={tx("Download / Save as PDF")} />
          </div>
          <CompatibilityReadingView reading={view.reading} />
          <section className="glass space-y-3 rounded-3xl p-6">
            <h2 className="text-xl text-gold-200">
              <T s="Know another couple who'd enjoy this?" />
            </h2>
            <WhatsAppShare
              context="compatibility"
              text={tx(
                "We read our palms together on AstroVidya — two palms, read side by side. Try it with your partner:",
              )}
              url={`${appUrl}/compatibility`}
            />
          </section>
        </>
      ) : view.unlocked ? (
        <PendingWriter
          endpoint={`/api/compatibility/${view.id}/generate`}
          title={tx("Writing your couple reading…")}
          body={tx(
            "Thank you — it's unlocked. Your reader is now looking at both palms side by side. This usually takes about 20 seconds.",
          )}
          retryMessage={tx(
            "Your couple reading is unlocked and saved — it just needs another moment to be written. Tap “Try again”.",
          )}
        />
      ) : (
        <section className="relative overflow-hidden rounded-[2rem] border border-gold-400/25 bg-gradient-to-b from-gold-400/[0.09] to-transparent p-6 sm:p-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
            <T s="Both palms are ready" />
          </p>
          <h2 className="mt-2 text-3xl text-parchment">
            <T s="Unlock your couple reading" />
          </h2>
          <ul className="mt-5 space-y-2 text-parchment/90">
            <li>
              <T s="· How the two of you think together" />
            </li>
            <li>
              <T s="· How you care for each other" />
            </li>
            <li>
              <T s="· Your everyday rhythm and how you grow as a pair" />
            </li>
            <li>
              <T s="· Your strengths together, and where to give each other room" />
            </li>
          </ul>
          <div className="mt-8 space-y-4">
            {paymentsEnabled() ? (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="text-4xl text-parchment">{formatInr(product.priceInr)}</span>
                  <span className="text-sm text-mist">
                    <T s="one-time, for this couple reading" />
                  </span>
                </p>
                <BuyButton
                  order={{ product: "COUPLE_COMPATIBILITY", compatibilityId: view.id }}
                  label={tx("Unlock couple reading — {0}", [formatInr(product.priceInr)])}
                />
                {balances ? (
                  <BalanceUnlock
                    order={{ product: "COUPLE_COMPATIBILITY", compatibilityId: view.id }}
                    credits={0}
                    canPayFromWallet={balances.walletPaise >= product.priceInr * 100}
                    walletLabel={tx("{0} available", [formatInr(balances.walletPaise / 100)])}
                  />
                ) : null}
              </>
            ) : (
              <p className="text-sm text-mist">
                <T s="Couple readings aren't available for purchase right now." />
              </p>
            )}
            <p className="text-xs text-mist-dim">
              <T s="No score, no kundli matching and no predictions — a warm traditional reading for reflection. Same entertainment-only disclaimer applies." />
            </p>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={`/readings/${view.readingId}`} variant="secondary">
          <T s="Back to my reading" />
        </ButtonLink>
      </div>
      <Disclaimer />
    </div>
  );
}
