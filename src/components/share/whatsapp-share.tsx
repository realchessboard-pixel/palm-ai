"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/cn";

/** wa.me link with a prefilled message. WhatsApp opens; nothing is sent until the visitor taps send. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Share on WhatsApp (and copy the link as a fallback). The visitor chooses
 * whom to send it to — we never message anyone ourselves.
 */
export function WhatsAppShare({
  text,
  url,
  label = "Share on WhatsApp",
  context,
  className,
}: {
  text: string;
  url: string;
  label?: string;
  /** Analytics label for where the share happened (e.g. "reading", "gift"). */
  context: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      <a
        href={whatsappUrl(`${text}\n${url}`)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("share_clicked", { channel: "whatsapp", context })}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-[0.95rem] font-medium text-[#062b14] transition-all hover:brightness-110 active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.6-.3Z"
          />
        </svg>
        {label}
      </a>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            track("share_clicked", { channel: "copy", context });
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Link copied" : "Copy link"}
      </Button>
    </div>
  );
}
