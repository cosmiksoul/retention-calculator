import { describe, it, expect } from 'vitest'
import { ltvSeries, ltvBand, breakevenDay } from '../../src/lib/ltv.js'
import { fitPowerLaw } from '../../src/lib/powerLaw.js'

describe('ltvSeries', () => {
  it('with R(t)=1 (a=1, b=0) cumLtv = arpu * t', () => {
    const series = ltvSeries({ a: 1, b: 0 }, 5, 4)
    expect(series.map((p) => p.cumLtv)).toEqual([5, 10, 15, 20])
    expect(series.map((p) => p.retention)).toEqual([1, 1, 1, 1])
    expect(series.map((p) => p.revenue)).toEqual([5, 5, 5, 5])
  })

  it('cumLtv is monotonically non-decreasing', () => {
    const series = ltvSeries({ a: 0.5, b: 0.5 }, 2, 60)
    for (let i = 1; i < series.length; i++) {
      expect(series[i].cumLtv).toBeGreaterThanOrEqual(series[i - 1].cumLtv - 1e-12)
    }
  })

  it('returns horizon-length array', () => {
    expect(ltvSeries({ a: 1, b: 0.5 }, 1, 30)).toHaveLength(30)
  })

  it('throws on invalid horizon or arpu', () => {
    expect(() => ltvSeries({ a: 1, b: 0.5 }, 1, 0)).toThrow()
    expect(() => ltvSeries({ a: 1, b: 0.5 }, NaN, 10)).toThrow()
  })
})

describe('breakevenDay', () => {
  // R(t)=1 ⇒ cumLtv at t = arpu * t = 5, 10, 15, 20, ...
  const flat = ltvSeries({ a: 1, b: 0 }, 5, 50)

  it('finds first day where cumLtv >= cac', () => {
    expect(breakevenDay(flat, 12)).toBe(3)   // 15 >= 12
    expect(breakevenDay(flat, 10)).toBe(2)
    expect(breakevenDay(flat, 5)).toBe(1)
  })

  it('returns null when CAC is never reached', () => {
    expect(breakevenDay(flat, 1000)).toBeNull()
  })

  it('returns null when CAC is missing or non-finite', () => {
    expect(breakevenDay(flat, null)).toBeNull()
    expect(breakevenDay(flat, undefined)).toBeNull()
    expect(breakevenDay(flat, NaN)).toBeNull()
    expect(breakevenDay(flat, Infinity)).toBeNull()
  })

  it('returns 1 when CAC <= 0', () => {
    expect(breakevenDay(flat, 0)).toBe(1)
    expect(breakevenDay(flat, -5)).toBe(1)
  })

  it('handles decaying retention', () => {
    // Geometric-ish: cumLtv grows but slowly
    const series = ltvSeries({ a: 0.6, b: 0.5 }, 2, 365)
    const be = breakevenDay(series, 10)
    expect(be).not.toBeNull()
    expect(series[be - 1].cumLtv).toBeGreaterThanOrEqual(10)
    if (be > 1) expect(series[be - 2].cumLtv).toBeLessThan(10)
  })
})

describe('ltvBand', () => {
  const fit = fitPowerLaw([
    { t: 1, r: 0.42 },
    { t: 7, r: 0.18 },
    { t: 14, r: 0.13 },
    { t: 30, r: 0.06 },
    { t: 60, r: 0.04 },
  ])

  it('upper >= mid LTV >= lower at every t', () => {
    const mid = ltvSeries(fit, 2, 90)
    const band = ltvBand(fit, 2, 90)
    for (let i = 0; i < band.length; i++) {
      expect(band[i].upper).toBeGreaterThanOrEqual(mid[i].cumLtv - 1e-9)
      expect(band[i].lower).toBeLessThanOrEqual(mid[i].cumLtv + 1e-9)
    }
  })

  it('both edges are monotonically non-decreasing', () => {
    const band = ltvBand(fit, 2, 180)
    for (let i = 1; i < band.length; i++) {
      expect(band[i].upper).toBeGreaterThanOrEqual(band[i - 1].upper - 1e-12)
      expect(band[i].lower).toBeGreaterThanOrEqual(band[i - 1].lower - 1e-12)
    }
  })
})
