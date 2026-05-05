// Parse a pasted cohort retention table (TSV/CSV from Sheets, Mixpanel, GA4, SQL,
// etc.) into per-period averaged retention percentages.
//
// Expected shape (the leading "Cohort" column is optional):
//
//   Cohort      | D0   | D1   | D7   | D14  | D30
//   2026-04-01  | 1200 | 480  | 240  | 168  | 108
//   2026-04-08  |  980 | 412  | 196  | 137  | —
//   …
//
// Cells may be:
//   - absolute counts (max > 100)        → retention(t) = value / D0 × 100
//   - already-percentages (0–100)        → kept as-is
//   - fractions (max ≤ 1.0)              → multiplied by 100
//
// Returns:
//   { errors:[], warnings:[], cohorts:[…], periods:[…], avgPoints:[{t,percent}] }
//
// On any hard error `avgPoints` is null — the caller should not feed the result
// into the calculator.

const PERIOD_RE = /^(?:d|day\s*)?(\d+)$/i

function detectSeparator(line) {
  if (line.includes('\t')) return '\t'
  const commas = (line.match(/,/g) || []).length
  const semis = (line.match(/;/g) || []).length
  if (semis > commas) return ';'
  if (commas > 0) return ','
  return null // signals: split on whitespace
}

function splitLine(line, sep) {
  return sep === null ? line.split(/\s+/) : line.split(sep)
}

function tryParsePeriod(s) {
  const m = String(s ?? '').trim().match(PERIOD_RE)
  return m ? parseInt(m[1], 10) : null
}

function tryParseNumber(s) {
  const raw = String(s ?? '').trim()
  if (!raw || raw === '-' || raw === '—' || raw === 'null' || raw === 'N/A') {
    return null
  }
  // Tolerate "%", spaces, and European decimal commas in obvious cases
  // (e.g. "12,5%"). Don't strip thousands separators — Sheets exports use them
  // and we need numbers like "1200" to stay as 1200, not 1.2.
  const cleaned = raw.replace(/%/g, '').replace(/\s/g, '')
  // If string has comma but no dot, treat comma as decimal separator
  const decimal =
    cleaned.includes(',') && !cleaned.includes('.')
      ? cleaned.replace(',', '.')
      : cleaned
  const v = parseFloat(decimal)
  return Number.isFinite(v) ? v : null
}

/**
 * Detect whether a single cohort row's values are absolute counts, fractions
 * (0..1) or percentages, and convert to percentages.
 */
function normalizeCohort(label, values) {
  const nonNull = values.filter((v) => v != null)
  if (nonNull.length === 0) {
    return { label, values, retentionPct: values.map(() => null), baseSize: null, format: 'empty' }
  }
  const max = Math.max(...nonNull)
  const first = values.find((v) => v != null)

  let retentionPct
  let format
  let baseSize = null
  if (max > 100) {
    format = 'absolute'
    baseSize = first
    retentionPct = values.map((v) => (v == null ? null : (v / first) * 100))
  } else if (max <= 1.0) {
    format = 'fraction'
    retentionPct = values.map((v) => (v == null ? null : v * 100))
  } else {
    format = 'percent'
    retentionPct = values.map((v) => v)
  }
  return { label, values, retentionPct, baseSize, format }
}

function mean(values) {
  return values.reduce((s, v) => s + v, 0) / values.length
}

function stdev(values, mu) {
  if (values.length < 2) return 0
  const sq = values.reduce((s, v) => s + (v - mu) ** 2, 0)
  return Math.sqrt(sq / (values.length - 1))
}

/**
 * @param {string} text
 */
