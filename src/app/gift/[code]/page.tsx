import type { Metadata } from "next";
import { GiftRedeemForm } from "@/components/account/gift-redeem";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/actor";

export const metadata: Metadata = {
  title: "A palm reading for you",
  description: "Someone has gifted you a detailed palm reading on PalmAI.",
  robots: { index: false, follow: false },
};

const CODE = /^[A-Z0-9]{5}-[A-Z0-9]{5}$/;

export default async function GiftPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).toUpperCase();
  const valid = CODE.test(code);
  const user = await getCurrentUser();
  const next = `/gift/${valid ? code : ""}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
          A gift for you
        </p>
        <h1 className="text-4xl text-parchment">Someone wants you to read your palm</h1>
        <p className="text-mist">
          You&apos;ve been gifted a detailed palm reading — the full reading of your right palm in
          the tradition of Hasta Samudrika Shastra, with every line, parvat and a PDF to keep.
        </p>
      </header>
      <Card as="section" className="space-y-5">
        {user ? (
          <>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-mist">
              <li>Redeem the code below — it adds one reading credit to your account.</li>
              <li>Take your free reading, then choose “Use 1 reading credit” to unlock it.</li>
            </ol>
            <GiftRedeemForm initialCode={valid ? code : ""} />
            <ButtonLink href="/read" variant="secondary">
              Read my palm
            </ButtonLink>
          </>
        ) : (
          <>
            <p className="text-parchment/90">
              Create a free account (or sign in) to keep your gift — it takes a few seconds.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={`/signup?next=${encodeURIComponent(next)}`}>
                Create free account
              </ButtonLink>
              <ButtonLink href={`/login?next=${encodeURIComponent(next)}`} variant="secondary">
                Sign in
              </ButtonLink>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
