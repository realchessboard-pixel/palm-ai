"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/misc";
import { track } from "@/lib/analytics/client";
import { ApiClientError, apiFetch, postJson } from "@/lib/api-client";
import {
  ImageInputError,
  prepareImage,
  validateFileBasics,
  type PreparedImage,
} from "@/lib/image/client-image";
import { hasBlockingIssue } from "@/lib/image/quality";
import { AnalysisProgress, type PipelinePhase } from "./analysis-progress";
import { CameraCapture } from "./camera-capture";
import { HandSelector, type Hand } from "./hand-selector";
import { PhotoReview, type ReviewChoices } from "./photo-review";
import { PhotoSource } from "./photo-source";

type Step =
  | { kind: "hand" }
  | { kind: "source"; error?: string }
  | { kind: "camera" }
  | { kind: "checking" }
  | { kind: "review"; image: PreparedImage }
  | { kind: "processing"; phase: PipelinePhase }
  | { kind: "failed"; message: string; readingId?: string; canRetryInterpretation: boolean };

interface AnalyzeResponse {
  readingId: string;
  status: string;
}

const STEP_TITLES: Record<Step["kind"], string> = {
  hand: "Which hand would you like read?",
  source: "Add a photo of your palm",
  camera: "Position your palm",
  checking: "Checking your photo",
  review: "Review your photo",
  processing: "Reading your palm",
  failed: "Something went wrong",
};

export function ReadingFlow() {
  const router = useRouter();
  const [hand, setHand] = useState<Hand | null>(null);
  const [step, setStep] = useState<Step>({ kind: "hand" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previewUrl = step.kind === "review" ? step.image.previewUrl : null;

  // Move focus to the step heading for screen-reader and keyboard users.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step.kind]);

  useEffect(() => {
    track("start_reading");
  }, []);

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

  async function interpret(readingId: string) {
    setStep({ kind: "processing", phase: "interpreting" });
    try {
      await postJson("/api/palm/interpret", { readingId });
      setStep({ kind: "processing", phase: "done" });
      router.push(`/readings/${readingId}`);
    } catch (error) {
      setStep({
        kind: "failed",
        message:
          error instanceof ApiClientError
            ? error.message
            : "We couldn't finish your reading. Please try again.",
        readingId,
        canRetryInterpretation: true,
      });
    }
  }

  async function analyze(image: PreparedImage, choices: ReviewChoices) {
    if (!hand) return;
    setStep({ kind: "processing", phase: "preparing" });
    track("image_uploaded", { hand });

    const form = new FormData();
    form.set("image", image.blob, "palm.jpg");
    form.set("hand", hand);
    form.set("consent", "true");
    form.set("trainingOptIn", String(choices.trainingOptIn));

    try {
      setStep({ kind: "processing", phase: "analyzing" });
      const result = await apiFetch<AnalyzeResponse>("/api/palm/analyze", {
        method: "POST",
        body: form,
      });
      await interpret(result.readingId);
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.code === "IMAGE_QUALITY" || error.code === "IMAGE_INVALID")
      ) {
        setStep({ kind: "source", error: error.message });
        return;
      }
      setStep({
        kind: "failed",
        message:
          error instanceof ApiClientError
            ? error.message
            : "We couldn't analyze this palm right now. Please try again.",
        canRetryInterpretation: false,
      });
    }
  }

  const stepNumber = {
    hand: 1,
    source: 2,
    camera: 2,
    checking: 2,
    review: 3,
    processing: 4,
    failed: 4,
  }[step.kind];

  return (
    <div className="mx-auto w-full max-w-xl">
      {step.kind !== "processing" ? (
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
            Step {stepNumber} of 4
          </p>
          {step.kind !== "hand" && step.kind !== "failed" ? (
            <button
              type="button"
              className="min-h-11 rounded-full px-3 text-sm text-mist hover:text-parchment"
              onClick={() =>
                setStep(step.kind === "review" ? { kind: "source" } : { kind: "hand" })
              }
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
        {STEP_TITLES[step.kind]}
      </h1>

      {step.kind === "hand" ? (
        <div className="space-y-6">
          <HandSelector value={hand} onChange={setHand} />
          <Button
            size="lg"
            className="w-full"
            disabled={!hand}
            onClick={() => setStep({ kind: "source" })}
          >
            Continue
          </Button>
        </div>
      ) : null}

      {step.kind === "source" ? (
        <div className="space-y-4">
          {step.error ? <Alert tone="error">{step.error}</Alert> : null}
          <PhotoSource onFile={handleSource} onOpenCamera={() => setStep({ kind: "camera" })} />
        </div>
      ) : null}

      {step.kind === "camera" && hand ? (
        <CameraCapture
          hand={hand}
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
        />
      ) : null}

      {step.kind === "processing" ? <AnalysisProgress phase={step.phase} /> : null}

      {step.kind === "failed" ? (
        <div className="space-y-4">
          <Alert tone="error">{step.message}</Alert>
          <div className="grid gap-3 sm:grid-cols-2">
            {step.canRetryInterpretation && step.readingId ? (
              <Button onClick={() => interpret(step.readingId!)}>Try again</Button>
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
