"use client";

/**
 * Saves the paid result as a PDF through the browser's print dialog ("Save as
 * PDF"). This keeps every script (Devanagari, Tamil, Bengali…) exactly as shown
 * on screen; print styles hide the site chrome.
 */
export function DownloadButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--rule)] px-5 text-sm font-medium hover:border-[var(--color-gold-400)]"
    >
      <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
        <path
          d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
