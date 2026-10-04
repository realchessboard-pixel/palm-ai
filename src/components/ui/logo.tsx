import Link from "next/link";
import { siteConfig } from "@/lib/config/site";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e0ad" />
          <stop offset="1" stopColor="#d29a3b" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="#110e1b" stroke="url(#logo-g)" strokeWidth="2" />
      <path
        d="M20 40c4-10 10-15 24-17M18 30c8 0 16 4 22 12M30 18c-2 10 0 20 6 28"
        fill="none"
        stroke="url(#logo-g)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="46" cy="18" r="2" fill="#f6e0ad" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 rounded-full"
      aria-label={`${siteConfig.name} home`}
    >
      <LogoMark />
      <span className="font-display text-xl tracking-tight text-parchment">{siteConfig.name}</span>
    </Link>
  );
}
