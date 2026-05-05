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
import HoverHint from './HoverHint.jsx'
import { useThemeColors } from '../lib/useThemeColors.js'

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
    <div className="rounded border border-line-strong bg-bg-elev/95 px-3 py-2 text-xs">
      <div className="font-medium text-fg">Day {label}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-fg-dim">Observed</span>
        <span className="ml-auto tabular-nums text-accent-fg">{fmt(obs)}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-fg-dim">Reconstructed</span>
        <span className="ml-auto tabular-nums text-emerald-300">{fmt(rec)}</span>
      </div>
      {err != null && Number.isFinite(err) && (
        <div className="flex items-center gap-3">
          <span className="text-fg-dim">Δ</span>
          <span
            className={`ml-auto tabular-nums ${
              Math.abs(err) > 10 ? 'text-amber-300' : 'text-fg-dim'
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
  const colors = useThemeColors()
  const data = observed.map((v, i) => ({
    t: i + 1,
    observed: v,
    reconstructed: reconstructed[i],
  }))

  return (
    <div className="rounded-lg border border-line bg-bg-elev/40 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center text-sm font-medium text-fg">
          <span>Observed vs reconstructed DAU</span>
          <HoverHint align="left">
            <p>
              Диагностика DAU-деконволюции: вы вводите наблюдаемый DAU и
              new_users по дням; калькулятор восстанавливает кривую ретеншена
              и обратно ре-конволвит её для проверки. Реконструированная линия
              должна совпадать с наблюдаемой.
            </p>
            <p className="mt-1.5">
              RMSE: &lt; 5% отлично, 5–15% приемлемо, &gt; 15% — данные плохо
              описываются моделью с фиксированной формой ретеншена (заметна
              реактивация юзеров или сезонные эффекты).
            </p>
          </HoverHint>
        </div>
        {rmsePct != null && (
          <div className="text-xs">
            <span className="text-fg-faint">RMSE: </span>
            <span
              className={`tabular-nums ${
                rmsePct < 5
                  ? 'text-emerald-300'
                  : rmsePct < 15
                  ? 'text-fg'
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
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[1, observed.length]}
              stroke={colors.axis}
              tick={{ fontSize: 11 }}
              label={{ value: 'Day', position: 'insideBottom', offset: -2, fill: colors.axis, fontSize: 11 }}
            />
            <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} domain={[0, 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="observed"
              name="Observed DAU"
              stroke={colors.user}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="reconstructed"
              name="Reconstructed"
              stroke={colors.recon}
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
