"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { hasBlockingIssue, type QualityIssue } from "@/lib/image/quality";

export interface ReviewChoices {
  trainingOptIn: boolean;
}

export function PhotoReview({
  previewUrl,
  issues,
  onRetake,
  onUse,
  busy,
}: {
  previewUrl: string;
  issues: QualityIssue[];
  onRetake: () => void;
  onUse: (choices: ReviewChoices) => void;
  busy?: boolean;
}) {
  const [consent, setConsent] = useState(false);
  const [trainingOptIn, setTrainingOptIn] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const consentId = useId();
  const errorId = useId();
  const blocked = hasBlockingIssue(issues);
  const blocking = issues.filter((i) => i.severity === "block");
  const warnings = issues.filter((i) => i.severity === "warn");

  return (
    <div className="space-y-5">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-black">
        {/* Local blob preview of the user's own photo; never leaves the device until "Use photo". */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Your palm photo preview" className="size-full object-contain" />
      </div>

      {blocking.length > 0 ? (
        <Alert tone="error" title="This photo can't be read">
          <ul className="list-disc space-y-1 pl-4">
            {blocking.map((i) => (
              <li key={i.code}>{i.message}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {warnings.length > 0 && !blocked ? (
        <Alert tone="warning" title="A quick check">
          <ul className="list-disc space-y-1 pl-4">
            {warnings.map((i) => (
              <li key={i.code}>{i.message}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs opacity-80">
            You can still continue — our AI will make the final call on what it can see.
          </p>
        </Alert>
      ) : null}
      {issues.length === 0 ? (
        <Alert tone="success">Looks good — the photo is bright and sharp enough to analyze.</Alert>
      ) : null}

      {!blocked ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <label htmlFor={consentId} className="flex cursor-pointer items-start gap-3">
            <input
              id={consentId}
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (e.target.checked) setShowConsentError(false);
              }}
              aria-invalid={showConsentError}
              aria-describedby={showConsentError ? errorId : undefined}
              className="mt-0.5 size-5 shrink-0 accent-gold-400"
            />
            <span className="leading-relaxed text-parchment/90">
              This is my hand (or I have permission), and I understand the reading is for
              entertainment and reflection. I agree to the{" "}
              <Link
                href="/terms"
                className="text-gold-300 underline underline-offset-2"
                target="_blank"
              >
                terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-gold-300 underline underline-offset-2"
                target="_blank"
              >
                privacy policy
              </Link>
              .
            </span>
          </label>
          {showConsentError ? (
            <p id={errorId} className="text-xs text-red-300" role="alert">
              Please confirm to continue.
            </p>
          ) : null}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={trainingOptIn}
              onChange={(e) => setTrainingOptIn(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-gold-400"
            />
            <span className="leading-relaxed text-mist">
              Optional: allow this photo to be used to improve palm analysis. Off by default — your
              photo is never used for training without this.
            </span>
          </label>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" onClick={onRetake} disabled={busy}>
          Retake
        </Button>
        <Button
          onClick={() => {
            if (!consent) {
              setShowConsentError(true);
              return;
            }
            onUse({ trainingOptIn });
          }}
          disabled={blocked || busy}
        >
          Use photo
        </Button>
      </div>
    </div>
  );
}
