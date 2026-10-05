import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ensureGuestKey, getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { BirthSchema, createKundli } from "@/lib/kundli/service";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

const Body = z.object({ name: z.string().trim().max(60), birth: BirthSchema });

/** Save a birth chart so its full reading can be bought and written. */
export const POST = withErrorHandling("kundli.create", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  await enforceRateLimit(
    "general",
    actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
  );
  const body = await parseJsonBody(request, Body);
  const guest = actor.user ? null : ensureGuestKey(request, actor);
  const result = await createKundli({ ...body, guestKeyHash: guest?.guestKeyHash ?? null }, actor);
  const response = NextResponse.json(result, { status: 201 });
  return guest ? guest.apply(response) : response;
});
