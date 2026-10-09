import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/account/auth-form";
import { AuthShell } from "@/components/account/auth-shell";
import { getCurrentUser } from "@/lib/auth/actor";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return { title: tx("Sign in"), robots: { index: false } };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const tx = await getT();
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/readings");
  return (
    <AuthShell title={tx("Welcome back")} subtitle={tx("Sign in to see your saved palm readings.")}>
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
