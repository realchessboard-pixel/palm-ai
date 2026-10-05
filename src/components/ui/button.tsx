import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-gold-300 to-gold-500 text-night-950 shadow-[0_8px_30px_-8px_rgb(229_180_94/0.55)] hover:from-gold-200 hover:to-gold-400 active:scale-[0.98]",
  secondary: "glass text-parchment hover:bg-white/10 hover:border-white/20 active:scale-[0.98]",
  ghost: "text-mist hover:text-parchment hover:bg-white/5",
  danger:
    "border border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 active:scale-[0.98]",
};

// All sizes keep a minimum 44px touch target for thumb-friendly mobile use.
const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-6 text-[0.95rem]",
  lg: "min-h-14 px-8 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
