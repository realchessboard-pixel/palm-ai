import { NextResponse, type NextRequest } from "next/server";
import { AppError, withErrorHandling } from "@/lib/http/errors";
import { handleWebhook } from "@/lib/payments/service";

const MAX_WEBHOOK_BYTES = 256 * 1024;

/** Signature-verified webhook. The raw body is required for HMAC verification. */
export const POST = withErrorHandling("payments.webhook.stripe", async (request: NextRequest) => {
  const rawBody = await request.text();
  if (rawBody.length > MAX_WEBHOOK_BYTES) throw new AppError("VALIDATION_ERROR");
  const result = await handleWebhook("STRIPE", rawBody, request.headers);
  return NextResponse.json({ received: true, ...result });
});
