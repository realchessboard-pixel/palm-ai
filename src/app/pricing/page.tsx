import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { BuyButton } from "@/components/payments/buy-button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/actor";
import { PRODUCTS, WALLET_TOPUPS, formatInr, priceWithGst } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Pricing"),
    description: tx(
      "Your basic palm reading is free. Unlock the detailed reading for {0}, read as a couple, gift a reading or read all year.",
      [formatInr(PRODUCTS.DETAILED_READING.priceInr)],
    ),
  };
}

const ACCOUNT_PRODUCTS = ["FAMILY_PACK", "GIFT_READING", "MEMBERSHIP_YEAR"] as const;

export default async function PricingPage() {
  const tx = await getT();
  const user = await getCurrentUser();
  const canBuy = paymentsEnabled();

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
          <T s="Pricing" />
        </p>
        <h1 className="text-4xl text-parchment sm:text-5xl">
          <T s="Start free. Go deeper when you like." />
        </h1>
        <p className="mx-auto max-w-2xl text-mist">
          <T s="Your main palm reading is always free. Pay only for what you want — one-time payments in rupees through UPI, cards or netbanking. Nothing renews automatically." />
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label={tx("Readings")}>
        <Card as="article" className="flex flex-col">
          <h2 className="text-xl text-gold-200">
            <T s="Basic reading" />
          </h2>
          <p className="mt-2 flex-1 text-sm text-mist">
            <T s="Your headline, the way you think and care, your strengths, career nature and one interesting insight — from your right palm." />
          </p>
          <p className="mt-4 text-3xl text-parchment">
            <T s="Free" />
          </p>
          <ButtonLink href="/read" className="mt-4">
            <T s="Read my palm" />
          </ButtonLink>
        </Card>
        {(["KUNDLI_REPORT", "DETAILED_READING", "COUPLE_COMPATIBILITY"] as const).map((product) => (
          <Card as="article" key={product} className="flex flex-col">
            <h2 className="text-xl text-gold-200">
              <T s={PRODUCTS[product].name} />
            </h2>
            <p className="mt-2 flex-1 text-sm text-mist">
              <T s={PRODUCTS[product].description} />
            </p>
            <p className="mt-4 text-3xl text-parchment">
              {priceWithGst(PRODUCTS[product]).headline}
              <span className="ml-2 text-sm text-mist">
                <T s={priceWithGst(PRODUCTS[product]).total} />
              </span>
            </p>
            <ButtonLink
              href={
                product === "COUPLE_COMPATIBILITY"
                  ? "/compatibility"
                  : product === "KUNDLI_REPORT"
                    ? "/mahakundli"
                    : "/read"
              }
              variant="secondary"
              className="mt-4"
            >
              {product === "COUPLE_COMPATIBILITY"
                ? tx("Read as a couple")
                : tx("Start with a free reading")}
            </ButtonLink>
          </Card>
        ))}
      </section>

      <section className="space-y-4" aria-labelledby="family-title">
        <h2 id="family-title" className="text-3xl">
          <T s="For family, friends and the whole year" />
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {ACCOUNT_PRODUCTS.map((product) => (
            <Card as="article" key={product} className="flex flex-col">
              <h3 className="text-xl text-gold-200">
                <T s={PRODUCTS[product].name} />
              </h3>
              <p className="mt-2 flex-1 text-sm text-mist">
                <T s={PRODUCTS[product].description} />
              </p>
              <p className="mt-4 text-3xl text-parchment">
                {formatInr(PRODUCTS[product].priceInr)}
              </p>
              <div className="mt-4">
                {!canBuy ? (
                  <p className="text-sm text-mist">
                    <T s="Not available right now." />
                  </p>
                ) : user ? (
                  <BuyButton order={{ product }} label={tx("Buy")} size="md" className="w-full" />
                ) : (
                  <ButtonLink href={`/signup?next=/pricing`} variant="secondary" className="w-full">
                    <T s="Create a free account to buy" />
                  </ButtonLink>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="wallet-title">
        <h2 id="wallet-title" className="text-3xl">
          <T s="AstroVidya wallet" />
        </h2>
        <p className="text-mist">
          <T
            s="Add money once and spend it on any reading — with a little extra on us: {0}. Wallet money is for AstroVidya only; it can't be withdrawn or transferred. {1}"
            v={[
              WALLET_TOPUPS.map((t) =>
                tx("pay {0}, get {1}", [formatInr(t.payInr), formatInr(t.creditInr)]),
              ).join(" · "),
              <Link key={1} href="/account" className="text-gold-300 underline underline-offset-2">
                <T s="Go to your wallet" />
              </Link>,
            ]}
          />
        </p>
      </section>

      <section className="space-y-3 text-sm text-mist" aria-label={tx("Notes")}>
        <p>
          <T s="Palm reading on AstroVidya is traditional palmistry offered for reflection and entertainment. It does not predict events and is not advice about health, money, relationships or the law." />
        </p>
        <p>
          <T
            s="All prices include GST — what you see is what you pay. Questions about a payment? See our {0}."
            v={[
              <Link key={0} href="/terms" className="text-gold-300 underline underline-offset-2">
                <T s="terms" />
              </Link>,
            ]}
          />
        </p>
      </section>
    </div>
  );
}
