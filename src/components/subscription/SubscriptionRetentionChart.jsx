// Retention curve for subscription mode (spec-v2 §5.3).
//
// Plots paying-user retention over horizon cycles. User points are drawn
// as dots; the power-law fit is a solid line. Cadence drives X-axis
// labels (Week / Month) and tick density. Stage 9 will add a benchmark
// dashed line when a subscription preset is active for the cadence.

import { useRef } from 'react'
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
} from 'recharts'
import HoverHint from '../HoverHint.jsx'
import ExportPngButton from '../ExportPngButton.jsx'
import { useThemeColors } from '../../lib/useThemeColors.js'
import { pngFilename } from '../../lib/exportPng.js'

const TICK_CANDIDATES = {
  monthly: [1, 3, 6, 12, 18, 24, 30, 36],
  weekly: [1, 2, 4, 8, 12, 26, 39, 52],
}

function CustomTooltip({ active, payload, label, cadence, bandSigma, colors }) {
  if (!active || !payload || !payload.length) return null
  const userP = payload.find((p) => p.dataKey === 'user')
  const fitP = payload.find((p) => p.dataKey === 'fit')
  const bandP = payload.find((p) => p.dataKey === 'band')
  const cyclePrefix = cadence === 'weekly' ? 'W' : 'M'
  return (
    <div className="rounded border border-line-strong bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-fg">
        {cyclePrefix}
        {label}
      </div>
      {userP && userP.value != null && (
        <Row color={colors.user} label="Your data" value={`${userP.value.toFixed(2)}%`} />
      )}
      {fitP && fitP.value != null && (
        <Row color={colors.user} label="Power-law fit" value={`${fitP.value.toFixed(2)}%`} />
      )}
      {bandP && Array.isArray(bandP.value) && (
        <Row
          color="transparent"
          label={`±${bandSigma}σ band`}
          value={`${bandP.value[0].toFixed(1)}–${bandP.value[1].toFixed(1)}%`}
        />
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
 *   fitSeries: Array<{t:number, retention:number}>,
 *   bandSeries: Array<{t:number, lower:number, upper:number}>|null,
 *   bandSigma: 1|2,
 *   horizon: number,
 *   cadence: 'weekly'|'monthly',
 *   rSquared: number,
 *   presetLabel?: string,
 * }} props
 */
export default function SubscriptionRetentionChart({
  userPoints,
  fitSeries,
  bandSeries,
  bandSigma = 1,
  horizon,
  cadence,
  rSquared,
  presetLabel,
}) {
  const colors = useThemeColors()
  const cardRef = useRef(null)
  const userByT = new Map(userPoints.map((p) => [p.t, p.percent]))

  const data = fitSeries.map((p, i) => ({
    t: p.t,
    fit: p.retention * 100,
    user: userByT.get(p.t) ?? null,
    band: bandSeries
      ? [bandSeries[i].lower * 100, bandSeries[i].upper * 100]
      : null,
  }))

  const showBand = !!bandSeries

  const ticks = (TICK_CANDIDATES[cadence] ?? TICK_CANDIDATES.monthly).filter(
    (t) => t <= horizon,
  )
  const axisLabel = cadence === 'weekly' ? 'Week' : 'Month'

  return (
    <div ref={cardRef} className="rounded-lg border border-line bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Retention curve (paying users)</span>
          <HoverHint align="left">
            <p>
              Доля платящих юзеров, активных через t {cadence === 'weekly' ? 'недель' : 'месяцев'}
              {' '}после окончания trial. Точки — введённые значения, линия —
              power-law fit R(t) = a·t<sup>−b</sup>.
            </p>
            <p className="mt-1.5">
              Кривая клампится сверху значением R(1) — paying retention
              физически не растёт.
            </p>
          </HoverHint>
        </div>
        <div className="flex items-baseline gap-2">
          {showBand && (
            <span className="text-xs text-fg-faint">
              shaded = ±{bandSigma}σ (≈{bandSigma === 1 ? '68%' : '95%'})
            </span>
          )}
          {Number.isFinite(rSquared) && (
            <span className="text-xs text-fg-faint">
              R² = {rSquared.toFixed(3)}
            </span>
          )}
          <ExportPngButton
            targetRef={cardRef}
            filename={pngFilename('subscription-retention', presetLabel)}
          />
        </div>
      </div>
      <div className="h-72 w-full">
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
              tickFormatter={(v) => `${v}%`}
              domain={[0, 'auto']}
            />
            <Tooltip
              content={
                <CustomTooltip
                  cadence={cadence}
                  bandSigma={bandSigma}
                  colors={colors}
                />
              }
            />
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