export function parseCohortTable(text) {
  const errors = []
  const warnings = []
  const empty = { errors, warnings, cohorts: [], periods: [], avgPoints: null }

  if (!text || !text.trim()) {
    errors.push('Empty input.')
    return empty
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 3) {
    errors.push('Need at least one header row + two cohort rows.')
    return empty
  }

  const sep = detectSeparator(lines[0])
  const headerCells = splitLine(lines[0], sep).map((c) => c.trim())
  if (headerCells.length < 3) {
    errors.push('Header must contain at least three columns (e.g. Cohort, D0, D1, …).')
    return empty
  }

  // If the first header cell parses as a period, there is no label column.
  const firstAsPeriod = tryParsePeriod(headerCells[0])
  const hasLabelColumn = firstAsPeriod === null
  const periodCells = hasLabelColumn ? headerCells.slice(1) : headerCells
  const periods = periodCells.map(tryParsePeriod)
  if (periods.some((p) => p === null)) {
    const bad = periodCells[periods.indexOf(null)]
    errors.push(`Header column "${bad}" is not a period label (expected D0, D1, Day 7, …).`)
    return empty
  }
  if (periods.length < 2) {
    errors.push('Need at least two period columns.')
    return empty
  }

  // Body rows
  const rawCohorts = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], sep).map((c) => c.trim())
    const label = hasLabelColumn ? cells[0] : `Cohort ${rawCohorts.length + 1}`
    const valueCells = hasLabelColumn ? cells.slice(1) : cells
    // Pad / truncate to match periods length
    const values = periods.map((_, idx) =>
      idx < valueCells.length ? tryParseNumber(valueCells[idx]) : null,
    )
    rawCohorts.push({ label, values })
  }

  if (rawCohorts.length < 2) {
    errors.push('Need at least 2 cohort rows.')
    return empty
  }

  const cohorts = rawCohorts.map((c) => normalizeCohort(c.label, c.values))

  // Per-period stats across cohorts
  const periodStats = periods.map((t, idx) => {
    const vals = cohorts
      .map((c) => c.retentionPct[idx])
      .filter((v) => v != null && Number.isFinite(v))
    const m = vals.length ? mean(vals) : null
    const s = vals.length ? stdev(vals, m ?? 0) : 0
    return { t, mean: m, std: s, n: vals.length, values: vals }
  })

  const usable = periodStats.filter((p) => p.mean != null)
  if (usable.length < 3) {
    errors.push('Need at least 3 periods with data after averaging.')
    return empty
  }

  // Cohort-size warning (only meaningful when at least one cohort gave us absolute counts)
  const baseSizes = cohorts.map((c) => c.baseSize).filter((b) => b != null)
  if (baseSizes.length >= 2) {
    const minSize = Math.min(...baseSizes)
    const maxSize = Math.max(...baseSizes)
    if (maxSize / minSize > 3) {
      warnings.push(
        `Cohort sizes vary by ${(maxSize / minSize).toFixed(1)}×. Larger cohorts dominate the average — consider weighting by size or splitting the input.`,
      )
    }
  }

  // Per-period dispersion: surface periods where the coefficient of variation
  // (σ / μ) exceeds 0.5 — at that point the average is unreliable.
  const noisy = periodStats.filter(
    (p) => p.mean != null && p.mean > 0 && p.n >= 2 && p.std / p.mean > 0.5,
  )
  if (noisy.length > 0) {
    warnings.push(
      `Cohorts disagree at D${noisy.map((p) => p.t).join(', D')} (σ/μ > 0.5). The averaged curve may be misleading — consider splitting cohorts by acquisition channel or season.`,
    )
  }

  // Use D0 as the anchor: drop it from avgPoints (it's always 100%, not informative for the fit).
  const avgPoints = usable
    .filter((p) => p.t > 0)
    .map((p) => ({ t: p.t, percent: p.mean }))

  if (avgPoints.length < 3) {
    errors.push('Need at least 3 non-zero periods with data after averaging.')
    return empty
  }

  return {
    errors,
    warnings,
    cohorts,
    periods: periodStats,
    avgPoints,
    hasLabelColumn,
    separator: sep === '\t' ? 'tab' : sep ?? 'whitespace',
  }
}
