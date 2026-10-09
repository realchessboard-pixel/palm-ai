"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/misc";
import { track } from "@/lib/analytics/client";
import { ApiClientError, apiFetch, isTransientError, postJson } from "@/lib/api-client";
import {
  ImageInputError,
  prepareImage,
  validateFileBasics,
  type PreparedImage,
} from "@/lib/image/client-image";
import { hasBlockingIssue } from "@/lib/image/quality";
import { AnalysisProgress, type PipelinePhase } from "./analysis-progress";
import { CameraCapture } from "./camera-capture";
import { PhotoReview, type ReviewChoices } from "./photo-review";
import { PhotoSource } from "./photo-source";

type Step =
  | { kind: "source"; error?: string }
  | { kind: "camera" }
  | { kind: "checking" }
  | { kind: "review"; image: PreparedImage }
  | { kind: "processing"; phase: PipelinePhase }
  | { kind: "failed"; message: string; canRetry: boolean };

const AUTO_RETRIES = 2;
const RETRY_DELAYS_MS = [1500, 4000];

interface Submission {
  image: PreparedImage;
  choices: ReviewChoices;
  /** Sent with the upload so a retry of the same submission can't create a second reading. */
  requestId: string | undefined;
}

interface AnalyzeResponse {
  readingId: string;
  status: string;
}

/** AstroVidya reads the right hand only, following the traditional reading of the right palm. */
const HAND = "right" as const;

const PARTNER_TITLES: Record<Step["kind"], string> = {
  source: "Now your partner's right palm",
  camera: "Place your partner's right palm in the frame",
  checking: "Checking the photo",
  review: "Review the photo",
  processing: "Reading your partner's palm",
  failed: "Let's give it another go",
};

const STEP_TITLES: Record<Step["kind"], string> = {
  source: "Show us your right palm",
  camera: "Place your right palm in the frame",
  checking: "Checking your photo",
  review: "Review your photo",
  processing: "Reading your palm",
  failed: "Let's give it another go",
};

/**
 * The reading flow. With `partnerFor` (the visitor's own reading id) it reads
 * the partner's palm for a couple reading instead: analysis only, with the
 * partner's agreement confirmed, then on to the couple reading page.
 */
