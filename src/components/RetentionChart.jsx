import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const USER_COLOR = '#22d3ee'
const FIT_COLOR = '#22d3ee'
const BENCH_COLOR = '#94a3b8'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded border border-slate-700 bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-slate-200">Day {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-slate-400">{p.name}</span>
          <span className="ml-auto tabular-nums text-slate-200">
            {p.value != null ? `${p.value.toFixed(2)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * @param {{
 *   userPoints: Array<{t:number, percent:number}>,
 *   fitSeries: Array<{t:number, retention:number}>,
 *   benchmarkSeries: Array<{t:number, retention:number}> | null,
 *   horizon: number,
 * }} props
 */
export default function RetentionChart({
  userPoints,
  fitSeries,
  benchmarkSeries,
  horizon,
}) {
  const userByT = new Map(userPoints.map((p) => [p.t, p.percent]))
  const benchByT = benchmarkSeries
    ? new Map(benchmarkSeries.map((p) => [p.t, p.retention * 100]))
    : null

  const data = fitSeries.map((p) => ({
    t: p.t,
    fit: p.retention * 100,
    user: userByT.get(p.t) ?? null,
    bench: benchByT?.get(p.t) ?? null,
  }))

  return (
    <div className="rounded-lg border border-slate-800 bg-bg-elev/40 p-4">
      <div className="mb-2 text-sm font-medium text-slate-200">Retention curve</div>
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
              tickFormatter={(v) => `${v}%`}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {benchmarkSeries && (
              <Line
                type="monotone"
                dataKey="bench"
                name="Industry benchmark"
                stroke={BENCH_COLOR}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="fit"
              name="Power-law fit"
              stroke={FIT_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="user"
              name="Your data"
              stroke="transparent"
              dot={{ r: 4, fill: USER_COLOR, stroke: USER_COLOR }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
