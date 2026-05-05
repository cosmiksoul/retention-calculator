// Shared "value vs baseline" delta helpers. Returns `{text, tone}` ready
// to feed a small delta line under a KPI card. `tone` follows the
// existing palette: emerald = better, red = worse, faint = unchanged.

/**
 * Percentage delta for continuous metrics (LTV, ratios, etc).
 *
 * @param {number} current
 * @param {number} base
 * @param {{higherIsBetter: boolean}} opts
 * @returns {{text: string, tone: string} | null}
 */
export function pctDelta(current, base, { higherIsBetter }) {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) {
    return null
  }
  const pct = ((current - base) / base) * 100
  if (Math.abs(pct) < 0.05) {
    return { text: '= baseline', tone: 'text-fg-faint' }
  }
  const sign = pct > 0 ? '+' : ''
  const better = higherIsBetter ? pct > 0 : pct < 0
  const tone = better ? 'text-emerald-300' : 'text-red-400'
  return { text: `${sign}${pct.toFixed(1)}% vs baseline`, tone }
}

/**
 * Integer-period delta for things like breakeven day or payback cycle.
 * Handles the asymmetric "reached / not reached" cases explicitly so
 * callers don't need to special-case `null` baselines.
 *
 * @param {number|null} current
 * @param {number|null} base
 * @param {{lowerIsBetter: boolean, unit?: string}} opts
 * @returns {{text: string, tone: string} | null}
 */
export function periodDelta(current, base, { lowerIsBetter, unit = 'd' }) {
  if (current == null && base == null) return null
  if (current == null && base != null) {
    return { text: 'Not reached vs baseline', tone: 'text-red-400' }
  }
  if (current != null && base == null) {
    return { text: 'reached vs N/A', tone: 'text-emerald-300' }
  }
  const diff = current - base
  if (diff === 0) {
    return { text: '= baseline', tone: 'text-fg-faint' }
  }
  const sign = diff > 0 ? '+' : ''
  const better = lowerIsBetter ? diff < 0 : diff > 0
  const tone = better ? 'text-emerald-300' : 'text-red-400'
  return { text: `${sign}${diff}${unit} vs baseline`, tone }
}
