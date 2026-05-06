// Period-agnostic LTV math — single math core for the unified calculator.
//
// Period is just a label ('day' | 'week' | 'month'); the math itself is
// identical regardless of which one is selected. This file replaces the
// session-specific `ltv.js` and the subscription-specific `subscriptionMath.js`
// — both are special cases of what is computed here.
//
// Funnel is a generic array of conversion steps (`[{label, conversionPct}]`).
// 0 steps ⇒ DAU semantics (acquired pool = full cohort, ARPU is per-cohort-
// entrant per period, matches v1). 2 steps with install→trial→paid ⇒
// classic subscription cascade (matches v2). N steps work the same way:
// each step's count = previous count × (conversionPct / 100).
//
// Power-law fit/predict/retentionCurve/retentionBand/extrapolationLevel
// continue to live in powerLaw.js (already period-agnostic). This module
// adds the funnel + cohort LTV + payback layer on top.

import { predict } from './powerLaw.js'

const PERIOD_ABBR = { day: 'D', week: 'W', month: 'M' }
const PERIOD_UNIT = { day: 'day', week: 'week', month: 'month' }

/**
 * Single-letter prefix for the chosen period: D / W / M.
 * @param {'day'|'week'|'month'} period
 * @returns {string}
 */
export function periodAbbr(period) {
  return PERIOD_ABBR[period] ?? 'D'
}

/**
 * Lowercase singular unit name for the chosen period: day / week / month.
 * @param {'day'|'week'|'month'} period
 * @returns {string}
 */
export function periodUnit(period) {
  return PERIOD_UNIT[period] ?? 'day'
}

/**
 * Composite label like "D7", "W4", "M12".
 * @param {number} t
 * @param {'day'|'week'|'month'} period
 * @returns {string}
 */
export function periodLabel(t, period) {
  return `${periodAbbr(period)}${t}`
}

const PERIOD_TICKS = {
  day: [1, 7, 14, 30, 60, 90, 180, 365],
  week: [1, 4, 8, 13, 26, 39, 52],
  month: [1, 3, 6, 9, 12, 18, 24, 36],
}

/**
 * Reasonable X-axis tick positions for the chosen period, capped to horizon.
 * Used by chart components so axis-tick spacing matches the period scale.
 *
 * @param {'day'|'week'|'month'} period
 * @param {number} horizon
 * @returns {number[]}
 */
export function periodTicks(period, horizon) {
  const all = PERIOD_TICKS[period] ?? PERIOD_TICKS.day
  return all.filter((t) => t <= horizon)
}

/**
 * Generic n-step funnel cascade. `funnel` is an array of `{label, conversionPct,
 * oneTimeFeeUsd?}` entries; each entry's count is `previous_count ×
 * conversionPct / 100`. A step may carry an optional `oneTimeFeeUsd` — a per-
 * user fee paid by everyone reaching that step (e.g. paid trial price).
 *
 * Steps emitted:
 *   - step 0: the cohort itself (label='Cohort', dropoffPct=null)
 *   - one step per funnel entry (label = entry.label, dropoffPct = 1 - conv/100,
 *     `oneTimeFeeUsd` and `oneTimeRevenue = count × fee` when fee > 0)
 *   - one step per retention checkpoint (label = `Active at ${period}${t}`,
 *     count = acquiredAtZero × retention.r, dropoff vs previous step)
 *
 * `acquiredAtZero` is the count after the last funnel entry — the people who
 * actually start paying / engaging. When funnel=[] it equals cohortSize
 * (DAU semantics).
 *
 * `oneTimeRevenue` sums fees across all funnel steps that carry one. It is
 * what cohortLtv lumps into period-1 revenue.
 *
 * @param {Object} params
 * @param {number} params.cohortSize
 * @param {Array<{label:string, conversionPct:number, oneTimeFeeUsd?:number|null}>} [params.funnel=[]]
 * @param {Array<{t:number, r:number}>} [params.retention=[]]   fractions (0..1)
 * @param {'day'|'week'|'month'} [params.period='day']
 * @returns {{
 *   steps: Array<{label:string, count:number, dropoffPct:number|null, oneTimeFeeUsd?:number, oneTimeRevenue?:number}>,
 *   acquiredAtZero: number,
 *   oneTimeRevenue: number,
 * }}
 */
