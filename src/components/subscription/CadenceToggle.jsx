// Sub-toggle inside Subscription mode. Switches the input form, retention
// checkpoints, and output units between weekly (W1/W2/W4/W8/W12/W26) and
// monthly (M1/M3/M6/M12) cohort views. State is owned by Calculator.jsx.
//
// `disabled` carries the case where the active preset has no
// `retention_weekly` data: the toggle is rendered greyed-out and shows the
// caller-supplied tooltip (per spec §2.1).

import HoverHint from '../HoverHint.jsx'

/**
 * @param {{
 *   value: 'weekly' | 'monthly',
 *   onChange: (next: 'weekly' | 'monthly') => void,
 *   disabled?: boolean,
 *   disabledReason?: string,
 * }} props
 */
export default function CadenceToggle({
  value,
  onChange,
  disabled = false,
  disabledReason = null,
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center text-sm font-medium text-fg-muted">
        <span>Cadence</span>
        <HoverHint align="left">
          <p>
            Subscription apps работают на двух типичных billing-режимах: weekly
            ($4.99–$9.99/неделя — VPN, photo editors) и monthly/annual
            ($9.99/мес — wellness, language learning, dating).
          </p>
          <p className="mt-1.5">
            Weekly cohort показывает W1/W2/W4/W8/W12/W26 ретеншен и виден
            «trial trap» pattern; monthly — M1/M3/M6/M12 с annual renewal
            cliff. ARPU и horizon переключаются вместе с cadence.
          </p>
        </HoverHint>
      </div>
      <div
        role="tablist"
        aria-label="Cadence"
        title={disabled ? disabledReason ?? '' : ''}
        className={`inline-flex rounded-md border p-0.5 ${
          disabled
            ? 'border-line bg-bg-subtle/40 opacity-60'
            : 'border-line-strong bg-bg-subtle'
        }`}
      >
        <Tab
          active={value === 'weekly'}
          onClick={() => !disabled && onChange('weekly')}
          disabled={disabled}
          label="Weekly cohort"
        />
        <Tab
          active={value === 'monthly'}
          onClick={() => !disabled && onChange('monthly')}
          disabled={disabled}
          label="Monthly cohort"
        />
      </div>
      {disabled && disabledReason && (
        <p className="mt-1 text-xs text-fg-faint">{disabledReason}</p>
      )}
    </div>
  )
}

function Tab({ active, onClick, label, disabled }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-disabled={disabled}
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-3 py-1 text-sm transition-colors ${
        active
          ? 'bg-accent-surface text-accent-fg'
          : 'text-fg-dim hover:text-fg disabled:hover:text-fg-dim'
      } disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  )
}
