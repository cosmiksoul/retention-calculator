import { predict } from './powerLaw.js'

/**
 * @typedef {Object} LtvPoint
 * @property {number} t          period index (1-based)
 * @property {number} retention  fraction
 * @property {number} revenue    arpu * retention
 * @property {number} cumLtv     Σ revenue from t=1
 */

/**
 * LTV(T) = ARPU × Σ R(t),  t=1..T.
 *
 * @param {{a: number, b: number}} fit
 * @param {number} arpu      revenue per active user per period
 * @param {number} horizon   number of periods (1..horizon)
 * @returns {LtvPoint[]}
 */
export function ltvSeries(fit, arpu, horizon) {
  if (!(horizon >= 1)) throw new Error('ltvSeries: horizon must be >= 1')
  if (!Number.isFinite(arpu)) throw new Error('ltvSeries: arpu must be a finite number')

  const out = []
  let cum = 0
  for (let t = 1; t <= horizon; t++) {
    const retention = predict(t, fit)
    const revenue = arpu * retention
    cum += revenue
    out.push({ t, retention, revenue, cumLtv: cum })
  }
  return out
}

/**
 * LTV envelope from the ±k·σ retention band. We integrate the band-edge curves
 * directly (capping retention to [0,1] each step) so the upper LTV is the
 * cumulative ARPU × upper-retention, and likewise for lower. This is the
 * cumulative analogue of `retentionBand`.
 *
 * @param {{a:number, b:number, se:number}} fit
 * @param {number} arpu
 * @param {number} horizon
 * @param {number} [kSigma=1]
 * @returns {Array<{t:number, lower:number, upper:number}>}
 */
export function ltvBand(fit, arpu, horizon, kSigma = 1) {
  if (!(horizon >= 1)) throw new Error('ltvBand: horizon must be >= 1')
  if (!Number.isFinite(arpu)) throw new Error('ltvBand: arpu must be finite')
  if (!(kSigma > 0)) throw new Error('ltvBand: kSigma must be > 0')

  const halfWidth = fit.se * kSigma
  let cumLow = 0
  let cumUp = 0
  const out = []
  for (let t = 1; t <= horizon; t++) {
    const upR = Math.min(1, fit.a * Math.pow(t, -(fit.b - halfWidth)))
    const loR = Math.max(0, fit.a * Math.pow(t, -(fit.b + halfWidth)))
    cumUp += arpu * upR
    cumLow += arpu * loR
    out.push({ t, lower: cumLow, upper: cumUp })
  }
  return out
}

/**
 * First t where cumLtv >= cac. Conventions:
 *   cac null/undefined/NaN → null  (caller decides what to render)
 *   cac <= 0               → 1     (any revenue covers zero cost)
 *   cac never reached      → null
 *
 * @param {LtvPoint[]} series
 * @param {number|null|undefined} cac
 * @returns {number|null}
 */
export function breakevenDay(series, cac) {
  if (cac == null || !Number.isFinite(cac)) return null
  if (cac <= 0) return 1
  for (const point of series) {
    if (point.cumLtv >= cac) return point.t
  }
  return null
}
