// Five KPI cards for subscription mode, unified with DAU mode (spec-v2 §5.1):
//   1. Predicted LTV       — main number, per install at horizon
//   2. Model fit (R²)      — quality of the power-law fit
//   3. Payback             — "Month 8" / "Week 12" / "Not reached"
//   4. LTV / CAC           — colored: red <1, amber 1–3, emerald >3
//   5. Long-term retention — fit value at the horizon endpoint
//
// All values are derived; this component is purely presentational.

import HoverHint from '../HoverHint.jsx'
import { cadenceUnit } from '../../lib/subscriptionMath.js'
import { pctDelta, periodDelta } from '../../lib/baselineDelta.js'

function fmtUsd(x) {
  if (!Number.isFinite(x)) return '—'
  if (Math.abs(x) >= 1000) return `$${x.toFixed(0)}`
  if (Math.abs(x) >= 10) return `$${x.toFixed(1)}`
  return `$${x.toFixed(2)}`
}

function rsqTone(r2) {
  if (r2 >= 0.95) return { tone: 'text-emerald-300', label: 'Excellent' }
  if (r2 >= 0.85) return { tone: 'text-fg', label: 'Good' }
  return { tone: 'text-amber-300', label: 'Weak fit — extrapolation is risky' }
}

function ltvCacTone(ratio) {
  if (!Number.isFinite(ratio)) return 'text-fg-strong'
  if (ratio >= 3) return 'text-emerald-300'
  if (ratio >= 1) return 'text-amber-300'
  return 'text-red-400'
}

function Card({ label, value, hint, tone = 'text-fg-strong', tooltip, tooltipAlign = 'left', delta }) {
  return (
    <div className="rounded-lg border border-line bg-bg-elev/50 px-4 py-3">
      <div className="flex items-center whitespace-nowrap text-xs uppercase tracking-wide text-fg-faint">
        <span>{label}</span>
        {tooltip && <HoverHint align={tooltipAlign}>{tooltip}</HoverHint>}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
      {delta && (
        <div className={`mt-0.5 text-xs tabular-nums ${delta.tone}`}>
          {delta.text}
        </div>
      )}
      {hint && !delta && <div className="mt-0.5 text-xs text-fg-faint">{hint}</div>}
    </div>
  )
}

/**
 * @param {{
 *   ltvPerInstall: number,
 *   rSquared: number,
 *   cac: number,
 *   payback: number|null,
 *   horizonRetention: number,
 *   horizon: number,
 *   cadence: 'weekly'|'monthly',
 *   baseline?: {
 *     ltvPerInstall: number,
 *     ratio: number|null,
 *     payback: number|null,
 *     horizonRetention: number,
 *   } | null,
 * }} props
 */
export default function SubscriptionKPI({
  ltvPerInstall,
  rSquared,
  cac,
  payback,
  horizonRetention,
  horizon,
  cadence,
  baseline,
}) {
  const unit = cadenceUnit(cadence)
  const cycleAbbr = cadence === 'weekly' ? 'W' : 'M'
  const showCac = Number.isFinite(cac) && cac > 0
  const ratio = showCac ? ltvPerInstall / cac : null
  const r2 = rsqTone(rSquared)

  const ltvDeltaInfo = baseline
    ? pctDelta(ltvPerInstall, baseline.ltvPerInstall, { higherIsBetter: true })
    : null
  const ratioDeltaInfo =
    baseline && ratio != null && baseline.ratio != null
      ? pctDelta(ratio, baseline.ratio, { higherIsBetter: true })
      : null
  const paybackDeltaInfo = baseline
    ? periodDelta(payback, baseline.payback, {
        lowerIsBetter: true,
        unit: cadence === 'weekly' ? 'w' : 'mo',
      })
    : null
  const retDeltaInfo = baseline
    ? pctDelta(horizonRetention, baseline.horizonRetention, {
        higherIsBetter: true,
      })
    : null

  const paybackValue =
    payback != null
      ? `${unit === 'week' ? 'Week' : 'Month'} ${payback}`
      : 'Not reached'
  const paybackTone = payback != null ? 'text-fg-strong' : 'text-amber-300'
  const paybackHint =
    payback != null
      ? `at ${cycleAbbr}${payback}`
      : `LTV < CAC at ${cycleAbbr}${horizon}`

  const ratioHint =
    ratio == null ? null : ratio >= 3 ? 'healthy' : ratio >= 1 ? 'borderline' : 'unprofitable'

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      <Card
        label="Predicted LTV"
        value={fmtUsd(ltvPerInstall)}
        hint={`at ${cycleAbbr}${horizon}`}
        delta={ltvDeltaInfo}
        tooltip={
          <>
            <p>
              Σ revenue (1..{horizon}) / cohort. Главное число unit-economics —
              именно с ним сравнивается CAC, потому что CAC платится за инсталл,
              не за платящего.
            </p>
          </>
        }
      />
      <Card
        label="Model fit (R²)"
        value={Number.isFinite(rSquared) ? rSquared.toFixed(3) : '—'}
        hint={r2.label}
        tone={r2.tone}
        tooltip={
          <>
            <p>
              Доля дисперсии ваших точек, объяснённая моделью R(t) = a·t<sup>−b</sup>.
              Считается на лог-преобразованных данных.
            </p>
            <p className="mt-1.5">
              ≥ 0.95 — отличная подгонка, прогноз надёжен. 0.85–0.95 —
              приемлемо. &lt; 0.85 — модель плохо ложится на ваши данные;
              экстраполяция рискованна, попробуйте сменить пресет или добавить
              промежуточных точек.
            </p>
          </>
        }
      />
      <Card
        label="Payback"
        value={paybackValue}
        hint={paybackHint}
        tone={paybackTone}
        delta={paybackDeltaInfo}
        tooltip={
          <>
            <p>
              Первый {unit}, на котором накопленная выручка покрыла полную
              стоимость привлечения когорты (cohort × CAC). После этой точки
              когорта переходит в плюс.
            </p>
          </>
        }
      />
      <Card
        label="LTV / CAC"
        value={ratio != null ? ratio.toFixed(2) : '—'}
        hint={ratioHint}
        tone={ltvCacTone(ratio)}
        delta={ratioDeltaInfo}
        tooltip={
          <>
            <p>
              Стандартная метрика юнит-экономики. ≥ 3.0 — здоровый бизнес,
              можно масштабировать paid acquisition. 1.0–3.0 — на грани.
              &lt; 1.0 — теряете деньги на каждом инсталле.
            </p>
            <p className="mt-1.5">
              Считается на горизонте {cycleAbbr}{horizon}; на коротком — ниже.
            </p>
          </>
        }
      />
      <Card
        label={`${cycleAbbr}${horizon} retention`}
        value={
          Number.isFinite(horizonRetention)
            ? `${(horizonRetention * 100).toFixed(2)}%`
            : '—'
        }
        hint="long-term, end of horizon"
        tooltipAlign="right"
        delta={retDeltaInfo}
        tooltip={
          <>
            <p>
              Прогноз ретеншена платящих пользователей в самой дальней точке
              горизонта ({cycleAbbr}{horizon}) — значение фита R(t) = a·t<sup>−b</sup>
              на конце окна.
            </p>
            <p className="mt-1.5">
              Sanity-check для модели: если число выглядит нереалистично высоким
              или низким — фит плохо экстраполируется и стоит добавить точек.
            </p>
          </>
        }
      />
    </div>
  )
}
