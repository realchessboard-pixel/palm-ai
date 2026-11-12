import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { T } from "@/components/i18n/i18n";
import { Disclaimer } from "@/components/ui/disclaimer";
import { getT } from "@/lib/i18n/server";
import { msg } from "@/lib/i18n/msg";
import { PRODUCTS, formatInr } from "@/lib/monetization/price";
import kundliImg from "../../../public/images/landing/kundli.webp";
import milanImg from "../../../public/images/landing/milan.webp";
import palmImg from "../../../public/images/landing/palm.webp";
import phoneImg from "../../../public/images/landing/phone.webp";
import starsImg from "../../../public/images/landing/stars.webp";

/**
 * Landing page for social traffic (Instagram / Facebook Reels, link in bio):
 * one clear free action first, the other free tools next, paid options last.
 * The artwork is the same as Reel #1, so the ad and the page feel like one.
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

const TOOLS: { href: string; image: StaticImageData; title: string; text: string }[] = [
  {
    href: "/read",
    image: palmImg,
    title: msg("Palm reading"),
    text: msg("A photo of your right palm — read the traditional way."),
  },
  {
    href: "/kundli",
    image: kundliImg,
    title: msg("Free Kundli"),
    text: msg("Your birth chart, Moon sign, nakshatra and dasha."),
  },
  {
    href: "/kundli-milan",
    image: milanImg,
    title: msg("Kundli Milan"),
    text: msg("Guna Milan out of 36 for a marriage match."),
  },
  {
    href: "/horoscope",
    image: starsImg,
    title: msg("Today's Rashifal"),
    text: msg("Your Moon sign's day, in your language."),
  },
];

const STEPS = [
  { icon: "📷", text: msg("Take or upload a photo of your right palm.") },
  { icon: "✋", text: msg("We look at your lines and mounts.") },
  { icon: "📜", text: msg("Read your free palm reading in a minute.") },
];

const DEEPER = [
  { product: PRODUCTS.DETAILED_READING, href: "/read" },
  { product: PRODUCTS.RASHIFAL_REPORT, href: "/rashifal-report" },
  { product: PRODUCTS.MILAN_REPORT, href: "/kundli-milan" },
  { product: PRODUCTS.KUNDLI_REPORT, href: "/mahakundli" },
];

const TRUST = [
  { icon: "🔒", text: msg("Your photo stays private, and you can delete it any time.") },
  { icon: "🕊", text: msg("No fear, no doshas, no remedies to buy.") },
  { icon: "🌿", text: msg("Readings are for reflection and enjoyment — not predictions.") },
];

const CHIPS = [msg("First reading free"), msg("19 languages"), msg("No sign-up"), msg("Private")];

const goldButton =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f0c27b] px-9 text-lg font-semibold text-[#2a1e17] shadow-[0_10px_30px_-10px_rgba(240,194,123,0.7)] transition hover:bg-[#f5d39c] active:scale-[0.98]";

export default function StartPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 pt-6 pb-20 sm:px-6 sm:pt-10">
      {/* Hero: the Reel's glowing palm, text over a warm gradient. */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#2a1e17] text-[#f7efe2] shadow-2xl">
        {/* Phones: the palm as its own picture above the text, framed on the lines. */}
        <div className="relative aspect-[4/3] sm:hidden">
          <Image
            src={palmImg}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[48%_55%]"
            loading="eager"
            fetchPriority="high"
            placeholder="blur"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#2a1e17] to-transparent"
          />
        </div>
        {/* Larger screens: the picture fills the card, text on the left. */}
        <Image
          src={palmImg}
          alt=""
          fill
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="-z-10 hidden object-cover object-right sm:block"
          placeholder="blur"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-[#1d140f] via-[#1d140f]/85 to-transparent sm:block"
        />
        <div className="flex flex-col px-6 pt-2 pb-10 sm:min-h-[30rem] sm:max-w-[34rem] sm:justify-center sm:px-12 sm:pt-12">
          <p className="text-sm font-semibold text-[#f0c27b]">
            <T s="First reading free · in your language · no sign-up" />
          </p>
          <h1 className="mt-3 text-4xl leading-tight text-[#f7efe2] sm:text-5xl">
            <T s="Is your story written in your palm?" />
          </h1>
          <p className="mt-4 text-lg text-[#f7efe2]/85">
            <T s="Show us your right palm in a photo and get a warm reading from traditional Indian palmistry — free." />
          </p>
          <div className="mt-7 flex flex-col items-start gap-3">
            <Link href="/read" className={goldButton}>
              <T s="✋ Read my palm free" />
            </Link>
            <p className="text-sm text-[#f7efe2]/70">
              <T s="Takes about a minute. Your photo stays private." />
            </p>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="AstroVidya">
            {CHIPS.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-[#f0c27b]/40 bg-[#f0c27b]/10 px-3 py-1 text-sm text-[#f7efe2]"
              >
                ✓ <T s={chip} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Free tools, each with its own picture. */}
      <section aria-labelledby="free-tools" className="space-y-6">
        <div className="text-center">
          <p className="eyebrow">
            <T s="Free" />
          </p>
          <h2 id="free-tools" className="mt-1 text-3xl sm:text-4xl">
            <T s="Your first reading is on us" />
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="group paper-card block h-full overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-[var(--color-gold-400)] hover:shadow-lg"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={tool.image}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 480px, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                    placeholder="blur"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-[#1d140f]/75 px-3 py-1 text-xs font-semibold text-[#f0c27b] backdrop-blur">
                    <T s="Free" />
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 p-5">
                  <span>
                    <span className="block text-xl font-semibold">
                      <T s={tool.title} />
                    </span>
                    <span className="mt-1 block text-sm text-mist">
                      <T s={tool.text} />
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-1 text-xl text-gold-400 transition group-hover:translate-x-1"
                  >
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works, next to the phone picture. */}
      <section
        aria-labelledby="how"
        className="paper-card grid items-center gap-8 overflow-hidden p-0 md:grid-cols-2"
      >
        <div className="relative aspect-[16/10] md:aspect-auto md:h-full md:min-h-[24rem]">
          <Image
            src={phoneImg}
            alt=""
            fill
            sizes="(min-width: 768px) 512px, 100vw"
            className="object-cover"
            placeholder="blur"
          />
        </div>
        <div className="space-y-6 px-6 pb-8 md:py-10 md:pr-10 md:pl-0">
          <h2 id="how" className="text-3xl">
            <T s="How it works" />
          </h2>
          <ol className="space-y-5">
            {STEPS.map((step, i) => (
              <li key={step.text} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#2a1e17] text-lg font-semibold text-[#f0c27b]">
                  {i + 1}
                </span>
                <p className="pt-2">
                  <span aria-hidden="true">{step.icon} </span>
                  <T s={step.text} />
                </p>
              </li>
            ))}
          </ol>
          <Link href="/read" className={goldButton}>
            <T s="Start my free palm reading" />
          </Link>
        </div>
      </section>

      {/* Paid options: clearly optional, prices GST-inclusive. */}
      <section aria-labelledby="deeper" className="space-y-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="deeper" className="text-3xl">
            <T s="Want to go deeper? Only if you wish." />
          </h2>
          <p className="mt-2 text-mist">
            <T s="After your free reading you can open a detailed one. One-time price, GST included — no subscription." />
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEEPER.map(({ product, href }) => (
            <li key={product.name}>
              <Link
                href={href}
                className="paper-card flex h-full flex-col justify-between gap-4 p-5 transition hover:border-[var(--color-gold-400)]"
              >
                <span className="font-semibold">
                  <T s={product.name} />
                </span>
                <span>
                  <span className="block text-3xl text-gold-400">
                    {formatInr(product.priceInr)}
                  </span>
                  <span className="text-xs text-mist">
                    <T s="incl. GST" /> · <T s="one-time" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Our promise. */}
      <section aria-labelledby="trust" className="space-y-6">
        <h2 id="trust" className="text-center text-3xl">
          <T s="Our promise to you" />
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {TRUST.map((point) => (
            <li key={point.text} className="paper-card flex flex-col gap-3 p-5 text-center">
              <span aria-hidden="true" className="text-3xl">
                {point.icon}
              </span>
              <span>
                <T s={point.text} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Closing call to action over the Reel's starry zodiac card. */}
      <section className="relative isolate overflow-hidden rounded-[2rem] px-6 py-16 text-center text-[#f7efe2] shadow-2xl">
        <Image
          src={starsImg}
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover"
          placeholder="blur"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[#1d140f]/55" />
        <h2 className="text-3xl text-[#f7efe2] sm:text-4xl">
          <T s="Your palm, read today" />
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[#f7efe2]/85">
          <T s="Takes about a minute. Your photo stays private." />
        </p>
        <Link href="/read" className={`${goldButton} mt-7`}>
          <T s="✋ Read my palm free" />
        </Link>
      </section>

      <Disclaimer compact className="mx-auto max-w-xl" />
    </div>
  );
}
