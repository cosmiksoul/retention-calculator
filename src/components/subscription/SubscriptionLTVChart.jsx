// Cumulative LTV per install for subscription mode (spec-v2 §5.4).
//
// Y-axis: $/install (not total $). Green line: cumulative LTV per install.
// Red dashed horizontal: CAC. Vertical dashed: payback cycle. Background
// zones: red before payback, green after.

import { useRef } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import HoverHint from '../HoverHint.jsx'
import ExportPngButton from '../ExportPngButton.jsx'
import { useThemeColors } from '../../lib/useThemeColors.js'
import { pngFilename } from '../../lib/exportPng.js'
import { cadenceLabel } from '../../lib/subscriptionMath.js'

const TICK_CANDIDATES = {
  monthly: [1, 3, 6, 12, 18, 24, 30, 36],
  weekly: [1, 2, 4, 8, 12, 26, 39, 52],
}

function fmtUsd(v) {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1000) return `$${v.toFixed(0)}`
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`
  return `$${v.toFixed(2)}`
}

function CustomTooltip({ active, payload, label, cac, cadence }) {
  if (!active || !payload || !payload.length) return null
  const ltvP = payload.find((p) => p.dataKey === 'cumLtv')
  const ltv = ltvP?.value ?? 0
  const margin = ltv - cac
  return (
    <div className="rounded border border-line-strong bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-fg">{cadenceLabel(label, cadence)}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-fg-dim">Cum LTV / install</span>
        <span className="ml-auto tabular-nums text-emerald-300">
          {fmtUsd(ltv)}
        </span>
      </div>
      {Number.isFinite(cac) && cac > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-fg-dim">vs CAC</span>
          <span
            className={`ml-auto tabular-nums ${
              margin >= 0 ? 'text-emerald-300' : 'text-red-400'
            }`}
          >
            {margin >= 0 ? '+' : ''}
            {fmtUsd(margin)}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * @param {{
 *   series: Array<{t:number, cumLtvPerInstall:number}>,
 *   bandSeries: Array<{t:number, lower:number, upper:number}>|null,
 *   bandSigma: 1|2,
 *   cohortSize: number,
 *   cac: number,
 *   payback: number|null,
 *   horizon: number,
 *   cadence: 'weekly'|'monthly',
 *   presetLabel?: string,
 * }} props
 */
export default function SubscriptionLTVChart({
  series,
  bandSeries,
  bandSigma = 1,
  cohortSize,
  cac,
  payback,
  horizon,
  cadence,
  presetLabel,
}) {
  const colors = useThemeColors()
  const cardRef = useRef(null)

  // ltvBand returns absolute revenue bounds (arpu × Σ R(t)), but our Y is
  // per-install. Convert by dividing by cohortSize to keep the band aligned
  // with the green line.
  const data = series.map((p, i) => ({
    t: p.t,
    cumLtv: p.cumLtvPerInstall,
    band:
      bandSeries && cohortSize > 0
        ? [bandSeries[i].lower / cohortSize, bandSeries[i].upper / cohortSize]
        : null,
  }))
  const showBand = !!bandSeries

  const lastLtv = series.length ? series[series.length - 1].cumLtvPerInstall : 0
  const bandUpperMax =
    bandSeries && cohortSize > 0
      ? bandSeries[bandSeries.length - 1].upper / cohortSize
      : 0
  const yMax = Math.max(lastLtv, cac, bandUpperMax) * 1.15
  const ticks = (TICK_CANDIDATES[cadence] ?? TICK_CANDIDATES.monthly).filter(
    (t) => t <= horizon,
  )
  const axisLabel = cadence === 'weekly' ? 'Week' : 'Month'
  const showCac = Number.isFinite(cac) && cac > 0

  return (
    <div ref={cardRef} className="rounded-lg border border-line bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Cumulative LTV per install</span>
          <HoverHint align="left">
            <p>
              Накопленный доход на одного инсталла на каждом cycle. Сравнивается
              с CAC (красная пунктирная) — точка пересечения и есть payback.
            </p>
            <p className="mt-1.5">
              Зоны до/после payback подсвечены: красная — когорта в минусе,
              зелёная — в плюсе.
            </p>
          </HoverHint>
        </div>
        <div className="flex items-baseline gap-2">
          {showBand && (
            <span className="text-xs text-fg-faint">
              shaded = ±{bandSigma}σ (≈{bandSigma === 1 ? '68%' : '95%'})
            </span>
          )}
          <ExportPngButton
            targetRef={cardRef}
            filename={pngFilename('subscription-ltv', presetLabel)}
          />
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="subLtvFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.line} stopOpacity={0.4} />
                <stop offset="100%" stopColor={colors.line} stopOpacity={0.05} />
              </linearGradient>
            </defs>
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
              tickFormatter={fmtUsd}
              domain={[0, yMax]}
            />
            <Tooltip content={<CustomTooltip cac={cac} cadence={cadence} />} />
            {showBand && (
              <Area
                dataKey="band"
                name={`±${bandSigma}σ`}
                stroke="none"
                fill={colors.line}
                fillOpacity={bandSigma === 1 ? 0.13 : 0.1}
                isAnimationActive={false}
                legendType="none"
                connectNulls
              />
            )}
            {showCac && payback != null && (
              <ReferenceArea
                x1={1}
                x2={payback}
                y1={0}
                y2={yMax}
                fill={colors.cac}
                fillOpacity={0.06}
                stroke="none"
              />
            )}
            {showCac && payback != null && (
              <ReferenceArea
                x1={payback}
                x2={horizon}
                y1={0}
                y2={yMax}
                fill={colors.line}
                fillOpacity={0.06}
                stroke="none"
              />
            )}
            {showCac && (
              <ReferenceLine
                y={cac}
                stroke={colors.cac}
                strokeDasharray="5 5"
                label={{
                  value: `CAC ${fmtUsd(cac)}`,
                  position: 'insideTopRight',
                  fill: colors.cac,
                  fontSize: 11,
                }}
              />
            )}
            {payback != null && (
              <ReferenceLine
                x={payback}
                stroke={colors.secondary}
                strokeDasharray="3 3"
                label={{
                  value: cadenceLabel(payback, cadence),
                  position: 'insideTop',
                  fill: colors.secondary,
                  fontSize: 11,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="cumLtv"
              name="Cum LTV / install"
              stroke={colors.line}
              strokeWidth={2}
              fill="url(#subLtvFill)"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
