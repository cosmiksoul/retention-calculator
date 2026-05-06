// One stat tile — label + big number + optional hint / delta / tooltip.
// Shared by both KPI blocks (AcquisitionKPI, PayingBaseKPI). When a
// `delta` is provided it replaces `hint` in the bottom row, since the
// baseline comparison carries the same role.

import HoverHint from './HoverHint.jsx'

/**
 * @param {{
 *   label: string,
 *   value: React.ReactNode,
 *   hint?: React.ReactNode,
 *   tooltip?: React.ReactNode,
 *   tooltipAlign?: 'left' | 'center' | 'right',
 *   tone?: string,
 *   delta?: { text: string, tone: string } | null,
 * }} props
 */
export default function KpiCard({
  label,
  value,
  hint,
  tooltip,
  tooltipAlign = 'left',
  tone = 'text-fg-strong',
  delta,
}) {
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
      {hint && !delta && (
        <div className="mt-0.5 text-xs text-fg-faint">{hint}</div>
      )}
    </div>
  )
}
