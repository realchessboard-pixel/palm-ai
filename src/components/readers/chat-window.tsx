"use client";

import { useEffect, useRef, useState } from "react";
import { BalanceUnlock } from "@/components/payments/balance-unlock";
import { BuyButton } from "@/components/payments/buy-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, postJson } from "@/lib/api-client";
import type { Reader } from "@/lib/readers/catalog";
import { ReaderPortrait } from "./reader-portrait";

interface Message {
  id: string;
  role: "USER" | "READER";
  text: string;
}

const MAX = 600;

export function ChatWindow({
  reader,
  chatId,
  initialMessages,
  questionsLeft: initialLeft,
  plans,
  wallet,
  paymentsEnabled,
  hasReading,
}: {
  reader: Reader;
  chatId: string;
  initialMessages: Message[];
  questionsLeft: number;
  plans: { single: string; bundle: string; bundleQuestions: number };
  wallet: { paise: number; singlePaise: number; bundlePaise: number } | null;
  paymentsEnabled: boolean;
  hasReading: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [left, setLeft] = useState(initialLeft);
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, waiting]);

  async function send() {
    const text = draft.trim();
    if (!text || waiting) return;
    setError(null);
    setWaiting(true);
    const pending: Message = { id: `local-${Date.now()}`, role: "USER", text };
    setMessages((m) => [...m, pending]);
    setDraft("");
    try {
      const res = await postJson<{ answer: string; questionsLeft: number }>(
        `/api/readers/chats/${chatId}/messages`,
        { text },
      );
      setMessages((m) => [...m, { id: `r-${Date.now()}`, role: "READER", text: res.answer }]);
      setLeft(res.questionsLeft);
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== pending.id));
      setDraft(text);
      setError(err instanceof ApiClientError ? err.message : "Please try again.");
    } finally {
      setWaiting(false);
    }
  }

  const first = reader.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <ol className="space-y-5" aria-live="polite">
        {messages.map((m) =>
          m.role === "READER" ? (
            <li key={m.id} className="flex items-start gap-3">
              <ReaderPortrait reader={reader} size={40} className="mt-1 shrink-0" />
              <div className="bubble-reader max-w-[85%]">
                {m.text.split(/\n{2,}/).map((p, i) => (
                  <p key={i} className={i ? "mt-3" : undefined}>
                    {p}
                  </p>
                ))}
              </div>
            </li>
          ) : (
            <li key={m.id} className="flex justify-end">
              <div className="bubble-user max-w-[85%] whitespace-pre-wrap">{m.text}</div>
            </li>
          ),
        )}
        {waiting ? (
          <li className="flex items-start gap-3">
            <ReaderPortrait reader={reader} size={40} className="mt-1 shrink-0" />
            <div className="bubble-reader text-mist">
              <span className="sr-only">{first} is writing an answer</span>
              <span aria-hidden="true" className="inline-flex gap-1">
                <span className="dot" />
                <span className="dot [animation-delay:150ms]" />
                <span className="dot [animation-delay:300ms]" />
              </span>{" "}
              {first} is looking at your palm…
            </div>
          </li>
        ) : null}
      </ol>
      <div ref={endRef} />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {left > 0 ? (
        <form
          className="paper-card space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="question" className="sr-only">
            Your question for {reader.name}
          </label>
          <textarea
            id="question"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={3}
            placeholder={
              hasReading
                ? `Ask ${first} about your palm — e.g. “What does my heart line say about how I love?”`
                : `Ask ${first} anything about palm reading`
            }
            className="field w-full resize-none"
            disabled={waiting}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-mist">
              {left} question{left === 1 ? "" : "s"} left
            </p>
            <Button type="submit" disabled={waiting || !draft.trim()}>
              {waiting ? "Waiting for answer…" : "Ask"}
            </Button>
          </div>
        </form>
      ) : (
        <section className="paper-card space-y-4 p-5" aria-labelledby="plans-title">
          <h2 id="plans-title" className="text-xl">
            Ask {first} {messages.some((m) => m.role === "USER") ? "more" : "your question"}
          </h2>
          {paymentsEnabled ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <BuyButton
                  order={{ product: "READER_QUESTIONS", chatId, plan: "single" }}
                  label={`1 question — ${plans.single}`}
                  variant="secondary"
                  size="md"
                  className="w-full"
                />
                <BuyButton
                  order={{ product: "READER_QUESTIONS", chatId, plan: "bundle" }}
                  label={`${plans.bundleQuestions} questions — ${plans.bundle}`}
                  size="md"
                  className="w-full"
                />
              </div>
              {wallet ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <BalanceUnlock
                    order={{ product: "READER_QUESTIONS", chatId, plan: "single" }}
                    credits={0}
                    canPayFromWallet={wallet.paise >= wallet.singlePaise}
                    walletLabel="1 question"
                  />
                  <BalanceUnlock
                    order={{ product: "READER_QUESTIONS", chatId, plan: "bundle" }}
                    credits={0}
                    canPayFromWallet={wallet.paise >= wallet.bundlePaise}
                    walletLabel={`${plans.bundleQuestions} questions`}
                  />
                </div>
              ) : null}
              <p className="text-xs text-mist">
                One-time payment via UPI, card or netbanking. Unused questions stay in this
                conversation.
              </p>
            </>
          ) : (
            <p className="text-sm text-mist">Questions aren&apos;t available to buy right now.</p>
          )}
        </section>
      )}
    </div>
  );
}
