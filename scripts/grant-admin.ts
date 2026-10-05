/**
 * Grant the ADMIN role to an existing account:
 *   npm run admin:grant -- someone@example.com
 * There is no default admin account or password; access is always tied to a
 * real user who signs in normally.
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run admin:grant -- <email>");
    process.exit(1);
  }
  const db = new PrismaClient();
  try {
    const user = await db.user
      .update({ where: { email }, data: { role: "ADMIN" } })
      .catch(() => null);
    if (!user) {
      console.error(`No account found for ${email}. Sign up first, then run this again.`);
      process.exit(1);
    }
    console.log(`${email} is now an admin.`);
  } finally {
    await db.$disconnect();
  }
}

void main();
