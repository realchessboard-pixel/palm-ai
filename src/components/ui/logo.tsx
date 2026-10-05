import Link from "next/link";
import { siteConfig } from "@/lib/config/site";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#b8471f" />
      <circle
        cx="32"
        cy="32"
        r="25.5"
        fill="none"
        stroke="#fbf6ec"
        strokeWidth="1.2"
        strokeDasharray="1 4"
        strokeLinecap="round"
      />
      <path
        d="M20 40c4-10 10-15 24-17M18 30c8 0 16 4 22 12M30 18c-2 10 0 20 6 28"
        fill="none"
        stroke="#fbf6ec"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
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
