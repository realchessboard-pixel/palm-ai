import type { NextRequest } from "next/server";
import { z } from "zod";
import { getActorFromRequest } from "@/lib/auth/actor";
import { AppError, withErrorHandling } from "@/lib/http/errors";
import { parseParams } from "@/lib/http/request";
import { getOwnedReading } from "@/lib/readings/service";
import { IdSchema } from "@/lib/schemas/api";
import { getStorage } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };
const Params = z.object({ id: IdSchema });

/**
 * Serves a reading's palm photo to its owner only. There is no public URL:
 * every request is authorised and the response is marked private/no-store.
 */
export const GET = withErrorHandling<Context>(
  "readings.image",
  async (request: NextRequest, { params }) => {
    const { id } = await parseParams(params, Params);
    const reading = await getOwnedReading(id, await getActorFromRequest(request));
    const thumb = request.nextUrl.searchParams.get("size") === "thumb";
    const key = thumb ? reading.thumbnailKey : reading.imageKey;
    if (!key) throw new AppError("NOT_FOUND");
    const object = await getStorage().get(key);
    if (!object) throw new AppError("NOT_FOUND");

    return new Response(new Uint8Array(object.data), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(object.data.length),
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);
