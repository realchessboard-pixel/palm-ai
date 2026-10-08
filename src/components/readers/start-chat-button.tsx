"use client";

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
            setError(err instanceof ApiClientError ? err.message : "Please try again.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening…" : `Ask ${readerName.split(" ")[0]}`}
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
