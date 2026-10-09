"use client";

import { msg } from "@/lib/i18n/msg";

import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, apiFetch, postJson } from "@/lib/api-client";

function message(err: unknown) {
  return err instanceof ApiClientError
    ? err.message
    : msg("Something went wrong. Please try again.");
}

export function TrainingPreference({ initial }: { initial: boolean }) {
  const tx = useT();
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={value}
          className="mt-1 size-5 accent-gold-400"
          onChange={async (e) => {
            const next = e.target.checked;
            setValue(next);
            setStatus(null);
            try {
              await apiFetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trainingOptIn: next }),
              });
              setStatus(tx("Saved."));
            } catch (err) {
              setValue(!next);
              setStatus(message(err));
            }
          }}
        />
        <span className="text-sm leading-relaxed text-parchment/90">
          <T s="Allow my future palm photos to be used to improve palm analysis. Off by default." />
        </span>
      </label>
      <p className="text-xs text-mist" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await postJson("/api/auth/logout", {}).catch(() => undefined);
        router.push("/");
        router.refresh();
      }}
    >
      <T s="Sign out" />
    </Button>
  );
}

export function DeleteDataButton() {
  const tx = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <div className="space-y-2">
        <Button variant="danger" onClick={() => setConfirming(true)}>
          <T s="Delete all my readings" />
        </Button>
        {result ? (
          <Alert tone="success">
            <T s={result} />
          </Alert>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Alert tone="warning">
        <T s="This permanently deletes every reading and palm photo. Your account stays open." />
      </Alert>
      <div className="flex gap-2">
        <Button
          variant="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await apiFetch<{ deleted: number }>("/api/account/readings", {
                method: "DELETE",
              });
              setResult(
                res.deleted === 1
                  ? tx("Deleted 1 reading.")
                  : tx("Deleted {0} readings.", [res.deleted]),
              );
              setConfirming(false);
              router.refresh();
            } catch (err) {
              setResult(message(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? tx("Deleting…") : tx("Yes, delete everything")}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          <T s="Cancel" />
        </Button>
      </div>
    </div>
  );
}

export function DeleteAccountForm() {
  const tx = useT();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pwId = useId();
  const confirmId = useId();

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await apiFetch("/api/account", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password, confirm }),
          });
          router.push("/?account=deleted");
          router.refresh();
        } catch (err) {
          setError(message(err));
          setBusy(false);
        }
      }}
    >
      {error ? (
        <Alert tone="error">
          <T s={error} />
        </Alert>
      ) : null}
      <div>
        <label htmlFor={pwId} className="mb-2 block text-sm text-parchment">
          <T s="Current password" />
        </label>
        <input
          id={pwId}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-parchment focus:border-gold-300/60 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor={confirmId} className="mb-2 block text-sm text-parchment">
          <T s="Type DELETE to confirm" />
        </label>
        <input
          id={confirmId}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-parchment focus:border-gold-300/60 focus:outline-none"
        />
      </div>
      <Button type="submit" variant="danger" disabled={busy || confirm !== "DELETE" || !password}>
        {busy ? tx("Deleting…") : tx("Permanently delete my account")}
      </Button>
    </form>
  );
}
