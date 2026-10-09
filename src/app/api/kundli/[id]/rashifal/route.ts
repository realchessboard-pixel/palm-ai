import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseParams } from "@/lib/http/request";
import { languageFromRequest } from "@/lib/i18n/server";
import { generateRashifalReport } from "@/lib/kundli/rashifal-service";
import { IdSchema } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 300;
type Context = { params: Promise<{ id: string }> };
const Params = z.object({ id: IdSchema });

/** Write the paid Detailed Rashifal (idempotent; 409 while in progress). */
export const POST = withErrorHandling<Context>(
  "kundli.rashifal",
  async (request: NextRequest, { params }) => {
    const actor = await getActorFromRequest(request);
    await enforceRateLimit(
      "interpret",
      actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
    );
    const { id } = await parseParams(params, Params);
    return NextResponse.json(await generateRashifalReport(id, actor, languageFromRequest(request)));
  },
);
