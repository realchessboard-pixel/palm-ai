import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { LANGUAGES } from "@/lib/i18n/languages";
import { SEO_LANGUAGES, type SeoLanguage } from "@/lib/horoscope/seo";

/** Plain links to the same page in every language (crawlable, unlike a dropdown). */
export async function SeoLanguageLinks({ current, path }: { current?: SeoLanguage; path: string }) {
  const tx = await getT(current);
  return (
    <nav aria-label={tx("Language")} className="flex max-w-md flex-wrap gap-2 text-sm">
      {SEO_LANGUAGES.map((code) => {
        const label = LANGUAGES.find((l) => l.code === code)!.label;
        return code === current ? (
          <span
            key={code}
            aria-current="page"
            className="rounded-full bg-[#2a1e17] px-3 py-1 text-[#f7efe2]"
          >
            {label}
          </span>
        ) : (
          <Link
            key={code}
            href={`/rashifal/${code}${path}`}
            lang={code}
            hrefLang={code}
            className="rounded-full border border-[var(--rule)] px-3 py-1"
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
