// "Paste DAU + new_users" input mode (spec §3.1 mode 3).
// Renders the textarea, surfaces parser / validator messages, exposes a
// smoothing-window selector, and offers a "load sample" button to seed a
// realistic 28-day synthetic series.
//
// The actual deconvolution and observed-vs-reconstructed chart are rendered
// by the Calculator (next to the other output blocks) so this component stays
// purely about input.

function generateSample() {
  // Power-law-ish ground truth retention; steady acquisition with mild jitter.
  const N = 28
  const R = []
  for (let t = 0; t < N; t++) {
    R.push(Math.min(1, 0.5 * Math.pow(t === 0 ? 1 : t, -0.45)))
  }
  R[0] = 1
  // Convolve newUsers × R → DAU
  const newUsers = []
  const dau = []
  for (let d = 0; d < N; d++) {
    const nu = Math.round(140 + 30 * Math.sin(d / 3) + (d % 4 === 0 ? 20 : 0))
    newUsers.push(nu)
    let agg = 0
    for (let i = 0; i <= d; i++) agg += newUsers[d - i] * R[i]
    dau.push(Math.round(agg))
  }
  const start = new Date(Date.UTC(2026, 3, 1))
  const lines = ['Date\tNew Users\tDAU']
  for (let d = 0; d < N; d++) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + d)
    lines.push(`${date.toISOString().slice(0, 10)}\t${newUsers[d]}\t${dau[d]}`)
  }
  return lines.join('\n')
}

const SMOOTH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 3, label: '3-day MA' },
  { value: 5, label: '5-day MA' },
]

/**
 * @param {{
 *   text: string,
 *   onTextChange: (s:string)=>void,
 *   parsed: object|null,
 *   validation: {valid:boolean, errors:string[], warnings:string[]}|null,
 *   smoothWindow: number,
 *   onSmoothChange: (n:number)=>void,
 * }} props
 */
export default function DAUInput({
  text,
  onTextChange,
  parsed,
  validation,
  smoothWindow,
  onSmoothChange,
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 flex items-center justify-between text-sm font-medium text-slate-300">
          <span>Paste DAU + new users (TSV / CSV)</span>
          {!text && (
            <button
              type="button"
              onClick={() => onTextChange(generateSample())}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              Load sample
            </button>
          )}
        </label>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Date\tNew Users\tDAU&#10;2026-04-01\t150\t1200&#10;…"
          rows={6}
          spellCheck={false}
          className="block w-full resize-y rounded border border-slate-700 bg-bg-subtle px-2 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
        />
      </div>

      <div className="rounded border border-slate-800 bg-bg-elev/30 p-2">
        <div className="mb-1.5 text-xs font-medium text-slate-300">
          Smoothing window
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {SMOOTH_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-1.5 text-xs text-slate-300">
              <input
                type="radio"
                name="dau-smooth"
                value={o.value}
                checked={smoothWindow === o.value}
                onChange={() => onSmoothChange(o.value)}
                className="accent-cyan-500"
              />
              {o.label}
            </label>
          ))}
        </div>
        <div className="mt-1 text-[11px] leading-snug text-slate-500">
          Sequential deconvolution amplifies day-to-day noise. Apply a moving
          average if observed DAU is volatile.
        </div>
      </div>

      {parsed?.errors?.length > 0 && (
        <div className="rounded border border-red-900/50 bg-red-950/30 p-2 text-xs text-red-300">
          {parsed.errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {validation?.errors?.length > 0 && (
        <div className="rounded border border-red-900/50 bg-red-950/30 p-2 text-xs text-red-300">
          {validation.errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {(parsed?.warnings?.length > 0 || validation?.warnings?.length > 0) && (
        <div className="rounded border border-amber-800/50 bg-amber-950/30 p-2 text-xs text-amber-200">
          {parsed?.warnings?.map((w, i) => <div key={`p${i}`}>{w}</div>)}
          {validation?.warnings?.map((w, i) => <div key={`v${i}`}>{w}</div>)}
        </div>
      )}

      {parsed?.rows?.length > 0 && (
        <div className="text-xs text-slate-500">
          {parsed.rows.length} day{parsed.rows.length > 1 ? 's' : ''} ·{' '}
          <span className="text-slate-400">separator: {parsed.separator}</span>
        </div>
      )}

      <div className="rounded border border-slate-800 bg-bg-elev/20 p-2 text-[11px] leading-snug text-slate-500">
        <strong className="text-slate-400">Caveats.</strong> The model assumes
        retention is identical across cohorts (no seasonality between cohorts)
        and that there is no reactivation — returning users will inflate DAU
        and bias the recovered curve upward. Short windows (under ~14 days)
        produce noisy estimates.
      </div>
    </div>
  )
}
