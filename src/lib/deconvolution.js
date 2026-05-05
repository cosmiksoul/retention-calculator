// DAU deconvolution.
//
// We are given two parallel time series:
//   newUsers[d]  — installs / new users acquired on day d
//   dau[d]       — daily active users observed on day d
//
// Under the assumption that retention R(age) is the same for every cohort and
// there is no reactivation, DAU is a convolution of `newUsers` with `R`:
//
//     dau[d] = Σ_{i=0..d}  newUsers[d − i] · R[i]
//
// We invert this sequentially — at day d we know R[0..d−1] from prior steps,
// so the only unknown is R[d]:
//
//     R[d] = (dau[d] − Σ_{i=0..d−1} newUsers[d − i] · R[i]) / newUsers[0]
//
// Each step is clamped to enforce R ≥ 0 (NNLS-style) and R[d] ≤ R[d−1]
// (retention can't grow without reactivation, which the model excludes).
// This is a "greedy isotonic" pass — fast, defensible, ~10 lines. Sequential
// deconvolution can be noisy on volatile inputs, so we expose an optional
// moving-average smoother and re-clamp afterwards.

/**
 * @param {number[]} newUsers
 * @param {number[]} dau
 * @param {{smoothWindow?: number}} [options]
 * @returns {number[]} R[0..N-1], R[0] = 1, monotone non-increasing in [0, 1]
 */
export function deconvolveDAU(newUsers, dau, options = {}) {
  const { smoothWindow = 0 } = options
  if (!Array.isArray(newUsers) || !Array.isArray(dau)) {
    throw new Error('deconvolveDAU: newUsers and dau must be arrays')
  }
  const N = dau.length
  if (newUsers.length !== N) {
    throw new Error('deconvolveDAU: newUsers and dau must be the same length')
  }
  if (N < 2) throw new Error('deconvolveDAU: need at least 2 days')
  if (!(newUsers[0] > 0)) {
    throw new Error('deconvolveDAU: newUsers[0] must be > 0 (no acquisition on day 0 ⇒ system is unsolvable)')
  }

  const R = new Array(N).fill(0)
  R[0] = 1
  const denom = newUsers[0]

  for (let d = 1; d < N; d++) {
    let known = 0
    for (let i = 0; i < d; i++) {
      known += newUsers[d - i] * R[i]
    }
    let r = (dau[d] - known) / denom
    if (!Number.isFinite(r) || r < 0) r = 0
    if (r > R[d - 1]) r = R[d - 1] // monotonicity
    R[d] = r
  }

  if (smoothWindow > 1) {
    const smooth = movingAverage(R, smoothWindow)
    smooth[0] = 1
    for (let d = 1; d < N; d++) {
      if (smooth[d] > smooth[d - 1]) smooth[d] = smooth[d - 1]
      if (smooth[d] < 0) smooth[d] = 0
      if (smooth[d] > 1) smooth[d] = 1
    }
    return smooth
  }
  return R
}

function movingAverage(arr, window) {
  const half = Math.floor(window / 2)
  const out = new Array(arr.length)
  for (let i = 0; i < arr.length; i++) {
    let sum = 0
    let n = 0
    for (let k = -half; k <= half; k++) {
      const j = i + k
      if (j >= 0 && j < arr.length) {
        sum += arr[j]
        n++
      }
    }
    out[i] = sum / n
  }
  return out
}

/**
 * Forward convolution — given newUsers and an R vector, reconstruct DAU.
 * Used to display "observed vs. reconstructed" diagnostic on the chart.
 */
export function reconstructDAU(newUsers, R) {
  const N = newUsers.length
  const out = new Array(N).fill(0)
  for (let d = 0; d < N; d++) {
    const limit = Math.min(d, R.length - 1)
    for (let i = 0; i <= limit; i++) {
      out[d] += newUsers[d - i] * R[i]
    }
  }
  return out
}

/**
 * Validate raw DAU-mode input. Hard errors block deconvolution; warnings are
 * surfaced to the user but don't prevent the math from running.
 *
 * @param {{newUsers:number[], dau:number[]}} input
 */
export function validateDAUInput({ newUsers, dau }) {
  const errors = []
  const warnings = []
  if (!Array.isArray(newUsers) || !Array.isArray(dau)) {
    return { valid: false, errors: ['Both new_users and DAU columns are required.'], warnings }
  }
  if (newUsers.length !== dau.length) {
    errors.push('new_users and DAU must have the same number of rows.')
    return { valid: false, errors, warnings }
  }
  const N = newUsers.length
  if (N < 7) {
    errors.push(`Need at least 7 days of data (got ${N}).`)
    return { valid: false, errors, warnings }
  }
  if (N < 14) {
    warnings.push(`Only ${N} days — recommend ≥14 for stable deconvolution.`)
  }
  if (!(newUsers[0] > 0)) {
    errors.push('First-day new_users must be > 0 (acquisition is required to anchor R[0]).')
  }

  for (let i = 0; i < N; i++) {
    if (!Number.isFinite(newUsers[i]) || newUsers[i] < 0) {
      errors.push(`Row ${i + 1}: new_users must be a non-negative number.`)
      break
    }
    if (!Number.isFinite(dau[i]) || dau[i] < 0) {
      errors.push(`Row ${i + 1}: DAU must be a non-negative number.`)
      break
    }
  }

  // DAU sanity: DAU should be ≥ new_users on the same day, since new users
  // are part of DAU on day 0 of their own cohort. Violations usually mean
  // mis-aligned columns or different definitions of "new user".
  let violations = 0
  for (let i = 0; i < N; i++) {
    if (newUsers[i] > dau[i] + 1e-9) violations++
  }
  if (violations > 0) {
    warnings.push(
      `${violations} day(s) have new_users > DAU. Usually a data-quality issue (DAU should include same-day new users) — check column alignment.`,
    )
  }

  // Volatility of acquisition — high CV makes deconvolution noisy.
  if (errors.length === 0) {
    const mean = newUsers.reduce((s, v) => s + v, 0) / N
    if (mean > 0) {
      const variance = newUsers.reduce((s, v) => s + (v - mean) ** 2, 0) / N
      const cv = Math.sqrt(variance) / mean
      if (cv > 0.5) {
        warnings.push(
          `new_users is volatile (σ/μ = ${cv.toFixed(2)} > 0.5). Deconvolved retention may be noisy — apply smoothing or use a longer window.`,
        )
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}
