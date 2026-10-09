"use client";

import { T } from "@/components/i18n/i18n";
import { useT } from "@/components/i18n/i18n";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { track } from "@/lib/analytics/client";
import { ApiClientError, postJson } from "@/lib/api-client";

export function StartChatButton({
  readerId,
  readerName,
  readingId,
  variant = "primary",
}: {
  readerId: string;
  readerName: string;
  readingId?: string;
  variant?: "primary" | "secondary";
}) {
  const tx = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variant={variant}
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const { chatId } = await postJson<{ chatId: string }>("/api/readers/chats", {
              readerId,
              ...(readingId ? { readingId } : {}),
            });
            track("premium_clicked", { product: "READER_QUESTIONS", reader: readerId });
            router.push(`/chat/${chatId}`);
          } catch (err) {
            setError(err instanceof ApiClientError ? err.message : tx("Please try again."));
            setBusy(false);
          }
        }}
      >
        {busy ? tx("Opening…") : tx("Ask {0}", [readerName.split(" ")[0]])}
      </Button>
      {error ? (
        <Alert tone="error">
          <T s={error} />
        </Alert>
      ) : null}
    </div>
  );
}
