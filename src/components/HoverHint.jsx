// Inline help affordance: a small ⓘ icon that reveals a popover on hover or
// keyboard focus. Used to attach extended Russian explanations to controls
// and outputs without crowding the visible UI.
//
// Why DIY (not Radix/Floating UI): the tooltip is purely informational, has
// no exotic placement requirements, and a third-party tooltip stack would
// add ~15 KB gzip for very little marginal value. The CSS-only approach
// here uses :hover and :focus-within on a positioned wrapper — it is
// keyboard-accessible (tab to icon, popover appears) and works on touch
// (tap focuses, tap-elsewhere blurs).

/**
 * @param {{
 *   children: React.ReactNode,
 *   label?: string,                       // aria-label for the trigger button
 *   align?: 'left' | 'center' | 'right',  // horizontal anchor of popover relative to icon
 *   width?: 'sm' | 'md',                  // popover max-width
 * }} props
 */
export default function HoverHint({
  children,
  label = 'Подсказка',
  align = 'center',
  width = 'md',
}) {
  const widthCls = width === 'sm' ? 'w-56' : 'w-64'
  // Anchor the popover above the trigger. left/right anchor when the trigger
  // sits flush against an edge so the bubble does not stick out of its row.
  const positionCls =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2'

  return (
    <span className="group relative inline-flex align-baseline">
      <button
        type="button"
        aria-label={label}
        className="ml-1 inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-slate-700 text-[9px] leading-none text-slate-500 transition-colors hover:border-cyan-500/60 hover:text-cyan-300 focus:border-cyan-500/60 focus:text-cyan-300 focus:outline-none"
      >
        i
      </button>
      <span
        role="tooltip"
        // whitespace-normal explicitly resets in case the trigger sits inside
        // a `whitespace-nowrap` ancestor (KPI card titles do this to keep
        // labels on one line).
        className={`pointer-events-none invisible absolute bottom-full z-30 mb-1.5 ${widthCls} ${positionCls} whitespace-normal break-words rounded border border-slate-700 bg-bg-elev px-3 py-2 text-[11px] font-normal normal-case leading-snug tracking-normal text-slate-300 opacity-0 shadow-lg shadow-black/40 transition-opacity duration-100 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100`}
      >
        {children}
      </span>
    </span>
  )
}
