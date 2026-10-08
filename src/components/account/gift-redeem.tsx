"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, postJson } from "@/lib/api-client";

/** Redeem a gift code for one reading credit. */
export function GiftRedeemForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const id = useId();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setResult(null);
        try {
          await postJson("/api/gifts/redeem", { code });
          setResult({
            tone: "success",
            text: "Gift redeemed — you have a reading credit. Use it to unlock any detailed reading.",
          });
          setCode("");
          router.refresh();
        } catch (err) {
          setResult({
            tone: "error",
            text: err instanceof ApiClientError ? err.message : "Please try again.",
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={id} className="block text-sm text-mist">
        Have a gift code?
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCDE-23456"
          autoComplete="off"
          maxLength={11}
          className="min-h-12 flex-1 rounded-full border border-white/15 bg-white/5 px-5 tracking-widest text-parchment uppercase placeholder:text-mist-dim focus:border-gold-300 focus:outline-none"
        />
        <Button type="submit" variant="secondary" disabled={busy || code.trim().length < 11}>
          {busy ? "Redeeming…" : "Redeem"}
        </Button>
      </div>
      {result ? <Alert tone={result.tone}>{result.text}</Alert> : null}
    </form>
  );
}
