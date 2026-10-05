import { NextResponse, type NextRequest } from "next/server";
import { getActorFromRequest, requireUser } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";
import { listReadingsForUser } from "@/lib/readings/service";

export const GET = withErrorHandling("readings.list", async (request: NextRequest) => {
  const user = requireUser(await getActorFromRequest(request));
  return NextResponse.json({ readings: await listReadingsForUser(user.id) });
});
