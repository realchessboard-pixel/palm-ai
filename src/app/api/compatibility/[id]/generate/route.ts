import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { generateCompatibility } from "@/lib/compatibility/service";
import { withErrorHandling } from "@/lib/http/errors";
import { parseParams } from "@/lib/http/request";
import { IdSchema } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 120;

type Context = { params: Promise<{ id: string }> };
const Params = z.object({ id: IdSchema });

/** Write the couple reading once it is unlocked (idempotent; 409 while in progress). */
export const POST = withErrorHandling<Context>(
  "compatibility.generate",
  async (request: NextRequest, { params }) => {
    const actor = await getActorFromRequest(request);
    await enforceRateLimit(
      "interpret",
      actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
    );
    const { id } = await parseParams(params, Params);
    return NextResponse.json(await generateCompatibility(id, actor));
  },
);
