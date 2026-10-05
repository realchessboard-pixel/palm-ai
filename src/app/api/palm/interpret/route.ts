import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { interpretReading } from "@/lib/pipeline/interpret";
import { ReadingIdBody } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 120;

/** Stage 2: turn stored observations into a grounded palmistry reading. */
export const POST = withErrorHandling("palm.interpret", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  await enforceRateLimit(
    "interpret",
    actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
  );
  const { readingId } = await parseJsonBody(request, ReadingIdBody);
  const result = await interpretReading(readingId, actor);
  return NextResponse.json(result);
});
