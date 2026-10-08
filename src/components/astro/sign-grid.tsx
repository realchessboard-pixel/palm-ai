import Link from "next/link";
import { RASHIS, SIGN_SLUGS } from "@/lib/astro/constants";

/** The 12 Moon signs, linking to today's horoscope. */
export function SignGrid() {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {RASHIS.map((r, i) => (
        <li key={r.name}>
          <Link
            href={`/horoscope/${SIGN_SLUGS[i]}`}
            className="paper-card block p-4 text-center transition-colors hover:border-[var(--color-gold-400)]"
          >
            <span className="block text-2xl" lang="hi">
              {r.hindi}
            </span>
            <span className="block font-medium">{r.name}</span>
            <span className="block text-xs text-mist">{r.english}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
