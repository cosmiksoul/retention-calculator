import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

function fmtUsd(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1000) return `$${v.toFixed(0)}`
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`
  return `$${v.toFixed(2)}`
}

function CustomTooltip({ active, payload, label, cac }) {
  if (!active || !payload || !payload.length) return null
  const ltv = payload[0]?.value
  return (
    <div className="rounded border border-slate-700 bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-slate-200">Day {label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-slate-400">Cum LTV</span>
        <span className="ml-auto tabular-nums text-slate-200">{fmtUsd(ltv)}</span>
      </div>
      {cac != null && (
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-slate-400">vs CAC</span>
          <span
            className={`ml-auto tabular-nums ${
              ltv >= cac ? 'text-emerald-300' : 'text-red-400'
            }`}
          >
            {ltv >= cac ? '+' : ''}
            {fmtUsd(ltv - cac)}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * @param {{
 *   series: Array<{t:number, cumLtv:number}>,
 *   cac: number|null,
 *   beDay: number|null,
 *   horizon: number,
 * }} props
 */
export default function LTVChart({ series, cac, beDay, horizon }) {
  const data = series.map((p) => ({ t: p.t, cumLtv: p.cumLtv }))
  const maxLtv = data.length ? data[data.length - 1].cumLtv : 0
  const yMax = cac != null ? Math.max(maxLtv, cac) * 1.1 : maxLtv * 1.05

  return (
    <div className="rounded-lg border border-slate-800 bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-sm font-medium text-slate-200">Cumulative LTV</div>
        {cac != null && beDay != null && (
          <div className="text-xs text-slate-500">
            Breakeven at <span className="text-slate-300">Day {beDay}</span>
          </div>
        )}
        {cac != null && beDay == null && (
          <div className="text-xs text-amber-400">CAC not reached at horizon</div>
        )}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[1, horizon]}
              ticks={[1, 7, 14, 30, 60, 90, 180, 365].filter((t) => t <= horizon)}
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              label={{ value: 'Day', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              tickFormatter={fmtUsd}
              domain={[0, yMax]}
            />
            <Tooltip content={<CustomTooltip cac={cac} />} />
            {cac != null && beDay != null && (
              <ReferenceArea
                x1={1}
                x2={beDay}
                y1={0}
                y2={yMax}
                fill="#ef4444"
                fillOpacity={0.06}
                stroke="none"
              />
            )}
            {cac != null && beDay != null && (
              <ReferenceArea
                x1={beDay}
                x2={horizon}
                y1={0}
                y2={yMax}
                fill="#22c55e"
                fillOpacity={0.06}
                stroke="none"
              />
            )}
            {cac != null && (
              <ReferenceLine
                y={cac}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{
                  value: `CAC ${fmtUsd(cac)}`,
                  position: 'right',
                  fill: '#ef4444',
                  fontSize: 11,
                }}
              />
            )}
            {beDay != null && (
              <ReferenceLine
                x={beDay}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
            )}
            <Line
              type="monotone"
              dataKey="cumLtv"
              name="Cum LTV"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
