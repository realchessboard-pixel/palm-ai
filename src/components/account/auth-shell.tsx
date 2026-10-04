import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/logo";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="card mx-auto max-w-md rounded-[2rem] p-7 sm:p-10">
        <LogoMark className="size-10" />
        <h1 className="mt-5 text-3xl text-parchment">{title}</h1>
        <p className="mt-2 text-sm text-mist">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
