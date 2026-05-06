// Optional funnel block — collapsible, default closed/empty. Allows up to
// 5 conversion steps before retention; each step is `{label, conversionPct,
// oneTimeFeeUsd?}`. The last step's count becomes the "acquired pool" —
// the people whose retention we model and to whom ARPU is per-period.
//
// 0 steps  ⇒ DAU semantics: entire cohort is the active pool.
// N steps  ⇒ acquired = cohort × Π(conversionPct/100). Classic 2-step
//             install→trial→paid is the most common case but the model is
//             generic. Any step may carry an optional one-time per-user fee
//             (paid trial price, activation cost) that lumps into period 1
//             revenue downstream.
//
// State is owned by the parent; this component is purely presentational.

import { useState, useEffect } from 'react'
import HoverHint from './HoverHint.jsx'
import { newPointId } from '../lib/idGen.js'

const inputCls =
  'rounded border border-line-strong bg-bg-subtle px-2 py-1 text-sm tabular-nums ' +
  'text-fg-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'

const MAX_STEPS = 5

/**
 * @param {{
 *   funnel: Array<{id?:string, label:string, conversionPct:number, oneTimeFeeUsd?:number|null}>,
 *   onChange: (next: Array<{id:string, label:string, conversionPct:number, oneTimeFeeUsd?:number|null}>) => void,
 *   defaultOpen?: boolean,
 * }} props
 */
export default function FunnelSection({ funnel, onChange, defaultOpen }) {
  // Funnel rows from a preset arrive without React keys; mint them once.
  const rows = funnel.map((s) => ({
    id: s.id ?? newPointId(),
    label: s.label,
    conversionPct: s.conversionPct,
    oneTimeFeeUsd: s.oneTimeFeeUsd ?? null,
  }))

  const [open, setOpen] = useState(defaultOpen ?? funnel.length > 0)
  // Auto-open when the parent populates a non-empty funnel (e.g. preset load)
  // so users see the data they just got.
  useEffect(() => {
    if (funnel.length > 0) setOpen(true)
  }, [funnel.length])

  const update = (id, patch) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const remove = (id) => onChange(rows.filter((r) => r.id !== id))
  const add = () => {
    if (rows.length >= MAX_STEPS) return
    onChange([
      ...rows,
      {
        id: newPointId(),
        label: `Step ${rows.length + 1}`,
        conversionPct: 50,
        oneTimeFeeUsd: null,
      },
    ])
  }

  // Cumulative pool size relative to the cohort, e.g. 8.6% × 35% = 3.01% acquired.
  const acquiredPct = rows.reduce(
    (acc, r) =>
      Number.isFinite(r.conversionPct) ? acc * (r.conversionPct / 100) : acc,
    1,
  )

  const feeStepCount = rows.filter(
    (r) => Number.isFinite(r.oneTimeFeeUsd) && r.oneTimeFeeUsd > 0,
  ).length

  return (
    <div className="rounded border border-line bg-bg-elev/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-fg-muted hover:text-fg-strong"
        aria-expanded={open}
      >
        <span className="flex items-center">
          <span aria-hidden className={`mr-1.5 inline-block w-2 transition-transform ${open ? 'rotate-90' : ''}`}>
            ▶
          </span>
          <span>
            Funnel
            <span className="ml-1.5 text-xs font-normal text-fg-faint">
              {rows.length === 0
                ? '(optional, 0 steps)'
                : `· ${rows.length} step${rows.length > 1 ? 's' : ''} · ${(acquiredPct * 100).toFixed(2)}% acquired${
                    feeStepCount > 0
                      ? ` · ${feeStepCount} paid step${feeStepCount > 1 ? 's' : ''}`
                      : ''
                  }`}
            </span>
          </span>
          <HoverHint align="left">
            <p>
              Цепочка конверсий между cohort и платящими/активными юзерами.
              Например: install → trial → paid. Можно оставить пустым (тогда
              acquired pool = вся когорта, классическая DAU-семантика).
            </p>
            <p className="mt-1.5">
              Каждый шаг — % от количества с предыдущего шага. Последний шаг
              даёт acquired pool, к которому потом привязывается ARPU per
              period и retention.
            </p>
            <p className="mt-1.5">
              Опционально: на любом шаге можно задать одноразовую плату ($) —
              типичный кейс «paid trial price» на trial-шаге. Эта выручка
              ляжет в period 1 и поднимет обе LTV / ускорит payback.
            </p>
            <p className="mt-1.5">До {MAX_STEPS} шагов.</p>
          </HoverHint>
        </span>
      </button>

      {open && (
        <div className="border-t border-line px-3 py-3">
          {rows.length === 0 ? (
            <p className="mb-3 text-xs text-fg-faint">
              No funnel steps yet. Add one to model an install→trial→paid (or
              any) cascade. Empty funnel ⇒ entire cohort is the active pool.
            </p>
          ) : (
            <div className="space-y-1.5">
              {rows.map((r, i) => (
                <div key={r.id}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 shrink-0 text-xs uppercase tracking-wide text-fg-faint">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={r.label}
                      onChange={(e) => update(r.id, { label: e.target.value })}
                      className={`${inputCls} min-w-0 flex-1`}
                      aria-label="Step label"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={r.conversionPct}
                      onChange={(e) =>
                        update(r.id, { conversionPct: Number(e.target.value) })
                      }
                      className={`${inputCls} w-14`}
                      aria-label="Conversion percent"
                    />
                    <span className="shrink-0 text-xs text-fg-faint">%</span>
                    <span className="shrink-0 text-xs text-fg-faint">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={r.oneTimeFeeUsd ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        update(r.id, {
                          oneTimeFeeUsd: v === '' ? null : Number(v),
                        })
                      }}
                      className={`${inputCls} w-14`}
                      aria-label="One-time fee in USD"
                      title="Optional one-time fee paid by users reaching this step (e.g. paid trial price). Lumps into period 1 revenue."
                    />
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="ml-1 shrink-0 text-base leading-none text-fg-faint hover:text-red-400"
                      aria-label="Remove step"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={add}
            disabled={rows.length >= MAX_STEPS}
            className="mt-3 text-xs text-accent-soft disabled:cursor-not-allowed disabled:opacity-40 hover:text-accent-fg"
          >
            + Add step
          </button>
        </div>
      )}
    </div>
  )
}