export function funnelCascade({
  cohortSize,
  funnel = [],
  retention = [],
  period = 'day',
}) {
  if (!(cohortSize >= 0)) {
    throw new Error('funnelCascade: cohortSize must be >= 0')
  }

  const steps = [{ label: 'Cohort (acquired users)', count: cohortSize, dropoffPct: null }]
  let prevCount = cohortSize
  let oneTimeRevenue = 0

  for (const entry of funnel) {
    const conv = entry.conversionPct / 100
    const count = prevCount * conv
    const fee =
      Number.isFinite(entry.oneTimeFeeUsd) && entry.oneTimeFeeUsd > 0
        ? entry.oneTimeFeeUsd
        : 0
    const stepFeeRevenue = count * fee
    oneTimeRevenue += stepFeeRevenue
    const step = {
      label: entry.label,
      count,
      dropoffPct: 1 - conv,
    }
    if (fee > 0) {
      step.oneTimeFeeUsd = fee
      step.oneTimeRevenue = stepFeeRevenue
    }
    steps.push(step)
    prevCount = count
  }

  const acquiredAtZero = prevCount

  for (const point of retention) {
    const count = acquiredAtZero * point.r
    steps.push({
      label: `Active at ${periodLabel(point.t, period)}`,
      count,
      dropoffPct: prevCount > 0 ? 1 - count / prevCount : 0,
    })
    prevCount = count
  }

  return { steps, acquiredAtZero, oneTimeRevenue }
}

/**
 * Per-period revenue / LTV series for the cohort.
 *
 * Retention is clamped to R(1) — physically retention is non-increasing,
 * and a poorly-fit power law (b ≤ 0) might briefly produce R(t) > R(1) in
 * the first few periods otherwise. Lower bound is 0.
 *
 * `oneTimeRevenue` (optional) lumps non-recurring funnel revenue into period
 * 1 — typically the sum of paid-trial / activation fees for users who reach
 * those funnel steps. Modeled as paid right after acquisition, in the same
 * window as R(1). Compounds into cumRevenue and therefore both LTV reads
 * and payback.
 *
 * Output fields:
 *   active                — acquiredAtZero × R(t)
 *   revenue               — arpuPerPeriod × active (+ oneTimeRevenue at t=1)
 *   cumRevenue            — Σ revenue, total cohort
 *   cumLtvPerCohort       — cumRevenue / cohortSize  (per cohort entrant —
 *                           matches v1 cumLtv when funnel=[])
 *   cumLtvPerAcquired     — cumRevenue / acquiredAtZero (matches v2
 *                           cumLtvPerPayingUser; equals cumLtvPerCohort
 *                           when funnel=[])
 *
 * @param {Object} params
 * @param {{a:number, b:number}} params.fit
 * @param {number} params.acquiredAtZero      paying/active count at period 0
 * @param {number} params.arpuPerPeriod       revenue per acquired entrant per period
 * @param {number} params.cohortSize          install/cohort base
 * @param {number} params.horizon             # of periods to project
 * @param {number} [params.oneTimeRevenue=0]  one-time funnel revenue lumped into t=1
 * @returns {Array<{
 *   t:number, retention:number, active:number, revenue:number,
 *   cumRevenue:number, cumLtvPerCohort:number, cumLtvPerAcquired:number,
 * }>}
 */
