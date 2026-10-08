import type { Metadata } from "next";
import Link from "next/link";
import { ReaderPortrait } from "@/components/readers/reader-portrait";
import { StartChatButton } from "@/components/readers/start-chat-button";
import { getActor } from "@/lib/auth/actor";
import { READER_TIERS, formatInr } from "@/lib/monetization/price";
import { READERS } from "@/lib/readers/catalog";
import { listReaderChats } from "@/lib/readers/service";
import { listReadingsForUser } from "@/lib/readings/service";
import { IdSchema } from "@/lib/schemas/api";

export const metadata: Metadata = {
  title: "Ask a palm reader",
  description:
    "Ask AstroVidya's readers about your own palm and chart — each with their own style, in Hindi, English and more.",
};

export default async function ReadersPage({
  searchParams,
}: {
  searchParams: Promise<{ reading?: string }>;
}) {
  const { reading } = await searchParams;
  const actor = await getActor();
  let readingId = reading && IdSchema.safeParse(reading).success ? reading : undefined;
  if (!readingId && actor.user) {
    readingId = (await listReadingsForUser(actor.user.id)).find((r) => r.status === "COMPLETE")?.id;
  }
  const chats = await listReaderChats(actor);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="max-w-2xl space-y-4">
        <p className="eyebrow">Ask a reader</p>
        <h1 className="text-4xl sm:text-5xl">Ask about your own palm</h1>
        <p className="text-lg text-mist">
          Choose a reader whose style suits you and ask anything about your lines, parvats and
          nature. They read <em>your</em> palm reading and answer in your language, usually within a
          minute.
        </p>
        <p className="note">
          Our readers are AI characters, each with their own voice and focus — not real people. The
          illustrations are drawings.{" "}
          {readingId ? "Your first question about your reading is free." : ""}
        </p>
        {!readingId ? (
          <p className="text-sm text-mist">
            For answers about <em>your</em> hand,{" "}
            <Link href="/read" className="link">
              take your free palm reading first
            </Link>
            .
          </p>
        ) : null}
      </header>

      {chats.length ? (
        <section className="mt-10" aria-labelledby="your-chats">
          <h2 id="your-chats" className="text-xl">
            Your conversations
          </h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {chats.map((c) => {
              const r = READERS.find((x) => x.id === c.readerId);
              return r ? (
                <li key={c.id}>
                  <Link href={`/chat/${c.id}`} className="chip">
                    <ReaderPortrait reader={r} size={28} />
                    {r.name}
                    {c.questionsLeft ? ` · ${c.questionsLeft} left` : ""}
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      ) : null}

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {READERS.map((r) => {
          const tier = READER_TIERS[r.tier];
          return (
            <li key={r.id} className="paper-card flex flex-col p-6">
              <div className="flex items-start gap-4">
                <ReaderPortrait reader={r} size={80} className="shrink-0" />
                <div>
                  <h2 className="text-2xl leading-tight">{r.name}</h2>
                  <p className="mt-1 text-sm text-mist">{r.title}</p>
                  <Link href="/how-readings-work" className="tag mt-2">
                    AI
                  </Link>
                </div>
              </div>
              <p className="mt-4 flex-1 leading-relaxed">{r.about}</p>
              <p className="mt-4 text-sm text-mist">
                {r.focus.join(" · ")}
                <br />
                Replies in {r.languages.join(", ")}
              </p>
              <div className="rule my-5" />
              <p className="text-sm">
                <strong className="text-lg">{formatInr(tier.singleInr)}</strong> a question ·{" "}
                {tier.bundle.questions} for {formatInr(tier.bundle.priceInr)}
              </p>
              <div className="mt-4">
                <StartChatButton readerId={r.id} readerName={r.name} readingId={readingId} />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-12 max-w-2xl text-sm text-mist">
        Readings are traditional palmistry for reflection and entertainment. Readers never predict
        events, health, money or marriage, and never sell remedies.
      </p>
    </div>
  );
}
