import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ensureGuestKey, getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { createMilan } from "@/lib/kundli/milan-service";
import { BirthSchema } from "@/lib/kundli/service";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

const Person = z.object({ name: z.string().trim().max(60), birth: BirthSchema });
const Body = z.object({ a: Person, b: Person });

/** Match two Kundlis (no AI call: the score is calculated). */
export const POST = withErrorHandling("milan.create", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  await enforceRateLimit(
    "general",
    actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
  );
  const body = await parseJsonBody(request, Body);
  const guest = actor.user ? null : ensureGuestKey(request, actor);
  const result = await createMilan({ ...body, guestKeyHash: guest?.guestKeyHash ?? null }, actor);
  const response = NextResponse.json(result, { status: 201 });
  return guest ? guest.apply(response) : response;
});
