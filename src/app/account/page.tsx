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

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage() {
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
        <h1 className="text-4xl text-parchment">Your account</h1>
        <p className="mt-2 text-mist">Signed in as {user.email}</p>
      </div>

      <WalletSection
        balances={balances}
        gifts={gifts}
        appUrl={appUrl}
        paymentsEnabled={paymentsEnabled()}
      />

      <Card as="section" className="space-y-4" aria-labelledby="invite-title">
        <h2 id="invite-title" className="text-2xl">
          Invite friends, earn free readings
        </h2>
        <p className="text-sm text-mist">
          For every {REFERRALS_PER_CREDIT} friends who join through your link and read their palm,
          you get one free detailed reading (up to {MAX_REFERRAL_CREDITS_PER_30_DAYS} a month).
        </p>
        <p className="text-sm text-parchment/90">
          {referrals.qualified} joined and read their palm · {referrals.pending} joined, reading
          pending · {referrals.creditsEarned} free reading
          {referrals.creditsEarned === 1 ? "" : "s"} earned
        </p>
        <WhatsAppShare
          context="referral"
          label="Invite on WhatsApp"
          text="I tried PalmAI — a warm palm reading in the Indian tradition, and the main reading is free ✋ Try yours:"
          url={`${appUrl}/?ref=${referrals.code}`}
        />
      </Card>

      <Card as="section" className="space-y-4">
        <h2 className="text-2xl">Privacy preferences</h2>
        <TrainingPreference initial={user.trainingOptIn} />
      </Card>

      <Card as="section" className="space-y-4">
        <h2 className="text-2xl">Delete my data</h2>
        <p className="text-sm text-mist">
          Remove all of your readings, palm photos and analysis results. You can also delete
          individual readings from{" "}
          <Link className="text-gold-300 underline underline-offset-2" href="/readings">
            Your Readings
          </Link>
          .
        </p>
        <DeleteDataButton />
      </Card>

      <Card as="section" className="space-y-4">
        <h2 className="text-2xl">Delete account</h2>
        <p className="text-sm text-mist">
          Permanently deletes your account, readings and photos. Payment records are kept only as
          required for accounting, without your readings.
        </p>
        <DeleteAccountForm />
      </Card>

      <LogoutButton />
    </div>
  );
}
