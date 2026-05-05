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
 *   - at least 3 rows
 *   - per-row: t > 0; percent in [0, 100]
 *   - no duplicate t
 *   - retention is non-increasing in t (Stage 0: Days only)
 */
export function validateRetentionPoints(points) {
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
  if (points.length < 3) {
    formError = 'Need at least 3 retention points to fit a power law.'
  }

  return { valid: byId.size === 0 && !formError, byId, formError }
}

/**
 * Cohort size, ARPU, horizon must be positive finite numbers.
 * CAC is optional — null/undefined/empty string ⇒ valid (just no breakeven).
 */
export function validateNumericInputs({ cohortSize, arpu, cac, horizon }) {
  const errors = {}
  if (!(cohortSize > 0) || !Number.isFinite(cohortSize)) {
    errors.cohortSize = 'Cohort size must be > 0'
  }
  if (!(arpu >= 0) || !Number.isFinite(arpu)) {
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
