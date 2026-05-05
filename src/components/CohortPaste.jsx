// Inline view for the "paste a cohort table" input mode. Renders a textarea,
// runs the parser on every change, and displays:
//   - a compact heatmap of the parsed cohorts × periods (colored by retention %)
//   - per-period averages used to fit the model
//   - any warnings / errors from the parser
//
// State (the text itself + parsed result) lives in the Calculator so it
// survives mode toggles; this component is mostly presentational.

const SAMPLE = `Cohort\tD0\tD1\tD7\tD14\tD30
2026-04-01\t1200\t480\t240\t168\t108
2026-04-08\t980\t392\t186\t128\t78
2026-04-15\t1100\t440\t220\t154\t99
2026-04-22\t1050\t399\t210\t147\t —`

function cellBg(percent) {
  if (percent == null || !Number.isFinite(percent)) return 'transparent'
  // Map 0..100% → opacity 0.04..0.55 over a single accent color.
  const a = Math.min(0.55, Math.max(0.04, (percent / 100) * 0.55))
  return `rgba(34, 211, 238, ${a.toFixed(3)})`
}

function fmtCell(percent) {
  if (percent == null || !Number.isFinite(percent)) return '—'
  if (percent >= 100) return '100%'
  return `${percent.toFixed(1)}%`
}

function Heatmap({ cohorts, periods }) {
  const cols = periods.length + 1 // 1 for cohort label
  return (
    <div
      className="overflow-x-auto rounded border border-line"
      style={{ ['--cols']: cols }}
    >
      <div
        className="grid min-w-fit text-xs"
        style={{ gridTemplateColumns: `minmax(7rem, auto) repeat(${periods.length}, minmax(3.5rem, 1fr))` }}
      >
        <div className="bg-bg-subtle/40 px-2 py-1.5 text-fg-faint">Cohort</div>
        {periods.map((p) => (
          <div
            key={p.t}
            className="bg-bg-subtle/40 px-2 py-1.5 text-right tabular-nums text-fg-dim"
          >
            D{p.t}
          </div>
        ))}
        {cohorts.map((c, ci) => (
          <Row key={ci} cohort={c} periods={periods} />
        ))}
        <div className="border-t border-line bg-bg-subtle/30 px-2 py-1.5 text-fg-muted">
          Avg
        </div>
        {periods.map((p) => (
          <div
            key={p.t}
            className="border-t border-line bg-bg-subtle/30 px-2 py-1.5 text-right tabular-nums text-fg"
          >
            {fmtCell(p.mean)}
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ cohort, periods }) {
  return (
    <>
      <div className="border-t border-line px-2 py-1.5 text-fg-muted">
        {cohort.label}
      </div>
      {periods.map((p, i) => (
        <div
          key={p.t}
          className="border-t border-line px-2 py-1.5 text-right tabular-nums text-fg"
          style={{ backgroundColor: cellBg(cohort.retentionPct[i]) }}
        >
          {fmtCell(cohort.retentionPct[i])}
        </div>
      ))}
    </>
  )
}

/**
 * @param {{
 *   text: string,
 *   onTextChange: (s:string)=>void,
 *   parsed: ReturnType<typeof import('../lib/parseCohort').parseCohortTable> | null,
 * }} props
 */
export default function CohortPaste({ text, onTextChange, parsed }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 flex items-center justify-between text-sm font-medium text-fg-muted">
          <span>Paste cohort table (TSV / CSV)</span>
          {!text && (
            <button
              type="button"
              onClick={() => onTextChange(SAMPLE)}
              className="text-xs text-accent-soft hover:text-accent-fg"
            >
              Load sample
            </button>
          )}
        </label>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Cohort\tD0\tD1\tD7\tD14\tD30&#10;2026-04-01\t1200\t480\t240\t168\t108&#10;…"
          rows={6}
          spellCheck={false}
          className="block w-full resize-y rounded border border-line-strong bg-bg-subtle px-2 py-2 font-mono text-xs text-fg-strong placeholder:text-fg-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
        />
      </div>

      {parsed?.errors?.length > 0 && (
        <div className="rounded border border-red-900/50 bg-red-950/30 p-2 text-xs text-red-300">
          {parsed.errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {parsed?.warnings?.length > 0 && (
        <div className="rounded border border-amber-800/50 bg-amber-950/30 p-2 text-xs text-amber-200">
          {parsed.warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      {parsed?.avgPoints && parsed.cohorts.length > 0 && (
        <>
          <div className="text-xs text-fg-faint">
            {parsed.cohorts.length} cohort{parsed.cohorts.length > 1 ? 's' : ''} × {parsed.periods.length} period{parsed.periods.length > 1 ? 's' : ''} ·{' '}
            <span className="text-fg-dim">format: {parsed.cohorts[0].format}</span> ·{' '}
            <span className="text-fg-dim">separator: {parsed.separator}</span>
          </div>
          <Heatmap cohorts={parsed.cohorts} periods={parsed.periods} />
        </>
      )}
    </div>
  )
}
