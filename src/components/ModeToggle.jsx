// Global Session / Subscription toggle. Lives in the page header below the
// `Calculator` H1 and switches the entire input + output panel between v1
// (session retention, daily scale) and v2 (subscription, weekly/monthly
// cadence). State is owned by Calculator.jsx; this component is purely
// presentational.

/**
 * @param {{
 *   value: 'session' | 'subscription',
 *   onChange: (next: 'session' | 'subscription') => void,
 * }} props
 */
export default function ModeToggle({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Calculator mode"
      className="inline-flex rounded-md border border-line-strong bg-bg-subtle p-0.5"
    >
      <Tab
        active={value === 'session'}
        onClick={() => onChange('session')}
        label="DAU"
        hint="Daily-scale model — games, iGaming, sportsbook"
      />
      <Tab
        active={value === 'subscription'}
        onClick={() => onChange('subscription')}
        label="Subscription"
        hint="Weekly / monthly model — VPN, fitness, photo editors, dating, AI"
      />
    </div>
  )
}

function Tab({ active, onClick, label, hint }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      title={hint}
      className={`rounded px-3 py-1 text-sm transition-colors ${
        active
          ? 'bg-accent-surface text-accent-fg'
          : 'text-fg-dim hover:text-fg'
      }`}
    >
      {label}
    </button>
  )
}
