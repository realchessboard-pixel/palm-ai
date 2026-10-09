import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ensureGuestKey, getActorFromRequest } from "@/lib/auth/actor";
import { languageFromRequest } from "@/lib/i18n/server";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { LIFE_AREA_IDS } from "@/lib/kundli/areas";
import { BirthSchema, createKundli } from "@/lib/kundli/service";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

const Body = z.object({
  name: z.string().trim().max(60),
  birth: BirthSchema,
  area: z.enum(LIFE_AREA_IDS).default("career"),
  /** "rashifal": save the chart for the Detailed Rashifal (no free answer is written). */
  purpose: z.enum(["mahakundli", "rashifal"]).default("mahakundli"),
});

/** Save a birth chart and write its one free Mahakundli answer. */
export const POST = withErrorHandling("kundli.create", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  await enforceRateLimit(
    "general",
    actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
  );
  const body = await parseJsonBody(request, Body);
  const guest = actor.user ? null : ensureGuestKey(request, actor);
  const result = await createKundli(
    {
      ...body,
      guestKeyHash: guest?.guestKeyHash ?? null,
      language: languageFromRequest(request),
      withTeaser: body.purpose === "mahakundli",
    },
    actor,
  );
  const response = NextResponse.json(result, { status: 201 });
  return guest ? guest.apply(response) : response;
});
