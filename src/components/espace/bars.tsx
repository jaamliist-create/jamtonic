/** Barres horizontales en CSS : lisibles, légères, sans bibliothèque de graphiques. */
export function Bars({
  rows,
  empty,
}: {
  rows: { key: string; label: string; sub?: string; value: number; href?: string }[]
  empty: string
}) {
  if (rows.every((r) => r.value === 0)) {
    return <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">{empty}</p>
  }
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-bold">{r.label}</span>
              {r.sub ? <span className="text-muted"> · {r.sub}</span> : null}
            </span>
            <span className="display text-xl">{r.value}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-strong" aria-hidden>
            <div className="h-full rounded-full bg-tonic" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function StatTile({
  label,
  value,
  href,
  tone = 'text-cream',
}: {
  label: string
  value: number | string
  href?: string
  tone?: string
}) {
  const body = (
    <>
      <p className={`display text-5xl ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </>
  )
  return href ? (
    <a href={href} className="card block p-4 transition-colors hover:border-tonic/60">
      {body}
    </a>
  ) : (
    <div className="card p-4">{body}</div>
  )
}
