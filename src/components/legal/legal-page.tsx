import type { ReactNode } from "react";
import { Alert } from "@/components/ui/misc";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <h1 className="text-4xl text-parchment">{title}</h1>
      <p className="mt-2 text-sm text-mist">Last updated {updated}</p>
      <Alert tone="warning" className="mt-6">
        Placeholder: this document is a starting template and must be reviewed by a qualified lawyer
        for your jurisdiction before launch.
      </Alert>
      <div className="mt-8 space-y-6 leading-relaxed text-parchment/85 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-parchment [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  );
}
