// Pure / Industry-adjusted forecast toggle. Shown only when a preset is
// selected (industry-adjusted needs a benchmark fit to scale against).
// Shared by both calculator modes — DAU and Subscription.

import HoverHint from './HoverHint.jsx'

/**
 * @param {{
 *   mode: 'pure'|'adjusted',
 *   onChange: (next: 'pure'|'adjusted') => void,
 *   avgRatio: number|undefined,
 * }} props
 */
export default function ForecastModeToggle({ mode, onChange, avgRatio }) {
  const radio = (key, label) => (
    <label className="flex items-center gap-1.5 text-xs text-fg-muted">
      <input
        type="radio"
        name="adjust-mode"
        value={key}
        checked={mode === key}
        onChange={() => onChange(key)}
        className="accent-accent"
      />
      {label}
    </label>
  )
  return (
    <div className="rounded border border-line bg-bg-elev/30 p-2">
      <div className="mb-0.5 flex items-center text-xs font-medium text-fg-muted">
        <span>Forecast mode</span>
        <HoverHint align="left">
          <p>
            <strong className="text-fg">Pure fit</strong> — подгоняет
            степенную модель только по вашим точкам. Лучше всего работает
            при ≥4 хорошо выстроенных точках с высоким R².
          </p>
          <p className="mt-1.5">
            <strong className="text-fg">Industry-adjusted</strong> —
            берёт форму индустриального бенчмарка (выбранный пресет) и
            масштабирует под ваш уровень: считается среднегеометрическое
            отношение ваших точек к бенчмарку и применяется ко всему хвосту.
            Полезно когда у вас 1–3 точки — даёт прогноз с реалистичной
            формой кривой за пределами ваших данных.
          </p>
        </HoverHint>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {radio('pure', 'Pure fit')}
        {radio('adjusted', 'Industry-adjusted')}
      </div>
      {mode === 'adjusted' && avgRatio != null && (
        <div className="mt-1.5 text-[11px] leading-snug text-fg-faint">
          Adjusted = benchmark × {avgRatio.toFixed(2)}× (geometric mean of your
          point/benchmark ratios). Confidence band hidden — synthetic fit doesn't
          carry residual uncertainty.
        </div>
      )}
      {mode === 'pure' && (
        <div className="mt-1 text-[11px] leading-snug text-fg-faint">
          Fits your points directly. Switch to industry-adjusted if you have
          fewer than 4 points and want a benchmark-shaped tail.
        </div>
      )}
    </div>
  )
}
