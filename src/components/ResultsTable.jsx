import HoverHint from './HoverHint.jsx'

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
    <div className="rounded-lg border border-slate-800 bg-bg-elev/40">
      <div className="border-b border-slate-800 px-4 py-2">
        <div className="flex items-center text-sm font-medium text-slate-200">
          <span>Per-period breakdown</span>
          <HoverHint align="left">
            <p>
              Подробная разбивка ретеншена и дохода по дням.
            </p>
            <p className="mt-1.5">
              Колонка <strong className="text-slate-200">Input</strong> —
              введённые вами значения (выделены синим);
              {' '}<strong className="text-slate-200">Fit</strong> — предсказание
              степенной модели. Это OLS-подгонка в логарифмах, не интерполяция,
              поэтому Fit может слегка отличаться от Input даже на ваших точках —
              это нормально и отражает попытку модели усреднить шум.
            </p>
          </HoverHint>
        </div>
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
