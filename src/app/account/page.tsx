import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DeleteAccountForm,
  DeleteDataButton,
  LogoutButton,
  TrainingPreference,
} from "@/components/account/account-settings";
import { WalletSection } from "@/components/account/wallet-section";
import { Card } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { WhatsAppShare } from "@/components/share/whatsapp-share";
import {
  MAX_REFERRAL_CREDITS_PER_30_DAYS,
  REFERRALS_PER_CREDIT,
  getReferralSummary,
} from "@/lib/growth/referrals";
import { getAccountBalances, listGiftsBought } from "@/lib/monetization/account";
import { paymentsEnabled } from "@/lib/payments/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return { title: tx("Your account"), robots: { index: false } };
}

export default async function AccountPage() {
  const tx = await getT();
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const [balances, gifts, referrals] = await Promise.all([
    getAccountBalances(user.id),
    listGiftsBought(user.id),
    getReferralSummary(user.id),
  ]);
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <div>
        <h1 className="text-4xl text-parchment">
          <T s="Your account" />
        </h1>
        <p className="mt-2 text-mist">
          <T s="Signed in as {0}" v={[user.email]} />
        </p>
      </div>

      <WalletSection
        balances={balances}
        gifts={gifts}
        appUrl={appUrl}
        paymentsEnabled={paymentsEnabled()}
      />

      <Card as="section" className="space-y-4" aria-labelledby="invite-title">
        <h2 id="invite-title" className="text-2xl">
          <T s="Invite friends, earn free readings" />
        </h2>
        <p className="text-sm text-mist">
          <T
            s="For every {0} friends who join through your link and read their palm, you get one free detailed reading (up to {1} a month)."
            v={[REFERRALS_PER_CREDIT, MAX_REFERRAL_CREDITS_PER_30_DAYS]}
          />
        </p>
        <p className="text-sm text-parchment/90">
          <T
            s={
              referrals.creditsEarned === 1
                ? "{0} joined and read their palm · {1} joined, reading pending · 1 free reading earned"
                : "{0} joined and read their palm · {1} joined, reading pending · {2} free readings earned"
            }
            v={[referrals.qualified, referrals.pending, referrals.creditsEarned]}
          />
        </p>
        <WhatsAppShare
          context="referral"
          label={tx("Invite on WhatsApp")}
          text={tx(
            "I tried AstroVidya — a warm palm reading in the Indian tradition, and the main reading is free ✋ Try yours:",
          )}
          url={`${appUrl}/?ref=${referrals.code}`}
        />
      </Card>

      <Card as="section" className="space-y-4">
        <h2 className="text-2xl">
          <T s="Privacy preferences" />
        </h2>
        <TrainingPreference initial={user.trainingOptIn} />
      </Card>

      <Card as="section" className="space-y-4">
        <h2 className="text-2xl">
          <T s="Delete my data" />
        </h2>
        <p className="text-sm text-mist">
          <T
            s="Remove all of your readings, palm photos and analysis results. You can also delete individual readings from {0}."
            v={[
              <Link key={0} className="text-gold-300 underline underline-offset-2" href="/readings">
                <T s="Your Readings" />
              </Link>,
            ]}
          />
        </p>
        <DeleteDataButton />
      </Card>

      <Card as="section" className="space-y-4">
        <h2 className="text-2xl">
          <T s="Delete account" />
        </h2>
        <p className="text-sm text-mist">
          <T s="Permanently deletes your account, readings and photos. Payment records are kept only as required for accounting, without your readings." />
        </p>
        <DeleteAccountForm />
      </Card>

      <LogoutButton />
    </div>
  );
}
