// Vertical funnel cascade visualization: cohort → optional funnel steps →
// active count at each user-input retention checkpoint. Each row shows
// absolute count and the drop-off vs the previous step. Bar widths are
// proportional to count.
//
// Pure CSS — flexbox + percentage-width inner bars. No chart library.

import { useRef } from 'react'
import HoverHint from './HoverHint.jsx'
import ExportPngButton from './ExportPngButton.jsx'
import { pngFilename } from '../lib/exportPng.js'

function fmtCount(x) {
  if (!Number.isFinite(x)) return '—'
  if (x >= 1000) return Math.round(x).toLocaleString()
  if (x >= 100) return x.toFixed(0)
  if (x >= 10) return x.toFixed(1)
  return x.toFixed(2)
}

function fmtPct(x) {
  if (!Number.isFinite(x)) return '—'
  return `${(x * 100).toFixed(1)}%`
}

/**
 * @param {{
 *   steps: Array<{label:string, count:number, dropoffPct:number|null}>,
 *   presetLabel?: string,
 * }} props
 */
export default function FunnelWaterfall({ steps, presetLabel }) {
  const cardRef = useRef(null)
  if (!steps || steps.length === 0) return null
  const maxCount = steps[0].count || 1

  return (
    <div ref={cardRef} className="rounded-lg border border-line bg-bg-elev/40 p-4">
      <div className="mb-3 flex items-center text-sm font-medium text-fg">
        <span>Funnel cascade</span>
        <HoverHint align="left">
          <p>
            Воронка от cohort к активным юзерам в каждой точке retention.
            Drop-off на каждом шаге считается от предыдущего, не от cohort.
          </p>
          <p className="mt-1.5">
            Самые жирные drop-off обычно на conversion-шагах (paywall, trial→paid).
            Retention drop-off становится менее агрессивным со временем — это
            нормально для степенной кривой.
          </p>
        </HoverHint>
        <div className="ml-auto">
          <ExportPngButton
            targetRef={cardRef}
            filename={pngFilename('funnel-cascade', presetLabel)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const widthPct = maxCount > 0 ? (step.count / maxCount) * 100 : 0
          return (
            <div key={`${step.label}-${i}`} className="text-sm">
              <div className="flex items-baseline justify-between text-xs text-fg-dim">
                <span className="text-fg">{step.label}</span>
                <span className="tabular-nums text-fg-faint">
                  {step.dropoffPct != null && step.dropoffPct > 0 && (
                    <span className="mr-2 text-red-300">
                      −{fmtPct(step.dropoffPct)}
                    </span>
                  )}
                  <span className="tabular-nums text-fg-strong">
                    {fmtCount(step.count)}
                  </span>
                </span>
              </div>
              <div className="mt-0.5 h-2 overflow-hidden rounded bg-bg-subtle">
                <div
                  className="h-full bg-accent/70"
                  style={{ width: `${Math.max(widthPct, 0.5)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
