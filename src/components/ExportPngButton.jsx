import { useState } from 'react'
import { downloadChartPng } from '../lib/exportPng.js'

/**
 * Tiny "save as PNG" icon button — embedded in the title row of every chart
 * card. Captures the parent card via the supplied ref and downloads it.
 *
 * @param {{
 *   targetRef: { current: HTMLElement | null },
 *   filename: string,
 * }} props
 */
export default function ExportPngButton({ targetRef, filename }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await downloadChartPng(targetRef.current, filename)
        } catch (e) {
          console.error('PNG export failed', e)
        } finally {
          setBusy(false)
        }
      }}
      title="Save chart as PNG"
      aria-label="Save chart as PNG"
      className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded text-fg-faint transition-colors hover:text-fg-muted disabled:opacity-50"
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 2v9" />
        <path d="M4.5 7.5L8 11l3.5-3.5" />
        <path d="M2.5 13.5h11" />
      </svg>
    </button>
  )
}
