// Power law retention model:  R(t) = a * t^(-b)
// Fit by ordinary least squares in log-space:
//   ln(r) = ln(a) - b * ln(t)
// which is plain linear regression on (ln t, ln r).

/**
 * @typedef {Object} RetentionPoint
 * @property {number} t  period index, must be > 0
 * @property {number} r  retention as a fraction in (0, 1]
 *
 * @typedef {Object} PowerLawFit
 * @property {number} a            ln-intercept exponentiated
 * @property {number} b            decay exponent (positive ⇒ retention decays)
 * @property {number} rSquared     coefficient of determination, computed in log space
 * @property {number} se           standard error of the slope (used by CI in later stages)
 * @property {number} n            number of input points
 */

/**
 * Fit R(t) = a * t^(-b) by OLS in log space.
 * @param {RetentionPoint[]} points
 * @returns {PowerLawFit}
 */
export function fitPowerLaw(points) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('fitPowerLaw: need at least 2 points')
  }

  const xs = []
  const ys = []
  for (const { t, r } of points) {
    if (!(t > 0)) throw new Error(`fitPowerLaw: t must be > 0, got ${t}`)
    if (!(r > 0 && r <= 1)) {
      throw new Error(`fitPowerLaw: r must be in (0, 1], got ${r}`)
    }
    xs.push(Math.log(t))
    ys.push(Math.log(r))
  }

  const n = xs.length
  const meanX = xs.reduce((s, v) => s + v, 0) / n
  const meanY = ys.reduce((s, v) => s + v, 0) / n

  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    sxy += dx * (ys[i] - meanY)
    sxx += dx * dx
  }
  if (sxx === 0) throw new Error('fitPowerLaw: zero variance in t (all points share the same period)')

  const slope = sxy / sxx                  // slope of ln(r) vs ln(t) ⇒ -b
  const intercept = meanY - slope * meanX  // ⇒ ln(a)
  const b = -slope
  const a = Math.exp(intercept)

  // R² in log space (we model log-linearly, so this is the honest measure).
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i++) {
    const yhat = intercept + slope * xs[i]
    ssRes += (ys[i] - yhat) ** 2
    ssTot += (ys[i] - meanY) ** 2
  }
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot

  // Standard error of the slope; needs at least 3 points to have residual dof.
  const se = n > 2 ? Math.sqrt(ssRes / (n - 2) / sxx) : 0

  return { a, b, rSquared, se, n }
}

/**
 * Predicted retention at period t (fraction in (0, ∞), typically (0, 1]).
 * @param {number} t
 * @param {{a: number, b: number}} fit
 */
export function predict(t, fit) {
  if (!(t > 0)) throw new Error('predict: t must be > 0')
  return fit.a * Math.pow(t, -fit.b)
}

/**
 * Build [{t, r}] series for t = 1..horizon.
 * @param {{a: number, b: number}} fit
 * @param {number} horizon
 */
export function retentionCurve(fit, horizon) {
  if (!(horizon >= 1)) throw new Error('retentionCurve: horizon must be >= 1')
  const out = []
  for (let t = 1; t <= horizon; t++) {
    out.push({ t, r: predict(t, fit) })
  }
  return out
}
