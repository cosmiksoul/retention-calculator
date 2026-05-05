// Confidence-band sigma selector. Shared by both calculator modes —
// session (right input column) and subscription (inside SubscriptionInput,
// between Funnel and Retention). Keeps the radios + tooltip layout in one
// place so visual changes propagate to both.

import HoverHint from './HoverHint.jsx'

/**
 * @param {{
 *   sigma: 1|2,
 *   onChange: (next: 1|2) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function BandSigmaToggle({ sigma, onChange, disabled = false }) {
  const radio = (k, label) => (
    <label
      className={`flex items-center gap-1.5 text-xs ${
        disabled ? 'text-fg-disabled' : 'text-fg-muted'
      }`}
    >
      <input
        type="radio"
        name="band-sigma"
        value={k}
        checked={sigma === k}
        onChange={() => onChange(k)}
        disabled={disabled}
        className="accent-accent"
      />
      {label}
    </label>
  )
  return (
    <div className="rounded border border-line bg-bg-elev/30 p-2">
      <div className="mb-0.5 flex items-center text-xs font-medium text-fg-muted">
        <span>Confidence band</span>
        <HoverHint align="left">
          <p>
            Полоса вокруг прогноза, отражающая неопределённость подгонки
            модели — насколько уверенно мы знаем параметры степенной кривой
            при текущем числе точек и их разбросе.
          </p>
          <p className="mt-1.5">
            ±1σ ≈ 68% вероятности, ±2σ ≈ 95%. Чем меньше точек и хуже R²,
            тем шире полоса. В industry-adjusted режиме скрыта —
            синтетическая подгонка не несёт остаточной неопределённости.
          </p>
        </HoverHint>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {radio(1, '±1σ ≈ 68%')}
        {radio(2, '±2σ ≈ 95%')}
      </div>
      {disabled && (
        <div className="mt-1 text-[11px] leading-snug text-fg-faint">
          Band requires ≥3 user points (residual degrees of freedom). It is also
          hidden in industry-adjusted mode.
        </div>
      )}
    </div>
  )
}
