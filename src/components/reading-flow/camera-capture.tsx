"use client";

import { msg } from "@/lib/i18n/msg";
import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { PalmGuide } from "@/components/palm/palm-guide";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/misc";
import { captureVideoFrame } from "@/lib/image/client-image";

const TIPS = [
  msg("Place your entire right palm inside the frame."),
  msg("Keep your fingers naturally separated."),
  msg("Use bright, even lighting."),
  msg("Keep the camera directly above your palm."),
];

type CameraState = "starting" | "live" | "denied" | "unavailable";

/**
 * Live camera with a palm-shaped guide. Camera permission is requested only
 * when this component mounts, i.e. after the user explicitly taps "Take photo".
 */
export function CameraCapture({
  hand,
  onCapture,
  onCancel,
}: {
  hand: "left" | "right";
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const tx = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [capturing, setCapturing] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("unavailable");
        return;
      }
      setState("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stop();
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setState("live");
      } catch (error) {
        if (cancelled) return;
        const name = (error as { name?: string })?.name;
        setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      }
    }
    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, stop]);

  useEffect(() => {
    const id = window.setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 3500);
    return () => window.clearInterval(id);
  }, []);

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setCapturing(true);
    try {
      const blob = await captureVideoFrame(video);
      stop();
      onCapture(blob);
    } finally {
      setCapturing(false);
    }
  }

  if (state === "denied" || state === "unavailable") {
    return (
      <div className="space-y-4">
        <Alert
          tone="warning"
          title={state === "denied" ? tx("Camera access was blocked") : tx("Camera unavailable")}
        >
          {state === "denied"
            ? tx(
                "You can allow camera access in your browser settings, or upload a photo from your gallery instead.",
              )
            : tx(
                "We couldn't start a camera on this device. Please upload a photo from your gallery instead.",
              )}
        </Alert>
        <Button variant="secondary" className="w-full" onClick={onCancel}>
          <T s="Back to upload options" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label={tx("Live camera preview")}
          className="absolute inset-0 size-full object-cover"
          style={facing === "user" ? { transform: "scaleX(-1)" } : undefined}
        />
        <PalmGuide hand={hand} className="absolute inset-[6%] size-[88%]" />
        {state === "starting" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-night-950/80 text-sm text-mist">
            <T s="{0}Starting camera…" v={[<Spinner key={0} label={tx("Starting camera")} />]} />
          </div>
        ) : null}
        <p
          aria-live="polite"
          className="absolute inset-x-3 bottom-3 rounded-2xl bg-night-950/75 px-4 py-2.5 text-center text-sm text-parchment backdrop-blur"
        >
          <T s={TIPS[tipIndex]!} />
        </p>
      </div>

      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <Button variant="ghost" onClick={onCancel}>
          <T s="Cancel" />
        </Button>
        <button
          type="button"
          onClick={capture}
          disabled={state !== "live" || capturing}
          aria-label={tx("Capture photo")}
          className="inline-flex size-20 items-center justify-center rounded-full border-4 border-gold-200/80 bg-gold-300/20 transition-transform active:scale-95 disabled:opacity-40"
        >
          <span className="block size-14 rounded-full bg-gradient-to-b from-gold-200 to-gold-500" />
        </button>
        <Button
          variant="ghost"
          aria-label={tx("Switch camera")}
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
        >
          <T
            s="{0}Flip"
            v={[
              <svg key={0} viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path
                  d="M4 8h3l2-3h6l2 3h3v11H4zM9 13a3 3 0 0 0 5.5 1.7M15 12a3 3 0 0 0-5.5-1.7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>,
            ]}
          />
        </Button>
      </div>
    </div>
  );
}
