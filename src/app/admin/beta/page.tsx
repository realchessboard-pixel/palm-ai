import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/misc";
import { getBetaReport, type BetaReportRow } from "@/lib/admin/beta-report";
import { getCurrentUser } from "@/lib/auth/actor";

export const metadata: Metadata = { title: "Beta report", robots: { index: false, follow: false } };

const secs = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`);
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function summary(rows: BetaReportRow[]) {
  const real = rows.filter((r) => !r.isDemo);
  const analyzed = real.filter((r) => r.detectedHand !== null);
  const compared = analyzed.filter((r) => r.handMismatch !== null);
  const costs = real.map((r) => r.estimatedCostInr).filter((c): c is number => c !== null);
  const pick = (k: "stage1Ms" | "stage2Ms" | "totalMs") =>
    real.map((r) => r[k]).filter((v): v is number => v !== null);
  return {
    readings: real.length,
    completed: real.filter((r) => r.status === "COMPLETE").length,
    rejected: real.filter((r) => r.status === "REJECTED").length,
    failed: real.filter((r) => r.status === "FAILED" || r.errorCode !== null).length,
    withRetries: real.filter((r) => r.retries > 0).length,
    mismatchRate: compared.length
      ? compared.filter((r) => r.handMismatch).length / compared.length
      : null,
    stage1: median(pick("stage1Ms")),
    stage2: median(pick("stage2Ms")),
    total: median(pick("totalMs")),
    avgCost: costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : null,
  };
}

/** Internal beta report (admin only). See docs/BETA_TEST_CHECKLIST.md. */
export default async function BetaReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/beta");
  if (!user.isAdmin) notFound();

  const rows = await getBetaReport(200);
  const s = summary(rows);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pt-10 pb-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Beta report</h1>
          <p className="mt-2 text-sm text-mist">
            Latest 200 readings. Demo readings are listed but excluded from the summary. The
            selected hand is always the one used — &quot;detected&quot; is only the model&apos;s
            check.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/admin" className="text-mist underline underline-offset-2">
            Admin
          </Link>
          <a
            href="/api/admin/beta-report"
            className="rounded-full border border-gold-400/40 px-4 py-2 text-gold-200"
          >
            Download CSV
          </a>
        </div>
      </div>

      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["Readings", String(s.readings)],
            ["Completed", String(s.completed)],
            ["Rejected / failed", `${s.rejected} / ${s.failed}`],
            ["With retries", String(s.withRetries)],
            ["Hand disagreement", pct(s.mismatchRate)],
            ["Median stage 1", secs(s.stage1)],
            ["Median stage 2", secs(s.stage2)],
            ["Median total", secs(s.total)],
            ["Avg est. AI cost", s.avgCost === null ? "—" : `₹${s.avgCost.toFixed(2)}`],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="card rounded-2xl p-4">
            <p className="text-xs text-mist">{label}</p>
            <p className="mt-1 text-xl text-parchment">{value}</p>
          </div>
        ))}
      </section>

      <Card as="section" className="overflow-x-auto p-0">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="text-mist">
            <tr>
              {[
                "Reading",
                "Status",
                "Selected",
                "Detected (conf.)",
                "Image conf.",
                "Stage 1",
                "Stage 2",
                "Total",
                "Retries",
                "Filtered",
                "Provider / model",
                "Est. cost",
              ].map((h) => (
                <th key={h} className="px-3 py-2 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-parchment/90">
            {rows.map((r) => (
              <tr key={r.readingId} className={r.isDemo ? "opacity-50" : undefined}>
                <td className="px-3 py-2 font-mono">
                  {r.readingId}
                  <div className="text-mist-dim">
                    {new Date(r.createdAt).toLocaleString("en", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    {r.isDemo ? " · demo" : ""}
                    {r.premium ? " · paid" : ""}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {r.status}
                  {r.errorCode ? <div className="text-red-300">{r.errorCode}</div> : null}
                </td>
                <td className="px-3 py-2">{r.selectedHand}</td>
                <td className={r.handMismatch ? "px-3 py-2 text-gold-200" : "px-3 py-2"}>
                  {r.detectedHand ?? "—"} ({pct(r.detectedHandConfidence)})
                </td>
                <td className="px-3 py-2">{pct(r.analysisConfidence)}</td>
                <td className="px-3 py-2">{secs(r.stage1Ms)}</td>
                <td className="px-3 py-2">{secs(r.stage2Ms)}</td>
                <td className="px-3 py-2">{secs(r.totalMs)}</td>
                <td className="px-3 py-2">
                  {r.retries}
                  <span className="text-mist-dim">
                    {" "}
                    ({r.analysisAttempts ?? "—"}/{r.interpretationAttempts ?? "—"})
                  </span>
                </td>
                <td className="px-3 py-2">{r.filteredItems ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.provider ?? "—"}
                  <div className="text-mist-dim">{r.interpretationModel ?? r.analysisModel}</div>
                </td>
                <td className="px-3 py-2">
                  {r.estimatedCostInr === null ? "—" : `₹${r.estimatedCostInr.toFixed(2)}`}
                  {r.costMethod ? <div className="text-mist-dim">{r.costMethod}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
