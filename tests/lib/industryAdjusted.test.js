import { describe, it, expect } from 'vitest'
import {
  geometricMean,
  adjustFitToBenchmark,
} from '../../src/lib/industryAdjusted.js'

describe('geometricMean', () => {
  it('returns the n-th root of the product', () => {
    expect(geometricMean([2, 8])).toBeCloseTo(4, 12)
    expect(geometricMean([1, 1, 1])).toBe(1)
    expect(geometricMean([10])).toBeCloseTo(10, 12)
  })

  it('treats positive equally-spaced multiplicative deviations symmetrically', () => {
    // Symmetric in log space ⇒ GM is 1
    expect(geometricMean([0.5, 2])).toBeCloseTo(1, 12)
    expect(geometricMean([0.25, 4])).toBeCloseTo(1, 12)
  })

  it('returns 1 for empty/non-positive input (neutral scale)', () => {
    expect(geometricMean([])).toBe(1)
    expect(geometricMean([0, -1])).toBe(1)
  })

  it('ignores non-positive values, keeps positives', () => {
    expect(geometricMean([0, 4, 16])).toBeCloseTo(8, 12)
  })
})

describe('adjustFitToBenchmark', () => {
  // benchmark: R(t) = 0.3 · t^(-0.5)
  const bench = { a: 0.3, b: 0.5 }

  it('returns null when there is no benchmark', () => {
    expect(adjustFitToBenchmark([{ t: 1, percent: 30 }], null)).toBeNull()
  })

  it('with user points exactly equal to benchmark, avgRatio = 1', () => {
    const points = [1, 7, 14, 30].map((t) => ({
      t,
      percent: bench.a * Math.pow(t, -bench.b) * 100,
    }))
    const adj = adjustFitToBenchmark(points, bench)
    expect(adj.avgRatio).toBeCloseTo(1, 12)
    expect(adj.a).toBeCloseTo(bench.a, 12)
    expect(adj.b).toBe(bench.b)
  })

  it('user 2× benchmark at all points ⇒ adjusted a = 2 × benchmark.a', () => {
    const points = [1, 7, 14, 30].map((t) => ({
      t,
      percent: 2 * bench.a * Math.pow(t, -bench.b) * 100,
    }))
    const adj = adjustFitToBenchmark(points, bench)
    expect(adj.avgRatio).toBeCloseTo(2, 12)
    expect(adj.a).toBeCloseTo(0.6, 12)
  })

  it('preserves benchmark slope b (shape)', () => {
    const points = [
      { t: 1, percent: 30 },
      { t: 30, percent: 5 },
    ]
    const adj = adjustFitToBenchmark(points, bench)
    expect(adj.b).toBe(bench.b)
  })

  it('uses geometric mean — symmetric deviations cancel', () => {
    // user is 0.5× at t=1 and 2× at t=30 — GM should land at 1×
    const benchAt1 = bench.a * Math.pow(1, -bench.b)
    const benchAt30 = bench.a * Math.pow(30, -bench.b)
    const points = [
      { t: 1, percent: 0.5 * benchAt1 * 100 },
      { t: 30, percent: 2 * benchAt30 * 100 },
    ]
    const adj = adjustFitToBenchmark(points, bench)
    expect(adj.avgRatio).toBeCloseTo(1, 12)
  })

  it('drops invalid points but uses the rest', () => {
    const points = [
      { t: 1, percent: 30 },     // valid
      { t: 0, percent: 5 },      // invalid t
      { t: 7, percent: 20 },     // valid
      { t: 14, percent: 0 },     // invalid r=0
    ]
    const adj = adjustFitToBenchmark(points, bench)
    expect(adj).not.toBeNull()
    expect(adj.n).toBe(2)
  })

  it('returns null when no usable points remain', () => {
    const points = [
      { t: 0, percent: 30 },
      { t: 7, percent: 0 },
    ]
    expect(adjustFitToBenchmark(points, bench)).toBeNull()
  })
})
