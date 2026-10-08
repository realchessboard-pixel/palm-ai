import Link from "next/link";
import type { ReactNode } from "react";
import { ReaderPortrait } from "@/components/readers/reader-portrait";
import { PRODUCTS, READER_TIERS, formatInr } from "@/lib/monetization/price";
import { READERS } from "@/lib/readers/catalog";

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 32 32"
    className="size-9 text-gold-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ICONS = {
  palm: (
    <Icon>
      <path d="M11 29V14l-3-4a2 2 0 0 1 3-2l2 3V5a2 2 0 0 1 4 0v8-10a2 2 0 0 1 4 0v10-8a2 2 0 0 1 4 0v12c0 7-3 12-7 12h-7z" />
    </Icon>
  ),
  sun: (
    <Icon>
      <circle cx="16" cy="16" r="5" />
      <path d="M16 3v4M16 25v4M3 16h4M25 16h4M7 7l3 3M22 22l3 3M7 25l3-3M22 10l3-3" />
    </Icon>
  ),
  chart: (
    <Icon>
      <rect x="4" y="4" width="24" height="24" />
      <path d="M4 4l24 24M28 4L4 28M16 4l12 12-12 12L4 16z" />
    </Icon>
  ),
  rings: (
    <Icon>
      <circle cx="12" cy="18" r="7" />
      <circle cx="20" cy="18" r="7" />
      <path d="M14 6l2-3 2 3" />
    </Icon>
  ),
  calendar: (
    <Icon>
      <rect x="4" y="7" width="24" height="21" rx="2" />
      <path d="M4 13h24M10 4v6M22 4v6" />
      <path d="M17 22a3 3 0 1 1-1-5 4 4 0 1 0 1 5z" />
    </Icon>
  ),
  chat: (
    <Icon>
      <path d="M5 6h22v15H13l-6 5v-5H5z" />
      <path d="M10 12h12M10 16h8" />
    </Icon>
  ),
  book: (
    <Icon>
      <path d="M5 6c4-2 8-2 11 1 3-3 7-3 11-1v20c-4-2-8-2-11 1-3-3-7-3-11-1z" />
      <path d="M16 7v20" />
    </Icon>
  ),
  heart: (
    <Icon>
      <path d="M16 27S4 20 4 12a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 8-12 15-12 15z" />
    </Icon>
  ),
  family: (
    <Icon>
      <circle cx="10" cy="9" r="3" />
      <circle cx="22" cy="9" r="3" />
      <circle cx="16" cy="17" r="2.5" />
      <path d="M5 26c0-6 3-10 5-10s5 4 5 10M17 26c0-6 3-10 5-10s5 4 5 10" />
    </Icon>
  ),
  gift: (
    <Icon>
      <rect x="5" y="12" width="22" height="15" />
      <path d="M3 8h26v4H3zM16 8v19M16 8c-3-6-9-4-6 0M16 8c3-6 9-4 6 0" />
    </Icon>
  ),
  star: (
    <Icon>
      <path d="M16 3l3.8 8 8.7 1-6.4 6 1.7 8.6L16 22.4 8.2 26.6 9.9 18 3.5 12l8.7-1z" />
    </Icon>
  ),
};

interface Tile {
  href: string;
  icon: keyof typeof ICONS;
  title: string;
  text: string;
  price: string;
}

const FREE: Tile[] = [
  {
    href: "/read",
    icon: "palm",
    title: "Palm reading",
    text: "Show your right palm — how you think, care and work.",
    price: "Free",
  },
  {
    href: "/horoscope",
    icon: "sun",
    title: "Aaj ka Rashifal",
    text: "Today's horoscope for your Moon sign, in your language.",
    price: "Free",
  },
  {
    href: "/kundli",
    icon: "chart",
    title: "Kundli",
    text: "Your birth chart, planets, nakshatra and dasha.",
    price: "Free",
  },
  {
    href: "/kundli-milan",
    icon: "rings",
    title: "Kundli Milan",
    text: "Guna Milan out of 36, every koota explained.",
    price: "Free",
  },
  {
    href: "/panchang",
    icon: "calendar",
    title: "Aaj ka Panchang",
    text: "Tithi, nakshatra, sunrise and Rahu Kaal for your city.",
    price: "Free",
  },
];

const minQuestion = Math.min(...Object.values(READER_TIERS).map((t) => t.singleInr));

