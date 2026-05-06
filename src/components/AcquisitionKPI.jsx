// Acquisition-side KPI block — answers "was the cohort buy worth it?"
//
// Six cards: Cohort size, CAC, Total Spent, LTV per acquired, LTV / CAC,
// Payback. Pairs with PayingBaseKPI (paying-side block) on screen — the two
// blocks split the unit economics into "money in" vs "money out", because
// reasoning about LTV per acquired and LTV per paid in a single 5-card row
// kept tripping users up when verifying the math.
//
// Per-acquired LTV = cumulative cohort revenue / cohort size, including
// funnel loss. Same as v1 cumLtv when funnel=[]. CAC is paid per cohort
// entrant, so this is the LTV that pairs with CAC for ratio / payback.
//
// CAC-dependent cards (Total Spent, LTV/CAC, Payback) render '—' with a
// "CAC not set" hint when CAC is missing — we keep the visual structure
// stable instead of collapsing the grid.

import HoverHint from './HoverHint.jsx'
import KpiCard from './KpiCard.jsx'
import {
  fmtUsd,
  fmtCount,
  ltvCacTone,
  pctDelta,
  periodDelta,
} from '../lib/kpiFormat.js'
import { periodAbbr, periodUnit } from '../lib/calc.js'

/**
 * @param {{
 *   cohortSize: number,
 *   cac: number|null,
 *   ltvPerAcquired: number,
 *   payback: number|null,
 *   horizon: number,
 *   period: 'day'|'week'|'month',
 *   baseline?: {
 *     ltvPerAcquired: number,
 *     ratio: number|null,
 *     payback: number|null,
 *   } | null,
 * }} props
 */
export default function AcquisitionKPI({
  cohortSize,
  cac,
  ltvPerAcquired,
  payback,
  horizon,
  period,
  baseline,
}) {
  const abbr = periodAbbr(period)
  const unit = periodUnit(period)
  const hasCac = cac != null && cac > 0
  const totalSpent = hasCac ? cohortSize * cac : null
  const ratio = hasCac ? ltvPerAcquired / cac : null

  const ltvDelta = baseline
    ? pctDelta(ltvPerAcquired, baseline.ltvPerAcquired, { higherIsBetter: true })
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

  const paybackLabel =
    period === 'day' ? 'Day' : period === 'week' ? 'Week' : 'Month'
  const paybackValue = !hasCac
    ? '—'
    : payback != null
    ? `${paybackLabel} ${payback}`
    : 'Not reached'
  const paybackTone = !hasCac
    ? 'text-fg-disabled'
    : payback != null
    ? 'text-fg-strong'
    : 'text-amber-300'
  const paybackHint = !hasCac
    ? 'CAC not set'
    : payback != null
    ? `at ${abbr}${payback}`
    : `LTV < CAC at ${abbr}${horizon}`

  return (
    <div className="rounded-lg border border-line bg-bg-elev/20 p-4">
      <div className="mb-3 flex items-center text-sm font-medium text-fg">
        <span>Acquisition economics</span>
        <HoverHint align="left">
          <p>
            Сколько вложили в закупку когорты и что получили взамен —
            считается per cohort entrant (на одного входящего), включая всех,
            кто отвалился в funnel и не дошёл до paying. CAC платится за
            каждого входящего, поэтому именно эта LTV сопоставима с CAC.
          </p>
          <p className="mt-1.5">
            Парный блок «Paying base» считает то же самое, но на тех, кто
            реально дошёл до paying — два разных LTV в одном дашборде, чтобы
            не путать их при ревизии экономики.
          </p>
        </HoverHint>
      </div>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard
          label="Cohort size"
          value={fmtCount(cohortSize)}
          hint="acquired users"
          tooltip={
            <p>
              Размер привлекаемой когорты — кол-во новых acquired users
              (installs / FTDs / signups), за которых уже заплачен CAC. От
              этой точки считаются Total Spent и Payback.
            </p>
          }
        />
        <KpiCard
          label="CAC"
          value={hasCac ? fmtUsd(cac) : '—'}
          hint={hasCac ? `$ / acquired ${unit}-cohort entrant` : 'CAC not set'}
          tone={hasCac ? 'text-fg-strong' : 'text-fg-disabled'}
          tooltip={
            <p>
              Customer Acquisition Cost — на одного входящего в когорту (per
              install / per FTD). Если оставить пусто, Total Spent / LTV/CAC
              / Payback не считаются.
            </p>
          }
        />
        <KpiCard
          label="Total Spent"
          value={fmtUsd(totalSpent)}
          hint={
            hasCac
              ? `${fmtCount(cohortSize)} × ${fmtUsd(cac)}`
              : 'CAC not set'
          }
          tone={hasCac ? 'text-amber-300' : 'text-fg-disabled'}
          tooltip={
            <p>
              Полная стоимость закупки когорты: cohort size × CAC. Это нижняя
              граница, которую нужно отбить выручкой к концу горизонта.
            </p>
          }
        />
        <KpiCard
          label="LTV per acquired"
          value={fmtUsd(ltvPerAcquired)}
          hint={`at ${abbr}${horizon}`}
          delta={ltvDelta}
          tooltip={
            <>
              <p>
                На одного входящего в когорту, на горизонте {abbr}
                {horizon}. Учитывает funnel-loss: те, кто не дошёл до paying,
                всё равно «съели» свою долю CAC, поэтому делим cumulative
                cohort revenue на полный размер когорты.
              </p>
              <p className="mt-1.5">
                Это LTV, которая парная к CAC. Сравнивайте с LTV per paid из
                соседнего блока — расхождение показывает цену funnel.
              </p>
            </>
          }
        />
        <KpiCard
          label="LTV / CAC"
          value={
            !hasCac
              ? '—'
              : Number.isFinite(ratio)
              ? ratio.toFixed(2)
              : '—'
          }
          hint={
            !hasCac
              ? 'CAC not set'
              : ratio == null
              ? null
              : ratio >= 3
              ? 'healthy'
              : ratio >= 1
              ? 'borderline'
              : 'unprofitable'
          }
          tone={hasCac ? ltvCacTone(ratio) : 'text-fg-disabled'}
          delta={ratioDelta}
          tooltip={
            <>
              <p>
                Стандартная метрика юнит-экономики: LTV per acquired ÷ CAC.
                ≥ 3.0 — здоровый бизнес, можно масштабировать paid
                acquisition. 1.0–3.0 — на грани. &lt; 1.0 — теряете деньги
                на каждом привлечённом юзере.
              </p>
              <p className="mt-1.5">
                Считается на горизонте {abbr}{horizon}; на коротком — ниже.
              </p>
            </>
          }
        />
        <KpiCard
          label="Payback"
          value={paybackValue}
          hint={paybackHint}
          tone={paybackTone}
          delta={paybackDelta}
          tooltipAlign="right"
          tooltip={
            <>
              <p>
                Первый {unit}, на котором накопленная выручка покрыла полную
                стоимость закупки когорты (cohort × CAC). После этой точки
                когорта переходит в плюс.
              </p>
              <p className="mt-1.5">
                Если payback позже горизонта — «Not reached»: на текущих
                параметрах окупаемость не сходится в выбранном окне.
              </p>
            </>
          }
        />
      </div>
    </div>
  )
}
