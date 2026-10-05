import type { ReactNode } from "react";
import type { ReadingMessages } from "@/lib/i18n/reading-messages";
import type { ReadingNarrative } from "@/lib/schemas/palm-interpretation";
import { Prose } from "./section-card";

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

/**
 * The main reading, as a palm reader would tell it: a personal headline and
 * introduction, then how you think, care and work, your strengths, and one
 * interesting balance in your palm. Plain narrative — no scores or citations.
 */
export function ReadingNarrativeView({
  narrative,
  messages,
  lang,
}: {
  narrative: ReadingNarrative;
  messages: ReadingMessages;
  lang: string;
}) {
  return (
    <article
      lang={lang}
      className="mx-auto max-w-3xl space-y-12"
      aria-labelledby="reading-headline"
    >
      <header className="space-y-6">
        <h2 id="reading-headline" className="text-3xl leading-snug text-gold-200 sm:text-4xl">
          {narrative.headline}
        </h2>
        <Prose text={narrative.introduction} className="text-lg text-parchment/90" />
      </header>

      {narrative.thinking ? (
        <Part title={messages.thinking}>
          <Prose text={narrative.thinking.text} />
        </Part>
      ) : null}

      {narrative.caring ? (
        <Part title={messages.caring}>
          <Prose text={narrative.caring.text} />
        </Part>
      ) : null}

      {narrative.strengths.length > 0 ? (
        <Part title={messages.strengths}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {narrative.strengths.map((strength) => (
              <li key={strength.name} className="card rounded-2xl p-5">
                <p className="font-display text-xl text-parchment">{strength.name}</p>
                <Prose text={strength.text} className="mt-2 text-base text-parchment/80" />
              </li>
            ))}
          </ul>
        </Part>
      ) : null}

      {narrative.career ? (
        <Part title={messages.career}>
          <Prose text={narrative.career.text} />
        </Part>
      ) : null}

      {narrative.insight ? (
        <section className="relative overflow-hidden rounded-[2rem] border border-gold-400/25 bg-gradient-to-b from-gold-400/[0.08] to-transparent p-6 sm:p-9">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
            {messages.insight}
          </p>
          <h3 className="mt-3 text-2xl text-parchment sm:text-3xl">{narrative.insight.title}</h3>
          <Prose text={narrative.insight.text} className="mt-4" />
        </section>
      ) : null}
    </article>
  );
}
