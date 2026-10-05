import { siteConfig } from "@/lib/config/site";
import { cn } from "@/lib/cn";

export function Disclaimer({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <aside
      aria-label="Disclaimer"
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] text-mist",
        compact ? "px-4 py-3 text-xs" : "px-6 py-5 text-sm",
        className,
      )}
    >
      <p className="leading-relaxed">
        <span className="font-semibold text-parchment">Please note: </span>
        {siteConfig.disclaimer} Readings never include medical, lifespan, pregnancy, legal or
        guaranteed financial claims.
      </p>
    </aside>
  );
}
