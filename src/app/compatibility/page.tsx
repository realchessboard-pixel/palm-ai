import { getLanguage } from "@/lib/i18n/server";
import { localeFor } from "@/lib/i18n/languages";
import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/actor";
import { PRODUCTS, formatInr } from "@/lib/monetization/price";
import { listReadingsForUser } from "@/lib/readings/service";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Couple palm reading"),
    description: tx(
      "Read your right palm and your partner's side by side — how you think, care and grow as a pair, in the tradition of Hasta Samudrika Shastra.",
    ),
  };
}

export default async function CompatibilityLandingPage() {
  const tx = await getT();
  const locale = localeFor(await getLanguage());
  const user = await getCurrentUser();
  const readings = user
    ? (await listReadingsForUser(user.id)).filter((r) => r.status === "COMPLETE").slice(0, 10)
    : [];
  const price = formatInr(PRODUCTS.COUPLE_COMPATIBILITY.priceInr);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
          <T s="Couple reading · {0}" v={[price]} />
        </p>
        <h1 className="text-4xl text-parchment sm:text-5xl">
          <T s="Two palms, read together" />
        </h1>
        <p className="text-mist">
          <T s="Your right palm and your partner's, read side by side by a traditional Indian palm reader: how the two of you think, care for each other, share the everyday and grow as a pair. Warm and reflective — never a score, never kundli matching, never predictions." />
        </p>
      </header>

      <Card as="section" className="space-y-4">
        <h2 className="text-2xl">
          <T s="How it works" />
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-parchment/90">
          <li>
            <T s="Take your own free palm reading." />
          </li>
          <li>
            <T s="On your reading, tap “Read as a couple” and show your partner's right palm." />
          </li>
          <li>
            <T s="Unlock your couple reading for {0}." v={[price]} />
          </li>
        </ol>
        <p className="text-sm text-mist">
          <T s="Only read your partner's palm with their agreement. Their photo is used for this couple reading only, is never used for training, and can be deleted at any time." />
        </p>
      </Card>

      {readings.length ? (
        <Card as="section" className="space-y-4">
          <h2 className="text-2xl">
            <T s="Choose your reading" />
          </h2>
          <ul className="space-y-3">
            {readings.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4"
              >
                <span className="text-parchment/90">
                  {r.headline ?? tx("Your palm reading")}
                  <span className="block text-xs text-mist">
                    {new Date(r.createdAt).toLocaleDateString(locale, { dateStyle: "medium" })}
                  </span>
                </span>
                <ButtonLink href={`/compatibility/new?reading=${r.id}`} size="sm">
                  <T s="Read as a couple" />
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/read" size="lg">
            <T s="Start with my free reading" />
          </ButtonLink>
          {user ? null : (
            <ButtonLink href="/login?next=/compatibility" variant="secondary" size="lg">
              <T s="I already have a reading" />
            </ButtonLink>
          )}
        </div>
      )}

      <p className="text-xs text-mist-dim">
        <T
          s="For entertainment and reflection only. See our {0}."
          v={[
            <Link key={0} href="/terms" className="underline underline-offset-2">
              <T s="terms" />
            </Link>,
          ]}
        />
      </p>
    </div>
  );
}
