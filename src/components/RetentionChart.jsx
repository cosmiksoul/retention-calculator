import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'

const USER_COLOR = '#22d3ee'
const FIT_COLOR = '#22d3ee'
const BENCH_COLOR = '#94a3b8'

function CustomTooltip({ active, payload, label, bandSigma }) {
  if (!active || !payload || !payload.length) return null
  const userP = payload.find((p) => p.dataKey === 'user')
  const fitP = payload.find((p) => p.dataKey === 'fit')
  const benchP = payload.find((p) => p.dataKey === 'bench')
  const bandP = payload.find((p) => p.dataKey === 'band')
  return (
    <div className="rounded border border-slate-700 bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-slate-200">Day {label}</div>
      {userP && userP.value != null && (
        <Row color={USER_COLOR} label="Your data" value={`${userP.value.toFixed(2)}%`} />
      )}
      {fitP && fitP.value != null && (
        <Row color={FIT_COLOR} label="Power-law fit" value={`${fitP.value.toFixed(2)}%`} />
      )}
      {bandP && Array.isArray(bandP.value) && (
        <Row
          color="transparent"
          label={`±${bandSigma}σ band`}
          value={`${bandP.value[0].toFixed(1)}–${bandP.value[1].toFixed(1)}%`}
        />
      )}
      {benchP && benchP.value != null && (
        <Row color={BENCH_COLOR} label="Industry" value={`${benchP.value.toFixed(2)}%`} />
      )}
    </div>
  )
}

function Row({ color, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-slate-400">{label}</span>
      <span className="ml-auto tabular-nums text-slate-200">{value}</span>
    </div>
  )
}

/**
 * @param {{
 *   userPoints: Array<{t:number, percent:number}>,
 *   fitSeries: Array<{t:number, retention:number}>,
 *   bandSeries: Array<{t:number, lower:number, upper:number}> | null,
 *   benchmarkSeries: Array<{t:number, retention:number}> | null,
 *   horizon: number,
 *   lastUserT: number,
 * }} props
 */
export default function RetentionChart({
  userPoints,
  fitSeries,
  alternateFitSeries,
  alternateLabel,
  bandSeries,
  bandSigma = 1,
  benchmarkSeries,
  horizon,
  lastUserT,
}) {
  const userByT = new Map(userPoints.map((p) => [p.t, p.percent]))
  const benchByT = benchmarkSeries
    ? new Map(benchmarkSeries.map((p) => [p.t, p.retention * 100]))
    : null

  const data = fitSeries.map((p, i) => ({
    t: p.t,
    fit: p.retention * 100,
    user: userByT.get(p.t) ?? null,
    bench: benchByT?.get(p.t) ?? null,
    band: bandSeries ? [bandSeries[i].lower * 100, bandSeries[i].upper * 100] : null,
    alt: alternateFitSeries ? alternateFitSeries[i].retention * 100 : null,
  }))

  const showBand = !!bandSeries

  return (
    <div className="rounded-lg border border-slate-800 bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium text-slate-200">Retention curve</div>
          <div className="text-[11px] italic leading-snug text-slate-500">
            Кривая удержания: % пользователей, остающихся активными через N дней.
          </div>
        </div>
        {showBand && (
          <div className="text-xs text-slate-500">
            shaded = ±{bandSigma}σ confidence band (≈{bandSigma === 1 ? '68%' : '95%'})
          </div>
        )}
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
              tickFormatter={(v) => `${v}%`}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip bandSigma={bandSigma} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {showBand && (
              <Area
                dataKey="band"
                name={`±${bandSigma}σ`}
                stroke="none"
                fill={FIT_COLOR}
                fillOpacity={bandSigma === 1 ? 0.13 : 0.1}
                isAnimationActive={false}
                legendType="none"
                connectNulls
              />
            )}
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
            {alternateFitSeries && (
              <Line
                type="monotone"
                dataKey="alt"
                name={alternateLabel ?? 'Alternate fit'}
                stroke={FIT_COLOR}
                strokeOpacity={0.7}
                strokeWidth={1.5}
                strokeDasharray="4 3"
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
