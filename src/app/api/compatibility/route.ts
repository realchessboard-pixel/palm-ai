import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { createCompatibility } from "@/lib/compatibility/service";
import { withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { IdSchema } from "@/lib/schemas/api";

const Body = z.object({ readingId: IdSchema, partnerReadingId: IdSchema });

/** Pair the visitor's reading with their partner's analysed palm. */
export const POST = withErrorHandling("compatibility.create", async (request: NextRequest) => {
  const actor = await getActorFromRequest(request);
  const body = await parseJsonBody(request, Body);
  return NextResponse.json(await createCompatibility(body, actor), { status: 201 });
});
