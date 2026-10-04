/**
 * Single-series bar chart (readings per day). One series, so no legend; the
 * heading names it. Values appear on hover/focus and in the table view.
 */
export function ReadingsChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const label = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString("en", { weekday: "short", timeZone: "UTC" });

  return (
    <figure>
      <div className="flex h-40 items-end gap-2 border-b border-white/15 pb-px" aria-hidden="true">
        {data.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-gold-400 transition-opacity group-hover:opacity-80"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 0 }}
            />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-night-700 px-2 py-0.5 text-xs whitespace-nowrap text-parchment group-hover:block">
              {d.count} reading{d.count === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-center text-xs text-mist" aria-hidden="true">
        {data.map((d) => (
          <span key={d.day} className="flex-1">
            {label(d.day)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Readings created per day, last 7 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Readings</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
