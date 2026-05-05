function fmtUsd(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1000) return `$${v.toFixed(0)}`
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`
  return `$${v.toFixed(2)}`
}

function fmtPct(v) {
  if (!Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(2)}%`
}

function fmtPctFromPercent(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toFixed(2)}%`
}

/**
 * Picks rows to display: the user's input periods plus a few canonical
 * checkpoints that fall within the horizon, plus the horizon itself.
 */
function pickRows(series, points, horizon) {
  const ts = new Set(points.map((p) => p.t))
  for (const t of [1, 7, 14, 30, 60, 90, 180, 365]) {
    if (t <= horizon) ts.add(t)
  }
  ts.add(horizon)
  return [...ts]
    .filter((t) => t >= 1 && t <= series.length)
    .sort((a, b) => a - b)
    .map((t) => series[t - 1])
}

/**
 * @param {{
 *   series: Array<{t:number, retention:number, revenue:number, cumLtv:number}>,
 *   points: Array<{t:number, percent:number}>,
 *   horizon: number,
 *   cohortSize: number,
 *   cac: number|null,
 * }} props
 */
export default function ResultsTable({ series, points, horizon, cohortSize, cac }) {
  const rows = pickRows(series, points, horizon)
  const showLtvCac = cac != null && cac > 0
  const userByT = new Map(points.map((p) => [p.t, p.percent]))

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-bg-elev/40">
      <div className="border-b border-slate-800 px-4 py-2 text-sm font-medium text-slate-200">
        Per-period breakdown
        <span className="ml-2 text-xs font-normal text-slate-500">
          Input rows are highlighted; "Fit" is the power-law prediction (OLS, not interpolation — values can differ slightly from input).
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-subtle/40 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Period</th>
              <th className="px-3 py-2 text-right font-medium">Input</th>
              <th className="px-3 py-2 text-right font-medium">Fit</th>
              <th className="px-3 py-2 text-right font-medium">Active users</th>
              <th className="px-3 py-2 text-right font-medium">Revenue / period</th>
              <th className="px-3 py-2 text-right font-medium">Cum LTV / user</th>
              {showLtvCac && (
                <th className="px-3 py-2 text-right font-medium">LTV / CAC</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((row) => {
              const userPct = userByT.get(row.t)
              const isUserPoint = userPct != null
              return (
                <tr
                  key={row.t}
                  className={`tabular-nums ${
                    isUserPoint ? 'bg-cyan-950/20' : ''
                  }`}
                >
                  <td className="px-3 py-1.5 text-slate-300">
                    Day {row.t}
                    {isUserPoint && (
                      <span
                        className="ml-1.5 text-[10px] uppercase tracking-wide text-cyan-400"
                        title="You entered a value at this period"
                      >
                        input
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right ${
                      isUserPoint ? 'text-cyan-300' : 'text-slate-600'
                    }`}
                  >
                    {fmtPctFromPercent(userPct)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-200">
                    {fmtPct(row.retention)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-200">
                    {Math.round(row.retention * cohortSize)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-200">
                    {fmtUsd(row.revenue * cohortSize)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-200">
                    {fmtUsd(row.cumLtv)}
                  </td>
                  {showLtvCac && (
                    <td className="px-3 py-1.5 text-right text-slate-200">
                      {(row.cumLtv / cac).toFixed(2)}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
