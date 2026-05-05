// Five KPI cards for subscription mode (spec-v2 §5.1):
//   1. LTV per install     — main number
//   2. LTV / CAC            — colored: red <1, amber 1–3, emerald >3
//   3. Payback              — "Month 8" / "Week 12" / "Not reached"
//   4. Trial → Paid         — echoed input, highlighted as the key knob
//   5. Long-term retention  — fit value at the cadence anchor (M12 / W26)
//
// All values are derived; this component is purely presentational.

import HoverHint from '../HoverHint.jsx'
import { cadenceUnit } from '../../lib/subscriptionMath.js'

function fmtUsd(x) {
  if (!Number.isFinite(x)) return '—'
  if (Math.abs(x) >= 1000) return `$${x.toFixed(0)}`
  if (Math.abs(x) >= 10) return `$${x.toFixed(1)}`
  return `$${x.toFixed(2)}`
}

function ltvCacTone(ratio) {
  if (!Number.isFinite(ratio)) return 'text-fg-strong'
  if (ratio >= 3) return 'text-emerald-300'
  if (ratio >= 1) return 'text-amber-300'
  return 'text-red-400'
}

function Card({ label, value, hint, tone = 'text-fg-strong', tooltip, tooltipAlign = 'left' }) {
  return (
    <div className="rounded-lg border border-line bg-bg-elev/50 px-4 py-3">
      <div className="flex items-center whitespace-nowrap text-xs uppercase tracking-wide text-fg-faint">
        <span>{label}</span>
        {tooltip && <HoverHint align={tooltipAlign}>{tooltip}</HoverHint>}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-fg-faint">{hint}</div>}
    </div>
  )
}

/**
 * @param {{
 *   ltvPerInstall: number,
 *   cac: number,
 *   payback: number|null,
 *   trialToPaid: number,
 *   longTermRetention: number,
 *   longTermAnchor: number,
 *   horizon: number,
 *   cadence: 'weekly'|'monthly',
 * }} props
 */
export default function SubscriptionKPI({
  ltvPerInstall,
  cac,
  payback,
  trialToPaid,
  longTermRetention,
  longTermAnchor,
  horizon,
  cadence,
}) {
  const unit = cadenceUnit(cadence)
  const cycleAbbr = cadence === 'weekly' ? 'W' : 'M'
  const showCac = Number.isFinite(cac) && cac > 0
  const ratio = showCac ? ltvPerInstall / cac : null

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
        label="LTV / install"
        value={fmtUsd(ltvPerInstall)}
        hint={`at ${cycleAbbr}${horizon}`}
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
        label="LTV / CAC"
        value={ratio != null ? ratio.toFixed(2) : '—'}
        hint={ratioHint}
        tone={ltvCacTone(ratio)}
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
        label="Payback"
        value={paybackValue}
        hint={paybackHint}
        tone={paybackTone}
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
        label="Trial → Paid"
        value={Number.isFinite(trialToPaid) ? `${trialToPaid.toFixed(1)}%` : '—'}
        hint="key knob"
        tone="text-accent-fg"
        tooltipAlign="right"
        tooltip={
          <>
            <p>
              Главная переменная subscription unit-economics — небольшое
              движение в обе стороны сильнее всего влияет на LTV.
            </p>
            <p className="mt-1.5">
              Подсвечен отдельной карточкой, чтобы держать его на виду:
              ARPU и retention двигают линейно, а t→p — мультипликативно
              на весь funnel.
            </p>
          </>
        }
      />
      <Card
        label={`Retention @ ${cycleAbbr}${longTermAnchor}`}
        value={
          Number.isFinite(longTermRetention)
            ? `${(longTermRetention * 100).toFixed(1)}%`
            : '—'
        }
        hint="long-term stickiness"
        tooltipAlign="right"
        tooltip={
          <>
            <p>
              Доля платящих юзеров, всё ещё активных на якорном чекпоинте
              ({cycleAbbr}{longTermAnchor}) — для monthly это annual renewal
              point, для weekly — ~6 месяцев.
            </p>
            <p className="mt-1.5">
              Считается из power-law fit, не из сырого input — может слегка
              отличаться от введённого значения если кривая шумная.
            </p>
          </>
        }
      />
    </div>
  )
}
