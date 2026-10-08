import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody, parseParams } from "@/lib/http/request";
import { MAX_QUESTION_LENGTH, askReader } from "@/lib/readers/service";
import { IdSchema } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 120;

type Context = { params: Promise<{ id: string }> };
const Params = z.object({ id: IdSchema });
const Body = z.object({ text: z.string().trim().min(1).max(MAX_QUESTION_LENGTH) });

/** Ask the reader a question (uses one paid or free question). */
export const POST = withErrorHandling<Context>(
  "readers.ask",
  async (request: NextRequest, { params }) => {
    const actor = await getActorFromRequest(request);
    await enforceRateLimit(
      "reader",
      actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
    );
    const { id } = await parseParams(params, Params);
    const { text } = await parseJsonBody(request, Body);
    return NextResponse.json(await askReader(id, text, actor));
  },
);
