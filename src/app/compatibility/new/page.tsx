import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReadingFlow } from "@/components/reading-flow/reading-flow";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { getOwnedReading } from "@/lib/readings/service";
import { IdSchema } from "@/lib/schemas/api";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Your partner's palm"),
    robots: { index: false, follow: false },
  };
}

export default async function NewCompatibilityPage({
  searchParams,
}: {
  searchParams: Promise<{ reading?: string }>;
}) {
  const { reading: readingId } = await searchParams;
  if (!readingId || !IdSchema.safeParse(readingId).success) redirect("/compatibility");
  try {
    const reading = await getOwnedReading(readingId, await getActor());
    if (reading.role !== "SELF" || !reading.analysis) redirect("/compatibility");
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  return (
    <div className="px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <ReadingFlow partnerFor={readingId} />
    </div>
  );
}
