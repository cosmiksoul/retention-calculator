import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import HoverHint from './HoverHint.jsx'
import { useThemeColors } from '../lib/useThemeColors.js'

function fmtUsd(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v < 0 ? '−' : ''
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1000) return `${sign}$${abs.toFixed(0)}`
  return `${sign}$${abs.toFixed(2)}`
}

function fmtPct(v) {
  if (!Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(0)}%`
}

function CustomTooltip({ active, payload, label, acquisitionCost }) {
  if (!active || !payload || !payload.length) return null
  const cum = payload[0]?.value ?? 0
  const profit = cum - acquisitionCost
  return (
    <div className="rounded border border-line-strong bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-fg">Day {label}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-fg-dim">Cum revenue</span>
        <span className="ml-auto tabular-nums text-emerald-300">
          {fmtUsd(cum)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-fg-dim">vs acquisition cost</span>
        <span
          className={`ml-auto tabular-nums ${
            profit >= 0 ? 'text-emerald-300' : 'text-red-400'
          }`}
        >
          {profit >= 0 ? '+' : ''}
          {fmtUsd(profit)}
        </span>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   series: Array<{t:number, cumLtv:number}>,
 *   cohortSize: number,
 *   cac: number,
 *   beDay: number|null,
 *   horizon: number,
 * }} props
 */
export default function CohortPL({ series, cohortSize, cac, beDay, horizon }) {
  const colors = useThemeColors()
  const acquisitionCost = cohortSize * cac
  const revenueAtHorizon = series[series.length - 1].cumLtv * cohortSize
  const revenueAtBreakeven =
    beDay != null ? series[beDay - 1].cumLtv * cohortSize : null
  const profit = revenueAtHorizon - acquisitionCost
  const roi = acquisitionCost > 0 ? profit / acquisitionCost : null

  const chartData = series.map((p) => ({
    t: p.t,
    cumRevenue: p.cumLtv * cohortSize,
  }))

  const yMax = Math.max(revenueAtHorizon, acquisitionCost) * 1.1

  const rows = [
    {
      label: 'Acquisition cost (total)',
      value: fmtUsd(acquisitionCost),
      formula: `${cohortSize.toLocaleString()} × ${fmtUsd(cac)}`,
    },
    {
      label: `Revenue at breakeven`,
      value:
        revenueAtBreakeven != null
          ? fmtUsd(revenueAtBreakeven)
          : '— (not reached)',
      formula:
        beDay != null
          ? `Σ revenue up to Day ${beDay}`
          : `cum revenue stays below acquisition cost on the horizon`,
    },
    {
      label: `Revenue at horizon (D${horizon})`,
      value: fmtUsd(revenueAtHorizon),
      formula: `Σ revenue × cohort size`,
    },
    {
      label: 'Profit at horizon',
      value: fmtUsd(profit),
      formula: 'Revenue at horizon − Acquisition cost',
      tone: profit >= 0 ? 'text-emerald-300' : 'text-red-400',
    },
    {
      label: 'ROI at horizon',
      value: roi != null ? fmtPct(roi) : '—',
      formula: 'Profit / Acquisition cost',
      tone:
        roi == null
          ? 'text-fg'
          : roi >= 0
          ? 'text-emerald-300'
          : 'text-red-400',
    },
    {
      label: 'Breakeven day',
      value: beDay != null ? `Day ${beDay}` : 'Not reached',
      formula: 'first t where cum revenue ≥ acquisition cost',
      tone: beDay != null ? 'text-fg-strong' : 'text-amber-300',
    },
  ]

  return (
    <div className="space-y-4 rounded-lg border border-line bg-bg-elev/40 p-4">
      <div>
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Cohort P&amp;L</span>
          <HoverHint align="left">
            <p>
              Абсолютная экономика когорты: per-user LTV × cohort size vs.
              total acquisition cost (cohort × CAC).
            </p>
            <p className="mt-1.5">
              Profit at horizon, ROI и breakeven day показывают финансовую
              состоятельность когорты в выбранном окне. Если breakeven позже
              горизонта — экономика на текущих параметрах не сходится.
            </p>
          </HoverHint>
        </div>
        <p className="mt-0.5 text-xs text-fg-faint">
          Absolute economics for a cohort of {cohortSize.toLocaleString()} users
          at CAC {fmtUsd(cac)}.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line/60">
            {rows.map((row) => (
              <tr key={row.label} className="tabular-nums">
                <td className="py-1.5 pr-4 text-fg-dim">{row.label}</td>
                <td
                  className={`py-1.5 pr-4 text-right font-semibold ${
                    row.tone ?? 'text-fg-strong'
                  }`}
                >
                  {row.value}
                </td>
                <td className="py-1.5 text-right text-xs text-fg-faint">
                  {row.formula}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.line} stopOpacity={0.4} />
                <stop offset="100%" stopColor={colors.line} stopOpacity={0.05} />
              </linearGradient>
            </defs>
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
              tickFormatter={fmtUsd}
              domain={[0, yMax]}
            />
            <Tooltip content={<CustomTooltip acquisitionCost={acquisitionCost} />} />
            {beDay != null && (
              <ReferenceArea
                x1={1}
                x2={beDay}
                y1={0}
                y2={yMax}
                fill={colors.cac}
                fillOpacity={0.06}
                stroke="none"
              />
            )}
            {beDay != null && (
              <ReferenceArea
                x1={beDay}
                x2={horizon}
                y1={0}
                y2={yMax}
                fill={colors.line}
                fillOpacity={0.06}
                stroke="none"
              />
            )}
            <ReferenceLine
              y={acquisitionCost}
              stroke={colors.cac}
              strokeDasharray="5 5"
              label={{
                value: `Acquisition cost ${fmtUsd(acquisitionCost)}`,
                position: 'insideTopRight',
                fill: colors.cac,
                fontSize: 11,
              }}
            />
            {beDay != null && (
              <ReferenceLine x={beDay} stroke={colors.secondary} strokeDasharray="3 3" />
            )}
            <Area
              type="monotone"
              dataKey="cumRevenue"
              name="Cum revenue"
              stroke={colors.line}
              strokeWidth={2}
              fill="url(#revFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
