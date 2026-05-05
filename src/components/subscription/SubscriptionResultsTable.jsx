// Per-cycle breakdown for subscription mode. Mirrors v1 ResultsTable but
// in cadence units (M / W) and with paying-user / per-install LTV columns
// instead of v1's per-user LTV.

import { useRef } from 'react'
import HoverHint from '../HoverHint.jsx'
import ExportPngButton from '../ExportPngButton.jsx'
import { pngFilename } from '../../lib/exportPng.js'
import { cadenceLabel } from '../../lib/subscriptionMath.js'

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

const CHECKPOINTS = {
  monthly: [1, 3, 6, 9, 12, 18, 24, 30, 36],
  weekly: [1, 2, 4, 8, 12, 26, 39, 52],
}

function pickRows(series, userPoints, horizon, cadence) {
  const ts = new Set(userPoints.map((p) => p.t))
  for (const t of CHECKPOINTS[cadence] ?? CHECKPOINTS.monthly) {
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
 *   series: Array<{t:number, retention:number, payingUsers:number, revenue:number, cumRevenue:number, cumLtvPerInstall:number}>,
 *   userPoints: Array<{t:number, percent:number}>,
 *   horizon: number,
 *   cadence: 'weekly'|'monthly',
 *   cac: number|null,
 *   presetLabel?: string,
 * }} props
 */
export default function SubscriptionResultsTable({
  series,
  userPoints,
  horizon,
  cadence,
  cac,
  presetLabel,
}) {
  const rows = pickRows(series, userPoints, horizon, cadence)
  const showLtvCac = cac != null && cac > 0
  const userByT = new Map(userPoints.map((p) => [p.t, p.percent]))
  const cardRef = useRef(null)

  return (
    <div ref={cardRef} className="rounded-lg border border-line bg-bg-elev/40">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Per-{cadence === 'weekly' ? 'week' : 'month'} breakdown</span>
          <HoverHint align="left">
            <p>
              Подробная разбивка retention и revenue по cycle. Колонка
              <strong className="text-fg"> Input</strong> — введённые точки
              (синие), <strong className="text-fg">Fit</strong> — предсказание
              power-law fit'а. Различие между ними нормально — фит усредняет
              шум.
            </p>
            <p className="mt-1.5">
              Active paying — paying@0 × R(t). LTV / install — Σ revenue до t /
              cohort. На годовом cliff в monthly данных fit может занижать
              разрыв — это известное ограничение power law'а.
            </p>
          </HoverHint>
        </div>
        <ExportPngButton
          targetRef={cardRef}
          filename={pngFilename('subscription-breakdown', presetLabel)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-subtle/40 text-xs uppercase tracking-wide text-fg-faint">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Period</th>
              <th className="px-3 py-2 text-right font-medium">Input</th>
              <th className="px-3 py-2 text-right font-medium">Fit</th>
              <th className="px-3 py-2 text-right font-medium">Active paying</th>
              <th className="px-3 py-2 text-right font-medium">Revenue</th>
              <th className="px-3 py-2 text-right font-medium">Cum LTV / install</th>
              {showLtvCac && (
                <th className="px-3 py-2 text-right font-medium">LTV / CAC</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map((row) => {
              const userPct = userByT.get(row.t)
              const isUserPoint = userPct != null
              return (
                <tr
                  key={row.t}
                  className={`tabular-nums ${
                    isUserPoint ? 'bg-accent-surface/20' : ''
                  }`}
                >
                  <td className="px-3 py-1.5 text-fg-muted">
                    {cadenceLabel(row.t, cadence)}
                    {isUserPoint && (
                      <span
                        className="ml-1.5 text-[10px] uppercase tracking-wide text-accent-soft"
                        title="You entered a value at this period"
                      >
                        input
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right ${
                      isUserPoint ? 'text-accent-fg' : 'text-fg-disabled'
                    }`}
                  >
                    {fmtPctFromPercent(userPct)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-fg">
                    {fmtPct(row.retention)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-fg">
                    {Math.round(row.payingUsers)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-fg">
                    {fmtUsd(row.revenue)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-fg">
                    {fmtUsd(row.cumLtvPerInstall)}
                  </td>
                  {showLtvCac && (
                    <td className="px-3 py-1.5 text-right text-fg">
                      {(row.cumLtvPerInstall / cac).toFixed(2)}
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
