// Shared formatters and tone helpers for KPI card components
// (AcquisitionKPI, PayingBaseKPI). Pulled out of the per-component files so
// money/count formatting and threshold colouring stay consistent across
// blocks.

export function fmtUsd(x) {
  if (x == null || !Number.isFinite(x)) return '—'
  if (Math.abs(x) >= 1_000_000) return `$${(x / 1_000_000).toFixed(2)}M`
  if (Math.abs(x) >= 1000) return `$${x.toFixed(0)}`
  if (Math.abs(x) >= 10) return `$${x.toFixed(1)}`
  return `$${x.toFixed(2)}`
}

export function fmtCount(x) {
  if (x == null || !Number.isFinite(x)) return '—'
  if (x >= 1000) return Math.round(x).toLocaleString()
  if (x >= 100) return x.toFixed(0)
  if (x >= 10) return x.toFixed(1)
  return x.toFixed(2)
}

export function rsqTone(r2) {
  if (!Number.isFinite(r2)) return { tone: 'text-fg-strong', label: '—' }
  if (r2 >= 0.95) return { tone: 'text-emerald-300', label: 'Excellent' }
  if (r2 >= 0.85) return { tone: 'text-fg', label: 'Good' }
  return { tone: 'text-amber-300', label: 'Weak fit — extrapolation is risky' }
}

export function ltvCacTone(ratio) {
  if (!Number.isFinite(ratio)) return 'text-fg-strong'
  if (ratio >= 3) return 'text-emerald-300'
  if (ratio >= 1) return 'text-amber-300'
  return 'text-red-400'
}

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

export function periodDelta(current, base, { unit, lowerIsBetter }) {
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
