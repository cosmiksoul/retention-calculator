// Unified 5-card KPI panel for the calculator. Period-aware — the same
// component renders D-prefixed labels for DAU mode, M-prefixed for monthly
// subscriptions, W-prefixed for weekly subscriptions.
//
// Cards (always in this order):
//   1. Predicted LTV       — per cohort entrant at horizon
//   2. Model fit (R²)      — power-law fit quality
//   3. Payback             — first period where cumulative LTV ≥ CAC
//   4. LTV / CAC           — ratio, colored by health band
//   5. <period><horizon> retention — fit value at the horizon endpoint
//
// Cards 3 & 4 hide when CAC is missing — keeps the panel honest about
// what's calculable.

import HoverHint from './HoverHint.jsx'
import { periodAbbr, periodUnit } from '../lib/calc.js'

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

function pctDelta(current, base, { higherIsBetter }) {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) {
    return null
  }
  const pct = ((current - base) / base) * 100
  if (Math.abs(pct) < 0.05) {
    return { text: '= baseline', tone: 'text-fg-faint' }
  }
  const sign = pct > 0 ? '+' : ''
  const better = higherIsBetter ? pct > 0 : pct < 0
  const tone = better ? 'text-emerald-300' : 'text-red-400'
  return { text: `${sign}${pct.toFixed(1)}% vs baseline`, tone }
}

function periodDelta(current, base, { unit, lowerIsBetter }) {
  if (current == null && base == null) return null
  if (current == null && base != null) {
    return { text: 'Not reached vs baseline', tone: 'text-red-400' }
  }
  if (current != null && base == null) {
    return { text: 'reached vs N/A', tone: 'text-emerald-300' }
  }
  const diff = current - base
  if (diff === 0) {
    return { text: '= baseline', tone: 'text-fg-faint' }
  }
  const sign = diff > 0 ? '+' : ''
  const better = lowerIsBetter ? diff < 0 : diff > 0
  const tone = better ? 'text-emerald-300' : 'text-red-400'
  return { text: `${sign}${diff}${unit} vs baseline`, tone }
}

function Card({ label, value, hint, tooltip, tooltipAlign = 'left', tone = 'text-fg-strong', delta }) {
  return (
    <div className="rounded-lg border border-line bg-bg-elev/50 px-4 py-3">
      <div className="flex items-center whitespace-nowrap text-xs uppercase tracking-wide text-fg-faint">
        <span>{label}</span>
        {tooltip && <HoverHint align={tooltipAlign}>{tooltip}</HoverHint>}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
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
 *   ltvAtHorizon: number,
 *   horizon: number,
 *   period: 'day'|'week'|'month',
 *   rSquared: number,
 *   payback: number|null,
 *   cac: number|null,
 *   horizonRetention: number,
 *   baseline?: {
 *     ltvAtHorizon: number,
 *     ratio: number|null,
 *     payback: number|null,
 *     horizonRetention: number,
 *   } | null,
 * }} props
 */
export default function KPICards({
  ltvAtHorizon,
  horizon,
  period,
  rSquared,
  payback,
  cac,
  horizonRetention,
  baseline,
}) {
  const abbr = periodAbbr(period)
  const unit = periodUnit(period)
  const showCacCards = cac != null && cac > 0
  const ratio = showCacCards ? ltvAtHorizon / cac : null
  const r2 = rsqTone(rSquared)

  const ltvDelta = baseline
    ? pctDelta(ltvAtHorizon, baseline.ltvAtHorizon, { higherIsBetter: true })
    : null
  const ratioDelta =
    baseline && ratio != null && baseline.ratio != null
      ? pctDelta(ratio, baseline.ratio, { higherIsBetter: true })
      : null
  const paybackDelta = baseline
    ? periodDelta(payback, baseline.payback, {
        unit: abbr.toLowerCase(),
        lowerIsBetter: true,
      })
    : null
  const retDelta = baseline
    ? pctDelta(horizonRetention, baseline.horizonRetention, {
        higherIsBetter: true,
      })
    : null

  const paybackLabel =
    period === 'day' ? 'Day' : period === 'week' ? 'Week' : 'Month'
  const paybackValue =
    payback != null ? `${paybackLabel} ${payback}` : 'Not reached'
  const paybackTone = payback != null ? 'text-fg-strong' : 'text-amber-300'
  const paybackHint =
    payback != null
      ? `at ${abbr}${payback}`
      : `LTV < CAC at ${abbr}${horizon}`

  return (
    <div
      className={`grid gap-3 ${
        showCacCards
          ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5'
          : 'grid-cols-2 md:grid-cols-3'
      }`}
    >
      <Card
        label="Predicted LTV"
        value={fmtUsd(ltvAtHorizon)}
        hint={`at ${abbr}${horizon}`}
        delta={ltvDelta}
        tooltip={
          <>
            <p>
              Per cohort entrant, на горизонте {abbr}{horizon}. Считается как
              ARPU × Σ R(t) × (acquired/cohort) для t = 1…{horizon} —
              складываются ожидаемые периодные доходы по степенной кривой
              ретеншена.
            </p>
            <p className="mt-1.5">
              Чем дальше горизонт, тем больше неопределённость — после ~3× от
              вашей последней точки данных модель экстраполирует, и прогноз
              стоит брать с поправкой на полосу ±σ.
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
      {showCacCards && (
        <>
          <Card
            label="Payback"
            value={paybackValue}
            hint={paybackHint}
            tone={paybackTone}
            delta={paybackDelta}
            tooltip={
              <>
                <p>
                  Первый {unit}, на котором накопленная выручка покрыла полную
                  стоимость привлечения когорты (cohort × CAC). После этой
                  точки когорта переходит в плюс.
                </p>
                <p className="mt-1.5">
                  Если payback позже горизонта — показывается «Not reached»:
                  юнит-экономика на текущих параметрах не сходится в выбранном
                  окне.
                </p>
              </>
            }
          />
          <Card
            label="LTV / CAC"
            value={ratio != null && Number.isFinite(ratio) ? ratio.toFixed(2) : '—'}
            hint={
              ratio == null
                ? null
                : ratio >= 3
                ? 'healthy'
                : ratio >= 1
                ? 'borderline'
                : 'unprofitable'
            }
            tone={ltvCacTone(ratio)}
            delta={ratioDelta}
            tooltip={
              <>
                <p>
                  Стандартная метрика юнит-экономики. ≥ 3.0 — здоровый бизнес,
                  можно масштабировать paid acquisition. 1.0–3.0 — на грани.
                  &lt; 1.0 — теряете деньги на каждом привлечённом юзере.
                </p>
                <p className="mt-1.5">
                  Считается на горизонте {abbr}{horizon}; на коротком — ниже.
                </p>
              </>
            }
          />
        </>
      )}
      <Card
        label={`${abbr}${horizon} retention`}
        value={
          Number.isFinite(horizonRetention)
            ? `${(horizonRetention * 100).toFixed(2)}%`
            : '—'
        }
        hint="long-term, end of horizon"
        tooltipAlign="right"
        delta={retDelta}
        tooltip={
          <>
            <p>
              Прогноз ретеншена в самой дальней точке горизонта ({abbr}{horizon}) —
              значение фита R(t) = a·t<sup>−b</sup> на конце окна.
            </p>
            <p className="mt-1.5">
              Sanity-check для модели: если число выглядит нереалистично
              высоким или низким — фит плохо экстраполируется и стоит
              добавить точек или сменить пресет.
            </p>
          </>
        }
      />
    </div>
  )
}
