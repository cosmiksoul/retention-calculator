import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
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

function CustomTooltip({ active, payload, label, cac, bandSigma }) {
  if (!active || !payload || !payload.length) return null
  const ltvP = payload.find((p) => p.dataKey === 'cumLtv')
  const bandP = payload.find((p) => p.dataKey === 'band')
  const ltv = ltvP?.value
  return (
    <div className="rounded border border-slate-700 bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-slate-200">Day {label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-slate-400">Cum LTV</span>
        <span className="ml-auto tabular-nums text-slate-200">{fmtUsd(ltv)}</span>
      </div>
      {bandP && Array.isArray(bandP.value) && (
        <div className="flex items-center gap-2">
          <span className="text-slate-400">±{bandSigma}σ</span>
          <span className="ml-auto tabular-nums text-slate-400">
            {fmtUsd(bandP.value[0])} – {fmtUsd(bandP.value[1])}
          </span>
        </div>
      )}
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
 *   bandSeries: Array<{t:number, lower:number, upper:number}> | null,
 *   cac: number|null,
 *   beDay: number|null,
 *   horizon: number,
 *   lastUserT: number,
 * }} props
 */
export default function LTVChart({
  series,
  bandSeries,
  bandSigma = 1,
  cac,
  beDay,
  horizon,
  lastUserT,
}) {
  const data = series.map((p, i) => ({
    t: p.t,
    cumLtv: p.cumLtv,
    band: bandSeries ? [bandSeries[i].lower, bandSeries[i].upper] : null,
  }))
  const maxLtv = data.length ? data[data.length - 1].cumLtv : 0
  const maxBandUpper = bandSeries ? bandSeries[bandSeries.length - 1].upper : maxLtv
  const yTop = Math.max(maxLtv, maxBandUpper, cac ?? 0)
  const yMax = yTop * 1.1

  return (
    <div className="rounded-lg border border-slate-800 bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium text-slate-200">Cumulative LTV</div>
          <div className="text-[11px] italic leading-snug text-slate-500">
            Накопленный доход с юзера. Пересечение с CAC = breakeven.
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {cac != null && beDay != null && (
            <>
              Breakeven at <span className="text-slate-300">Day {beDay}</span>
            </>
          )}
          {cac != null && beDay == null && (
            <span className="text-amber-400">CAC not reached at horizon</span>
          )}
          {bandSeries && cac == null && (
            <span>shaded = ±{bandSigma}σ ≈ {bandSigma === 1 ? '68%' : '95%'}</span>
          )}
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
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
            <Tooltip content={<CustomTooltip cac={cac} bandSigma={bandSigma} />} />
            {cac != null && beDay != null && (
              <ReferenceArea x1={1} x2={beDay} y1={0} y2={yMax} fill="#ef4444" fillOpacity={0.06} stroke="none" />
            )}
            {cac != null && beDay != null && (
              <ReferenceArea x1={beDay} x2={horizon} y1={0} y2={yMax} fill="#22c55e" fillOpacity={0.06} stroke="none" />
            )}
            {bandSeries && (
              <Area
                dataKey="band"
                name={`±${bandSigma}σ`}
                stroke="none"
                fill="#22c55e"
                fillOpacity={bandSigma === 1 ? 0.13 : 0.1}
                isAnimationActive={false}
                legendType="none"
                connectNulls
              />
            )}
            {cac != null && (
              <ReferenceLine
                y={cac}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{
                  value: `CAC ${fmtUsd(cac)}`,
                  position: 'insideTopRight',
                  fill: '#ef4444',
                  fontSize: 11,
                }}
              />
            )}
            {beDay != null && <ReferenceLine x={beDay} stroke="#94a3b8" strokeDasharray="3 3" />}
            {lastUserT > 0 && lastUserT < horizon && (
              <ReferenceLine
                x={lastUserT}
                stroke="#475569"
                strokeDasharray="2 4"
                label={{
                  value: `last data → D${lastUserT}`,
                  position: 'insideTop',
                  fill: '#64748b',
                  fontSize: 10,
                }}
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
