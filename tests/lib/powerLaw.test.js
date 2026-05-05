import { describe, it, expect } from 'vitest'
import {
  fitPowerLaw,
  predict,
  retentionCurve,
  retentionBand,
  extrapolationLevel,
} from '../../src/lib/powerLaw.js'

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

describe('retentionBand', () => {
  // Take a noisy fit so SE > 0
  const noisyPoints = [
    { t: 1, r: 0.42 },
    { t: 7, r: 0.18 },
    { t: 14, r: 0.13 },
    { t: 30, r: 0.06 },
    { t: 60, r: 0.04 },
  ]
  const fit = fitPowerLaw(noisyPoints)

  it('upper >= predict >= lower at every t', () => {
    const band = retentionBand(fit, 90)
    for (const { t, lower, upper } of band) {
      const p = predict(t, fit)
      expect(upper).toBeGreaterThanOrEqual(p - 1e-12)
      expect(lower).toBeLessThanOrEqual(p + 1e-12)
    }
  })

  it('log-width grows monotonically with t (uncertainty compounds in log space)', () => {
    // Linear width can narrow at large t because both edges decay to 0;
    // the meaningful "uncertainty" grows in log space, since
    //   log(upper/lower) = 2 · se · log(t).
    const band = retentionBand(fit, 365)
    let prevLog = 0
    for (const { upper, lower } of band) {
      if (upper <= 0 || lower <= 0) continue
      const w = Math.log(upper) - Math.log(lower)
      expect(w).toBeGreaterThanOrEqual(prevLog - 1e-12)
      prevLog = w
    }
  })

  it('caps lower at 0 and upper at 1', () => {
    const band = retentionBand(fit, 365)
    for (const { lower, upper } of band) {
      expect(lower).toBeGreaterThanOrEqual(0)
      expect(upper).toBeLessThanOrEqual(1 + 1e-12)
    }
  })

  it('±2σ band is wider than ±1σ at every t (when se > 0)', () => {
    const band1 = retentionBand(fit, 90, 1)
    const band2 = retentionBand(fit, 90, 2)
    for (let i = 0; i < band1.length; i++) {
      const w1 = band1[i].upper - band1[i].lower
      const w2 = band2[i].upper - band2[i].lower
      // Allow equality when both upper edges saturate at 1 — there's no slack
      // for the 2σ envelope to stretch further.
      expect(w2).toBeGreaterThanOrEqual(w1 - 1e-12)
    }
    // And strictly wider at points away from the t=1 origin where capping
    // doesn't dominate.
    const idx = band1.findIndex((p) => p.t === 30)
    expect(band2[idx].upper - band2[idx].lower).toBeGreaterThan(
      band1[idx].upper - band1[idx].lower,
    )
  })

  it('throws on non-positive kSigma', () => {
    expect(() => retentionBand(fit, 30, 0)).toThrow()
    expect(() => retentionBand(fit, 30, -1)).toThrow()
  })

  it('collapses to predict when SE=0 (only 2 points)', () => {
    const exactFit = fitPowerLaw([
      { t: 1, r: 0.4 },
      { t: 7, r: 0.2 },
    ])
    expect(exactFit.se).toBe(0)
    const band = retentionBand(exactFit, 30)
    for (const { t, lower, upper } of band) {
      const p = predict(t, exactFit)
      expect(upper).toBeCloseTo(Math.min(1, p), 12)
      expect(lower).toBeCloseTo(p, 12)
    }
  })
})

describe('extrapolationLevel', () => {
  it('flags severe extrapolation past 10× last point', () => {
    expect(extrapolationLevel(30, 365)).toBe('severe')   // 12.2×
    expect(extrapolationLevel(7, 90)).toBe('severe')     // 12.8×
  })

  it('flags caution between 3× and 10×', () => {
    expect(extrapolationLevel(30, 120)).toBe('caution')  // 4×
    expect(extrapolationLevel(30, 300)).toBe('caution')  // 10×
  })

  it('returns none within 3×', () => {
    expect(extrapolationLevel(30, 90)).toBe('none')      // 3×
    expect(extrapolationLevel(30, 60)).toBe('none')
  })

  it('handles invalid inputs without crashing', () => {
    expect(extrapolationLevel(0, 30)).toBe('none')
    expect(extrapolationLevel(-1, 30)).toBe('none')
    expect(extrapolationLevel(30, 0)).toBe('none')
  })
})
