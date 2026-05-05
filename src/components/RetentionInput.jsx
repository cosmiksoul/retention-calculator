// Generic retention-points input. Shared by session mode (cadence='daily',
// label prefix 'D') and subscription mode (cadence='weekly'|'monthly',
// prefix 'W'/'M'). The math is cadence-agnostic — only the prefix label
// and (optionally) the header copy differ. Add/remove/edit is enabled in
// every mode; cadence-specific defaults seed the initial set of points.

import { newPointId } from '../lib/idGen.js'

export { newPointId }

export const DEFAULT_POINTS = [
  { id: newPointId(), t: 1, percent: 40 },
  { id: newPointId(), t: 7, percent: 20 },
  { id: newPointId(), t: 14, percent: 15 },
  { id: newPointId(), t: 30, percent: 10 },
]

const MAX_POINTS = 10

const PREFIX_BY_CADENCE = {
  daily: 'D',
  weekly: 'W',
  monthly: 'M',
}

const inputCls =
  'rounded border border-line-strong bg-bg-subtle px-2 py-1 text-sm tabular-nums ' +
  'text-fg-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'

/**
 * @param {{
 *   points: Array<{id:string, t:number, percent:number}>,
 *   onChange: (next: Array<{id:string, t:number, percent:number}>) => void,
 *   errors?: Map<string, string>,
 *   cadence?: 'daily'|'weekly'|'monthly',
 *   header?: string,
 *   tooltip?: import('react').ReactNode,
 *   minPoints?: number,
 * }} props
 */
export default function RetentionInput({
  points,
  onChange,
  errors,
  cadence = 'daily',
  header = 'Retention points',
  tooltip = null,
  minPoints = 1,
}) {
  const prefix = PREFIX_BY_CADENCE[cadence] ?? 'D'

  const update = (id, patch) =>
    onChange(points.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const remove = (id) => onChange(points.filter((p) => p.id !== id))
  const add = () => {
    if (points.length >= MAX_POINTS) return
    const sorted = [...points].sort((a, b) => a.t - b.t)
    const lastT = sorted.length ? sorted[sorted.length - 1].t : 0
    const lastPct = sorted.length ? sorted[sorted.length - 1].percent : 100
    onChange([
      ...points,
      { id: newPointId(), t: lastT + 1, percent: Math.max(0, lastPct - 1) },
    ])
  }

  const sorted = [...points].sort((a, b) => a.t - b.t)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center text-sm font-medium text-fg-muted">
          <span>{header}</span>
          {tooltip}
        </span>
        <button
          type="button"
          onClick={add}
          disabled={points.length >= MAX_POINTS}
          className="text-xs text-accent-soft disabled:cursor-not-allowed disabled:opacity-40 hover:text-accent-fg"
        >
          + Add point
        </button>
      </div>
      <div className="space-y-1.5">
        {sorted.map((p) => {
          const err = errors?.get(p.id)
          return (
            <div key={p.id}>
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-xs uppercase tracking-wide text-fg-faint">
                  {prefix}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={p.t}
                  onChange={(e) =>
                    update(p.id, { t: Number(e.target.value) })
                  }
                  className={`${inputCls} w-16`}
                  aria-label="Period"
                />
                <span className="text-fg-faint">→</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={p.percent}
                  onChange={(e) =>
                    update(p.id, { percent: Number(e.target.value) })
                  }
                  className={`${inputCls} w-24`}
                  aria-label="Retention %"
                />
                <span className="text-xs text-fg-faint">%</span>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  disabled={points.length <= minPoints}
                  className="ml-auto text-base leading-none text-fg-faint disabled:opacity-30 hover:text-red-400"
                  aria-label="Remove point"
                >
                  ×
                </button>
              </div>
              {err && (
                <div className="ml-7 mt-0.5 text-xs text-red-400">{err}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
