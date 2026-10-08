import { BuyButton } from "@/components/payments/buy-button";
import { WhatsAppShare } from "@/components/share/whatsapp-share";
import { Card } from "@/components/ui/misc";
import type { AccountBalances, GiftView } from "@/lib/monetization/account";
import { FAMILY_PACK_CREDITS, PRODUCTS, WALLET_TOPUPS, formatInr } from "@/lib/monetization/price";
import { GiftRedeemForm } from "./gift-redeem";

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

/** Wallet, reading credits, membership and gifts on the account page. */
export function WalletSection({
  balances,
  gifts,
  appUrl,
  paymentsEnabled,
}: {
  balances: AccountBalances;
  gifts: GiftView[];
  appUrl: string;
  paymentsEnabled: boolean;
}) {
  return (
    <>
      <Card as="section" className="space-y-5" aria-labelledby="wallet-title">
        <h2 id="wallet-title" className="text-2xl">
          Wallet &amp; credits
        </h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 p-4">
            <dt className="text-xs tracking-wide text-mist uppercase">Wallet</dt>
            <dd className="mt-1 text-2xl text-parchment">
              {formatInr(balances.walletPaise / 100)}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 p-4">
            <dt className="text-xs tracking-wide text-mist uppercase">Reading credits</dt>
            <dd className="mt-1 text-2xl text-parchment">{balances.readingCredits}</dd>
          </div>
          <div className="rounded-2xl border border-white/10 p-4">
            <dt className="text-xs tracking-wide text-mist uppercase">Membership</dt>
            <dd className="mt-1 text-lg text-parchment">
              {balances.membershipUntil
                ? `Active until ${dateFmt(balances.membershipUntil)}`
                : "Not active"}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-mist">
          A reading credit unlocks one detailed reading — open any of your readings and choose “Use
          1 reading credit”. Wallet money can be spent on anything on AstroVidya. It can&apos;t be
          withdrawn or transferred.
        </p>

        {paymentsEnabled ? (
          <div className="space-y-3">
            <h3 className="text-lg text-gold-200">Add money (with a bonus)</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {WALLET_TOPUPS.map((t) => (
                <BuyButton
                  key={t.payInr}
                  order={{ product: "WALLET_TOPUP", payInr: t.payInr }}
                  label={`Pay ${formatInr(t.payInr)} → get ${formatInr(t.creditInr)}`}
                  variant="secondary"
                  size="md"
                />
              ))}
            </div>
          </div>
        ) : null}

        <GiftRedeemForm />
      </Card>

      {paymentsEnabled ? (
        <Card as="section" className="space-y-5" aria-labelledby="buy-title">
          <h2 id="buy-title" className="text-2xl">
            For you and your family
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["FAMILY_PACK", "GIFT_READING", "MEMBERSHIP_YEAR"] as const).map((product) => (
              <div key={product} className="flex flex-col rounded-2xl border border-white/10 p-4">
                <h3 className="text-lg text-gold-200">{PRODUCTS[product].name}</h3>
                <p className="mt-1 flex-1 text-sm text-mist">{PRODUCTS[product].description}</p>
                <p className="mt-3 text-2xl text-parchment">
                  {formatInr(PRODUCTS[product].priceInr)}
                </p>
                <div className="mt-3">
                  <BuyButton
                    order={{ product }}
                    label={product === "GIFT_READING" ? "Buy a gift" : "Buy"}
                    size="md"
                    className="w-full"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-mist-dim">
            The family pack adds {FAMILY_PACK_CREDITS} reading credits. Membership is a one-time
            payment for a year — it does not renew automatically.
          </p>
        </Card>
      ) : null}

      {gifts.length ? (
        <Card as="section" className="space-y-4" aria-labelledby="gifts-title">
          <h2 id="gifts-title" className="text-2xl">
            Your gifts
          </h2>
          <ul className="space-y-4">
            {gifts.map((g) => (
              <li key={g.code} className="space-y-2 rounded-2xl border border-white/10 p-4">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-lg tracking-widest text-parchment">{g.code}</span>
                  <span className="text-sm text-mist">
                    {g.redeemed ? "Redeemed" : `Valid until ${dateFmt(g.expiresAt)}`}
                  </span>
                </p>
                {g.redeemed ? null : (
                  <WhatsAppShare
                    context="gift"
                    label="Send on WhatsApp"
                    text="I've gifted you a detailed palm reading on AstroVidya 🎁 Open this link and redeem it:"
                    url={`${appUrl}/gift/${g.code}`}
                  />
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
