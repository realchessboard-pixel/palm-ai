import { T } from "@/components/i18n/i18n";
import Link from "next/link";
import { READER_TIERS, formatInr } from "@/lib/monetization/price";
import { READERS } from "@/lib/readers/catalog";
import { ReaderPortrait } from "./reader-portrait";

/** After a reading: invite the visitor to ask a reader about it (first question free). */
export function AskReaderCard({ readingId }: { readingId: string }) {
  const featured = READERS.slice(0, 4);
  const from = Math.min(...Object.values(READER_TIERS).map((t) => t.singleInr));
  return (
    <section aria-labelledby="ask-title" className="paper-card p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex -space-x-3">
          {featured.map((r) => (
            <ReaderPortrait
              key={r.id}
              reader={r}
              size={56}
              className="rounded-full ring-2 ring-[var(--paper)]"
            />
          ))}
        </div>
        <div className="flex-1">
          <h2 id="ask-title" className="text-2xl">
            <T s="Have a question about your palm?" />
          </h2>
          <p className="mt-1 text-mist">
            <T
              s="Ask one of our readers — they've seen this reading. Your first question is free, then from {0}."
              v={[formatInr(from)]}
            />
          </p>
        </div>
        <Link href={`/readers?reading=${readingId}`} className="btn-primary shrink-0">
          <T s="Choose a reader" />
        </Link>
      </div>
    </section>
  );
}
