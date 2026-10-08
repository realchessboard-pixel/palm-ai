"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { isTransientError, postJson } from "@/lib/api-client";
import type { Language } from "@/lib/i18n/languages";

/**
 * Shown while a reading has no cached translation in the chosen language:
 * requests one (the English text stays visible meanwhile) and refreshes.
 */
export function TranslationLoader({
  readingId,
  language,
  messages,
}: {
  readingId: string;
  language: Language;
  messages: { translating: string; translationFailed: string; retry: string };
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      for (let tries = 0; ; tries++) {
        try {
          await postJson(`/api/readings/${readingId}/translation`, { language });
          if (!cancelled) router.refresh();
          return;
        } catch (error) {
          if (tries < 1 && isTransientError(error)) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }
          if (!cancelled) setFailed(true);
          return;
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [readingId, language, attempt, router]);

  return (
    <div
      className="glass flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm"
      aria-live="polite"
    >
      {failed ? (
        <>
          <span className="text-parchment/85">{messages.translationFailed}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            {messages.retry}
          </Button>
        </>
      ) : (
        <>
          <Spinner label={messages.translating} />
          <span className="text-parchment/85">{messages.translating}</span>
        </>
      )}
    </div>
  );
}
