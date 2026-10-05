import { Alert } from "@/components/ui/misc";
import { lineLabel } from "@/lib/palmistry/features";
import type { PaymentState } from "@/lib/payments/states";
import type { LockedContent } from "@/lib/readings/projection";
import { SECTION_TITLES } from "@/lib/schemas/palm-interpretation";
import { OfferViewed } from "./offer-viewed";
import { UnlockButton } from "./unlock-button";

const STATE_NOTICE: Partial<Record<PaymentState, { tone: "info" | "error"; text: string }>> = {
  PAYMENT_INITIATED: {
    tone: "info",
    text: "A payment for this reading hasn't been confirmed yet. If you completed it, refresh in a moment — otherwise you can start again below.",
  },
  PAYMENT_FAILED: {
    tone: "error",
    text: "Your last payment didn't go through, so your detailed reading is still locked. You can try again below.",
  },
  PAYMENT_CANCELLED: {
    tone: "info",
    text: "Checkout was cancelled and you have not been charged. Your detailed reading is still available to unlock.",
  },
};

/**
 * The detailed-reading offer: describes what the detailed reading contains for
 * THIS reading. The content itself is not sent to the browser until a
 * verified payment unlocks it.
 */
export function PremiumPanel({
  readingId,
  locked,
  priceLabel,
  paymentsEnabled,
  paymentState = "UNPAID",
}: {
  readingId: string;
  locked: LockedContent;
  priceLabel: string;
  paymentsEnabled: boolean;
  paymentState?: PaymentState;
}) {
  const notice = STATE_NOTICE[paymentState];
  const items = [
    ...locked.detailedSections.map((id) => `In-depth ${SECTION_TITLES[id].toLowerCase()} reading`),
    ...locked.sections.map((id) => SECTION_TITLES[id]),
    ...locked.lines.map((line) => `${lineLabel(line)} reading`),
    ...(locked.mountCount > 0
      ? [`${locked.mountCount} palm mount${locked.mountCount === 1 ? "" : "s"} interpreted`]
      : []),
    ...(locked.fingers ? ["Finger & thumb analysis"] : []),
    ...(locked.markings ? ["Minor markings"] : []),
    "Downloadable PDF report",
  ];

  return (
    <section
      aria-labelledby="premium-title"
      className="relative overflow-hidden rounded-[2rem] border border-gold-400/25 bg-gradient-to-b from-gold-400/[0.09] to-transparent p-6 sm:p-10"
    >
      {paymentsEnabled ? <OfferViewed readingId={readingId} /> : null}
      <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
        Your Basic Reading Is Ready
      </p>
      <h2 id="premium-title" className="mt-2 text-3xl text-parchment">
        Want the complete picture?
      </h2>
      <p className="mt-3 max-w-xl text-mist">
        Get your full palm analysis, including detailed line, mount, finger and interpretation
        insights. It&apos;s prepared from the same photo and grounded in the features we detected.
      </p>
      {notice ? (
        <Alert tone={notice.tone} className="mt-5">
          {notice.text}
        </Alert>
      ) : null}
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-parchment/90">
            <svg
              viewBox="0 0 20 20"
              className="mt-0.5 size-4 shrink-0 text-gold-300"
              aria-hidden="true"
            >
              <path
                d="M5 10.5l3 3 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {paymentsEnabled ? (
          <>
            <p className="mb-4 flex items-baseline gap-2">
              <span className="text-4xl text-parchment">{priceLabel}</span>
              <span className="text-sm text-mist">one-time, for this reading</span>
            </p>
            <UnlockButton readingId={readingId} priceLabel={priceLabel} />
          </>
        ) : (
          <p className="text-sm text-mist">
            Detailed readings aren&apos;t available for purchase right now.
          </p>
        )}
        <p className="mt-3 text-xs text-mist-dim">
          Unlocks the detailed reading for this palm reading only. No subscription. Same
          entertainment-only disclaimer applies.
        </p>
      </div>
    </section>
  );
}
