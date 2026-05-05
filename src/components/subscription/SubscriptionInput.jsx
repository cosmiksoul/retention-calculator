// Subscription mode input form. Renders four sub-blocks:
//
//   1. Funnel — install→trial and trial→paid percentages
//   2. Retention checkpoints — M1/M3/M6/M12 in monthly, W1/W2/W4/W8/W12/W26
//      in weekly. Fixed checkpoints per cadence (not user-extensible like
//      v1's Manual input)
//   3. Pricing & cohort — ARPU paid per cycle, CAC per install, cohort size
//   4. Horizon — slider with cadence-aware range and unit
//
// State is owned by Calculator.jsx; this component is purely presentational
// and dispatches updates via an opaque `onPatch(partial)` callback.

import HoverHint from '../HoverHint.jsx'
import { HORIZON_RANGE } from '../../lib/subscriptionInputs.js'

const inputCls =
  'rounded border border-line-strong bg-bg-subtle px-2 py-1 text-sm tabular-nums ' +
  'text-fg-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'

function NumberField({ label, value, onChange, suffix, error, tooltip, tooltipAlign = 'left', step = 'any', min }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center text-sm font-medium text-fg-muted">
        <span>{label}</span>
        {tooltip && <HoverHint align={tooltipAlign}>{tooltip}</HoverHint>}
      </span>
      <div className="flex items-baseline gap-2">
        <input
          type="number"
          step={step}
          min={min}
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value
            onChange(v === '' ? null : Number(v))
          }}
          className={`${inputCls} w-full`}
        />
        {suffix && <span className="text-xs text-fg-faint">{suffix}</span>}
      </div>
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  )
}

/**
 * @param {{
 *   state: {
 *     installToTrial: number,
 *     trialToPaid: number,
 *     retention: Array<{t:number, percent:number|null}>,
 *     arpuPaid: number,
 *     cac: number,
 *     cohortSize: number,
 *     horizon: number,
 *   },
 *   cadence: 'weekly'|'monthly',
 *   errors: Record<string,string>,
 *   onPatch: (partial: Object) => void,
 * }} props
 */
