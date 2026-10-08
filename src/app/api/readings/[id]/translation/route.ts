import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody, parseParams } from "@/lib/http/request";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";
import { ensureTranslation } from "@/lib/readings/translation";
import { IdSchema } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

type Context = { params: Promise<{ id: string }> };
const Params = z.object({ id: IdSchema });
const Body = z.object({ language: z.enum(LANGUAGE_CODES) });

/**
 * Translate the visible text of a finished reading into another language.
 * The palm analysis and the reading are never regenerated; translations are
 * cached, so asking again for the same language costs nothing.
 */
export const POST = withErrorHandling<Context>(
  "readings.translate",
  async (request: NextRequest, { params }) => {
    const { id } = await parseParams(params, Params);
    const actor = await getActorFromRequest(request);
    const { language } = await parseJsonBody(request, Body);
    await enforceRateLimit(
      "translate",
      actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
    );
    return NextResponse.json(await ensureTranslation(id, language, actor));
  },
);
