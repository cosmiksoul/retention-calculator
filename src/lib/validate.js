// Input validation for the calculator. Pure, easy to unit test.

/**
 * @typedef {Object} RawRetentionRow
 * @property {string|number} id      stable key for React rendering
 * @property {number} t              period (>0, integer)
 * @property {number} percent        retention as percent in [0, 100]
 *
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {Map<string|number, string>} byId    id → first error message for that row
 * @property {string|null} formError              global, non-row error
 */

/**
 * Validate the retention input rows. Rules:
 *   - per-row: t > 0; percent in [0, 100]
 *   - no duplicate t
 *   - retention is non-increasing in t
 *   - at least `minPoints` rows (default 2; the band visualization needs ≥3
 *     for non-zero residual std error, but the fit itself accepts 2)
 */
export function validateRetentionPoints(points, { minPoints = 2 } = {}) {
  const byId = new Map()
  if (!Array.isArray(points)) {
    return { valid: false, byId, formError: 'No retention points provided.' }
  }

  for (const p of points) {
    if (!(p.t > 0) || !Number.isInteger(p.t)) {
      byId.set(p.id, 'Period must be a positive integer')
      continue
    }
    if (!(p.percent >= 0 && p.percent <= 100) || !Number.isFinite(p.percent)) {
      byId.set(p.id, 'Retention must be 0–100%')
    }
  }

  const sorted = [...points].sort((a, b) => a.t - b.t)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].t === sorted[i - 1].t && !byId.has(sorted[i].id)) {
      byId.set(sorted[i].id, 'Duplicate period')
    }
  }

  // Only flag monotonicity once basic per-row errors are clean — otherwise we double up.
  if (byId.size === 0) {
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].percent > sorted[i - 1].percent) {
        byId.set(sorted[i].id, 'Retention cannot grow over time')
      }
    }
  }

  let formError = null
  if (points.length < minPoints) {
    formError = `Need at least ${minPoints} retention points to fit a power law.`
  }

  return { valid: byId.size === 0 && !formError, byId, formError }
}

/**
 * Validate funnel rows. Each row must have a non-empty label and a
 * conversionPct in (0, 100]. Empty funnel is allowed (DAU semantics).
 */
export function validateFunnel(funnel) {
  const byId = new Map()
  if (!Array.isArray(funnel)) return { valid: true, byId }
  for (const step of funnel) {
    if (!step) continue
    if (typeof step.label !== 'string' || step.label.trim() === '') {
      byId.set(step.id, 'Step label cannot be empty')
      continue
    }
    if (
      !Number.isFinite(step.conversionPct) ||
      step.conversionPct <= 0 ||
      step.conversionPct > 100
    ) {
      byId.set(step.id, 'Conversion must be in (0, 100]')
    }
  }
  return { valid: byId.size === 0, byId }
}

/**
 * Cohort size, ARPU, horizon must be positive finite numbers.
 * CAC is optional — null/undefined/empty string ⇒ valid (just no payback).
 *
 * Accepts both `arpu` (legacy call sites) and `arpuPerPeriod` (unified).
 */
export function validateNumericInputs({
  cohortSize,
  arpu,
  arpuPerPeriod,
  cac,
  horizon,
}) {
  const errors = {}
  if (!(cohortSize > 0) || !Number.isFinite(cohortSize)) {
    errors.cohortSize = 'Cohort size must be > 0'
  }
  const arpuValue = arpuPerPeriod ?? arpu
  if (!(arpuValue >= 0) || !Number.isFinite(arpuValue)) {
    errors.arpu = 'ARPU must be a non-negative number'
  }
  if (cac != null && cac !== '' && (!(cac >= 0) || !Number.isFinite(cac))) {
    errors.cac = 'CAC must be a non-negative number'
  }
  if (!(horizon >= 1) || !Number.isFinite(horizon) || !Number.isInteger(horizon)) {
    errors.horizon = 'Forecast horizon must be a positive integer'
  }
  return { valid: Object.keys(errors).length === 0, errors }
}
