import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return { title: tx("Offline"), robots: { index: false } };
}

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl">
        <T s="You're offline" />
      </h1>
      <p className="mt-3 text-mist">
        <T s="Palm readings need an internet connection. Please reconnect and try again." />
      </p>
      <ButtonLink href="/" className="mt-8">
        <T s="Try again" />
      </ButtonLink>
    </div>
  );
}
