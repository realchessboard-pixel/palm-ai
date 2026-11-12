import { getEnv } from "@/lib/config/env";

/** ads.txt: tells ad buyers AdSense may sell this site's ad space (AdSense requires it). */
export function GET() {
  const client = getEnv().NEXT_PUBLIC_ADSENSE_CLIENT;
  const body = client
    ? `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`
    : "# No ad partners configured.\n";
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
