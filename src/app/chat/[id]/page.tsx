import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatWindow } from "@/components/readers/chat-window";
import { ReaderPortrait } from "@/components/readers/reader-portrait";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { getAccountBalances } from "@/lib/monetization/account";
import { READER_TIERS, formatInr, toPaise } from "@/lib/monetization/price";
import { paymentsEnabled } from "@/lib/payments/pricing";
import { getReader } from "@/lib/readers/catalog";
import { getReaderChatView } from "@/lib/readers/service";
import { IdSchema } from "@/lib/schemas/api";

export const metadata: Metadata = {
  title: "Your conversation",
  robots: { index: false, follow: false },
};

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) notFound();
  const actor = await getActor();
  let view;
  try {
    view = await getReaderChatView(id, actor);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const reader = getReader(view.readerId);
  if (!reader) notFound();
  const tier = READER_TIERS[reader.tier];
  const balances = actor.user ? await getAccountBalances(actor.user.id) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <header className="mb-8 flex items-center gap-4">
        <ReaderPortrait reader={reader} size={64} />
        <div>
          <h1 className="text-3xl leading-tight">{reader.name}</h1>
          <p className="text-sm text-mist">
            {reader.title} ·{" "}
            <Link href="/how-readings-work" className="tag">
              AI
            </Link>
          </p>
        </div>
      </header>
      {!view.readingId ? (
        <p className="note mb-6">
          {reader.name.split(" ")[0]} can&apos;t see your palm in this conversation.{" "}
          <Link href="/read" className="link">
            Take your free reading
          </Link>{" "}
          for answers about your own hand.
        </p>
      ) : null}
      {/* Remounts with the server's state after a purchase refreshes the page. */}
      <ChatWindow
        key={view.questionsLeft}
        reader={reader}
        chatId={view.id}
        initialMessages={view.messages}
        questionsLeft={view.questionsLeft}
        hasReading={Boolean(view.readingId)}
        plans={{
          single: formatInr(tier.singleInr),
          bundle: formatInr(tier.bundle.priceInr),
          bundleQuestions: tier.bundle.questions,
        }}
        wallet={
          balances
            ? {
                paise: balances.walletPaise,
                singlePaise: toPaise(tier.singleInr),
                bundlePaise: toPaise(tier.bundle.priceInr),
              }
            : null
        }
        paymentsEnabled={paymentsEnabled()}
      />
      <p className="mt-10 text-xs text-mist">
        Answers are traditional palmistry for reflection and entertainment — not predictions or
        advice about health, money, relationships or the law.{" "}
        <Link href="/readers" className="link">
          All readers
        </Link>
      </p>
    </div>
  );
}
