// Per-period revenue from one acquired cohort: one bar per period along
// the X-axis, height = total cohort revenue at period t. Complements
// Cumulative LTV by showing *where* the money actually arrives.
//
// Period-aware: bar density follows the period scale (up to 36 months,
// 52 weeks, or 365 days). Recharts hides ticks that would overlap; we
// add a tickFormatter to keep labels in sync with the active period.

import { useRef } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import HoverHint from './HoverHint.jsx'
import ExportPngButton from './ExportPngButton.jsx'
import { useThemeColors } from '../lib/useThemeColors.js'
import { pngFilename } from '../lib/exportPng.js'
import { periodAbbr, periodTicks } from '../lib/calc.js'

function fmtUsd(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1000) return `$${v.toFixed(0)}`
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`
  return `$${v.toFixed(2)}`
}

function CustomTooltip({ active, payload, label, periodAbbrCur }) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded border border-line-strong bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-fg">{periodAbbrCur}{label}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-fg-dim">Cohort revenue</span>
        <span className="ml-auto tabular-nums text-emerald-300">
          {fmtUsd(p.revenue)}
        </span>
      </div>
      {p.baseline != null && (
        <div className="flex items-center gap-3">
          <span className="text-fg-dim">Baseline</span>
          <span className="ml-auto tabular-nums" style={{ color: 'rgb(234 179 8)' }}>
            {fmtUsd(p.baseline)}
          </span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="text-fg-dim">Share of total</span>
        <span className="ml-auto tabular-nums text-fg-muted">
          {p.pct.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   series: Array<{t:number, revenue:number}>,    // revenue per cohort entrant per period
 *   cohortSize: number,
 *   horizon: number,
 *   baselineSeries?: Array<{t:number, revenue:number}>,
 *   baselineCohortSize?: number,
 *   presetLabel?: string,
 *   period?: 'day'|'week'|'month',
 * }} props
 */
export default function RevenueChart({
  series,
  cohortSize,
  horizon,
  baselineSeries,
  baselineCohortSize,
  presetLabel,
  period = 'day',
}) {
  const colors = useThemeColors()
  const cardRef = useRef(null)
  const abbr = periodAbbr(period)

  const totalCohort = series.reduce((s, p) => s + p.revenue * cohortSize, 0)
  const baselineByT =
    baselineSeries && baselineCohortSize != null
      ? new Map(
          baselineSeries.map((p) => [p.t, p.revenue * baselineCohortSize]),
        )
      : null

  const data = series.map((p) => {
    const cohortRevenue = p.revenue * cohortSize
    return {
      t: p.t,
      revenue: cohortRevenue,
      pct: totalCohort > 0 ? (cohortRevenue / totalCohort) * 100 : 0,
      baseline: baselineByT?.get(p.t) ?? null,
    }
  })

  return (
    <div ref={cardRef} className="rounded-lg border border-line bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Revenue per period</span>
          <HoverHint align="left">
            <p>
              Высота бара — выручка когорты в одном периоде (ARPU × R(t) ×
              acquired) × доля от cohort. Power-law decay видна в форме
              кривой: основной доход приходится на ранние периоды.
            </p>
            <p className="mt-1.5">
              Для коротких горизонтов каждый период — отдельный бар; на
              длинных горизонтах часть подписей может скрываться (recharts
              сам решает плотность). Полная сумма за период — в тултипе.
            </p>
          </HoverHint>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-fg-faint">
            Cohort total over {abbr}1–{abbr}{horizon}:{' '}
            <span className="tabular-nums text-fg-muted">
              {fmtUsd(totalCohort)}
            </span>
          </span>
          <ExportPngButton
            targetRef={cardRef}
            filename={pngFilename('revenue-per-period', presetLabel)}
          />
        </div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={[1, horizon]}
              ticks={periodTicks(period, horizon)}
              stroke={colors.axis}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${abbr}${v}`}
            />
            <YAxis
              stroke={colors.axis}
              tick={{ fontSize: 11 }}
              tickFormatter={fmtUsd}
            />
            <Tooltip
              content={<CustomTooltip periodAbbrCur={abbr} />}
              cursor={{ fill: colors.grid, fillOpacity: 0.4 }}
            />
            <Bar
              dataKey="revenue"
              fill={colors.line}
              fillOpacity={0.85}
              isAnimationActive={false}
              radius={[2, 2, 0, 0]}
            />
            {baselineByT && (
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline"
                stroke={colors.baseline}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
