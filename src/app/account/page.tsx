import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DeleteAccountForm,
  DeleteDataButton,
  LogoutButton,
  TrainingPreference,
} from "@/components/account/account-settings";
import { Card } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/actor";

export const metadata: Metadata = { title: "Account & privacy", robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <div>
        <h1 className="text-4xl text-parchment">Account &amp; privacy</h1>
        <p className="mt-2 text-mist">Signed in as {user.email}</p>
      </div>

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
