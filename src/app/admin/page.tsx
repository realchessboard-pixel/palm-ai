import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReadingsChart } from "@/components/admin/readings-chart";
import { Card } from "@/components/ui/misc";
import { getAdminStats } from "@/lib/admin/stats";
import { getCurrentUser } from "@/lib/auth/actor";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

function money(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** digits);
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card rounded-2xl p-5">
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-1 font-display text-3xl text-parchment">{value}</p>
      {hint ? <p className="mt-1 text-xs text-mist-dim">{hint}</p> : null}
    </div>
  );
}

/**
 * Admin dashboard. Access requires a signed-in user with the ADMIN role (or an
 * email listed in ADMIN_EMAILS). Others get a 404 so the page isn't discoverable.
 */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) notFound();

  const stats = await getAdminStats();
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pt-10 pb-20 sm:px-6">
      <div>
        <h1 className="text-4xl">Admin</h1>
        <p className="mt-2 text-mist">Aggregate metrics only — no personal data is shown here.</p>
      </div>

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total users" value={stats.totalUsers.toLocaleString()} />
        <Stat label="Total readings" value={stats.totalReadings.toLocaleString()} />
        <Stat
          label="Free readings"
          value={stats.freeReadings.toLocaleString()}
          hint="Completed, not unlocked"
        />
        <Stat label="Premium readings" value={stats.premiumReadings.toLocaleString()} />
        <Stat
          label="Conversion rate"
          value={pct(stats.conversionRate)}
          hint="Premium ÷ completed readings"
        />
        <Stat label="AI errors (30 days)" value={stats.aiErrors30d.toLocaleString()} />
        <Stat label="Rejected photos (30 days)" value={stats.rejectedPhotos30d.toLocaleString()} />
        <Stat
          label="Revenue"
          value={
            stats.revenue.length
              ? stats.revenue.map((r) => money(r.amount, r.currency)).join(" · ")
              : "—"
          }
          hint="Paid payments, all time"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card as="section">
          <h2 className="text-xl">Readings, last 7 days</h2>
          <div className="mt-6">
            <ReadingsChart data={stats.readingsLast7Days} />
          </div>
        </Card>
        <Card as="section">
          <h2 className="text-xl">Recent activity</h2>
          {stats.recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-mist">No events yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5 text-sm">
              {stats.recentActivity.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-mono text-parchment/90">{e.name}</span>
                  <span className="text-xs text-mist">
                    {e.signedIn ? "member · " : "guest · "}
                    {new Date(e.createdAt).toLocaleString("en", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
