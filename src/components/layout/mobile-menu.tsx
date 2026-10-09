"use client";

import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";

export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const tx = useT();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const pathname = usePathname();

  // Close the menu after navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full text-parchment hover:bg-white/5"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? tx("Close menu") : tx("Open menu")}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
          {open ? (
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
      {open ? (
        <div
          id={menuId}
          className="absolute inset-x-0 top-16 border-b border-white/10 bg-night-900/95 px-4 pt-2 pb-6 backdrop-blur-xl"
        >
          <nav aria-label={tx("Mobile")} className="flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-xl px-3 text-base text-parchment hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            <ButtonLink href="/read" className="mt-3 w-full" onClick={() => setOpen(false)}>
              <T s="Read My Palm" />
            </ButtonLink>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
