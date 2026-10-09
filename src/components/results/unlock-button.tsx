"use client";

import { useT } from "@/components/i18n/i18n";
import { BuyButton } from "@/components/payments/buy-button";

export function UnlockButton({ readingId, priceLabel }: { readingId: string; priceLabel: string }) {
  const tx = useT();
  return (
    <BuyButton
      order={{ product: "DETAILED_READING", readingId }}
      label={tx("Unlock Detailed Reading — {0}", [priceLabel])}
    />
  );
}
