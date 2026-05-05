// Builds a CSV snapshot of the calculator state: a metadata header,
// the KPI block, and the per-period breakdown row-for-row.
//
// We hand-roll the CSV (no library) — it's a few columns and the only
// string content we emit is the preset label. Numbers are formatted
// to a fixed, readable precision so the file looks the same as the UI.

function escapeCell(v) {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(...cells) {
  return cells.map(escapeCell).join(',')
}

function fmtN(v, digits = 4) {
  if (v == null || !Number.isFinite(v)) return ''
  return v.toFixed(digits)
}

function fmtPct(fraction) {
  if (fraction == null || !Number.isFinite(fraction)) return ''
  return (fraction * 100).toFixed(2)
}

/**
 * @param {{
 *   timestamp: string,            // ISO
 *   mode: 'pure'|'adjusted',
 *   presetLabel: string|null,
 *   bandSigma: number,
 *   inputs: {arpuPerDay:number, cac:number|null, cohortSize:number, horizon:number},
 *   fit: {a:number, b:number, se:number, rSquared:number, n:number},
 *   kpi: {ltvAtHorizon:number, beDay:number|null, ltvCacRatio:number|null, paybackDays:number|null},
 *   userPoints: Array<{t:number, percent:number}>,
 *   series: Array<{t:number, retention:number, revenue:number, cumLtv:number}>,
 * }} snapshot
 * @returns {string}
 */
export function buildCsv(snapshot) {
  const {
    timestamp,
    mode,
    presetLabel,
    bandSigma,
    inputs,
    fit,
    kpi,
    userPoints,
    series,
  } = snapshot

  const cacShown = inputs.cac != null && Number.isFinite(inputs.cac) ? inputs.cac : null
  const userByT = new Map(userPoints.map((p) => [p.t, p.percent]))

  const lines = []

  // Section 1 — metadata
  lines.push(row('Retention & LTV Calculator export'))
  lines.push(row('Generated', timestamp))
  lines.push(row('Forecast mode', mode === 'adjusted' ? 'industry-adjusted' : 'pure fit'))
  if (presetLabel) lines.push(row('Preset', presetLabel))
  lines.push(row('Confidence band', `±${bandSigma}σ`))
  lines.push('')

  // Section 2 — inputs
  lines.push(row('Inputs'))
  lines.push(row('ARPU', '$/day', fmtN(inputs.arpuPerDay, 4)))
  lines.push(row('CAC', '$', cacShown != null ? fmtN(cacShown, 2) : ''))
  lines.push(row('Cohort size', 'users', String(inputs.cohortSize)))
  lines.push(row('Horizon', 'days', String(inputs.horizon)))
  lines.push('')

  // Section 3 — fit + KPIs
  lines.push(row('Power-law fit'))
  lines.push(row('a (intercept)', '', fmtN(fit.a, 6)))
  lines.push(row('b (decay)', '', fmtN(fit.b, 6)))
  lines.push(row('SE(b)', '', fmtN(fit.se, 6)))
  lines.push(row('R²', '', fmtN(fit.rSquared, 4)))
  lines.push(row('User points used', '', String(fit.n)))
  lines.push('')

  lines.push(row('KPIs'))
  lines.push(row(`Predicted LTV @ D${inputs.horizon}`, '$ / user', fmtN(kpi.ltvAtHorizon, 4)))
  if (kpi.beDay != null) {
    lines.push(row('Breakeven', 'day', String(kpi.beDay)))
  }
  if (kpi.ltvCacRatio != null) {
    lines.push(row('LTV / CAC', '', fmtN(kpi.ltvCacRatio, 3)))
  }
  if (kpi.paybackDays != null) {
    lines.push(row('Payback', 'days', String(kpi.paybackDays)))
  }
  lines.push('')

  // Section 4 — per-period breakdown (every day up to horizon)
  const showRatio = cacShown != null && cacShown > 0
  const headers = [
    'Day',
    'Input retention (%)',
    'Fit retention (%)',
    'Active users',
    'Revenue / period (cohort $)',
    'Cum LTV / user ($)',
  ]
  if (showRatio) headers.push('LTV / CAC')
  lines.push(row('Per-period breakdown'))
  lines.push(row(...headers))
  for (const p of series) {
    const cells = [
      String(p.t),
      userByT.has(p.t) ? fmtN(userByT.get(p.t), 2) : '',
      fmtPct(p.retention),
      String(Math.round(p.retention * inputs.cohortSize)),
      fmtN(p.revenue * inputs.cohortSize, 2),
      fmtN(p.cumLtv, 4),
    ]
    if (showRatio) cells.push(fmtN(p.cumLtv / cacShown, 3))
    lines.push(row(...cells))
  }

  return lines.join('\n')
}

/**
 * Builds a filename like `ltv-2026-05-05T17-22-mobile_casual.csv` so users
 * can save several snapshots without overwriting each other.
 */
export function buildFilename({ timestamp, presetLabel }) {
  const tsSafe = timestamp.replace(/[:.]/g, '-').slice(0, 16)
  const slug = presetLabel
    ? presetLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : 'manual'
  return `ltv-${tsSafe}-${slug}.csv`
}
