// Shared shape, defaults, and validation for the subscription input form.
//
// Defaults match spec-v2 §3.1–3.4: monthly cohort centred on RevenueCat
// utilities-median numbers (M1 50% / M3 32% / M6 22% / M12 12%, ARPU $12,
// CAC $2.10), weekly cohort centred on the Adapty 2026 weekly trap pattern
// (W1 75% / W2 65% / W4 50% / W8 38% / W12 30% / W26 18%, ARPU $7.99).
//
// Cadence switch resets the form to defaults of the new cadence — that is
// the design principle in §3.4: "одно и то же приложение нельзя
// одновременно иметь разные значения в Weekly и Monthly". Stage 8 will
// override defaults from a selected preset when one is available.
//
// Retention points carry stable ids so the shared RetentionInput component
// can identify rows across edits / adds / removes (same shape as v1).

import { newPointId } from './idGen.js'

const RETENTION_DEFAULT_TS = {
  monthly: [
    { t: 1, percent: 50 },
    { t: 3, percent: 32 },
    { t: 6, percent: 22 },
    { t: 12, percent: 12 },
  ],
  weekly: [
    { t: 1, percent: 75 },
    { t: 2, percent: 65 },
    { t: 4, percent: 50 },
    { t: 8, percent: 38 },
    { t: 12, percent: 30 },
    { t: 26, percent: 18 },
  ],
}

export const SUBSCRIPTION_DEFAULTS = {
  monthly: {
    installToTrial: 8.6,
    trialToPaid: 35.0,
    arpuPaid: 12,
    cac: 2.1,
    cohortSize: 1000,
    horizon: 24,
  },
  weekly: {
    installToTrial: 8.6,
    trialToPaid: 35.0,
    arpuPaid: 7.99,
    cac: 2.1,
    cohortSize: 1000,
    horizon: 26,
  },
}

export const HORIZON_RANGE = {
  monthly: { min: 6, max: 36 },
  weekly: { min: 4, max: 52 },
}

/**
 * Returns a fresh defaults object — retention rows get freshly minted ids
 * so React keys don't collide across cadence switches.
 */
export function defaultsFor(cadence) {
  const scalars = SUBSCRIPTION_DEFAULTS[cadence] ?? SUBSCRIPTION_DEFAULTS.monthly
  const tpl = RETENTION_DEFAULT_TS[cadence] ?? RETENTION_DEFAULT_TS.monthly
  return {
    ...scalars,
    retention: tpl.map((p) => ({ id: newPointId(), ...p })),
  }
}

/**
 * Validates a subscription input state.
 *
 * Mirrors the session validator's contract:
 *   { valid, errors, byId, retentionFormError }
 * where `errors` covers scalar fields and `byId`/`retentionFormError`
 * cover the retention rows (so the shared RetentionInput component can
 * surface per-row messages directly).
 *
 * @param {Object} state
 * @returns {{
 *   valid: boolean,
 *   errors: Record<string, string>,
 *   byId: Map<string, string>,
 *   retentionFormError: string|null,
 * }}
 */
export function validateSubscriptionInputs(state) {
  const errors = {}

  const checkPct = (key, label) => {
    const v = state[key]
    if (!Number.isFinite(v)) {
      errors[key] = `${label} required`
      return
    }
    if (v < 0 || v > 100) errors[key] = `${label} must be 0–100%`
  }
  checkPct('installToTrial', 'Install→Trial')
  checkPct('trialToPaid', 'Trial→Paid')

  if (!Number.isFinite(state.arpuPaid) || state.arpuPaid <= 0) {
    errors.arpuPaid = 'ARPU must be > 0'
  }
  if (!Number.isFinite(state.cac) || state.cac < 0) {
    errors.cac = 'CAC must be ≥ 0'
  }
  if (!Number.isFinite(state.cohortSize) || state.cohortSize <= 0) {
    errors.cohortSize = 'Cohort must be > 0'
  }
  if (!Number.isFinite(state.horizon) || state.horizon < 1) {
    errors.horizon = 'Horizon must be ≥ 1'
  }

  const byId = new Map()
  const points = Array.isArray(state.retention) ? state.retention : []

  for (const p of points) {
    if (!(p.t > 0) || !Number.isInteger(p.t)) {
      byId.set(p.id, 'Period must be a positive integer')
      continue
    }
    if (
      !Number.isFinite(p.percent) ||
      p.percent < 0 ||
      p.percent > 100
    ) {
      byId.set(p.id, 'Retention must be 0–100%')
    }
  }

  const sorted = [...points].sort((a, b) => a.t - b.t)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].t === sorted[i - 1].t && !byId.has(sorted[i].id)) {
      byId.set(sorted[i].id, 'Duplicate period')
    }
  }

  // Monotonic non-increasing — only flag once basic per-row errors clear.
  if (byId.size === 0) {
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].percent > sorted[i - 1].percent) {
        byId.set(sorted[i].id, 'Retention cannot grow over time')
      }
    }
  }

  let retentionFormError = null
  if (points.length < 2) {
    retentionFormError = 'Need at least 2 retention points'
  }

  const valid =
    Object.keys(errors).length === 0 &&
    byId.size === 0 &&
    !retentionFormError

  return { valid, errors, byId, retentionFormError }
}
