// Paying-base KPI block — answers "how does the paying funnel and curve
// perform?". Pairs with AcquisitionKPI on screen.
//
// Six cards: Lost in funnel, Payer base, Model fit (R²), Revenue at
// horizon, LTV per paid, Horizon retention. LTV per paid = cumulative
// cohort revenue / paying base size; equals LTV per acquired when funnel
// is empty (DAU mode), and renders as such — we deliberately don't
// special-case DAU, the duplicated number is part of the transparency.

import HoverHint from './HoverHint.jsx'
import KpiCard from './KpiCard.jsx'
import {
  fmtUsd,
  fmtCount,
  rsqTone,
  pctDelta,
} from '../lib/kpiFormat.js'
import { periodAbbr } from '../lib/calc.js'

/**
 * @param {{
 *   cohortSize: number,
 *   payerBase: number,
 *   rSquared: number,
 *   cumRevenueAtHorizon: number,
 *   totalSpent: number|null,
 *   ltvPerPaid: number,
 *   horizonRetention: number,
 *   horizon: number,
 *   period: 'day'|'week'|'month',
 *   funnelLength: number,
 *   baseline?: { horizonRetention: number } | null,
 * }} props
 */
export default function PayingBaseKPI({
  cohortSize,
  payerBase,
  rSquared,
  cumRevenueAtHorizon,
  totalSpent,
  ltvPerPaid,
  horizonRetention,
  horizon,
  period,
  funnelLength,
  baseline,
}) {
  const abbr = periodAbbr(period)
  const r2 = rsqTone(rSquared)

  const lostCount = Math.max(0, cohortSize - payerBase)
  const lostPct = cohortSize > 0 ? (lostCount / cohortSize) * 100 : 0
  const payerPct = cohortSize > 0 ? (payerBase / cohortSize) * 100 : 0

  const profit = totalSpent != null ? cumRevenueAtHorizon - totalSpent : null
  const revenueTone =
    profit == null
      ? 'text-fg-strong'
      : profit >= 0
      ? 'text-emerald-300'
      : 'text-amber-300'
  const revenueHint =
    profit == null
      ? 'cumulative cohort revenue'
      : profit >= 0
      ? `+${fmtUsd(profit)} vs Total Spent`
      : `${fmtUsd(profit)} vs Total Spent`

  const lostHint =
    funnelLength > 0
      ? `${lostPct.toFixed(1)}% of cohort`
      : 'no funnel — full cohort active'
  const payerHint =
    funnelLength > 0
      ? `${payerPct.toFixed(1)}% of cohort, period 0`
      : 'entire cohort, period 0'

  const retDelta = baseline
    ? pctDelta(horizonRetention, baseline.horizonRetention, {
        higherIsBetter: true,
      })
    : null

  return (
    <div className="rounded-lg border border-line bg-bg-elev/20 p-4">
      <div className="mb-3 flex items-center text-sm font-medium text-fg">
        <span>Paying base economics</span>
        <HoverHint align="left">
          <p>
            Что происходит с теми, кто реально дошёл до paying. Сколько
            потеряли в funnel, какая активная база осталась на period 0,
            насколько хорошо модель ложится на ваши точки, и какую выручку
            эта база даст к концу горизонта.
          </p>
          <p className="mt-1.5">
            LTV per paid считается на размер payer base, не на полную когорту
            — это «честный» revenue per active user, без размытия funnel-
            потерями. Когда funnel=[] (DAU-режим), payer base = cohort, и
            LTV per paid совпадает с LTV per acquired.
          </p>
        </HoverHint>
      </div>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard
          label="Lost in funnel"
          value={fmtCount(lostCount)}
          hint={lostHint}
          tone={lostCount > 0 ? 'text-red-300' : 'text-fg-strong'}
          tooltip={
            <p>
              Сколько юзеров отвалилось на conversion-шагах между cohort и
              активной платящей базой. CAC за них уже заплачен — отдачи не
              будет.
            </p>
          }
        />
        <KpiCard
          label="Payer base"
          value={fmtCount(payerBase)}
          hint={payerHint}
          tooltip={
            <p>
              Active payer pool — те, до кого дошёл funnel, на period 0. На
              них применяется ARPU per period × retention curve, отсюда и
              считается cumulative revenue.
            </p>
          }
        />
        <KpiCard
          label="Model fit (R²)"
          value={Number.isFinite(rSquared) ? rSquared.toFixed(3) : '—'}
          hint={r2.label}
          tone={r2.tone}
          tooltip={
            <>
              <p>
                Доля дисперсии ваших точек, объяснённая моделью R(t) = a·t
                <sup>−b</sup>. Считается на лог-преобразованных данных.
              </p>
              <p className="mt-1.5">
                ≥ 0.95 — отличная подгонка, прогноз надёжен. 0.85–0.95 —
                приемлемо. &lt; 0.85 — модель плохо ложится на ваши данные;
                экстраполяция рискованна, попробуйте сменить пресет или
                добавить промежуточных точек.
              </p>
            </>
          }
        />
        <KpiCard
          label={`Revenue at ${abbr}${horizon}`}
          value={fmtUsd(cumRevenueAtHorizon)}
          hint={revenueHint}
          tone={revenueTone}
          tooltip={
            <p>
              Накопленная выручка когорты за весь горизонт прогноза.
              Сравнение с Total Spent (acquisition block) даёт абсолютную
              прибыль / убыток на когорте.
            </p>
          }
        />
        <KpiCard
          label="LTV per paid"
          value={fmtUsd(ltvPerPaid)}
          hint={`at ${abbr}${horizon}`}
          tooltip={
            <>
              <p>
                На одного дошедшего до paying юзера, на горизонте {abbr}
                {horizon}. Делим cumulative cohort revenue на размер payer
                base, без учёта funnel-loss — «честная» юнит-экономика
                активного юзера.
              </p>
              <p className="mt-1.5">
                Сравнивайте с LTV per acquired из соседнего блока. Если
                разница большая — funnel «жрёт» много, имеет смысл вложиться
                в conversion вместо новой закупки.
              </p>
              <p className="mt-1.5">
                Если на funnel-шагах заданы one-time fees, их выручка тоже
                входит в numerator — даже от тех, кто заплатил trial и потом
                не сконвертировался в paid.
              </p>
            </>
          }
        />
        <KpiCard
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
                Прогноз ретеншена в самой дальней точке горизонта ({abbr}
                {horizon}) — значение фита R(t) = a·t<sup>−b</sup> на конце
                окна.
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
    </div>
  )
}
