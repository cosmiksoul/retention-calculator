// Extended Cohort P&L for subscription mode (spec-v2 §5.5).
//
// Table-only — the cumulative LTV chart lives separately in Stage 6
// (CumulativeLTVChart). This component shows absolute economics for the
// selected cohort: revenue, profit, ROI, payback, plus per-install /
// per-paying-user LTV breakdown.

import { useRef } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import HoverHint from '../HoverHint.jsx'
import ExportPngButton from '../ExportPngButton.jsx'
import { useThemeColors } from '../../lib/useThemeColors.js'
import { pngFilename } from '../../lib/exportPng.js'
import { cadenceLabel, cadenceUnit } from '../../lib/subscriptionMath.js'

const TICK_CANDIDATES = {
  monthly: [1, 3, 6, 12, 18, 24, 30, 36],
  weekly: [1, 2, 4, 8, 12, 26, 39, 52],
}

function CohortPLChart({ data, acquisitionCost, payback, horizon, cadence, yMax }) {
  const colors = useThemeColors()
  const ticks = (TICK_CANDIDATES[cadence] ?? TICK_CANDIDATES.monthly).filter(
    (t) => t <= horizon,
  )
  const axisLabel = cadence === 'weekly' ? 'Week' : 'Month'
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="cohortPLFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.line} stopOpacity={0.4} />
              <stop offset="100%" stopColor={colors.line} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            domain={[1, horizon]}
            ticks={ticks}
            stroke={colors.axis}
            tick={{ fontSize: 11 }}
            label={{
              value: axisLabel,
              position: 'insideBottom',
              offset: -2,
              fill: colors.axis,
              fontSize: 11,
            }}
          />
          <YAxis
            stroke={colors.axis}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => fmtUsd(v)}
            domain={[0, yMax]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null
              const cum = payload.find((p) => p.dataKey === 'cumRevenue')?.value ?? 0
              const profit = cum - acquisitionCost
              return (
                <div className="rounded border border-line-strong bg-bg-elev/95 px-3 py-2 text-xs">
                  <div className="font-medium text-fg">
                    {cadenceLabel(label, cadence)}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-fg-dim">Cum revenue</span>
                    <span className="ml-auto tabular-nums text-emerald-300">
                      {fmtUsd(cum)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-fg-dim">vs acquisition cost</span>
                    <span
                      className={`ml-auto tabular-nums ${
                        profit >= 0 ? 'text-emerald-300' : 'text-red-400'
                      }`}
                    >
                      {profit >= 0 ? '+' : ''}
                      {fmtUsd(profit)}
                    </span>
                  </div>
                </div>
              )
            }}
          />
          {payback != null && (
            <ReferenceArea
              x1={1}
              x2={payback}
              y1={0}
              y2={yMax}
              fill={colors.cac}
              fillOpacity={0.06}
              stroke="none"
            />
          )}
          {payback != null && (
            <ReferenceArea
              x1={payback}
              x2={horizon}
              y1={0}
              y2={yMax}
              fill={colors.line}
              fillOpacity={0.06}
              stroke="none"
            />
          )}
          <ReferenceLine
            y={acquisitionCost}
            stroke={colors.cac}
            strokeDasharray="5 5"
            label={{
              value: `Acquisition cost ${fmtUsd(acquisitionCost)}`,
              position: 'insideTopRight',
              fill: colors.cac,
              fontSize: 11,
            }}
          />
          {payback != null && (
            <ReferenceLine x={payback} stroke={colors.secondary} strokeDasharray="3 3" />
          )}
          <Area
            type="monotone"
            dataKey="cumRevenue"
            name="Cum revenue"
            stroke={colors.line}
            strokeWidth={2}
            fill="url(#cohortPLFill)"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

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
  presetLabel,
}) {
  const cardRef = useRef(null)
  const last = ltvSeries[ltvSeries.length - 1] ?? {
    cumRevenue: 0,
    cumLtvPerInstall: 0,
    cumLtvPerPayingUser: 0,
  }
  const acquisitionCost = cohortSize * cac
  const profit = last.cumRevenue - acquisitionCost
  const roi = acquisitionCost > 0 ? profit / acquisitionCost : null
  const unit = cadenceUnit(cadence)
  const chartData = ltvSeries.map((p) => ({ t: p.t, cumRevenue: p.cumRevenue }))
  const yMax = Math.max(last.cumRevenue, acquisitionCost) * 1.1

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
    <div ref={cardRef} className="space-y-3 rounded-lg border border-line bg-bg-elev/40 p-4">
      <div className="flex items-center justify-between">
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
        <ExportPngButton
          targetRef={cardRef}
          filename={pngFilename('subscription-cohort-pl', presetLabel)}
        />
      </div>
      <p className="text-xs text-fg-faint">
        Cohort {cohortSize.toLocaleString()} installs · CAC {fmtUsd(cac)} ·
        horizon {cadenceLabel(horizon, cadence)}
      </p>

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

      <CohortPLChart
        data={chartData}
        acquisitionCost={acquisitionCost}
        payback={payback}
        horizon={horizon}
        cadence={cadence}
        yMax={yMax}
      />
    </div>
  )
}