export default function SubscriptionInput({ state, cadence, errors, onPatch }) {
  const isWeekly = cadence === 'weekly'
  const cycleWord = isWeekly ? 'week' : 'month'
  const cycleAbbr = isWeekly ? 'wk' : 'mo'
  const range = HORIZON_RANGE[cadence]

  const updateRetention = (t, percent) => {
    onPatch({
      retention: state.retention.map((p) =>
        p.t === t ? { ...p, percent } : p,
      ),
    })
  }

  return (
    <div className="space-y-5">
      {/* Funnel */}
      <div>
        <div className="mb-2 flex items-center text-sm font-medium text-fg-muted">
          <span>Funnel</span>
          <HoverHint align="left">
            <p>
              Цепочка install → trial → paid. Главные ручки subscription
              unit-economics: install_to_trial зависит от paywall и
              онбординга, trial_to_paid — от ценности продукта.
            </p>
          </HoverHint>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Install → Trial"
            value={state.installToTrial}
            onChange={(v) => onPatch({ installToTrial: v })}
            suffix="%"
            min={0}
            step="0.1"
            error={errors.installToTrial}
            tooltip={
              <p>
                % инсталлов, начавших free trial. RevenueCat медиана для
                Utilities ~8.6%. Низкий = слабый онбординг или невыразительный
                paywall.
              </p>
            }
          />
          <NumberField
            label="Trial → Paid"
            value={state.trialToPaid}
            onChange={(v) => onPatch({ trialToPaid: v })}
            suffix="%"
            min={0}
            step="0.1"
            error={errors.trialToPaid}
            tooltipAlign="right"
            tooltip={
              <p>
                % triаls, оплативших после trial. <strong className="text-fg">Главная переменная subscription
                unit-economics</strong> — её небольшое движение в обе стороны
                сильнее всего влияет на LTV.
              </p>
            }
          />
        </div>
      </div>

      {/* Retention */}
      <div>
        <div className="mb-2 flex items-center text-sm font-medium text-fg-muted">
          <span>Retention (% paying)</span>
          <HoverHint align="left">
            <p>
              Доля платящих юзеров, активных в данном {cycleWord}. {' '}
              Считается от paying@0 (после trial-to-paid конверсии), не от
              installs.
            </p>
            <p className="mt-1.5">
              {isWeekly
                ? 'Weekly cohort показывает W1/W2/W4/W8/W12/W26 — главная точка W1 (первый billing cycle), там виден «trial trap» pattern для weekly-плана.'
                : 'Monthly cohort показывает M1/M3/M6/M12. Главная точка — M12 (annual renewal cliff).'}
            </p>
            <p className="mt-1.5">
              Минимум 2 точки. Кривая должна быть монотонно убывающей.
            </p>
          </HoverHint>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {state.retention.map((p) => (
            <div key={p.t} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-xs uppercase tracking-wide text-fg-faint">
                {isWeekly ? 'W' : 'M'}{p.t}
              </span>
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={p.percent ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  updateRetention(p.t, v === '' ? null : Number(v))
                }}
                className={`${inputCls} w-full`}
              />
              <span className="text-xs text-fg-faint">%</span>
            </div>
          ))}
        </div>
        {errors.retention && (
          <p className="mt-1 text-xs text-red-400">{errors.retention}</p>
        )}
        {Object.entries(errors)
          .filter(([k]) => k.startsWith('retention_'))
          .map(([k, msg]) => (
            <p key={k} className="mt-1 text-xs text-red-400">
              {k.replace('retention_', isWeekly ? 'W' : 'M')}: {msg}
            </p>
          ))}
      </div>

      {/* Pricing & cohort */}
      <div>
        <div className="mb-2 flex items-center text-sm font-medium text-fg-muted">
          <span>Pricing &amp; Cohort</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={`ARPU paid`}
            value={state.arpuPaid}
            onChange={(v) => onPatch({ arpuPaid: v })}
            suffix={`$ / ${cycleAbbr}`}
            min={0}
            step="0.01"
            error={errors.arpuPaid}
            tooltip={
              <p>
                Средний доход на платящего юзера за один billing cycle.
                Не путать с ARPU per install — здесь именно от paying user.
              </p>
            }
          />
          <NumberField
            label="CAC per install"
            value={state.cac}
            onChange={(v) => onPatch({ cac: v })}
            suffix="$"
            min={0}
            step="0.01"
            error={errors.cac}
            tooltipAlign="right"
            tooltip={
              <p>
                Стоимость одного инсталла (не платящего!). Не зависит от
                cadence. AppTweak medians: utilities ~$2.10, fitness $4–6,
                photo/video $2–3, language learning $3–5.
              </p>
            }
          />
          <NumberField
            label="Cohort size"
            value={state.cohortSize}
            onChange={(v) => onPatch({ cohortSize: v })}
            suffix="installs"
            min={1}
            step="1"
            error={errors.cohortSize}
            tooltip={
              <p>
                Размер изучаемой когорты в инсталлах. Влияет только на
                абсолютные деньги в Cohort P&amp;L; LTV per install от него
                не зависит.
              </p>
            }
          />
          <div className="block">
            <span className="mb-1 flex items-center text-sm font-medium text-fg-muted">
              <span>Horizon</span>
              <HoverHint align="right">
                <p>
                  На сколько {cycleWord}s вперёд считаем cumulative LTV. Точки
                  ретеншена анкорят кривую; за горизонтом виден extrapolation
                  power-law хвоста.
                </p>
              </HoverHint>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={1}
                value={state.horizon}
                onChange={(e) => onPatch({ horizon: Number(e.target.value) })}
                className="flex-1 accent-accent"
              />
              <span className="w-14 text-right text-sm tabular-nums text-fg-strong">
                {state.horizon} {cycleWord}s
              </span>
            </div>
            {errors.horizon && (
              <span className="mt-1 block text-xs text-red-400">{errors.horizon}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
