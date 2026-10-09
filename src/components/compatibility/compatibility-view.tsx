import { getT } from "@/lib/i18n/server";
import type { ReactNode } from "react";
import { Prose } from "@/components/results/section-card";
import { COMPATIBILITY_PART_TITLES, type CompatibilityReading } from "@/lib/compatibility/schema";

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-3 text-2xl text-gold-200 sm:text-[1.7rem]">
        <span aria-hidden="true" className="h-px w-6 bg-gold-400/50" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The couple reading, told as one warm narrative. */
export async function CompatibilityReadingView({ reading }: { reading: CompatibilityReading }) {
  const tx = await getT();
  return (
    <article className="mx-auto max-w-3xl space-y-12" aria-labelledby="couple-headline">
      <header className="space-y-6">
        <h2 id="couple-headline" className="text-3xl leading-snug text-gold-200 sm:text-4xl">
          {reading.headline}
        </h2>
        <Prose text={reading.introduction} className="text-lg text-parchment/90" />
      </header>
      {reading.parts.map((part) => (
        <Part key={part.id} title={COMPATIBILITY_PART_TITLES[part.id]}>
          <Prose text={part.text} />
        </Part>
      ))}
      {reading.strengths.length ? (
        <Part title={tx("Your strengths together")}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {reading.strengths.map((s) => (
              <li key={s.name} className="card rounded-2xl p-5">
                <p className="text-lg text-parchment">{s.name}</p>
                <Prose text={s.text} className="mt-1 text-base text-parchment/80" />
              </li>
            ))}
          </ul>
        </Part>
      ) : null}
      {reading.reflection ? (
        <Part title={reading.reflection.title}>
          <Prose text={reading.reflection.text} />
        </Part>
      ) : null}
    </article>
  );
}
