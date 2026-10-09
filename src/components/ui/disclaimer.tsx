"use client";

import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { siteConfig } from "@/lib/config/site";
import { cn } from "@/lib/cn";

export function Disclaimer({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const tx = useT();
  return (
    <aside
      aria-label={tx("Disclaimer")}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] text-mist",
        compact ? "px-4 py-3 text-xs" : "px-6 py-5 text-sm",
        className,
      )}
    >
      <p className="leading-relaxed">
        <T
          s="{0}{1} Readings never include medical, lifespan, pregnancy, legal or guaranteed financial claims."
          v={[
            <span key={0} className="font-semibold text-parchment">
              <T s="Please note:" />
            </span>,
            tx(siteConfig.disclaimer),
          ]}
        />
      </p>
    </aside>
  );
}
