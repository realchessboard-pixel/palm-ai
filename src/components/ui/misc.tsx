import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-medium tracking-wide text-gold-200",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return <Tag className={cn("card rounded-3xl p-6 sm:p-8", className)}>{children}</Tag>;
}

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn("inline-block", className)}>
      <span className="block size-5 animate-spin rounded-full border-2 border-gold-300/30 border-t-gold-300" />
    </span>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "error" | "success";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-aura-400/30 bg-aura-500/10 text-parchment",
    warning: "border-gold-400/40 bg-gold-500/10 text-gold-100",
    error: "border-red-400/40 bg-red-500/10 text-red-100",
    success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-2xl border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}
    >
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("mx-auto max-w-2xl", align === "center" ? "text-center" : "text-left")}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 id={id} className="text-3xl leading-tight text-parchment sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-mist">{description}</p>
      ) : null}
    </div>
  );
}
