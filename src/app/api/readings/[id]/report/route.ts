import type { NextRequest } from "next/server";
import { z } from "zod";
import { trackServerEvent } from "@/lib/analytics/server";
import { getActorFromRequest } from "@/lib/auth/actor";
import { AppError, withErrorHandling } from "@/lib/http/errors";
import { parseParams } from "@/lib/http/request";
import { getReadingView } from "@/lib/readings/service";
import { renderReadingPdf } from "@/lib/report/pdf";
import { IdSchema } from "@/lib/schemas/api";

type Context = { params: Promise<{ id: string }> };
const Params = z.object({ id: IdSchema });

/** Downloadable PDF of the full report. Premium entitlement is checked server-side. */
export const GET = withErrorHandling<Context>(
  "readings.report",
  async (request: NextRequest, { params }) => {
    const { id } = await parseParams(params, Params);
    const actor = await getActorFromRequest(request);
    const reading = await getReadingView(id, actor);
    if (reading.status !== "COMPLETE" || !reading.interpretation) throw new AppError("NOT_FOUND");
    if (!reading.premium) {
      throw new AppError("FORBIDDEN", {
        message: "The downloadable report is part of the full reading.",
      });
    }
    const pdf = await renderReadingPdf(reading);
    await trackServerEvent("report_downloaded", { userId: actor.user?.id, readingId: id });
    const date = reading.createdAt.slice(0, 10);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="palm-reading-${date}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
);
