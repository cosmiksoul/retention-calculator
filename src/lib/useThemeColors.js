import { useEffect, useState } from 'react'

// Recharts cannot consume Tailwind classes — its strokes/fills are JS strings.
// To keep chart colours in sync with the active theme we read the CSS custom
// properties off `<html>` and re-read them whenever the `data-theme` attribute
// changes.
//
// `--c-chart-*` tokens are stored as full CSS colours (`#1f2937`) so they can
// be used as-is. Foreground tokens are stored as space-separated RGB triplets
// (so Tailwind's alpha modifier works) and need `rgb()` wrapping here.

const CHART_TOKENS = [
  'grid',
  'axis',
  'line',
  'line-secondary',
  'user',
  'cac',
  'recon',
  'baseline',
]

function readColors() {
  if (typeof document === 'undefined') {
    // SSR-friendly fallback — values mirror dark theme defaults.
    return {
      grid: '#1f2937',
      axis: '#64748b',
      line: '#22c55e',
      secondary: '#94a3b8',
      user: '#22d3ee',
      cac: '#ef4444',
      recon: '#22c55e',
      baseline: '#eab308',
      fgFaint: 'rgb(100 116 139)',
      fgDisabled: 'rgb(71 85 105)',
    }
  }
  const cs = getComputedStyle(document.documentElement)
  const get = (name) => cs.getPropertyValue(name).trim()
  const out = {}
  for (const t of CHART_TOKENS) {
    out[t === 'line-secondary' ? 'secondary' : t] = get(`--c-chart-${t}`)
  }
  out.fgFaint = `rgb(${get('--c-fg-faint')})`
  out.fgDisabled = `rgb(${get('--c-fg-disabled')})`
  return out
}

/**
 * Returns the current chart palette and re-renders the caller when the user
 * flips the theme.
 *
 * @returns {{
 *   grid: string,
 *   axis: string,
 *   line: string,
 *   secondary: string,
 *   user: string,
 *   cac: string,
 *   recon: string,
 *   baseline: string,
 *   fgFaint: string,
 *   fgDisabled: string,
 * }}
 */
export function useThemeColors() {
  const [colors, setColors] = useState(readColors)

  useEffect(() => {
    // Re-read once after mount — `useState(readColors)` runs during render,
    // and on the very first paint `getComputedStyle` can return empty strings
    // for custom properties before the stylesheet is attached. Calling it
    // again here guarantees we always have hex/rgb values for Recharts.
    setColors(readColors())
    const root = document.documentElement
    const observer = new MutationObserver(() => setColors(readColors()))
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return colors
}
