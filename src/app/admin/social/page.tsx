import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyButton } from "@/components/admin/copy-button";
import { RASHIS, SIGN_SLUGS } from "@/lib/astro/constants";
import { getCurrentUser } from "@/lib/auth/actor";
import { siteConfig } from "@/lib/config/site";
import { SEO_LANGUAGES, SIGN_NAMES, isSeoLanguage, seoTitle } from "@/lib/horoscope/seo";
import { getHoroscope, todayIst } from "@/lib/horoscope/service";
import { LANGUAGES } from "@/lib/i18n/languages";

export const metadata: Metadata = {
  title: "Social posts",
  robots: { index: false, follow: false },
};

/**
 * Today's ready-to-post text for YouTube Shorts / Instagram Reels / WhatsApp
 * Status: one post per sign. Read it aloud over a simple background and paste
 * the caption. Admin only.
 */
export default async function SocialKit({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/social");
  if (!user.isAdmin) notFound();
  const { lang: raw } = await searchParams;
  const lang = raw && isSeoLanguage(raw) ? raw : "hi";
  const today = todayIst();
  const posts = await Promise.all(
    RASHIS.map(async (r, i) => {
      const h = await getHoroscope(i, lang, today);
      const link = `${siteConfig.url}/rashifal/${lang}/${SIGN_SLUGS[i]}`;
      const script = `${seoTitle(lang, i)} — ${today}\n\n${h.title}\n\n${h.text}\n\n❤ ${h.love}\n💼 ${h.work}\n✨ ${h.tip}`;
      const caption = `${seoTitle(lang, i)} ${today} ✨\n${h.title}\nFull rashifal + free Kundli: ${link}\n#rashifal #${r.name.toLowerCase()} #${r.english.toLowerCase()} #horoscope #astrology #jyotish #${SIGN_NAMES[lang][i]!.replace(/\s/g, "")}`;
      return { i, script, caption };
    }),
  );
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 pt-10 pb-20 sm:px-6">
      <header className="space-y-3">
        <Link href="/admin" className="text-sm underline">
          ← Admin
        </Link>
        <h1 className="text-4xl">Today&apos;s social posts</h1>
        <p className="text-mist">
          One post per sign for YouTube Shorts, Instagram Reels and WhatsApp Status. Record the
          “script” as a 30–45s voice-over on a simple background, then paste the caption. Same time
          every day works best.
        </p>
        <nav aria-label="Language" className="flex flex-wrap gap-2 text-sm">
          {SEO_LANGUAGES.map((code) => (
            <Link
              key={code}
              href={`/admin/social?lang=${code}`}
              aria-current={code === lang ? "page" : undefined}
              className={`rounded-full border px-3 py-1 ${code === lang ? "bg-[#2a1e17] text-[#f7efe2]" : "border-[var(--rule)]"}`}
            >
              {LANGUAGES.find((l) => l.code === code)!.label}
            </Link>
          ))}
        </nav>
      </header>
      {posts.map((p) => (
        <section key={p.i} lang={lang} className="paper-card space-y-4 p-5">
          <h2 className="text-2xl">{seoTitle(lang, p.i)}</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Script</h3>
              <CopyButton text={p.script} />
            </div>
            <pre className="text-sm whitespace-pre-wrap">{p.script}</pre>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Caption</h3>
              <CopyButton text={p.caption} />
            </div>
            <pre className="text-sm whitespace-pre-wrap">{p.caption}</pre>
          </div>
        </section>
      ))}
    </div>
  );
}
