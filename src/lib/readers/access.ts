import "server-only";
import { canAccessReading, type Actor } from "@/lib/auth/actor";
import { db } from "@/lib/db";
import { AppError } from "@/lib/http/errors";

/** Load a reader chat the actor may see (unknown and foreign ones are both NOT_FOUND). */
export async function getOwnedReaderChat(id: string, actor: Actor) {
  const chat = await db.readerChat.findUnique({ where: { id } });
  if (!chat || !canAccessReading(actor, chat)) throw new AppError("NOT_FOUND");
  return chat;
}
