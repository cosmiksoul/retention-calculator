// Per-cycle cohort revenue (subscription mode).
//
// One bar per cycle (1..horizon). Y-axis: cohort revenue in dollars
// (per-cycle revenue × cohort size). Complements the cumulative LTV
// chart by showing *when* revenue actually arrives — early cycles
// dominate due to retention decay, with a long tail.

import { useRef } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import HoverHint from '../HoverHint.jsx'
import ExportPngButton from '../ExportPngButton.jsx'
import { useThemeColors } from '../../lib/useThemeColors.js'
import { pngFilename } from '../../lib/exportPng.js'
import { cadenceLabel } from '../../lib/subscriptionMath.js'

function fmtUsd(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1000) return `$${v.toFixed(0)}`
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`
  return `$${v.toFixed(2)}`
}

function CustomTooltip({ active, payload, cadence }) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded border border-line-strong bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-fg">{cadenceLabel(p.t, cadence)}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-fg-dim">Cohort revenue</span>
        <span className="ml-auto tabular-nums text-emerald-300">
          {fmtUsd(p.revenue)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-fg-dim">Share</span>
        <span className="ml-auto tabular-nums text-fg-muted">
          {p.pct.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

const TICK_CANDIDATES = {
  monthly: [1, 3, 6, 12, 18, 24, 30, 36],
  weekly: [1, 2, 4, 8, 12, 26, 39, 52],
}

/**
 * @param {{
 *   series: Array<{t:number, revenue:number}>,
 *   horizon: number,
 *   cadence: 'weekly'|'monthly',
 *   presetLabel?: string,
 * }} props
 */
export default function SubscriptionRevenueChart({
  series,
  horizon,
  cadence,
  presetLabel,
}) {
  const colors = useThemeColors()
  const cardRef = useRef(null)
  const total = series.reduce((s, p) => s + p.revenue, 0)

  const data = series.map((p) => ({
    t: p.t,
    revenue: p.revenue,
    pct: total > 0 ? (p.revenue / total) * 100 : 0,
  }))

  const ticks = (TICK_CANDIDATES[cadence] ?? TICK_CANDIDATES.monthly).filter(
    (t) => t <= horizon,
  )
  const axisLabel = cadence === 'weekly' ? 'Week' : 'Month'

  return (
    <div ref={cardRef} className="rounded-lg border border-line bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Revenue per {cadence === 'weekly' ? 'week' : 'month'}</span>
          <HoverHint align="left">
            <p>
              Один бар на cycle: revenue(t) × cohort size = paying users в
              этом cycle × ARPU × cohort. Распределение revenue по времени.
            </p>
            <p className="mt-1.5">
              Передние cycle всегда самые жирные — retention паяющих юзеров
              убывающая, поэтому деньги front-loaded. Лонг-тейл важен для
              annual-dominant подписок (M12 cliff).
            </p>
          </HoverHint>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-fg-faint">
            Total: {fmtUsd(total)}
          </span>
          <ExportPngButton
            targetRef={cardRef}
            filename={pngFilename('subscription-revenue', presetLabel)}
          />
        </div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
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
              tickFormatter={fmtUsd}
            />
            <Tooltip content={<CustomTooltip cadence={cadence} />} />
            <Bar
              dataKey="revenue"
              fill={colors.line}
              fillOpacity={0.7}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
