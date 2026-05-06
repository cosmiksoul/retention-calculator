// "Where the money goes" — narrates the cohort economics in 4 steps:
// what was spent, what was lost in the funnel, how big the active paying
// base is, and how much revenue it produces over the horizon. Sits below
// the KPI cards as a transparency layer for users who want to follow the
// $ flow without reading the per-period table.
//
// Each step is a small stat card. Cells gracefully fall back to "—" when
// the underlying inputs are missing (e.g. CAC is empty ⇒ acquisition cost
// is unknown, but the rest still renders).

import HoverHint from './HoverHint.jsx'
import { periodAbbr } from '../lib/calc.js'

function fmtUsd(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1000) return `$${v.toFixed(0)}`
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`
  return `$${v.toFixed(2)}`
}

function fmtCount(x) {
  if (!Number.isFinite(x)) return '—'
  if (x >= 1000) return Math.round(x).toLocaleString()
  if (x >= 100) return x.toFixed(0)
  if (x >= 10) return x.toFixed(1)
  return x.toFixed(2)
}

function Step({ label, value, hint, tone = 'text-fg-strong', tooltip }) {
  return (
    <div className="rounded-lg border border-line bg-bg-elev/40 px-4 py-3">
      <div className="flex items-center text-xs uppercase tracking-wide text-fg-faint">
        <span>{label}</span>
        {tooltip && <HoverHint align="left">{tooltip}</HoverHint>}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-fg-faint">{hint}</div>}
    </div>
  )
}

/**
 * @param {{
 *   cohortSize: number,
 *   acquiredAtZero: number,
 *   cumRevenueAtHorizon: number,
 *   cac: number|null,
 *   horizon: number,
 *   period: 'day'|'week'|'month',
 *   funnelLength: number,
 * }} props
 */
export default function EconomicsFlow({
  cohortSize,
  acquiredAtZero,
  cumRevenueAtHorizon,
  cac,
  horizon,
  period,
  funnelLength,
}) {
  const abbr = periodAbbr(period)
  const hasCac = cac != null && cac > 0
  const acquisitionCost = hasCac ? cohortSize * cac : null

  const lostCount = Math.max(0, cohortSize - acquiredAtZero)
  const lostPct = cohortSize > 0 ? (lostCount / cohortSize) * 100 : 0
  const acquiredPct =
    cohortSize > 0 ? (acquiredAtZero / cohortSize) * 100 : 0

  const profit =
    acquisitionCost != null ? cumRevenueAtHorizon - acquisitionCost : null
  const revenueTone =
    profit == null
      ? 'text-fg-strong'
      : profit >= 0
      ? 'text-emerald-300'
      : 'text-amber-300'

  const lossSubtext =
    funnelLength > 0
      ? `${lostPct.toFixed(1)}% of cohort`
      : 'no funnel — full cohort active'

  return (
    <div className="rounded-lg border border-line bg-bg-elev/20 p-4">
      <div className="mb-3 flex items-center text-sm font-medium text-fg">
        <span>Money flow</span>
        <HoverHint align="left">
          <p>
            Прозрачный пересказ юнит-экономики когорты в четырёх шагах: сколько
            потратили на закупку, сколько потеряли в funnel, какая активная
            платящая база осталась, и какую выручку она даст к концу горизонта.
          </p>
          <p className="mt-1.5">
            Числа дублируют KPI и P&amp;L блоки, но в форме потока — чтобы было
            видно, где деньги «уходят» и где «приходят».
          </p>
        </HoverHint>
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Step
          label="Spent on acquisition"
          value={fmtUsd(acquisitionCost)}
          hint={
            hasCac
              ? `${cohortSize.toLocaleString()} × ${fmtUsd(cac)} CAC`
              : 'CAC not set'
          }
          tone={hasCac ? 'text-amber-300' : 'text-fg-disabled'}
          tooltip={
            <p>
              Полная стоимость закупки когорты: cohort size × CAC. Это нижняя
              граница, которую нужно отбить выручкой.
            </p>
          }
        />
        <Step
          label="Lost in funnel"
          value={fmtCount(lostCount)}
          hint={lossSubtext}
          tone={lostCount > 0 ? 'text-red-300' : 'text-fg-strong'}
          tooltip={
            <p>
              Сколько юзеров отвалилось на conversion-шагах между cohort и
              активной платящей базой. CAC за них уже заплачен — отдачи не
              будет.
            </p>
          }
        />
        <Step
          label="Active payer base"
          value={fmtCount(acquiredAtZero)}
          hint={
            funnelLength > 0
              ? `${acquiredPct.toFixed(1)}% of cohort, period 0`
              : `entire cohort, period 0`
          }
          tooltip={
            <p>
              Acquired pool — те, до кого дошёл funnel. На них применяется
              ARPU per period × retention curve.
            </p>
          }
        />
        <Step
          label={`Revenue at ${abbr}${horizon}`}
          value={fmtUsd(cumRevenueAtHorizon)}
          hint={
            profit == null
              ? 'cumulative cohort revenue'
              : profit >= 0
              ? `+${fmtUsd(profit)} vs acquisition`
              : `${fmtUsd(profit)} vs acquisition`
          }
          tone={revenueTone}
          tooltip={
            <p>
              Накопленная выручка когорты за весь горизонт прогноза. Сравнение
              с acquisition cost даёт абсолютную прибыль / убыток на когорте.
            </p>
          }
        />
      </div>
    </div>
  )
}