export function cohortLtv({
  fit,
  acquiredAtZero,
  arpuPerPeriod,
  cohortSize,
  horizon,
  oneTimeRevenue = 0,
}) {
  if (!(horizon >= 1)) throw new Error('cohortLtv: horizon must be >= 1')
  if (!Number.isFinite(arpuPerPeriod)) {
    throw new Error('cohortLtv: arpuPerPeriod must be finite')
  }
  if (!Number.isFinite(acquiredAtZero)) {
    throw new Error('cohortLtv: acquiredAtZero must be finite')
  }
  if (!(cohortSize > 0)) throw new Error('cohortLtv: cohortSize must be > 0')
  if (!Number.isFinite(oneTimeRevenue) || oneTimeRevenue < 0) {
    throw new Error('cohortLtv: oneTimeRevenue must be a non-negative finite number')
  }

  const r1 = predict(1, fit)
  const out = []
  let cumRev = 0
  for (let t = 1; t <= horizon; t++) {
    const retention = Math.max(0, Math.min(predict(t, fit), r1))
    const active = acquiredAtZero * retention
    const recurring = active * arpuPerPeriod
    const revenue = recurring + (t === 1 ? oneTimeRevenue : 0)
    cumRev += revenue
    out.push({
      t,
      retention,
      active,
      revenue,
      cumRevenue: cumRev,
      cumLtvPerCohort: cumRev / cohortSize,
      cumLtvPerAcquired: acquiredAtZero > 0 ? cumRev / acquiredAtZero : 0,
    })
  }
  return out
}

/**
 * ±k·σ confidence band on cumulative cohort revenue.
 *
 * Integrates `perPeriodRate × R±(t)` cumulatively, where R±(t) is the
 * retention band edge (capped to [0,1]). The caller picks what
 * `perPeriodRate` represents:
 *   - `arpuPerPeriod × acquiredAtZero`   ⇒ total-cohort revenue band
 *   - `arpuPerPeriod × acquiredAtZero / cohortSize` ⇒ per-cohort-entrant band
 *     (matches v1 ltvBand call shape)
 *
 * `oneTimeOffset` (optional) is a deterministic lump-sum added at t=1 on
 * both bounds — same units as `perPeriodRate × t`. Used for paid-trial /
 * activation fees, which carry no power-law uncertainty.
 *
 * Width grows monotonically with t in log-space, by construction.
 *
 * @param {{a:number, b:number, se:number}} fit
 * @param {number} perPeriodRate    revenue rate at t=0 in chosen units
 * @param {number} horizon
 * @param {number} [kSigma=1]
 * @param {number} [oneTimeOffset=0]
 * @returns {Array<{t:number, lower:number, upper:number}>}
 */
export function cohortLtvBand(fit, perPeriodRate, horizon, kSigma = 1, oneTimeOffset = 0) {
  if (!(horizon >= 1)) throw new Error('cohortLtvBand: horizon must be >= 1')
  if (!Number.isFinite(perPeriodRate)) {
    throw new Error('cohortLtvBand: perPeriodRate must be finite')
  }
  if (!(kSigma > 0)) throw new Error('cohortLtvBand: kSigma must be > 0')
  if (!Number.isFinite(oneTimeOffset) || oneTimeOffset < 0) {
    throw new Error('cohortLtvBand: oneTimeOffset must be a non-negative finite number')
  }

  const halfWidth = fit.se * kSigma
  let cumLow = 0
  let cumUp = 0
  const out = []
  for (let t = 1; t <= horizon; t++) {
    const upR = Math.min(1, fit.a * Math.pow(t, -(fit.b - halfWidth)))
    const loR = Math.max(0, fit.a * Math.pow(t, -(fit.b + halfWidth)))
    cumUp += perPeriodRate * upR
    cumLow += perPeriodRate * loR
    if (t === 1) {
      cumUp += oneTimeOffset
      cumLow += oneTimeOffset
    }
    out.push({ t, lower: cumLow, upper: cumUp })
  }
  return out
}

/**
 * First period T (1-indexed) where cumulative cohort revenue ≥ cohort × CAC,
 * equivalently cumLtvPerCohort ≥ CAC.
 *
 * Conventions:
 *   cac null/undefined/NaN/Infinity → null  (caller decides what to render)
 *   cac <= 0                        → 1     (any revenue covers zero cost)
 *   cac never reached               → null
 *
 * @param {Array<{t:number, cumLtvPerCohort:number}>} series
 * @param {number|null|undefined} cac per cohort entrant
 * @returns {number|null}
 */
export function payback(series, cac) {
  if (cac == null || !Number.isFinite(cac)) return null
  if (cac <= 0) return 1
  for (const point of series) {
    if (point.cumLtvPerCohort >= cac) return point.t
  }
  return null
}
