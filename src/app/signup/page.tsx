import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/account/auth-form";
import { AuthShell } from "@/components/account/auth-shell";
import { getCurrentUser } from "@/lib/auth/actor";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/readings");
  return (
    <AuthShell
      title="Save your readings"
      subtitle="Create a free account to keep your palm readings in one private place. Readings from this browser are added automatically."
    >
      <AuthForm mode="signup" next={next} />
    </AuthShell>
  );
}
