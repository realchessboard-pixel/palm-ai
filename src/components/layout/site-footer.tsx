import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { siteConfig } from "@/lib/config/site";

export async function SiteFooter() {
  const tx = await getT();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/5 bg-night-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-xl">{siteConfig.name}</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist">
            <T
              s="Mahakundli, palm reading, Kundli and rashifal in the Indian tradition. {0}"
              v={[tx(siteConfig.disclaimer)]}
            />
          </p>
        </div>
        <nav aria-label={tx("Product")}>
          <h2 className="font-sans text-sm font-semibold text-parchment">
            <T s="Product" />
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-mist">
            <li>
              <Link className="hover:text-parchment" href="/read">
                <T s="Palm reading" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/horoscope">
                <T s="Aaj ka Rashifal" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/kundli">
                <T s="Free Kundli" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/kundli-milan">
                <T s="Kundli Milan" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/panchang">
                <T s="Panchang" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/readers">
                <T s="Ask a reader" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/compatibility">
                <T s="Couple reading" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/pricing">
                <T s="Pricing" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/readings">
                <T s="Your readings" />
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={tx("Legal")}>
          <h2 className="font-sans text-sm font-semibold text-parchment">
            <T s="Trust" />
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-mist">
            <li>
              <Link className="hover:text-parchment" href="/how-readings-work">
                <T s="How readings are made" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/privacy">
                <T s="Privacy policy" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/terms">
                <T s="Terms of use" />
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/account">
                <T s="Delete my data" />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/5 px-4 py-6 text-center text-xs text-mist-dim">
        <T
          s="© {0} {1}. For entertainment and personal reflection only."
          v={[year, siteConfig.name]}
        />
      </div>
    </footer>
  );
}
