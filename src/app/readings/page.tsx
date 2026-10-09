import { getLanguage } from "@/lib/i18n/server";
import { localeFor } from "@/lib/i18n/languages";
import { msg } from "@/lib/i18n/msg";
import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteReadingButton } from "@/components/account/delete-reading-button";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/actor";
import { listReadingsForUser } from "@/lib/readings/service";
import type { ReadingStatusView } from "@/lib/readings/view";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return { title: tx("Your Readings"), robots: { index: false } };
}

const STATUS: Record<ReadingStatusView, { label: string; tone: string }> = {
  COMPLETE: { label: msg("Complete"), tone: "text-emerald-300 border-emerald-400/30" },
  REJECTED: { label: msg("Photo not readable"), tone: "text-gold-200 border-gold-400/30" },
  FAILED: { label: msg("Didn't finish"), tone: "text-red-300 border-red-400/30" },
  PENDING: { label: msg("In progress"), tone: "text-mist border-white/15" },
  ANALYZING: { label: msg("In progress"), tone: "text-mist border-white/15" },
  ANALYZED: { label: msg("Needs finishing"), tone: "text-mist border-white/15" },
  INTERPRETING: { label: msg("In progress"), tone: "text-mist border-white/15" },
};

export default async function ReadingsPage() {
  const tx = await getT();
  const locale = localeFor(await getLanguage());
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/readings");
  const readings = await listReadingsForUser(user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl text-parchment">
            <T s="Your Readings" />
          </h1>
          <p className="mt-2 text-mist">
            <T s="Private to you. Delete any reading at any time." />
          </p>
        </div>
        <ButtonLink href="/read">
          <T s="New reading" />
        </ButtonLink>
      </div>

      {readings.length === 0 ? (
        <div className="card mt-10 rounded-3xl p-10 text-center">
          <p className="text-lg text-parchment">
            <T s="No readings yet." />
          </p>
          <p className="mt-2 text-mist">
            <T s="Your palm readings will appear here." />
          </p>
          <ButtonLink href="/read" className="mt-6">
            <T s="Read My Palm" />
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {readings.map((r) => (
            <li key={r.id} className="card flex flex-col overflow-hidden rounded-3xl">
              <div className="relative aspect-[4/3] bg-night-800">
                {r.hasImage ? (
                  // Private thumbnail served through an authenticated route.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/readings/${r.id}/image?size=thumb`}
                    alt={tx("Thumbnail of your {0} palm", [r.hand])}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-mist-dim">
                    <T s="Photo deleted" />
                  </div>
                )}
                {r.premium ? (
                  <span className="absolute top-3 left-3 rounded-full bg-gold-300 px-2.5 py-1 text-xs font-semibold text-night-950">
                    <T s="Full report" />
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <time dateTime={r.createdAt} className="text-mist">
                    {new Date(r.createdAt).toLocaleDateString(locale, { dateStyle: "medium" })}
                  </time>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS[r.status].tone}`}
                  >
                    <T s={STATUS[r.status].label} />
                  </span>
                </div>
                <p className="font-display text-lg text-parchment">
                  {r.headline ??
                    (r.hand === "left" ? tx("Left hand reading") : tx("Right hand reading"))}
                </p>
                <p className="text-xs text-mist">
                  {r.hand === "left" ? tx("Left hand") : tx("Right hand")}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <Link
                    href={`/readings/${r.id}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-white/5 px-5 text-sm text-parchment hover:bg-white/10"
                  >
                    <T s="View" />
                  </Link>
                  <DeleteReadingButton readingId={r.id} size="sm" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
