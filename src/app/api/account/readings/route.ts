import { NextResponse, type NextRequest } from "next/server";
import { deleteAllUserReadings } from "@/lib/auth/accounts";
import { getActorFromRequest, requireUser } from "@/lib/auth/actor";
import { withErrorHandling } from "@/lib/http/errors";

/** "Delete my data": remove every reading and photo but keep the account. */
export const DELETE = withErrorHandling("account.readings.delete", async (request: NextRequest) => {
  const user = requireUser(await getActorFromRequest(request));
  const deleted = await deleteAllUserReadings(user.id);
  return NextResponse.json({ deleted });
});
