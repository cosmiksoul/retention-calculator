// Per-period revenue from one acquired cohort, bucketed into the canonical
// ranges (D1, D2-7, D8-14, …). Complements Cumulative LTV by showing *where*
// the money actually arrives in the cohort's lifetime — most curves
// concentrate revenue in the first 14-30 days.
//
// The math comes straight from `ltvSeries`: each row already carries
// `revenue = ARPU × R(t)`. We just sum it inside each bucket and multiply by
// cohortSize so the y-axis reads in cohort dollars (matches ResultsTable).

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
import { bucketRevenue } from '../lib/revenueBuckets.js'
import HoverHint from './HoverHint.jsx'
import ExportPngButton from './ExportPngButton.jsx'
import { useThemeColors } from '../lib/useThemeColors.js'
import { pngFilename } from '../lib/exportPng.js'

function fmtUsd(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1000) return `$${v.toFixed(0)}`
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`
  return `$${v.toFixed(2)}`
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded border border-line-strong bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-fg">{p.label}</div>
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
        <span className="text-fg-dim">Share</span>
        <span className="ml-auto tabular-nums text-fg-muted">
          {p.pct.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   series: Array<{t:number, revenue:number}>,
 *   cohortSize: number,
 *   horizon: number,
 * }} props
 */
export default function RevenueChart({
  series,
  cohortSize,
  horizon,
  baselineSeries,
  baselineCohortSize,
  presetLabel,
}) {
  const colors = useThemeColors()
  const cardRef = useRef(null)
  const buckets = bucketRevenue(series, horizon)
  const totalPerUser = buckets.reduce((s, b) => s + b.revenue, 0)
  const totalCohort = totalPerUser * cohortSize
  const baselineBuckets =
    baselineSeries && baselineCohortSize != null
      ? bucketRevenue(baselineSeries, horizon)
      : null
  const data = buckets.map((b, i) => ({
    label: b.label,
    revenue: b.revenue * cohortSize,
    pct: totalPerUser > 0 ? (b.revenue / totalPerUser) * 100 : 0,
    baseline:
      baselineBuckets && baselineBuckets[i]
        ? baselineBuckets[i].revenue * baselineCohortSize
        : null,
  }))

  return (
    <div ref={cardRef} className="rounded-lg border border-line bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Revenue per period</span>
          <HoverHint align="left">
            <p>
              Бары сгруппированы по канонических периодам (D1, D2–7, D8–14,
              D15–30, D31–60, D61–90, D91–180, D181–365) и показывают
              суммарный доход когорты в каждом окне: ARPU × R(t),
              просуммированный по дням × cohort size.
            </p>
            <p className="mt-1.5">
              Резкий перекос в первые ~30 дней — норма для степенного
              ретеншена. Это и есть «front-loaded revenue»: основной доход
              приходит от свежих когорт.
            </p>
          </HoverHint>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-fg-faint">
            Cohort total over D1–D{horizon}:{' '}
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
              dataKey="label"
              stroke={colors.axis}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke={colors.axis}
              tick={{ fontSize: 11 }}
              tickFormatter={fmtUsd}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.grid, fillOpacity: 0.4 }} />
            <Bar
              dataKey="revenue"
              fill={colors.line}
              fillOpacity={0.85}
              isAnimationActive={false}
              radius={[2, 2, 0, 0]}
            />
            {baselineBuckets && (
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline"
                stroke={colors.baseline}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3, fill: colors.baseline, stroke: colors.baseline }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
