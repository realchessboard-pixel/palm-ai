import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseParams } from "@/lib/http/request";
import { unlockWithCredit } from "@/lib/payments/service";
import { IdSchema } from "@/lib/schemas/api";

type Context = { params: Promise<{ id: string }> };
const Params = z.object({ id: IdSchema });

/** Unlock this reading's detailed reading with one of the user's reading credits. */
export const POST = withErrorHandling<Context>(
  "readings.unlock_with_credit",
  async (request: NextRequest, { params }) => {
    const { id } = await parseParams(params, Params);
    await unlockWithCredit(id, await getActorFromRequest(request));
    return NextResponse.json({ ok: true });
  },
);
