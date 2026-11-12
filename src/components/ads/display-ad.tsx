"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import { T } from "@/components/i18n/i18n";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export type ClientDisplayAds =
  | { mode: "off" }
  | { mode: "test" }
  | { mode: "on"; client: string; slots: { top?: string; inline?: string; bottom?: string } };

type Position = "top" | "inline" | "bottom" | "sticky";

/** One ad slot. Re-requests an ad on every page change (client navigation). */
export function DisplayAd({ ads, position }: { ads: ClientDisplayAds; position: Position }) {
  const pathname = usePathname();
  const ref = useRef<HTMLModElement>(null);
  const slot =
    ads.mode === "on" ? (position === "sticky" ? ads.slots.bottom : ads.slots[position]) : null;

  useEffect(() => {
    if (ads.mode !== "on" || !slot || !ref.current) return;
    if (ref.current.getAttribute("data-adsbygoogle-status")) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // An ad blocker or a not-yet-approved account: the page works without it.
    }
  }, [ads.mode, slot, pathname]);

  if (ads.mode === "off") return null;
  const box =
    position === "sticky"
      ? "mx-auto h-[50px] w-full max-w-[320px]"
      : "mx-auto min-h-[100px] w-full max-w-5xl md:min-h-[90px]";

  return (
    <aside aria-label="Advertisement" className="px-4 py-3">
      <p className="mb-1 text-center text-[10px] tracking-[0.2em] text-mist uppercase">
        <T s="Advertisement" />
      </p>
      {ads.mode === "test" ? (
        <div
          className={`${box} flex items-center justify-center rounded-lg border border-dashed border-[var(--rule)] text-xs text-mist`}
        >
          <T s="Test ad · {0}" v={[position]} />
        </div>
      ) : slot ? (
        <ins
          key={pathname}
          ref={ref}
          className={`adsbygoogle block ${box}`}
          data-ad-client={ads.client}
          data-ad-slot={slot}
          {...(position === "sticky"
            ? {}
            : { "data-ad-format": "auto", "data-full-width-responsive": "true" })}
        />
      ) : null}
    </aside>
  );
}

/** A small ad bar fixed above the phone's bottom tabs; the visitor can close it. */
export function StickyMobileAd({ ads }: { ads: ClientDisplayAds }) {
  // Closing hides it for this page only; it comes back on the next page.
  const pathname = usePathname();
  const [closedOn, setClosedOn] = useState<string | null>(null);
  if (ads.mode === "off" || closedOn === pathname) return null;
  if (ads.mode === "on" && !ads.slots.bottom) return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-[var(--rule)] bg-[var(--paper,#fff)]/95 backdrop-blur md:hidden">
      <button
        type="button"
        onClick={() => setClosedOn(pathname)}
        className="absolute top-1 right-2 z-10 rounded-full px-2 text-sm text-mist"
        aria-label="Close advertisement"
      >
        ✕
      </button>
      <DisplayAd ads={ads} position="sticky" />
    </div>
  );
}

const AdsContext = createContext<ClientDisplayAds>({ mode: "off" });

export function AdsProvider({ ads, children }: { ads: ClientDisplayAds; children: ReactNode }) {
  return <AdsContext.Provider value={ads}>{children}</AdsContext.Provider>;
}

/** An ad in the middle of a page's content (uses the site's ad settings). */
export function InlineAd() {
  return <DisplayAd ads={useContext(AdsContext)} position="inline" />;
}
