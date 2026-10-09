"use client";

import { msg } from "@/lib/i18n/msg";
import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/image/quality";
import { cn } from "@/lib/cn";

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

/** Choose how to provide a photo: live camera, gallery/file picker, or drag & drop. */
export function PhotoSource({
  onFile,
  onOpenCamera,
  disabled,
}: {
  onFile: (file: File) => void;
  onOpenCamera: () => void;
  disabled?: boolean;
}) {
  const tx = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-3xl border-2 border-dashed p-6 text-center transition-colors sm:p-10",
          dragging ? "border-gold-300 bg-gold-400/10" : "border-white/12 bg-white/[0.02]",
        )}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
          <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
            <path
              d="M12 16V4m0 0L7 9m5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="mt-4 font-medium text-parchment">
          <T s="Add a photo of your palm" />
        </p>
        <p className="mt-1 text-sm text-mist">
          <T
            s="{0}JPG, PNG or WebP, up to 15 MB."
            v={[
              <span key={0} className="hidden sm:inline">
                <T s="Drag and drop an image here, or choose an option below." />
              </span>,
            ]}
          />
        </p>

        <div className="mt-6 grid gap-3 sm:mx-auto sm:max-w-md sm:grid-cols-2">
          <Button onClick={onOpenCamera} disabled={disabled}>
            <T
              s="{0}Take photo"
              v={[
                <svg key={0} viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <path
                    d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>,
              ]}
            />
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileInput.current?.click()}
            disabled={disabled}
          >
            <T s="Choose from gallery" />
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label={tx("Upload a palm photo")}
          tabIndex={-1}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <ul className="grid gap-2 text-sm text-mist sm:grid-cols-2">
        {[
          msg("Place your entire palm inside the frame"),
          msg("Keep your fingers naturally separated"),
          msg("Use bright, even lighting"),
          msg("Hold the camera directly above your palm"),
        ].map((tip) => (
          <li key={tip} className="flex items-start gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-300" aria-hidden="true" />
            <T s={tip} />
          </li>
        ))}
      </ul>
    </div>
  );
}
