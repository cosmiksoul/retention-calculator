// Subscription-mode math: funnel cascade, cumulative revenue/LTV, payback.
//
// The power-law fit itself is reused from src/lib/powerLaw.js — that module
// is cadence-agnostic (it fits on a generic {t, r} array). This file adds
// the subscription-specific layer on top: install→trial→paid funnel,
// per-cycle paying users / revenue / LTV per install / per paying user,
// and a payback finder that compares cumulative revenue to the absolute
// cohort acquisition cost.
//
// All time indices `t` are in cadence units — months for cadence='monthly',
// weeks for cadence='weekly'. Math is identical in both cases; cadence
// only affects display labels and which input fields the UI surfaces.

import { predict } from './powerLaw.js'

/**
 * @param {number} t
 * @param {'monthly'|'weekly'} cadence
 * @returns {string}
 */
export function cadenceLabel(t, cadence) {
  return `${cadence === 'weekly' ? 'W' : 'M'}${t}`
}

/**
 * @param {'monthly'|'weekly'} cadence
 * @returns {'week'|'month'}
 */
export function cadenceUnit(cadence) {
  return cadence === 'weekly' ? 'week' : 'month'
}

/**
 * Funnel cascade from raw cohort to retained paying users at each user-input
 * retention checkpoint. This drives the visual funnel waterfall in the UI;
 * for LTV math (between checkpoints, past horizon) we use the fitted curve
 * via subscriptionLtv.
 *
 * Drop-off percentage is computed against the previous step. The first step
 * (Installs) has dropoffPct=null since it's the absolute baseline.
 *
 * @param {Object} params
 * @param {number} params.cohortSize           # of installs (the absolute base)
 * @param {number} params.installToTrial       fraction (0..1)
 * @param {number} params.trialToPaid          fraction (0..1)
 * @param {Array<{t:number, r:number}>} params.retention   fractions (0..1)
 * @param {'monthly'|'weekly'} [params.cadence='monthly']
 * @returns {{
 *   steps: Array<{label:string, count:number, dropoffPct:number|null}>,
 *   payingAtZero: number,
 * }}
 */
export function funnelCascade({
  cohortSize,
  installToTrial,
  trialToPaid,
  retention,
  cadence = 'monthly',
}) {
  if (!(cohortSize >= 0)) throw new Error('funnelCascade: cohortSize must be >= 0')

  const steps = [{ label: 'Installs', count: cohortSize, dropoffPct: null }]

  const trials = cohortSize * installToTrial
  steps.push({
    label: 'Trials started',
    count: trials,
    dropoffPct: 1 - installToTrial,
  })

  const payingAtZero = trials * trialToPaid
  steps.push({
    label: `Paying users (${cadenceUnit(cadence)} 0)`,
    count: payingAtZero,
    dropoffPct: 1 - trialToPaid,
  })

  let prevCount = payingAtZero
  for (const point of retention) {
    const count = payingAtZero * point.r
    steps.push({
      label: `Active at ${cadenceLabel(point.t, cadence)}`,
      count,
      dropoffPct: prevCount > 0 ? 1 - count / prevCount : 0,
    })
    prevCount = count
  }

  return { steps, payingAtZero }
}

/**
 * Per-cycle subscription revenue series.
 *
 * Retention is clamped to R(1) — paying-user retention is physically
 * non-increasing, and a poorly-fit power law (b ≤ 0) might briefly produce
 * R(t) > R(1) in the first few cycles otherwise. Lower bound is 0 (a
 * negative retention is meaningless).
 *
 * @param {Object} params
 * @param {{a:number, b:number}} params.fit    power-law fit on retention points
 * @param {number} params.payingAtZero         absolute # paying at cycle 0
 * @param {number} params.arpuPaid             revenue per paying user per cycle
 * @param {number} params.cohortSize           install base (for LTV per install)
 * @param {number} params.horizon              # of cycles to project
 * @returns {Array<{
 *   t:number, retention:number, payingUsers:number, revenue:number,
 *   cumRevenue:number, cumLtvPerInstall:number, cumLtvPerPayingUser:number
 * }>}
 */
export function subscriptionLtv({
  fit,
  payingAtZero,
  arpuPaid,
  cohortSize,
  horizon,
}) {
  if (!(horizon >= 1)) throw new Error('subscriptionLtv: horizon must be >= 1')
  if (!Number.isFinite(arpuPaid)) throw new Error('subscriptionLtv: arpuPaid must be finite')
  if (!Number.isFinite(payingAtZero)) throw new Error('subscriptionLtv: payingAtZero must be finite')
  if (!(cohortSize > 0)) throw new Error('subscriptionLtv: cohortSize must be > 0')

  const r1 = predict(1, fit)
  const out = []
  let cumRev = 0
  for (let t = 1; t <= horizon; t++) {
    const retention = Math.max(0, Math.min(predict(t, fit), r1))
    const payingUsers = payingAtZero * retention
    const revenue = payingUsers * arpuPaid
    cumRev += revenue
    out.push({
      t,
      retention,
      payingUsers,
      revenue,
      cumRevenue: cumRev,
      cumLtvPerInstall: cumRev / cohortSize,
      cumLtvPerPayingUser: payingAtZero > 0 ? cumRev / payingAtZero : 0,
    })
  }
  return out
}

/**
 * First cycle T (1-indexed) where cumulative revenue ≥ cohort acquisition cost.
 *
 * Conventions mirror v1 breakevenDay:
 *   cac null/undefined/NaN → null  (caller decides what to render)
 *   cac <= 0               → 1     (any revenue covers zero cost)
 *   cac never reached      → null
 *
 * @param {Array<{t:number, cumRevenue:number}>} series
 * @param {number} cohortSize
 * @param {number|null|undefined} cac per install
 * @returns {number|null}
 */
export function subscriptionPayback(series, cohortSize, cac) {
  if (cac == null || !Number.isFinite(cac)) return null
  if (cac <= 0) return 1
  const target = cohortSize * cac
  for (const point of series) {
    if (point.cumRevenue >= target) return point.t
  }
  return null
}
