import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/i18n/i18n";
import { ButtonLink } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/msg";
import { PRODUCTS, formatInr } from "@/lib/monetization/price";

/**
 * Landing page for social traffic (Instagram / Facebook Reels, link in bio):
 * one clear free action first, the other free tools next, paid options last.
 * Use /start?lang=hi (or ta, bn, …) so visitors skip the language picker.
 */
export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Free palm reading, Kundli and Rashifal"),
    description: tx(
      "Show us your right palm and get a warm reading from traditional Indian palmistry — free. Plus free Kundli, Kundli Milan, Panchang and daily Rashifal in your language.",
    ),
    alternates: { canonical: "/start" },
    // A campaign page: the home page is the one to rank.
    robots: { index: false, follow: true },
  };
}

const TOOLS = [
  {
    href: "/read",
    icon: "✋",
    title: msg("Palm reading"),
    text: msg("A photo of your right palm — read the traditional way."),
  },
  {
    href: "/kundli",
    icon: "✦",
    title: msg("Free Kundli"),
    text: msg("Your birth chart, Moon sign, nakshatra and dasha."),
  },
  {
    href: "/kundli-milan",
    icon: "❤",
    title: msg("Kundli Milan"),
    text: msg("Guna Milan out of 36 for a marriage match."),
  },
  {
    href: "/horoscope",
    icon: "☀",
    title: msg("Today's Rashifal"),
    text: msg("Your Moon sign's day, in your language."),
  },
];

const STEPS = [
  msg("Take or upload a photo of your right palm."),
  msg("We look at your lines and mounts."),
  msg("Read your free palm reading in a minute."),
];

const DEEPER = [
  {
    name: PRODUCTS.DETAILED_READING.name,
    price: PRODUCTS.DETAILED_READING.priceInr,
    href: "/read",
  },
  {
    name: PRODUCTS.RASHIFAL_REPORT.name,
    price: PRODUCTS.RASHIFAL_REPORT.priceInr,
    href: "/rashifal-report",
  },
  {
    name: PRODUCTS.MILAN_REPORT.name,
    price: PRODUCTS.MILAN_REPORT.priceInr,
    href: "/kundli-milan",
  },
  {
    name: PRODUCTS.KUNDLI_REPORT.name,
    price: PRODUCTS.KUNDLI_REPORT.priceInr,
    href: "/mahakundli",
  },
];

const TRUST = [
  msg("Your photo stays private, and you can delete it any time."),
  msg("No fear, no doshas, no remedies to buy."),
  msg("Readings are for reflection and enjoyment — not predictions."),
];

export default function StartPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-14 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <section className="rounded-[1.75rem] bg-[#2a1e17] px-6 py-10 text-center text-[#f7efe2] sm:px-12 sm:py-14">
        <p className="text-sm font-semibold text-[#f0c27b]">
          <T s="Free · in your language · no sign-up" />
        </p>
        <h1 className="mx-auto mt-4 max-w-2xl text-4xl leading-tight text-[#f7efe2] sm:text-5xl">
          <T s="Is your story written in your palm?" />
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#f7efe2]/80">
          <T s="Show us your right palm in a photo and get a warm reading from traditional Indian palmistry — free." />
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/read"
            className="inline-flex min-h-14 items-center rounded-full bg-[#f0c27b] px-9 text-lg font-semibold text-[#2a1e17] hover:bg-[#f5d39c]"
          >
            <T s="✋ Read my palm free" />
          </Link>
          <p className="text-sm text-[#f7efe2]/65">
            <T s="Takes about a minute. Your photo stays private." />
          </p>
        </div>
      </section>

      <section aria-labelledby="free-tools" className="space-y-5">
        <h2 id="free-tools" className="text-center text-3xl">
          <T s="Everything here is free to start" />
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="paper-card flex h-full items-start gap-4 p-5 transition-colors hover:border-[var(--color-gold-400)]"
              >
                <span aria-hidden="true" className="text-3xl text-gold-400">
                  {tool.icon}
                </span>
                <span>
                  <span className="block text-xl font-semibold">
                    <T s={tool.title} />
                  </span>
                  <span className="mt-1 block text-sm text-mist">
                    <T s={tool.text} />
                  </span>
                  <span className="mt-2 inline-block text-xs font-semibold tracking-wide text-[var(--color-emerald-300)] uppercase">
                    <T s="Free" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="space-y-5">
        <h2 id="how" className="text-center text-3xl">
          <T s="How it works" />
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step} className="paper-card p-5">
              <span className="text-3xl text-gold-400">{i + 1}</span>
              <p className="mt-2">
                <T s={step} />
              </p>
            </li>
          ))}
        </ol>
        <div className="text-center">
          <ButtonLink href="/read" size="lg">
            <T s="Start my free palm reading" />
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="deeper" className="paper-card space-y-4 p-6 sm:p-8">
        <h2 id="deeper" className="text-2xl">
          <T s="Want to go deeper? Only if you wish." />
        </h2>
        <p className="text-sm text-mist">
          <T s="After your free reading you can open a detailed one. One-time price, GST included — no subscription." />
        </p>
        <ul className="divide-y divide-[var(--rule)]">
          {DEEPER.map((item) => (
            <li key={item.href + item.name}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-4 py-3 hover:text-gold-300"
              >
                <span>
                  <T s={item.name} />
                </span>
                <span className="font-semibold whitespace-nowrap">{formatInr(item.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="trust" className="space-y-4">
        <h2 id="trust" className="text-center text-2xl">
          <T s="Our promise to you" />
        </h2>
        <ul className="mx-auto grid max-w-2xl gap-2">
          {TRUST.map((point) => (
            <li key={point} className="flex gap-3">
              <span aria-hidden="true" className="text-gold-400">
                ✓
              </span>
              <span>
                <T s={point} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[1.75rem] bg-[#2a1e17] px-6 py-10 text-center text-[#f7efe2]">
        <h2 className="text-3xl text-[#f7efe2]">
          <T s="Your palm, read today" />
        </h2>
        <Link
          href="/read"
          className="mt-6 inline-flex min-h-14 items-center rounded-full bg-[#f0c27b] px-9 text-lg font-semibold text-[#2a1e17] hover:bg-[#f5d39c]"
        >
          <T s="✋ Read my palm free" />
        </Link>
      </section>

      <Disclaimer compact className="mx-auto max-w-xl" />
    </div>
  );
}
