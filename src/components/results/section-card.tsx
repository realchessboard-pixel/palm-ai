import { cn } from "@/lib/cn";
import type { ProjectedSection } from "@/lib/readings/projection";

const ICONS: Record<string, string> = {
  personality: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0",
  relationships: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  career: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  money:
    "M12 3v18M16 7.5C16 6 14.2 5 12 5s-4 1-4 2.5S9.8 10 12 10.5s4 1.5 4 3S14.2 16 12 16s-4-1-4-2.5",
  lifePath: "M4 20c4-1 4-7 8-8s4-6 8-8",
  strengths: "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z",
  challenges: "M12 4l9 16H3zM12 10v4m0 3v.5",
  highlights: "M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z",
};

/**
 * Long-form reading text. Rendered as plain text nodes — model output is never
 * injected as HTML. Paragraphs are justified via `.reading-prose`.
 */
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("reading-prose text-[1.05rem] text-parchment/88", className)}>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function SectionCard({ section, lang }: { section: ProjectedSection; lang?: string }) {
  return (
    <article
      lang={lang}
      className="card rounded-3xl p-6 sm:p-7"
      aria-labelledby={`section-${section.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path
                d={ICONS[section.id] ?? ICONS.highlights}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h3 id={`section-${section.id}`} className="text-2xl text-parchment">
            {section.title}
          </h3>
        </div>
      </div>
      <Prose text={section.summary} className="mt-4 text-lg text-gold-100/90" />
      {section.details ? <Prose text={section.details} className="mt-4" /> : null}
      {section.points.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {section.points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-parchment/85">
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-300"
                aria-hidden="true"
              />
              {point}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