const PREMIUM: Tile[] = [
  {
    href: "/readers",
    icon: "chat",
    title: "Ask a reader",
    text: "Ask about your own palm or chart. First question free.",
    price: `From ${formatInr(minQuestion)}`,
  },
  {
    href: "/read",
    icon: "palm",
    title: "Detailed palm reading",
    text: "Every line, parvat, finger and marking, with a PDF.",
    price: formatInr(PRODUCTS.DETAILED_READING.priceInr),
  },
  {
    href: "/kundli",
    icon: "book",
    title: "Full Kundli reading",
    text: "Your chart read in words: nature, career, relationships, dasha.",
    price: formatInr(PRODUCTS.KUNDLI_REPORT.priceInr),
  },
  {
    href: "/compatibility",
    icon: "heart",
    title: "Couple palm reading",
    text: "Both your palms read together — how you grow as a pair.",
    price: formatInr(PRODUCTS.COUPLE_COMPATIBILITY.priceInr),
  },
  {
    href: "/pricing",
    icon: "family",
    title: "Family pack",
    text: "Four detailed palm readings for the whole family.",
    price: formatInr(PRODUCTS.FAMILY_PACK.priceInr),
  },
  {
    href: "/pricing",
    icon: "gift",
    title: "Gift a reading",
    text: "Send a reading on WhatsApp for a birthday or festival.",
    price: formatInr(PRODUCTS.GIFT_READING.priceInr),
  },
  {
    href: "/pricing",
    icon: "star",
    title: "Membership",
    text: "Every palm and Kundli reading in full for a year.",
    price: `${formatInr(PRODUCTS.MEMBERSHIP_YEAR.priceInr)}/year`,
  },
];

function TileCard({ tile, free }: { tile: Tile; free: boolean }) {
  return (
    <li>
      <Link
        href={tile.href}
        className="paper-card flex h-full flex-col gap-3 p-5 transition-colors hover:border-[var(--color-gold-400)]"
      >
        <div className="flex items-start justify-between gap-3">
          {ICONS[tile.icon]}
          <span
            className={
              free
                ? "tag border-[var(--color-emerald-400)] text-[var(--color-emerald-300)]"
                : "tag border-[var(--color-gold-400)] text-gold-300"
            }
          >
            {tile.price}
          </span>
        </div>
        <span className="text-xl font-semibold">{tile.title}</span>
        <span className="text-sm text-mist">{tile.text}</span>
      </Link>
    </li>
  );
}

/** Everything AstroVidya offers, on the home page: free tools first, then paid services. */
export function Services() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-14 sm:px-6">
      <nav aria-label="Services" className="flex flex-wrap gap-2">
        {[
          ["#free", "Free for everyone"],
          ["#premium", "Go deeper"],
          ["#readers", "Ask a reader"],
          ["/horoscope", "Today's rashifal"],
        ].map(([href, label]) => (
          <Link key={href} href={href!} className="chip px-4">
            {label}
          </Link>
        ))}
      </nav>

      <section id="free" aria-labelledby="free-title" className="scroll-mt-24 space-y-5">
        <div>
          <p className="eyebrow">Free for everyone</p>
          <h2 id="free-title" className="mt-1 text-3xl sm:text-4xl">
            Start here — no payment, no catch
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FREE.map((t) => (
            <TileCard key={t.title} tile={t} free />
          ))}
        </ul>
      </section>

      <section id="premium" aria-labelledby="premium-title" className="scroll-mt-24 space-y-5">
        <div>
          <p className="eyebrow">Go deeper</p>
          <h2 id="premium-title" className="mt-1 text-3xl sm:text-4xl">
            Readings and answers, when you want more
          </h2>
          <p className="mt-2 text-mist">
            One-time payments by UPI, card or netbanking. Nothing renews automatically.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PREMIUM.map((t) => (
            <TileCard key={t.title} tile={t} free={false} />
          ))}
        </ul>
      </section>

      <section
        id="readers"
        aria-labelledby="readers-title"
        className="paper-card scroll-mt-24 p-6 sm:p-8"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="eyebrow">Ask a reader · from {formatInr(minQuestion)}</p>
            <h2 id="readers-title" className="mt-1 text-3xl">
              Got a question about your palm or chart?
            </h2>
            <p className="mt-2 text-mist">
              Eight readers, each with their own style — Vedic, relationships, career, family. They
              read your own reading and reply in your language within a minute. Readers are AI
              characters, clearly labelled.
            </p>
          </div>
          <Link href="/readers" className="btn-primary shrink-0">
            Meet the readers
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap gap-4">
          {READERS.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <ReaderPortrait reader={r} size={44} />
              <span className="text-sm">
                {r.name}
                <span className="block text-xs text-mist">{r.title}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