export function ReadingFlow({ partnerFor }: { partnerFor?: string } = {}) {
  const titles = partnerFor ? PARTNER_TITLES : STEP_TITLES;
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "source" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submission = useRef<Submission | null>(null);
  const inFlight = useRef(false);
  const previewUrl = step.kind === "review" ? step.image.previewUrl : null;

  // Move focus to the step heading for screen-reader and keyboard users.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step.kind]);

  useEffect(() => {
    if (!partnerFor) track("start_reading");
  }, [partnerFor]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleSource(source: Blob) {
    setStep({ kind: "checking" });
    try {
      if (source instanceof File) validateFileBasics(source);
      const image = await prepareImage(source);
      if (hasBlockingIssue(image.issues)) {
        track("image_rejected", { stage: "client", reason: image.issues[0]?.code ?? "unknown" });
      }
      setStep({ kind: "review", image });
    } catch (error) {
      const message =
        error instanceof ImageInputError
          ? error.message
          : "We couldn't read that image. Please try another photo.";
      track("image_rejected", { stage: "client", reason: "invalid_file" });
      setStep({ kind: "source", error: message });
    }
  }

  async function analyze(image: PreparedImage, choices: ReviewChoices, retry = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    const previous = submission.current;
    const current: Submission = {
      image,
      choices,
      requestId:
        retry && previous ? previous.requestId : (globalThis.crypto?.randomUUID?.() ?? undefined),
    };
    submission.current = current;
    setStep({ kind: "processing", phase: "preparing" });
    track("image_uploaded", { hand: HAND });

    const form = new FormData();
    form.set("image", image.blob, "palm.jpg");
    form.set("hand", HAND);
    form.set("consent", "true");
    form.set("trainingOptIn", String(!partnerFor && choices.trainingOptIn));
    if (partnerFor) {
      form.set("role", "partner");
      form.set("partnerConsent", "true");
    }
    if (current.requestId) form.set("requestId", current.requestId);

    try {
      setStep({ kind: "processing", phase: "analyzing" });
      // Temporary hiccups are retried quietly (same request id, so never a duplicate reading).
      let result: AnalyzeResponse | undefined;
      for (let attempt = 0; ; attempt++) {
        try {
          result = await apiFetch<AnalyzeResponse>("/api/palm/analyze", {
            method: "POST",
            body: form,
          });
          break;
        } catch (error) {
          if (attempt >= AUTO_RETRIES || !isTransientError(error)) throw error;
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        }
      }
      setStep({ kind: "processing", phase: "analyzed" });
      if (partnerFor) {
        const { compatibilityId } = await postJson<{ compatibilityId: string }>(
          "/api/compatibility",
          { readingId: partnerFor, partnerReadingId: result!.readingId },
        );
        router.push(`/compatibility/${compatibilityId}`);
        return;
      }
      // The results page shows the palm map right away and writes the interpretation there.
      router.push(`/readings/${result!.readingId}`);
    } catch (error) {
      inFlight.current = false;
      if (
        error instanceof ApiClientError &&
        (error.code === "IMAGE_QUALITY" || error.code === "IMAGE_INVALID")
      ) {
        setStep({ kind: "source", error: error.message });
        return;
      }
      if (error instanceof ApiClientError && error.details?.reason === "daily_free_palm_limit") {
        setStep({ kind: "failed", message: error.message, canRetry: false });
        return;
      }
      setStep({
        kind: "failed",
        message:
          error instanceof ApiClientError && !isTransientError(error)
            ? error.message
            : "Our palm reader is very busy right now. Your photo is ready — tap “Try again” and we'll pick up where we left off.",
        canRetry: true,
      });
    }
  }

  const stepNumber = {
    source: 1,
    camera: 1,
    checking: 1,
    review: 2,
    processing: 3,
    failed: 3,
  }[step.kind];

  return (
    <div className="mx-auto w-full max-w-xl">
      {step.kind !== "processing" ? (
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
            Step {stepNumber} of 3
          </p>
          {step.kind === "review" || step.kind === "camera" ? (
            <button
              type="button"
              className="min-h-11 rounded-full px-3 text-sm text-mist hover:text-parchment"
              onClick={() => setStep({ kind: "source" })}
            >
              ← Back
            </button>
          ) : null}
        </div>
      ) : null}

      <h1
        ref={headingRef}
        tabIndex={-1}
        className={
          step.kind === "processing"
            ? "sr-only"
            : "mb-6 text-3xl text-parchment outline-none sm:text-4xl"
        }
      >
        {titles[step.kind]}
      </h1>

      {step.kind === "source" ? (
        <div className="space-y-4">
          <p className="-mt-2 text-mist">
            {partnerFor
              ? "Ask your partner to hold their right hand inside the frame — palm facing the camera, fingers relaxed and slightly apart. Only read their palm with their agreement."
              : "Place your right hand clearly inside the frame — palm facing the camera, fingers relaxed and slightly apart."}
          </p>
          {step.error ? <Alert tone="error">{step.error}</Alert> : null}
          <PhotoSource onFile={handleSource} onOpenCamera={() => setStep({ kind: "camera" })} />
        </div>
      ) : null}

      {step.kind === "camera" ? (
        <CameraCapture
          hand={HAND}
          onCapture={handleSource}
          onCancel={() => setStep({ kind: "source" })}
        />
      ) : null}

      {step.kind === "checking" ? (
        <div className="flex flex-col items-center gap-4 py-16 text-mist">
          <Spinner label="Checking photo quality" className="scale-150" />
          Checking brightness, sharpness and framing…
        </div>
      ) : null}

      {step.kind === "review" ? (
        <PhotoReview
          previewUrl={step.image.previewUrl}
          issues={step.image.issues}
          onRetake={() => setStep({ kind: "source" })}
          onUse={(choices) => analyze(step.image, choices)}
          partner={Boolean(partnerFor)}
        />
      ) : null}

      {step.kind === "processing" ? <AnalysisProgress phase={step.phase} /> : null}

      {step.kind === "failed" ? (
        <div className="space-y-4">
          <Alert tone="error">{step.message}</Alert>
          <div className="grid gap-3 sm:grid-cols-2">
            {step.canRetry ? (
              <Button
                onClick={() =>
                  submission.current &&
                  analyze(submission.current.image, submission.current.choices, true)
                }
              >
                Try again
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setStep({ kind: "source" })}>
              Use a different photo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
