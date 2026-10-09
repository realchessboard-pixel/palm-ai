import { msg } from "@/lib/i18n/msg";
import { T } from "@/components/i18n/i18n";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import type { Language } from "@/lib/i18n/languages";
import { t } from "@/lib/i18n/ui";
import { LanguageMenu } from "./language-picker";
import { MobileMenu } from "./mobile-menu";

export interface HeaderUser {
  email: string;
  isAdmin: boolean;
}

export async function SiteHeader({ user, lang }: { user: HeaderUser | null; lang: Language }) {
  const tx = await getT();
  const links = [
    { href: "/horoscope", label: t(lang, "nav.rashifal") },
    { href: "/kundli", label: t(lang, "nav.kundli") },
    { href: "/kundli-milan", label: t(lang, "nav.milan") },
    { href: "/panchang", label: t(lang, "nav.panchang") },
    { href: "/readers", label: t(lang, "nav.ask") },
    { href: "/pricing", label: t(lang, "nav.pricing") },
    { href: "/how-readings-work", label: t(lang, "nav.about") },
    ...(user ? [{ href: "/readings", label: t(lang, "nav.readings") }] : []),
    ...(user?.isAdmin ? [{ href: "/admin", label: msg("Admin") }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-night-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <LanguageMenu current={lang} label={t(lang, "nav.language")} />
        </div>
        <nav aria-label={tx("Main")} className="hidden items-center gap-1 md:flex">
          {links
            .filter((l) => l.href !== "/panchang" && l.href !== "/how-readings-work")
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm text-mist transition-colors hover:text-parchment"
              >
                <T s={link.label} />
              </Link>
            ))}
          {user ? (
            <Link
              href="/account"
              className="rounded-full px-4 py-2 text-sm text-mist transition-colors hover:text-parchment"
            >
              {t(lang, "nav.account")}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm text-mist transition-colors hover:text-parchment"
            >
              {t(lang, "nav.signin")}
            </Link>
          )}
          <ButtonLink href="/read" size="sm" className="ml-2">
            {t(lang, "nav.readPalm")}
          </ButtonLink>
        </nav>
        <MobileMenu
          links={[
            ...links,
            user
              ? { href: "/account", label: t(lang, "nav.account") }
              : { href: "/login", label: t(lang, "nav.signin") },
          ]}
        />
      </div>
    </header>
  );
}
