import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { parseParams } from "@/lib/http/request";
import { deleteReading, getReadingView } from "@/lib/readings/service";
import { IdSchema } from "@/lib/schemas/api";

type Context = { params: Promise<{ id: string }> };
const Params = z.object({ id: IdSchema });

export const GET = withErrorHandling<Context>(
  "readings.get",
  async (request: NextRequest, { params }) => {
    const { id } = await parseParams(params, Params);
    const reading = await getReadingView(id, await getActorFromRequest(request));
    return NextResponse.json({ reading });
  },
);

export const DELETE = withErrorHandling<Context>(
  "readings.delete",
  async (request: NextRequest, { params }) => {
    const { id } = await parseParams(params, Params);
    await deleteReading(id, await getActorFromRequest(request));
    return NextResponse.json({ ok: true });
  },
);
