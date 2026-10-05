import { NextResponse, type NextRequest } from "next/server";
import { betaReportCsv, getBetaReport } from "@/lib/admin/beta-report";
import { getActorFromRequest, requireAdmin } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";

/** Admin-only CSV export of the beta report. */
export const GET = withErrorHandling("admin.beta_report", async (request: NextRequest) => {
  requireAdmin(await getActorFromRequest(request));
  const csv = betaReportCsv(await getBetaReport(1000));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="palmai-beta-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
