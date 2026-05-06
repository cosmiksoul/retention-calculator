// Builds a CSV snapshot of the calculator state: a metadata header,
// the KPI block, and the per-period breakdown row-for-row.
//
// We hand-roll the CSV (no library) — it's a few columns and the only
// string content we emit is the preset/funnel labels. Numbers are formatted
// to a fixed, readable precision so the file looks the same as the UI.
//
// Period is part of the snapshot ('day' | 'week' | 'month'); column labels
// and unit annotations adapt accordingly.

import { periodAbbr, periodUnit } from './calc.js'

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
 *   timestamp: string,
 *   period: 'day'|'week'|'month',
 *   forecastMode: 'pure'|'adjusted',
 *   presetLabel: string|null,
 *   bandSigma: number,
 *   inputs: {
 *     arpuPerPeriod: number,
 *     cac: number|null,
 *     cohortSize: number,
 *     horizon: number,
 *     funnel: Array<{label:string, conversionPct:number}>,
 *   },
 *   fit: {a:number, b:number, se:number, rSquared:number, n:number},
 *   kpi: {
 *     ltvAtHorizon: number,
 *     payback: number|null,
 *     ltvCacRatio: number|null,
 *     horizonRetention: number,
 *     acquiredAtZero: number,
 *   },
 *   userPoints: Array<{t:number, percent:number}>,
 *   series: Array<{
 *     t:number, retention:number, active:number,
 *     revenue:number, cumRevenue:number,
 *     cumLtvPerCohort:number, cumLtvPerAcquired:number,
 *   }>,
 * }} snapshot
 * @returns {string}
 */
export function buildCsv(snapshot) {
  const {
    timestamp,
    period,
    forecastMode,
    presetLabel,
    bandSigma,
    inputs,
    fit,
    kpi,
    userPoints,
    series,
  } = snapshot

  const abbr = periodAbbr(period)
  const unit = periodUnit(period)
  const unitCap = unit.charAt(0).toUpperCase() + unit.slice(1)
  const cacShown =
    inputs.cac != null && Number.isFinite(inputs.cac) ? inputs.cac : null
  const userByT = new Map(userPoints.map((p) => [p.t, p.percent]))
  const showRatio = cacShown != null && cacShown > 0
  const hasFunnel = inputs.funnel && inputs.funnel.length > 0

  const lines = []

  lines.push(row('Retention & LTV Calculator export'))
  lines.push(row('Generated', timestamp))
  lines.push(row('Period', period))
  lines.push(
    row(
      'Forecast mode',
      forecastMode === 'adjusted' ? 'industry-adjusted' : 'pure fit',
    ),
  )
  if (presetLabel) lines.push(row('Preset', presetLabel))
  lines.push(row('Confidence band', `±${bandSigma}σ`))
  lines.push('')

  lines.push(row('Inputs'))
  lines.push(row('ARPU', `$/${unit}`, fmtN(inputs.arpuPerPeriod, 4)))
  lines.push(row('CAC', '$ per cohort entrant', cacShown != null ? fmtN(cacShown, 2) : ''))
  lines.push(row('Cohort size', 'entrants', String(inputs.cohortSize)))
  lines.push(row('Horizon', `${unit}s`, String(inputs.horizon)))
  if (hasFunnel) {
    lines.push('')
    lines.push(row('Funnel'))
    let totalOneTimeRevenue = 0
    let cumCount = inputs.cohortSize
    for (const [i, step] of inputs.funnel.entries()) {
      cumCount = cumCount * (step.conversionPct / 100)
      const fee =
        Number.isFinite(step.oneTimeFeeUsd) && step.oneTimeFeeUsd > 0
          ? step.oneTimeFeeUsd
          : 0
      totalOneTimeRevenue += cumCount * fee
      const cells = [
        `Step ${i + 1}`,
        step.label,
        fmtN(step.conversionPct, 2),
        '%',
      ]
      if (fee > 0) cells.push(`$${fmtN(fee, 2)} fee`)
      lines.push(row(...cells))
    }
    lines.push(row('Acquired at 0', 'count', fmtN(kpi.acquiredAtZero, 2)))
    if (totalOneTimeRevenue > 0) {
      lines.push(
        row('One-time funnel revenue', '$ at t=1', fmtN(totalOneTimeRevenue, 2)),
      )
    }
  }
  lines.push('')

  lines.push(row('Power-law fit'))
  lines.push(row('a (intercept)', '', fmtN(fit.a, 6)))
  lines.push(row('b (decay)', '', fmtN(fit.b, 6)))
  lines.push(row('SE(b)', '', fmtN(fit.se, 6)))
  lines.push(row('R²', '', fmtN(fit.rSquared, 4)))
  lines.push(row('User points used', '', String(fit.n)))
  lines.push('')

  lines.push(row('KPIs'))
  lines.push(
    row(
      `Predicted LTV @ ${abbr}${inputs.horizon}`,
      '$ / cohort entrant',
      fmtN(kpi.ltvAtHorizon, 4),
    ),
  )
  if (kpi.ltvCacRatio != null) {
    lines.push(row('LTV / CAC', '', fmtN(kpi.ltvCacRatio, 3)))
  }
  if (kpi.payback != null) {
    lines.push(row('Payback', `${unit}s`, String(kpi.payback)))
  }
  lines.push(
    row(
      `Retention @ ${abbr}${inputs.horizon}`,
      '%',
      fmtN(kpi.horizonRetention * 100, 2),
    ),
  )
  lines.push('')

  const headers = [
    unitCap,
    'Input retention (%)',
    'Fit retention (%)',
    'Active count',
    `Revenue / ${unit} ($)`,
    'Cum revenue ($)',
    'Cum LTV / cohort entrant ($)',
  ]
  if (hasFunnel) headers.push('Cum LTV / acquired ($)')
  if (showRatio) headers.push('LTV / CAC')
  lines.push(row(`Per-${unit} breakdown`))
  lines.push(row(...headers))
  for (const p of series) {
    const cells = [
      String(p.t),
      userByT.has(p.t) ? fmtN(userByT.get(p.t), 2) : '',
      fmtPct(p.retention),
      String(Math.round(p.active)),
      fmtN(p.revenue, 2),
      fmtN(p.cumRevenue, 2),
      fmtN(p.cumLtvPerCohort, 4),
    ]
    if (hasFunnel) cells.push(fmtN(p.cumLtvPerAcquired, 4))
    if (showRatio) cells.push(fmtN(p.cumLtvPerCohort / cacShown, 3))
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
