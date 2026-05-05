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
import HoverHint from './HoverHint.jsx'
import { useThemeColors } from '../lib/useThemeColors.js'

function CustomTooltip({ active, payload, label, bandSigma, colors }) {
  if (!active || !payload || !payload.length) return null
  const userP = payload.find((p) => p.dataKey === 'user')
  const fitP = payload.find((p) => p.dataKey === 'fit')
  const benchP = payload.find((p) => p.dataKey === 'bench')
  const bandP = payload.find((p) => p.dataKey === 'band')
  const baselineP = payload.find((p) => p.dataKey === 'baseline')
  return (
    <div className="rounded border border-line-strong bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-fg">Day {label}</div>
      {userP && userP.value != null && (
        <Row color={colors.user} label="Your data" value={`${userP.value.toFixed(2)}%`} />
      )}
      {fitP && fitP.value != null && (
        <Row color={colors.user} label="Power-law fit" value={`${fitP.value.toFixed(2)}%`} />
      )}
      {baselineP && baselineP.value != null && (
        <Row color={colors.baseline} label="Baseline" value={`${baselineP.value.toFixed(2)}%`} />
      )}
      {bandP && Array.isArray(bandP.value) && (
        <Row
          color="transparent"
          label={`±${bandSigma}σ band`}
          value={`${bandP.value[0].toFixed(1)}–${bandP.value[1].toFixed(1)}%`}
        />
      )}
      {benchP && benchP.value != null && (
        <Row color={colors.secondary} label="Industry" value={`${benchP.value.toFixed(2)}%`} />
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
      <span className="text-fg-dim">{label}</span>
      <span className="ml-auto tabular-nums text-fg">{value}</span>
    </div>
  )
}

/**
 * @param {{
 *   userPoints: Array<{t:number, percent:number}>,
 *   fitSeries: Array<{t:number, r:number}>,
 *   bandSeries: Array<{t:number, lower:number, upper:number}> | null,
 *   benchmarkSeries: Array<{t:number, r:number}> | null,
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
  baselineSeries,
  horizon,
  lastUserT,
}) {
  const colors = useThemeColors()
  const userByT = new Map(userPoints.map((p) => [p.t, p.percent]))
  const benchByT = benchmarkSeries
    ? new Map(benchmarkSeries.map((p) => [p.t, p.r * 100]))
    : null
  const baselineByT = baselineSeries
    ? new Map(baselineSeries.map((p) => [p.t, p.r * 100]))
    : null

  const data = fitSeries.map((p, i) => ({
    t: p.t,
    fit: p.r * 100,
    user: userByT.get(p.t) ?? null,
    bench: benchByT?.get(p.t) ?? null,
    baseline: baselineByT?.get(p.t) ?? null,
    band: bandSeries ? [bandSeries[i].lower * 100, bandSeries[i].upper * 100] : null,
    alt: alternateFitSeries ? alternateFitSeries[i].r * 100 : null,
  }))

  const showBand = !!bandSeries

  return (
    <div className="rounded-lg border border-line bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Retention curve</span>
          <HoverHint align="left">
            <p>
              Доля пользователей, активных через N дней после привлечения.
            </p>
            <p className="mt-1.5">
              Точки — ваши данные, сплошная линия — степенная подгонка
              R(t) = a·t<sup>−b</sup>, пунктир — индустриальный бенчмарк
              (если выбран пресет). Затенённая зона — ±σ доверительный
              интервал.
            </p>
          </HoverHint>
        </div>
        {showBand && (
          <div className="text-xs text-fg-faint">
            shaded = ±{bandSigma}σ confidence band (≈{bandSigma === 1 ? '68%' : '95%'})
          </div>
        )}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[1, horizon]}
              ticks={[1, 7, 14, 30, 60, 90, 180, 365].filter((t) => t <= horizon)}
              stroke={colors.axis}
              tick={{ fontSize: 11 }}
              label={{ value: 'Day', position: 'insideBottom', offset: -2, fill: colors.axis, fontSize: 11 }}
            />
            <YAxis
              stroke={colors.axis}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip bandSigma={bandSigma} colors={colors} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {showBand && (
              <Area
                dataKey="band"
                name={`±${bandSigma}σ`}
                stroke="none"
                fill={colors.user}
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
                stroke={colors.secondary}
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
                stroke={colors.user}
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
              stroke={colors.user}
              strokeWidth={2.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            {baselineSeries && (
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline"
                stroke={colors.baseline}
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="user"
              name="Your data"
              stroke="transparent"
              dot={{ r: 4, fill: colors.user, stroke: colors.user }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {lastUserT > 0 && lastUserT < horizon && (
              <ReferenceLine
                x={lastUserT}
                stroke={colors.fgDisabled}
                strokeDasharray="2 4"
                label={{
                  value: `last data → D${lastUserT}`,
                  position: 'insideTop',
                  fill: colors.fgFaint,
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
