import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { confirmRazorpayPayment } from "@/lib/payments/service";
import { RazorpayVerifySchema } from "@/lib/schemas/api";

export const POST = withErrorHandling("payments.razorpay.verify", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  const input = await parseJsonBody(request, RazorpayVerifySchema);
  return NextResponse.json(await confirmRazorpayPayment(input, actor));
});
