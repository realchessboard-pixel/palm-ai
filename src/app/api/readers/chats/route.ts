import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ensureGuestKey, getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { startReaderChat } from "@/lib/readers/service";
import { IdSchema } from "@/lib/schemas/api";

const Body = z.object({
  readerId: z.string().regex(/^[a-z-]{2,40}$/),
  readingId: IdSchema.optional(),
});

/** Start (or reopen) a chat with an AI reader. */
export const POST = withErrorHandling("readers.start_chat", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  const body = await parseJsonBody(request, Body);
  const guest = actor.user ? null : ensureGuestKey(request, actor);
  const result = await startReaderChat(
    { ...body, guestKeyHash: guest?.guestKeyHash ?? null },
    actor,
  );
  const response = NextResponse.json(result, { status: 201 });
  return guest ? guest.apply(response) : response;
});
