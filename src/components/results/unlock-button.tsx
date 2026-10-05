"use client";

import { BuyButton } from "@/components/payments/buy-button";

export function UnlockButton({ readingId, priceLabel }: { readingId: string; priceLabel: string }) {
  return (
    <BuyButton
      order={{ product: "DETAILED_READING", readingId }}
      label={`Unlock Detailed Reading — ${priceLabel}`}
    />
  );
}
