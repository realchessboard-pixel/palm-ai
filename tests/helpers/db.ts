import { db } from "@/lib/db";
import { MemoryRateLimiter, setRateLimiter } from "@/lib/security/rate-limit";
import { MemoryStorage } from "@/lib/storage/memory";
import { setStorage } from "@/lib/storage";

/** True when an integration test database is configured. */
export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

if (!hasTestDatabase) {
  console.warn("TEST_DATABASE_URL not set — skipping database integration tests.");
}

const TABLES = [
  "DailyHoroscope",
  "KundliProfile",
  "ReaderMessage",
  "ReaderChat",
  "LedgerEntry",
  "GiftCode",
  "Referral",
  "Compatibility",
  "ProcessedWebhookEvent",
  "UsageEvent",
  "Entitlement",
  "Payment",
  "PalmInterpretation",
  "PalmAnalysis",
  "Reading",
  "Session",
  "User",
];

export async function resetDatabase(): Promise<MemoryStorage> {
  await db.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
  const storage = new MemoryStorage();
  setStorage(storage);
  setRateLimiter(new MemoryRateLimiter());
  return storage;
}
