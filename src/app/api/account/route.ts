import { NextResponse, type NextRequest } from "next/server";
import { deleteAccount } from "@/lib/auth/accounts";
import { getActorFromRequest, requireUser } from "@/lib/auth/actor";
import { GUEST_COOKIE, SESSION_COOKIE } from "@/lib/auth/cookies";
import { verifyPassword } from "@/lib/auth/crypto";
import { db } from "@/lib/db";
import { AppError, withErrorHandling } from "@/lib/http/errors";
import { parseJsonBody } from "@/lib/http/request";
import { AccountUpdateSchema, DeleteAccountSchema } from "@/lib/schemas/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

/** Update privacy preferences. */
export const PATCH = withErrorHandling("account.update", async (request: NextRequest) => {
  const user = requireUser(await getActorFromRequest(request));
  const input = await parseJsonBody(request, AccountUpdateSchema);
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...(input.trainingOptIn !== undefined ? { trainingOptIn: input.trainingOptIn } : {}),
      ...(input.name !== undefined ? { name: input.name || null } : {}),
    },
    select: { trainingOptIn: true, name: true },
  });
  return NextResponse.json({ account: updated });
});

/** Permanently delete the account and all personal data. Requires the password. */
export const DELETE = withErrorHandling("account.delete", async (request: NextRequest) => {
  const user = requireUser(await getActorFromRequest(request));
  await enforceRateLimit("auth", `delete:${user.id}`);
  const { password } = await parseJsonBody(request, DeleteAccountSchema);
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(password, record.passwordHash))) {
    throw new AppError("FORBIDDEN", { message: "That password is incorrect." });
  }
  await deleteAccount(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(GUEST_COOKIE);
  return response;
});
