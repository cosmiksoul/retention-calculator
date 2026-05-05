import { describe, it, expect } from 'vitest'
import { fitPowerLaw, predict, retentionCurve } from '../../src/lib/powerLaw.js'

describe('fitPowerLaw', () => {
  it('recovers known a, b on noise-free synthetic data', () => {
    const a = 0.5
    const b = 0.6
    const points = [1, 2, 7, 14, 30].map((t) => ({ t, r: a * Math.pow(t, -b) }))
    const fit = fitPowerLaw(points)
    expect(fit.a).toBeCloseTo(a, 6)
    expect(fit.b).toBeCloseTo(b, 6)
    expect(fit.rSquared).toBeCloseTo(1, 6)
    expect(fit.n).toBe(5)
  })

  it('R² is high but < 1 with small log-symmetric noise', () => {
    const a = 0.4
    const b = 0.5
    const points = [1, 7, 14, 30, 60].map((t, i) => ({
      t,
      r: a * Math.pow(t, -b) * (1 + (i % 2 === 0 ? 0.05 : -0.05)),
    }))
    const fit = fitPowerLaw(points)
    expect(fit.rSquared).toBeGreaterThan(0.85)
    expect(fit.rSquared).toBeLessThan(1)
  })

  it('produces non-negative SE with > 2 points; SE = 0 with exactly 2', () => {
    const exact = fitPowerLaw([
      { t: 1, r: 0.5 },
      { t: 7, r: 0.2 },
    ])
    expect(exact.se).toBe(0)

    const noisy = fitPowerLaw([
      { t: 1, r: 0.5 },
      { t: 7, r: 0.2 },
      { t: 14, r: 0.13 },
      { t: 30, r: 0.07 },
    ])
    expect(noisy.se).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(noisy.se)).toBe(true)
  })

  it('throws on fewer than 2 points', () => {
    expect(() => fitPowerLaw([])).toThrow()
    expect(() => fitPowerLaw([{ t: 1, r: 0.5 }])).toThrow()
  })

  it('throws on r outside (0, 1]', () => {
    expect(() => fitPowerLaw([{ t: 1, r: 0 }, { t: 7, r: 0.2 }])).toThrow()
    expect(() => fitPowerLaw([{ t: 1, r: -0.1 }, { t: 7, r: 0.2 }])).toThrow()
    expect(() => fitPowerLaw([{ t: 1, r: 1.2 }, { t: 7, r: 0.2 }])).toThrow()
  })

  it('throws on t <= 0', () => {
    expect(() => fitPowerLaw([{ t: 0, r: 0.5 }, { t: 7, r: 0.2 }])).toThrow()
    expect(() => fitPowerLaw([{ t: -1, r: 0.5 }, { t: 7, r: 0.2 }])).toThrow()
  })

  it('throws when all t are equal (zero variance)', () => {
    expect(() => fitPowerLaw([{ t: 7, r: 0.5 }, { t: 7, r: 0.4 }])).toThrow()
  })
})

describe('predict', () => {
  it('matches a * t^(-b)', () => {
    const fit = { a: 0.5, b: 0.6 }
    expect(predict(7, fit)).toBeCloseTo(0.5 * Math.pow(7, -0.6), 12)
    expect(predict(1, fit)).toBeCloseTo(0.5, 12)
  })

  it('throws on t <= 0', () => {
    expect(() => predict(0, { a: 1, b: 0.5 })).toThrow()
  })
})

describe('retentionCurve', () => {
  it('returns horizon-length series starting at t=1', () => {
    const series = retentionCurve({ a: 1, b: 0.5 }, 10)
    expect(series).toHaveLength(10)
    expect(series[0].t).toBe(1)
    expect(series[9].t).toBe(10)
  })

  it('is monotonically non-increasing for b > 0', () => {
    const series = retentionCurve({ a: 0.6, b: 0.5 }, 100)
    for (let i = 1; i < series.length; i++) {
      expect(series[i].r).toBeLessThanOrEqual(series[i - 1].r + 1e-12)
    }
  })

  it('throws on horizon < 1', () => {
    expect(() => retentionCurve({ a: 1, b: 0.5 }, 0)).toThrow()
  })
})
