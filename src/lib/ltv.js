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
