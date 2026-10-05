import type { Metadata } from "next";
import Link from "next/link";
import { BuyButton } from "@/components/payments/buy-button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/actor";
import { PRODUCTS, WALLET_TOPUPS, formatInr } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Your basic palm reading is free. Unlock the detailed reading for ${formatInr(PRODUCTS.DETAILED_READING.priceInr)}, read as a couple, gift a reading or read all year.`,
};

const ACCOUNT_PRODUCTS = ["FAMILY_PACK", "GIFT_READING", "MEMBERSHIP_YEAR"] as const;

export default async function PricingPage() {
  const user = await getCurrentUser();
  const canBuy = paymentsEnabled();

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">Pricing</p>
        <h1 className="text-4xl text-parchment sm:text-5xl">
          Start free. Go deeper when you like.
        </h1>
        <p className="mx-auto max-w-2xl text-mist">
          Your main palm reading is always free. Pay only for what you want — one-time payments in
          rupees through UPI, cards or netbanking. Nothing renews automatically.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Readings">
        <Card as="article" className="flex flex-col">
          <h2 className="text-xl text-gold-200">Basic reading</h2>
          <p className="mt-2 flex-1 text-sm text-mist">
            Your headline, the way you think and care, your strengths, career nature and one
            interesting insight — from your right palm.
          </p>
          <p className="mt-4 text-3xl text-parchment">Free</p>
          <ButtonLink href="/read" className="mt-4">
            Read my palm
          </ButtonLink>
        </Card>
        {(["DETAILED_READING", "COUPLE_COMPATIBILITY"] as const).map((product) => (
          <Card as="article" key={product} className="flex flex-col">
            <h2 className="text-xl text-gold-200">{PRODUCTS[product].name}</h2>
            <p className="mt-2 flex-1 text-sm text-mist">{PRODUCTS[product].description}</p>
            <p className="mt-4 text-3xl text-parchment">{formatInr(PRODUCTS[product].priceInr)}</p>
            <ButtonLink
              href={product === "COUPLE_COMPATIBILITY" ? "/compatibility" : "/read"}
              variant="secondary"
              className="mt-4"
            >
              {product === "COUPLE_COMPATIBILITY"
                ? "Read as a couple"
                : "Start with a free reading"}
            </ButtonLink>
          </Card>
        ))}
      </section>

      <section className="space-y-4" aria-labelledby="family-title">
        <h2 id="family-title" className="text-3xl">
          For family, friends and the whole year
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {ACCOUNT_PRODUCTS.map((product) => (
            <Card as="article" key={product} className="flex flex-col">
              <h3 className="text-xl text-gold-200">{PRODUCTS[product].name}</h3>
              <p className="mt-2 flex-1 text-sm text-mist">{PRODUCTS[product].description}</p>
              <p className="mt-4 text-3xl text-parchment">
                {formatInr(PRODUCTS[product].priceInr)}
              </p>
              <div className="mt-4">
                {!canBuy ? (
                  <p className="text-sm text-mist">Not available right now.</p>
                ) : user ? (
                  <BuyButton order={{ product }} label="Buy" size="md" className="w-full" />
                ) : (
                  <ButtonLink href={`/signup?next=/pricing`} variant="secondary" className="w-full">
                    Create a free account to buy
                  </ButtonLink>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="wallet-title">
        <h2 id="wallet-title" className="text-3xl">
          PalmAI wallet
        </h2>
        <p className="text-mist">
          Add money once and spend it on any reading — with a little extra on us:{" "}
          {WALLET_TOPUPS.map(
            (t) => `pay ${formatInr(t.payInr)}, get ${formatInr(t.creditInr)}`,
          ).join(" · ")}
          . Wallet money is for PalmAI only; it can&apos;t be withdrawn or transferred.{" "}
          <Link href="/account" className="text-gold-300 underline underline-offset-2">
            Go to your wallet
          </Link>
        </p>
      </section>

      <section className="space-y-3 text-sm text-mist" aria-label="Notes">
        <p>
          Palm reading on PalmAI is traditional palmistry offered for reflection and entertainment.
          It does not predict events and is not advice about health, money, relationships or the
          law.
        </p>
        <p>
          Prices include all taxes. Questions about a payment? See our{" "}
          <Link href="/terms" className="text-gold-300 underline underline-offset-2">
            terms
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
