// Per-period revenue from one acquired cohort, bucketed into the canonical
// ranges (D1, D2-7, D8-14, …). Complements Cumulative LTV by showing *where*
// the money actually arrives — most curves concentrate revenue in the first
// 14–30 days.
//
// Bar height = average daily cohort revenue inside the bucket, NOT the bucket
// total. We do this because canonical bucket widths are uneven (D1 = 1 day,
// D181–365 = 185 days), and plotting raw sums makes late buckets visually
// dominate even though daily revenue is decaying. Normalising by days makes
// the bars decline monotonically along the power-law, matching the chart's
// claim of front-loaded revenue. The bucket total is preserved in the
// tooltip so users can still read absolute dollars.

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
      <div className="font-medium text-fg">
        {p.label}
        <span className="ml-1 text-fg-faint">
          ({p.days} {p.days === 1 ? 'day' : 'days'})
        </span>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-fg-dim">Avg / day</span>
        <span className="ml-auto tabular-nums text-emerald-300">
          {fmtUsd(p.revenuePerDay)}
        </span>
      </div>
      {p.baselinePerDay != null && (
        <div className="flex items-center gap-3">
          <span className="text-fg-dim">Baseline / day</span>
          <span className="ml-auto tabular-nums" style={{ color: 'rgb(234 179 8)' }}>
            {fmtUsd(p.baselinePerDay)}
          </span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="text-fg-dim">Period total</span>
        <span className="ml-auto tabular-nums text-fg">
          {fmtUsd(p.revenue)}
        </span>
      </div>
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
  const data = buckets.map((b, i) => {
    const days = b.to - b.from + 1
    const cohortRevenue = b.revenue * cohortSize
    const baselineCohort =
      baselineBuckets && baselineBuckets[i]
        ? baselineBuckets[i].revenue * baselineCohortSize
        : null
    return {
      label: b.label,
      days,
      revenue: cohortRevenue,
      revenuePerDay: cohortRevenue / days,
      pct: totalPerUser > 0 ? (b.revenue / totalPerUser) * 100 : 0,
      baselinePerDay: baselineCohort != null ? baselineCohort / days : null,
    }
  })

  return (
    <div ref={cardRef} className="rounded-lg border border-line bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Daily revenue (averaged in period)</span>
          <HoverHint align="left">
            <p>
              Высота бара — средняя дневная выручка когорты внутри периода
              (D1, D2–7, D8–14, D15–30, D31–60, D61–90, D91–180, D181–365):
              сумма ARPU × R(t) внутри окна, делённая на число дней в нём
              и умноженная на cohort size.
            </p>
            <p className="mt-1.5">
              Нормировка на день нужна, чтобы сравнивать узкие окна (D1) с
              широкими (D91–180): иначе поздние периоды визуально «перевешивают»
              просто потому, что они длиннее.
            </p>
            <p className="mt-1.5">
              Кривая монотонно убывает по power-law — это и есть
              «front-loaded revenue»: основной доход приходит в первые
              ~30 дней. Полная сумма за каждый период видна в тултипе.
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
              dataKey="revenuePerDay"
              fill={colors.line}
              fillOpacity={0.85}
              isAnimationActive={false}
              radius={[2, 2, 0, 0]}
            />
            {baselineBuckets && (
              <Line
                type="monotone"
                dataKey="baselinePerDay"
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
