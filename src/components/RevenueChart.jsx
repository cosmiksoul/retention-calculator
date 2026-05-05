// Per-period revenue from one acquired cohort, bucketed into the canonical
// ranges (D1, D2-7, D8-14, …). Complements Cumulative LTV by showing *where*
// the money actually arrives in the cohort's lifetime — most curves
// concentrate revenue in the first 14-30 days.
//
// The math comes straight from `ltvSeries`: each row already carries
// `revenue = ARPU × R(t)`. We just sum it inside each bucket and multiply by
// cohortSize so the y-axis reads in cohort dollars (matches ResultsTable).

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { bucketRevenue } from '../lib/revenueBuckets.js'

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
    <div className="rounded border border-slate-700 bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-slate-200">{p.label}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-slate-400">Cohort revenue</span>
        <span className="ml-auto tabular-nums text-emerald-300">
          {fmtUsd(p.revenue)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-slate-400">Share</span>
        <span className="ml-auto tabular-nums text-slate-300">
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
export default function RevenueChart({ series, cohortSize, horizon }) {
  const buckets = bucketRevenue(series, horizon)
  const totalPerUser = buckets.reduce((s, b) => s + b.revenue, 0)
  const totalCohort = totalPerUser * cohortSize
  const data = buckets.map((b) => ({
    label: b.label,
    revenue: b.revenue * cohortSize,
    pct: totalPerUser > 0 ? (b.revenue / totalPerUser) * 100 : 0,
  }))

  return (
    <div className="rounded-lg border border-slate-800 bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium text-slate-200">
            Revenue per period
          </div>
          <div className="text-[11px] italic leading-snug text-slate-500">
            Где именно во времени сосредоточен доход когорты.
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Cohort total over D1–D{horizon}:{' '}
          <span className="tabular-nums text-slate-300">
            {fmtUsd(totalCohort)}
          </span>
        </div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              tickFormatter={fmtUsd}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b40' }} />
            <Bar
              dataKey="revenue"
              fill="#22c55e"
              fillOpacity={0.85}
              isAnimationActive={false}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-[11px] leading-snug text-slate-500">
        Buckets sum daily revenue (ARPU × R(t)) over canonical ranges and scale
        by cohort size. Compare bucket heights to see how front-loaded the
        revenue is — heavy left tail is normal for power-law retention.
      </div>
    </div>
  )
}
