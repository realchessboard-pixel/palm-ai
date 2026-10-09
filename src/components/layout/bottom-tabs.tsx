"use client";

import { msg } from "@/lib/i18n/msg";
import { useT } from "@/components/i18n/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "home" as const, href: "/", label: msg("Home"), d: "M4 13l8-7 8 7M6 11v9h12v-9" },
  {
    key: "rashifal" as const,
    href: "/horoscope",
    label: msg("Rashifal"),
    d: "M12 4v2M12 18v2M4 12h2M18 12h2M6.5 6.5l1.4 1.4M16.1 16.1l1.4 1.4M6.5 17.5l1.4-1.4M16.1 7.9l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  },
  {
    key: "palm" as const,
    href: "/read",
    label: msg("Palm"),
    d: "M9 21v-9l-2-3a1.5 1.5 0 0 1 2.5-1.6L11 9V4.5a1.5 1.5 0 0 1 3 0V10V3.5a1.5 1.5 0 0 1 3 0V10V5a1.5 1.5 0 0 1 3 0v8c0 5-2 8-5 8z",
  },
  {
    key: "kundli" as const,
    href: "/kundli",
    label: msg("Kundli"),
    d: "M4 4h16v16H4zM4 4l16 16M20 4L4 20M12 4l8 8-8 8-8-8z",
  },
  {
    key: "ask" as const,
    href: "/readers",
    label: msg("Ask"),
    d: "M4 5h16v11H10l-4 3v-3H4zM8 9h8M8 12h5",
  },
];

/** App-style tab bar on phones, so every section is one tap away. */
export function BottomTabs({
  labels,
}: {
  labels: Record<"home" | "rashifal" | "palm" | "kundli" | "ask", string>;
}) {
  const tx = useT();
  const path = usePathname();
  return (
    <nav
      aria-label={tx("Sections")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--rule)] bg-[var(--paper-raised)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] ${active ? "text-gold-400" : "text-mist"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={t.d} />
                </svg>
                {labels[t.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
