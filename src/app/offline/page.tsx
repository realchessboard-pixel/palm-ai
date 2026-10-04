import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl">You&apos;re offline</h1>
      <p className="mt-3 text-mist">
        Palm readings need an internet connection. Please reconnect and try again.
      </p>
      <ButtonLink href="/" className="mt-8">
        Try again
      </ButtonLink>
    </div>
  );
}
