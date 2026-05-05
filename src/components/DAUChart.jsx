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

const OBSERVED_COLOR = '#22d3ee'
const RECON_COLOR = '#22c55e'

function fmt(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(0)
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const obs = payload.find((p) => p.dataKey === 'observed')?.value
  const rec = payload.find((p) => p.dataKey === 'reconstructed')?.value
  const err = obs && rec ? ((rec - obs) / obs) * 100 : null
  return (
    <div className="rounded border border-slate-700 bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-slate-200">Day {label}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-slate-400">Observed</span>
        <span className="ml-auto tabular-nums text-cyan-300">{fmt(obs)}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-slate-400">Reconstructed</span>
        <span className="ml-auto tabular-nums text-emerald-300">{fmt(rec)}</span>
      </div>
      {err != null && Number.isFinite(err) && (
        <div className="flex items-center gap-3">
          <span className="text-slate-400">Δ</span>
          <span
            className={`ml-auto tabular-nums ${
              Math.abs(err) > 10 ? 'text-amber-300' : 'text-slate-400'
            }`}
          >
            {err >= 0 ? '+' : ''}
            {err.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Diagnostic chart: did the deconvolved retention reproduce the observed DAU?
 * Reconstructed line should track observed line within a few %.
 *
 * @param {{
 *   observed: number[],
 *   reconstructed: number[],
 *   rmsePct: number,
 * }} props
 */
export default function DAUChart({ observed, reconstructed, rmsePct }) {
  const data = observed.map((v, i) => ({
    t: i + 1,
    observed: v,
    reconstructed: reconstructed[i],
  }))

  return (
    <div className="rounded-lg border border-slate-800 bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-sm font-medium text-slate-200">
          Observed vs reconstructed DAU
        </div>
        {rmsePct != null && (
          <div className="text-xs">
            <span className="text-slate-500">RMSE: </span>
            <span
              className={`tabular-nums ${
                rmsePct < 5
                  ? 'text-emerald-300'
                  : rmsePct < 15
                  ? 'text-slate-200'
                  : 'text-amber-300'
              }`}
            >
              {rmsePct.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[1, observed.length]}
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              label={{ value: 'Day', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }}
            />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="observed"
              name="Observed DAU"
              stroke={OBSERVED_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="reconstructed"
              name="Reconstructed"
              stroke={RECON_COLOR}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
