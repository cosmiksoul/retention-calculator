// Extended Cohort P&L for subscription mode (spec-v2 §5.5).
//
// Table-only — the cumulative LTV chart lives separately in Stage 6
// (CumulativeLTVChart). This component shows absolute economics for the
// selected cohort: revenue, profit, ROI, payback, plus per-install /
// per-paying-user LTV breakdown.

import HoverHint from '../HoverHint.jsx'
import { cadenceLabel, cadenceUnit } from '../../lib/subscriptionMath.js'

function fmtUsd(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v < 0 ? '−' : ''
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1000) return `${sign}$${abs.toFixed(0)}`
  return `${sign}$${abs.toFixed(2)}`
}

function fmtPct(v) {
  if (!Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(0)}%`
}

function fmtCount(v) {
  if (!Number.isFinite(v)) return '—'
  if (v >= 1000) return Math.round(v).toLocaleString()
  if (v >= 10) return v.toFixed(1)
  return v.toFixed(2)
}

/**
 * @param {{
 *   cohortSize: number,
 *   cac: number,
 *   trialsStarted: number,
 *   payingAtZero: number,
 *   ltvSeries: Array<{t:number, cumRevenue:number, cumLtvPerInstall:number, cumLtvPerPayingUser:number}>,
 *   horizon: number,
 *   payback: number|null,
 *   cadence: 'weekly'|'monthly',
 * }} props
 */
export default function SubscriptionCohortPL({
  cohortSize,
  cac,
  trialsStarted,
  payingAtZero,
  ltvSeries,
  horizon,
  payback,
  cadence,
}) {
  const last = ltvSeries[ltvSeries.length - 1] ?? {
    cumRevenue: 0,
    cumLtvPerInstall: 0,
    cumLtvPerPayingUser: 0,
  }
  const acquisitionCost = cohortSize * cac
  const profit = last.cumRevenue - acquisitionCost
  const roi = acquisitionCost > 0 ? profit / acquisitionCost : null
  const unit = cadenceUnit(cadence)

  const rows = [
    {
      label: 'Cohort size',
      value: cohortSize.toLocaleString(),
      formula: 'input',
    },
    {
      label: 'Acquisition cost',
      value: fmtUsd(acquisitionCost),
      formula: `${cohortSize.toLocaleString()} × ${fmtUsd(cac)}`,
    },
    {
      label: 'Trials started',
      value: fmtCount(trialsStarted),
      formula: 'cohort × install→trial',
    },
    {
      label: `Paying users (${unit} 0)`,
      value: fmtCount(payingAtZero),
      formula: 'trials × trial→paid',
    },
    {
      label: `Revenue at ${cadenceLabel(horizon, cadence)}`,
      value: fmtUsd(last.cumRevenue),
      formula: 'Σ revenue(t)',
    },
    {
      label: `Profit at ${cadenceLabel(horizon, cadence)}`,
      value: fmtUsd(profit),
      formula: 'Revenue − Acquisition cost',
      tone: profit >= 0 ? 'text-emerald-300' : 'text-red-400',
    },
    {
      label: `ROI at ${cadenceLabel(horizon, cadence)}`,
      value: roi != null ? fmtPct(roi) : '—',
      formula: 'Profit / Acquisition cost',
      tone:
        roi == null
          ? 'text-fg-strong'
          : roi >= 0
          ? 'text-emerald-300'
          : 'text-red-400',
    },
    {
      label: 'LTV / install',
      value: fmtUsd(last.cumLtvPerInstall),
      formula: 'Revenue / cohort',
    },
    {
      label: 'LTV / paying user',
      value: fmtUsd(last.cumLtvPerPayingUser),
      formula: `Revenue / paying@${unit} 0`,
    },
    {
      label: 'Payback',
      value:
        payback != null
          ? cadenceLabel(payback, cadence)
          : 'Not reached',
      formula: 'first cycle Σ revenue ≥ acquisition cost',
      tone: payback != null ? 'text-fg-strong' : 'text-amber-300',
    },
  ]

  return (
    <div className="space-y-3 rounded-lg border border-line bg-bg-elev/40 p-4">
      <div>
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Cohort P&amp;L</span>
          <HoverHint align="left">
            <p>
              Абсолютная экономика когорты на горизонте: per-install LTV ×
              cohort size vs total acquisition cost. Profit, ROI и payback
              показывают, выходит ли когорта в плюс в выбранном окне.
            </p>
            <p className="mt-1.5">
              LTV / paying user — дополнительная метрика, отвечает «сколько
              в среднем платит платящий», но для CAC-сравнения используй
              LTV / install.
            </p>
          </HoverHint>
        </div>
        <p className="mt-0.5 text-xs text-fg-faint">
          Cohort {cohortSize.toLocaleString()} installs · CAC {fmtUsd(cac)} ·
          horizon {cadenceLabel(horizon, cadence)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line/60">
            {rows.map((row) => (
              <tr key={row.label} className="tabular-nums">
                <td className="py-1.5 pr-4 text-fg-dim">{row.label}</td>
                <td
                  className={`py-1.5 pr-4 text-right font-semibold ${
                    row.tone ?? 'text-fg-strong'
                  }`}
                >
                  {row.value}
                </td>
                <td className="py-1.5 text-right text-xs text-fg-faint">
                  {row.formula}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
