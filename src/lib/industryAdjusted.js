// Industry-adjusted retention model (§3.2 of spec).
//
// When the user has only a couple of input points but wants a long-horizon
// forecast, fitting a power law to those few points is fragile — the slope is
// poorly constrained. Industry-adjusted mode borrows the *shape* of the
// benchmark curve and rescales it by how much better/worse the user's product
// is on average:
//
//   ratio(t) = R_user(t) / R_benchmark(t)        per user point
//   k        = geometric mean of ratios          (multiplicative scale)
//   R_adjusted(t) = k · R_benchmark(t)
//
// Geometric mean is chosen because retention ratios are multiplicative —
// arithmetic mean would over-weight the tails (a 2× spike at one point pulls
// the average up much more than a 0.5× dip pulls it down, even though they
// represent symmetric deviations).

/**
 * Geometric mean of strictly positive numbers. Non-positive values are
 * filtered out (their log is undefined). Returns 1 if no usable values —
 * a neutral identity for multiplicative scaling.
 */
export function geometricMean(values) {
  const positives = values.filter((v) => v > 0)
  if (positives.length === 0) return 1
  const sumLog = positives.reduce((s, v) => s + Math.log(v), 0)
  return Math.exp(sumLog / positives.length)
}

/**
 * Build a synthetic "fit" object whose retention curve is the benchmark curve
 * scaled by the geometric-mean ratio of user/benchmark at the user's input
 * points. The returned shape matches `fitPowerLaw`'s output, so downstream
 * helpers (retentionCurve, ltvSeries, retentionBand) work unchanged.
 *
 * `se` is set to 0 because the adjusted curve carries the benchmark's slope
 * and we don't have a clean way to attribute residual uncertainty to it from
 * the user's few points — surfacing a fake CI here would be misleading.
 *
 * @param {Array<{t:number, percent:number}>} userPoints
 * @param {{a:number, b:number} | null} benchmarkFit
 * @returns {{a:number, b:number, se:number, n:number, avgRatio:number} | null}
 */
export function adjustFitToBenchmark(userPoints, benchmarkFit) {
  if (!benchmarkFit) return null
  const ratios = []
  for (const { t, percent } of userPoints) {
    if (!(t > 0)) continue
    const userR = percent / 100
    if (!(userR > 0 && userR <= 1)) continue
    const benchR = benchmarkFit.a * Math.pow(t, -benchmarkFit.b)
    if (!(benchR > 0)) continue
    ratios.push(userR / benchR)
  }
  if (ratios.length === 0) return null
  const avgRatio = geometricMean(ratios)
  return {
    a: benchmarkFit.a * avgRatio,
    b: benchmarkFit.b,
    se: 0,
    n: ratios.length,
    avgRatio,
  }
}
