"use client";

import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, postJson } from "@/lib/api-client";

function safeNext(next: string | null | undefined): string {
  // Only allow same-site relative paths, to avoid open redirects.
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/readings";
}

/** Referral code remembered from a shared link (see ReferralCapture). */
function readReferral(): string | undefined {
  try {
    return localStorage.getItem("palmai.ref") ?? undefined;
  } catch {
    return undefined;
  }
}

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const tx = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const emailId = useId();
  const passwordId = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await postJson(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        email,
        password,
        ...(mode === "signup" ? { ref: readReferral() } : {}),
      });
      router.push(safeNext(next));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        const fields =
          (err.details?.fields as { path: string; message: string }[] | undefined) ?? [];
        if (fields.length)
          setFieldErrors(Object.fromEntries(fields.map((f) => [f.path, f.message])));
        else setError(err.message);
      } else {
        setError(tx("Something went wrong. Please try again."));
      }
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error ? (
        <Alert tone="error">
          <T s={error} />
        </Alert>
      ) : null}
      <div>
        <label htmlFor={emailId} className="mb-2 block text-sm font-medium text-parchment">
          <T s="Email" />
        </label>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-parchment placeholder:text-mist-dim focus:border-gold-300/60 focus:outline-none"
          placeholder="you@example.com"
        />
        {fieldErrors.email ? (
          <p id={`${emailId}-error`} className="mt-1.5 text-xs text-red-300">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor={passwordId} className="mb-2 block text-sm font-medium text-parchment">
          <T s="Password" />
        </label>
        <input
          id={passwordId}
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 10 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={`${passwordId}-hint`}
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-parchment focus:border-gold-300/60 focus:outline-none"
        />
        <p
          id={`${passwordId}-hint`}
          className={`mt-1.5 text-xs ${fieldErrors.password ? "text-red-300" : "text-mist-dim"}`}
        >
          {fieldErrors.password ?? (mode === "signup" ? tx("At least 10 characters.") : "")}
        </p>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? tx("Please wait…") : mode === "login" ? tx("Sign in") : tx("Create account")}
      </Button>
      <p className="text-center text-sm text-mist">
        {mode === "login" ? (
          <>
            <T
              s="New here? {0}"
              v={[
                <Link
                  key={0}
                  href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                  className="text-gold-300 underline-offset-4 hover:underline"
                >
                  <T s="Create an account" />
                </Link>,
              ]}
            />
          </>
        ) : (
          <>
            <T
              s="Already have an account? {0}"
              v={[
                <Link
                  key={0}
                  href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                  className="text-gold-300 underline-offset-4 hover:underline"
                >
                  <T s="Sign in" />
                </Link>,
              ]}
            />
          </>
        )}
      </p>
    </form>
  );
}
