import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { siteConfig } from "@/lib/config/site";

export function SiteFooter() {
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
            Palm reading, Kundli and rashifal in the Indian tradition, written with the help of AI.{" "}
            {siteConfig.disclaimer}
          </p>
        </div>
        <nav aria-label="Product">
          <h2 className="font-sans text-sm font-semibold text-parchment">Product</h2>
          <ul className="mt-3 space-y-2 text-sm text-mist">
            <li>
              <Link className="hover:text-parchment" href="/read">
                Palm reading
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/horoscope">
                Aaj ka Rashifal
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/kundli">
                Free Kundli
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/kundli-milan">
                Kundli Milan
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/panchang">
                Panchang
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/readers">
                Ask a reader
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/compatibility">
                Couple reading
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/pricing">
                Pricing
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/readings">
                Your readings
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="font-sans text-sm font-semibold text-parchment">Trust</h2>
          <ul className="mt-3 space-y-2 text-sm text-mist">
            <li>
              <Link className="hover:text-parchment" href="/privacy">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/terms">
                Terms of use
              </Link>
            </li>
            <li>
              <Link className="hover:text-parchment" href="/account">
                Delete my data
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/5 px-4 py-6 text-center text-xs text-mist-dim">
        © {year} {siteConfig.name}. For entertainment and personal reflection only.
      </div>
    </footer>
  );
}
