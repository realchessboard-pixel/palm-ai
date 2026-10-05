import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { MobileMenu } from "./mobile-menu";

export interface HeaderUser {
  email: string;
  isAdmin: boolean;
}

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const links = [
    { href: "/#how-it-works", label: "How it works" },
    { href: "/readers", label: "Ask a reader" },
    { href: "/compatibility", label: "Couples" },
    { href: "/pricing", label: "Pricing" },
    ...(user ? [{ href: "/readings", label: "Your readings" }] : []),
    ...(user?.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-night-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm text-mist transition-colors hover:text-parchment"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <Link
              href="/account"
              className="rounded-full px-4 py-2 text-sm text-mist transition-colors hover:text-parchment"
            >
              Account
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm text-mist transition-colors hover:text-parchment"
            >
              Sign in
            </Link>
          )}
          <ButtonLink href="/read" size="sm" className="ml-2">
            Read My Palm
          </ButtonLink>
        </nav>
        <MobileMenu
          links={[
            ...links,
            user ? { href: "/account", label: "Account" } : { href: "/login", label: "Sign in" },
          ]}
        />
      </div>
    </header>
  );
}
