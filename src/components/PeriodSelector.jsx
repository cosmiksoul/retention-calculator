// Period radio group: day / week / month / year. The single switch that
// controls the modeling period of the unified calculator.
//
// Indicators on the right show whether the currently-selected preset has
// data for each period (a dot for "data available" vs. dim "no preset
// data"). Switching to an unsupported period is allowed — the calculator
// resets retention points to defaults and surfaces a toast.

import HoverHint from './HoverHint.jsx'

const PERIODS = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
]

/**
 * @param {{
 *   value: 'day'|'week'|'month'|'year',
 *   onChange: (period: 'day'|'week'|'month'|'year') => void,
 *   supported?: Array<'day'|'week'|'month'|'year'>|null,  // periods the active preset has data for
 * }} props
 */
export default function PeriodSelector({ value, onChange, supported = null }) {
  return (
    <div>
      <div className="mb-1 flex items-center text-sm font-medium text-fg-muted">
        <span>Modeling period</span>
        <HoverHint align="left">
          <p>
            Шкала, в которой считаем retention и LTV.
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              <strong className="text-fg">Day</strong> — игры/iGaming/sportsbook.
              Точки D1, D7, D30, …
            </li>
            <li>
              <strong className="text-fg">Week</strong> — weekly subscription
              cadence (utilities, photo/video). Точки W1, W2, W4, …
            </li>
            <li>
              <strong className="text-fg">Month</strong> — monthly subscription.
              Точки M1, M3, M6, M12.
            </li>
            <li>
              <strong className="text-fg">Year</strong> — annual subscription
              (Adobe CC, Duolingo Plus annual, B2B SaaS). Точки Y1, Y2, Y3,
              Y5 — ARPPU = годовая цена, retention = доля юзеров, дошедших
              до соответствующего ренюала.
            </li>
          </ul>
          <p className="mt-1.5">
            Смена периода после загрузки пресета сбрасывает точки ретеншена,
            если у пресета нет данных под выбранный период.
          </p>
        </HoverHint>
      </div>
      <div
        role="radiogroup"
        aria-label="Modeling period"
        className="flex gap-1 rounded border border-line-strong bg-bg-subtle p-0.5"
      >
        {PERIODS.map(({ key, label }) => {
          const active = value === key
          const hasData = supported == null || supported.includes(key)
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(key)}
              className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
                active
                  ? 'bg-accent-surface/40 text-accent-fg'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {label}
                {supported && (
                  <span
                    aria-hidden
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      hasData ? 'bg-accent/70' : 'bg-line-strong'
                    }`}
                    title={
                      hasData ? 'Preset has data for this period' : 'No preset data — switching resets points'
                    }
                  />
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
