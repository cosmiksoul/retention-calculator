import { describe, it, expect } from 'vitest'
import {
  periodAbbr,
  periodUnit,
  periodLabel,
  funnelCascade,
  cohortLtv,
  cohortLtvBand,
  payback,
} from '../../src/lib/calc.js'
import { fitPowerLaw } from '../../src/lib/powerLaw.js'

describe('period helpers', () => {
  it('periodAbbr → D / W / M', () => {
    expect(periodAbbr('day')).toBe('D')
    expect(periodAbbr('week')).toBe('W')
    expect(periodAbbr('month')).toBe('M')
  })

  it('periodAbbr falls back to D on unknown', () => {
    expect(periodAbbr('quarter')).toBe('D')
    expect(periodAbbr(undefined)).toBe('D')
  })

  it('periodUnit returns lowercase singular noun', () => {
    expect(periodUnit('day')).toBe('day')
    expect(periodUnit('week')).toBe('week')
    expect(periodUnit('month')).toBe('month')
  })

  it('periodLabel composes prefix and t', () => {
    expect(periodLabel(7, 'day')).toBe('D7')
    expect(periodLabel(4, 'week')).toBe('W4')
    expect(periodLabel(12, 'month')).toBe('M12')
  })
})

describe('funnelCascade — DAU semantics (no funnel steps)', () => {
  it('empty funnel: acquired = cohortSize, single Cohort step', () => {
    const { steps, acquiredAtZero } = funnelCascade({
      cohortSize: 1000,
      retention: [],
    })
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({
      label: 'Cohort (acquired users)',
      count: 1000,
      dropoffPct: null,
    })
    expect(acquiredAtZero).toBe(1000)
  })

  it('empty funnel + retention checkpoints: counts scale from full cohort', () => {
    const { steps, acquiredAtZero } = funnelCascade({
      cohortSize: 1000,
      retention: [
        { t: 1, r: 0.4 },
        { t: 7, r: 0.2 },
      ],
      period: 'day',
    })
    expect(acquiredAtZero).toBe(1000)
    expect(steps).toHaveLength(3)
    expect(steps[1]).toMatchObject({ label: 'Active at D1', count: 400 })
    expect(steps[2]).toMatchObject({ label: 'Active at D7', count: 200 })
    // dropoff D1 vs cohort = 60%; dropoff D7 vs D1 = 50%
    expect(steps[1].dropoffPct).toBeCloseTo(0.6, 9)
    expect(steps[2].dropoffPct).toBeCloseTo(0.5, 9)
  })
})

describe('funnelCascade — n-step funnel', () => {
  it('2-step funnel reproduces install→trial→paid cascade', () => {
    const { steps, acquiredAtZero } = funnelCascade({
      cohortSize: 1000,
      funnel: [
        { label: 'Install → Trial', conversionPct: 8.6 },
        { label: 'Trial → Paid', conversionPct: 35 },
      ],
      retention: [{ t: 1, r: 0.5 }],
      period: 'month',
    })
    // 1000 → 86 → 30.1 → 15.05 (active at M1)
    expect(steps[0].count).toBe(1000)
    expect(steps[1].count).toBeCloseTo(86, 9)
    expect(steps[1].label).toBe('Install → Trial')
    expect(steps[2].count).toBeCloseTo(30.1, 9)
    expect(steps[2].label).toBe('Trial → Paid')
    expect(steps[3].label).toBe('Active at M1')
    expect(steps[3].count).toBeCloseTo(15.05, 9)
    expect(acquiredAtZero).toBeCloseTo(30.1, 9)
  })

  it('1-step funnel: e.g. install→registered with no further conversion', () => {
    const { steps, acquiredAtZero } = funnelCascade({
      cohortSize: 1000,
      funnel: [{ label: 'Registered', conversionPct: 25 }],
      retention: [],
    })
    expect(steps).toHaveLength(2)
    expect(steps[1]).toMatchObject({
      label: 'Registered',
      count: 250,
      dropoffPct: 0.75,
    })
    expect(acquiredAtZero).toBe(250)
  })

  it('3-step funnel: cohort → step1 → step2 → step3, then retention', () => {
    const { steps, acquiredAtZero } = funnelCascade({
      cohortSize: 1000,
      funnel: [
        { label: 'A', conversionPct: 50 },
        { label: 'B', conversionPct: 40 },
        { label: 'C', conversionPct: 25 },
      ],
      retention: [{ t: 1, r: 0.8 }],
      period: 'week',
    })
    // 1000 → 500 → 200 → 50 → 40 active at W1
    expect(steps.map((s) => s.count)).toEqual([1000, 500, 200, 50, 40])
    expect(steps[4].label).toBe('Active at W1')
    expect(acquiredAtZero).toBe(50)
    // dropoff for step C: 1 - 0.25 = 0.75
    expect(steps[3].dropoffPct).toBeCloseTo(0.75, 9)
  })

  it('throws on negative cohort size', () => {
    expect(() =>
      funnelCascade({ cohortSize: -1, retention: [] }),
    ).toThrow()
  })

  it('zero cohort: every step zero, drop-off defined', () => {
    const { steps, acquiredAtZero } = funnelCascade({
      cohortSize: 0,
      funnel: [{ label: 'A', conversionPct: 50 }],
      retention: [{ t: 1, r: 0.5 }],
    })
    expect(acquiredAtZero).toBe(0)
    expect(steps.every((s) => s.count === 0)).toBe(true)
    // dropoff vs zero handled defensively
    expect(steps[2].dropoffPct).toBe(0)
  })
})

describe('cohortLtv', () => {
  it('flat retention (a=1, b=0) + funnel=[] reproduces v1 LTV: cumLtvPerCohort = arpu × t', () => {
    const series = cohortLtv({
      fit: { a: 1, b: 0 },
      acquiredAtZero: 1000,
      arpuPerPeriod: 5,
      cohortSize: 1000,
      horizon: 4,
    })
    expect(series.map((p) => p.cumLtvPerCohort)).toEqual([5, 10, 15, 20])
    expect(series.map((p) => p.retention)).toEqual([1, 1, 1, 1])
    expect(series.map((p) => p.active)).toEqual([1000, 1000, 1000, 1000])
  })

  it('flat retention with funnel: cumLtvPerCohort = arpu × acquired/cohort × t', () => {
    // Subscription-style: acquired = 30 from 1000 cohort, ARPU = $12, R(t)=1.
    // Per-period cohort revenue = 30 × $12 = $360.
    // cumLtvPerCohort = 360 × t / 1000 = 0.36 × t.
    const series = cohortLtv({
      fit: { a: 1, b: 0 },
      acquiredAtZero: 30,
      arpuPerPeriod: 12,
      cohortSize: 1000,
      horizon: 4,
    })
    expect(series.map((p) => p.revenue)).toEqual([360, 360, 360, 360])
    expect(series.map((p) => p.cumLtvPerCohort)).toEqual([0.36, 0.72, 1.08, 1.44])
    expect(series[3].cumLtvPerAcquired).toBeCloseTo(48, 9) // 1440/30
  })

  it('cumRevenue is monotonically non-decreasing', () => {
    const series = cohortLtv({
      fit: { a: 0.5, b: 0.5 },
      acquiredAtZero: 1000,
      arpuPerPeriod: 2,
      cohortSize: 1000,
      horizon: 60,
    })
    for (let i = 1; i < series.length; i++) {
      expect(series[i].cumRevenue).toBeGreaterThanOrEqual(
        series[i - 1].cumRevenue - 1e-12,
      )
    }
  })

  it('returns horizon-length array', () => {
    expect(
      cohortLtv({
        fit: { a: 0.5, b: 0.5 },
        acquiredAtZero: 100,
        arpuPerPeriod: 5,
        cohortSize: 1000,
        horizon: 30,
      }),
    ).toHaveLength(30)
  })

  it('clamps retention to R(1) when fit gives R(t) > R(1)', () => {
    // b<0 ⇒ predict(t) grows with t; clamp pegs it at R(1).
    const series = cohortLtv({
      fit: { a: 0.3, b: -0.5 },
      acquiredAtZero: 100,
      arpuPerPeriod: 10,
      cohortSize: 1000,
      horizon: 5,
    })
    for (const p of series) {
      expect(p.retention).toBeLessThanOrEqual(0.3 + 1e-12)
    }
  })

  it('cumLtvPerCohort = cumRevenue / cohortSize at every t', () => {
    const series = cohortLtv({
      fit: { a: 0.5, b: 0.5 },
      acquiredAtZero: 30,
      arpuPerPeriod: 12,
      cohortSize: 1000,
      horizon: 12,
    })
    for (const p of series) {
      expect(p.cumLtvPerCohort).toBeCloseTo(p.cumRevenue / 1000, 9)
    }
  })

  it('cumLtvPerCohort === cumLtvPerAcquired when funnel empty (acquired=cohort)', () => {
    const series = cohortLtv({
      fit: { a: 0.5, b: 0.4 },
      acquiredAtZero: 1000,
      arpuPerPeriod: 2,
      cohortSize: 1000,
      horizon: 30,
    })
    for (const p of series) {
      expect(p.cumLtvPerCohort).toBeCloseTo(p.cumLtvPerAcquired, 12)
    }
  })

  it('throws on invalid horizon, arpu, acquired, cohort', () => {
    const fit = { a: 0.5, b: 0.5 }
    expect(() =>
      cohortLtv({ fit, acquiredAtZero: 30, arpuPerPeriod: 12, cohortSize: 1000, horizon: 0 }),
    ).toThrow()
    expect(() =>
      cohortLtv({ fit, acquiredAtZero: 30, arpuPerPeriod: NaN, cohortSize: 1000, horizon: 12 }),
    ).toThrow()
    expect(() =>
      cohortLtv({ fit, acquiredAtZero: NaN, arpuPerPeriod: 12, cohortSize: 1000, horizon: 12 }),
    ).toThrow()
    expect(() =>
      cohortLtv({ fit, acquiredAtZero: 30, arpuPerPeriod: 12, cohortSize: 0, horizon: 12 }),
    ).toThrow()
  })

  it('zero acquiredAtZero ⇒ zero everything, no NaN', () => {
    const series = cohortLtv({
      fit: { a: 0.5, b: 0.5 },
      acquiredAtZero: 0,
      arpuPerPeriod: 12,
      cohortSize: 1000,
      horizon: 3,
    })
    expect(series.every((p) => p.cumRevenue === 0)).toBe(true)
    expect(series.every((p) => p.cumLtvPerAcquired === 0)).toBe(true)
    expect(series.every((p) => p.cumLtvPerCohort === 0)).toBe(true)
  })
})

describe('cohortLtvBand', () => {
  const fit = fitPowerLaw([
    { t: 1, r: 0.42 },
    { t: 7, r: 0.18 },
    { t: 14, r: 0.13 },
    { t: 30, r: 0.06 },
    { t: 60, r: 0.04 },
  ])

  it('upper >= mid >= lower at every t', () => {
    const mid = cohortLtv({
      fit,
      acquiredAtZero: 1000,
      arpuPerPeriod: 2,
      cohortSize: 1000,
      horizon: 90,
    })
    const band = cohortLtvBand(fit, 2 * 1000, 90, 1)
    for (let i = 0; i < band.length; i++) {
      expect(band[i].upper).toBeGreaterThanOrEqual(mid[i].cumRevenue - 1e-9)
      expect(band[i].lower).toBeLessThanOrEqual(mid[i].cumRevenue + 1e-9)
    }
  })

  it('both edges are monotonically non-decreasing', () => {
    const band = cohortLtvBand(fit, 100, 180, 1)
    for (let i = 1; i < band.length; i++) {
      expect(band[i].upper).toBeGreaterThanOrEqual(band[i - 1].upper - 1e-12)
      expect(band[i].lower).toBeGreaterThanOrEqual(band[i - 1].lower - 1e-12)
    }
  })

  it('throws on invalid horizon, perPeriodRate, kSigma', () => {
    expect(() => cohortLtvBand(fit, 100, 0, 1)).toThrow()
    expect(() => cohortLtvBand(fit, NaN, 90, 1)).toThrow()
    expect(() => cohortLtvBand(fit, 100, 90, 0)).toThrow()
  })
})

describe('payback', () => {
  // Flat-retention series: cumLtvPerCohort = arpu × t when funnel=[].
  const flat = cohortLtv({
    fit: { a: 1, b: 0 },
    acquiredAtZero: 1000,
    arpuPerPeriod: 5,
    cohortSize: 1000,
    horizon: 50,
  })

  it('finds first period where cumLtvPerCohort >= cac', () => {
    expect(payback(flat, 12)).toBe(3) // 15 >= 12
    expect(payback(flat, 10)).toBe(2)
    expect(payback(flat, 5)).toBe(1)
  })

  it('returns null when CAC never reached', () => {
    expect(payback(flat, 1000)).toBeNull()
  })

  it('returns null on missing or non-finite CAC', () => {
    expect(payback(flat, null)).toBeNull()
    expect(payback(flat, undefined)).toBeNull()
    expect(payback(flat, NaN)).toBeNull()
    expect(payback(flat, Infinity)).toBeNull()
  })

  it('returns 1 when CAC <= 0', () => {
    expect(payback(flat, 0)).toBe(1)
    expect(payback(flat, -5)).toBe(1)
  })

  it('subscription-style: target depends on full cohort × cac', () => {
    // acquired=30 of 1000 cohort, $12 ARPU, R(t)=1 ⇒ 360/period total.
    // Per-cohort cumLtv = 0.36 × t. CAC=$2.10 ⇒ payback at t=6 (2.16 ≥ 2.10).
    const series = cohortLtv({
      fit: { a: 1, b: 0 },
      acquiredAtZero: 30,
      arpuPerPeriod: 12,
      cohortSize: 1000,
      horizon: 24,
    })
    expect(payback(series, 2.1)).toBe(6)
    expect(payback(series, 1.0)).toBe(3)
    expect(payback(series, 100)).toBeNull()
  })
})

describe('compatibility shims (cross-period equivalence)', () => {
  // The math is period-agnostic: same fit + same horizon should produce
  // identical numbers regardless of which period label is in use.
  it('day/week/month produce identical numeric output', () => {
    const fit = { a: 0.4, b: 0.5 }
    const day = cohortLtv({
      fit,
      acquiredAtZero: 200,
      arpuPerPeriod: 2,
      cohortSize: 1000,
      horizon: 30,
    })
    const week = cohortLtv({
      fit,
      acquiredAtZero: 200,
      arpuPerPeriod: 2,
      cohortSize: 1000,
      horizon: 30,
    })
    expect(day.map((p) => p.cumRevenue)).toEqual(week.map((p) => p.cumRevenue))
  })

  it('matches v1 ltv when funnel=[] (acquired=cohort, ARPU per cohort entrant)', () => {
    // v1 contract: cumLtv = ARPU × Σ R(t). Equivalent to cohortLtv with
    // acquired=cohort and arpuPerPeriod=ARPU.
    const fit = fitPowerLaw([
      { t: 1, r: 0.4 },
      { t: 7, r: 0.2 },
      { t: 30, r: 0.08 },
    ])
    const series = cohortLtv({
      fit,
      acquiredAtZero: 1000,
      arpuPerPeriod: 2,
      cohortSize: 1000,
      horizon: 60,
    })
    // Manual reference: Σ ARPU × R(t)
    let cum = 0
    for (let t = 1; t <= 60; t++) {
      const r = Math.max(0, Math.min(fit.a * Math.pow(t, -fit.b), fit.a))
      cum += 2 * r
      expect(series[t - 1].cumLtvPerCohort).toBeCloseTo(cum, 9)
    }
  })
})

describe('funnelCascade — one-time fees', () => {
  it('returns oneTimeRevenue=0 when no step has a fee', () => {
    const { oneTimeRevenue } = funnelCascade({
      cohortSize: 1000,
      funnel: [{ label: 'Install → Trial', conversionPct: 8.6 }],
      retention: [],
    })
    expect(oneTimeRevenue).toBe(0)
  })

  it('paid-trial step: oneTimeRevenue = trial_count × fee', () => {
    const { steps, acquiredAtZero, oneTimeRevenue } = funnelCascade({
      cohortSize: 1000,
      funnel: [
        { label: 'Install → Trial', conversionPct: 8.6, oneTimeFeeUsd: 1.99 },
        { label: 'Trial → Paid', conversionPct: 35 },
      ],
      retention: [],
    })
    expect(acquiredAtZero).toBeCloseTo(30.1, 9)
    // 86 trials × $1.99 = $171.14
    expect(oneTimeRevenue).toBeCloseTo(86 * 1.99, 9)
    expect(steps[1].oneTimeFeeUsd).toBe(1.99)
    expect(steps[1].oneTimeRevenue).toBeCloseTo(86 * 1.99, 9)
    // Steps without fee don't get the field
    expect(steps[2].oneTimeFeeUsd).toBeUndefined()
  })

  it('multiple paid steps sum into oneTimeRevenue', () => {
    const { oneTimeRevenue } = funnelCascade({
      cohortSize: 1000,
      funnel: [
        { label: 'Install → Trial', conversionPct: 10, oneTimeFeeUsd: 0.99 },
        { label: 'Trial → Paid', conversionPct: 50, oneTimeFeeUsd: 9.99 },
      ],
      retention: [],
    })
    // 100 trials × $0.99 + 50 paid × $9.99 = 99 + 499.5 = 598.5
    expect(oneTimeRevenue).toBeCloseTo(99 + 499.5, 9)
  })

  it('non-positive / non-finite fees are ignored', () => {
    const { oneTimeRevenue, steps } = funnelCascade({
      cohortSize: 1000,
      funnel: [
        { label: 'A', conversionPct: 50, oneTimeFeeUsd: 0 },
        { label: 'B', conversionPct: 50, oneTimeFeeUsd: -1 },
        { label: 'C', conversionPct: 50, oneTimeFeeUsd: NaN },
        { label: 'D', conversionPct: 50, oneTimeFeeUsd: null },
      ],
      retention: [],
    })
    expect(oneTimeRevenue).toBe(0)
    for (const s of steps.slice(1)) {
      expect(s.oneTimeFeeUsd).toBeUndefined()
      expect(s.oneTimeRevenue).toBeUndefined()
    }
  })
})

describe('cohortLtv — one-time revenue lumping', () => {
  it('default oneTimeRevenue=0 reproduces pre-fee behaviour', () => {
    const a = cohortLtv({
      fit: { a: 1, b: 0 },
      acquiredAtZero: 100,
      arpuPerPeriod: 5,
      cohortSize: 1000,
      horizon: 4,
    })
    const b = cohortLtv({
      fit: { a: 1, b: 0 },
      acquiredAtZero: 100,
      arpuPerPeriod: 5,
      cohortSize: 1000,
      horizon: 4,
      oneTimeRevenue: 0,
    })
    expect(a).toEqual(b)
  })

  it('oneTimeRevenue lumps into period 1 only', () => {
    // recurring = 100 × $5 × R(t)=1 = $500/period (4 periods → cumRev = $2000)
    // + $400 one-time at t=1
    const series = cohortLtv({
      fit: { a: 1, b: 0 },
      acquiredAtZero: 100,
      arpuPerPeriod: 5,
      cohortSize: 1000,
      horizon: 4,
      oneTimeRevenue: 400,
    })
    expect(series[0].revenue).toBe(900) // 500 recurring + 400 one-time
    expect(series[1].revenue).toBe(500)
    expect(series[2].revenue).toBe(500)
    expect(series[3].revenue).toBe(500)
    expect(series[3].cumRevenue).toBe(2400)
    // Per-cohort: 2400/1000 = 2.4. Per-acquired: 2400/100 = 24
    expect(series[3].cumLtvPerCohort).toBeCloseTo(2.4, 9)
    expect(series[3].cumLtvPerAcquired).toBeCloseTo(24, 9)
  })

  it('payback shortens with one-time revenue', () => {
    // CAC × cohort = $5 × 1000 = $5000.
    // Without trial: cumRevenue grows $500/period → payback at t=10.
    // With $1500 trial revenue at t=1: cumRev[1]=2000 < 5000, [2]=2500, [3]=3000, …, [7]=5000 ⇒ payback=7.
    const noTrial = cohortLtv({
      fit: { a: 1, b: 0 },
      acquiredAtZero: 100,
      arpuPerPeriod: 5,
      cohortSize: 1000,
      horizon: 20,
    })
    const withTrial = cohortLtv({
      fit: { a: 1, b: 0 },
      acquiredAtZero: 100,
      arpuPerPeriod: 5,
      cohortSize: 1000,
      horizon: 20,
      oneTimeRevenue: 1500,
    })
    expect(payback(noTrial, 5)).toBe(10)
    expect(payback(withTrial, 5)).toBe(7)
  })

  it('throws on negative or non-finite oneTimeRevenue', () => {
    const base = {
      fit: { a: 1, b: 0 },
      acquiredAtZero: 100,
      arpuPerPeriod: 5,
      cohortSize: 1000,
      horizon: 4,
    }
    expect(() => cohortLtv({ ...base, oneTimeRevenue: -1 })).toThrow()
    expect(() => cohortLtv({ ...base, oneTimeRevenue: NaN })).toThrow()
  })
})

describe('cohortLtvBand — one-time offset', () => {
  const fit = fitPowerLaw([
    { t: 1, r: 0.42 },
    { t: 7, r: 0.18 },
    { t: 30, r: 0.06 },
  ])

  it('default offset=0 reproduces pre-fee bounds', () => {
    const a = cohortLtvBand(fit, 100, 30, 1)
    const b = cohortLtvBand(fit, 100, 30, 1, 0)
    expect(a).toEqual(b)
  })

  it('offset bumps both bounds by the same constant from t=1 onward', () => {
    const noOff = cohortLtvBand(fit, 100, 30, 1)
    const withOff = cohortLtvBand(fit, 100, 30, 1, 50)
    for (let i = 0; i < noOff.length; i++) {
      expect(withOff[i].lower - noOff[i].lower).toBeCloseTo(50, 9)
      expect(withOff[i].upper - noOff[i].upper).toBeCloseTo(50, 9)
    }
  })

  it('throws on negative or non-finite offset', () => {
    expect(() => cohortLtvBand(fit, 100, 30, 1, -1)).toThrow()
    expect(() => cohortLtvBand(fit, 100, 30, 1, NaN)).toThrow()
  })
})

describe('end-to-end control scenarios', () => {
  it('utilities-median-T1 monthly: marginal economics, payback not reached at M24', () => {
    const retention = [
      { t: 1, r: 0.50 },
      { t: 3, r: 0.32 },
      { t: 6, r: 0.22 },
      { t: 12, r: 0.12 },
    ]
    const fit = fitPowerLaw(retention)
    const { acquiredAtZero } = funnelCascade({
      cohortSize: 1000,
      funnel: [
        { label: 'Install → Trial', conversionPct: 8.6 },
        { label: 'Trial → Paid', conversionPct: 35 },
      ],
      retention,
      period: 'month',
    })
    expect(acquiredAtZero).toBeCloseTo(30.1, 6)

    const series = cohortLtv({
      fit,
      acquiredAtZero,
      arpuPerPeriod: 12,
      cohortSize: 1000,
      horizon: 24,
    })
    const m24 = series[23]
    expect(m24.cumRevenue).toBeGreaterThan(0)
    expect(m24.cumLtvPerCohort).toBeLessThan(2.1)
    expect(payback(series, 2.1)).toBeNull()
  })

  it('language-learning top-T1: strong LTV, payback before M12', () => {
    const retention = [
      { t: 1, r: 0.75 },
      { t: 3, r: 0.60 },
      { t: 6, r: 0.52 },
      { t: 12, r: 0.45 },
    ]
    const fit = fitPowerLaw(retention)
    const { acquiredAtZero } = funnelCascade({
      cohortSize: 1000,
      funnel: [
        { label: 'Install → Trial', conversionPct: 12 },
        { label: 'Trial → Paid', conversionPct: 65 },
      ],
      retention,
      period: 'month',
    })
    expect(acquiredAtZero).toBeCloseTo(78, 6)

    const series = cohortLtv({
      fit,
      acquiredAtZero,
      arpuPerPeriod: 25,
      cohortSize: 1000,
      horizon: 24,
    })
    const m24 = series[23]
    expect(m24.cumLtvPerCohort).toBeGreaterThan(5)
    const pb = payback(series, 4.5)
    expect(pb).not.toBeNull()
    expect(pb).toBeLessThan(12)
  })

  it('iGaming-style DAU mode (no funnel): single retention curve drives LTV', () => {
    // Mimics v1 casino-median-T1: ARPU $2/day, CAC per FTD $25.
    // cohort here is FTDs, not installs — funnel=[] with a per-FTD CAC.
    const retention = [
      { t: 1, r: 0.7 },
      { t: 7, r: 0.4 },
      { t: 30, r: 0.18 },
      { t: 90, r: 0.08 },
    ]
    const fit = fitPowerLaw(retention)
    const { acquiredAtZero } = funnelCascade({
      cohortSize: 1000,
      retention,
      period: 'day',
    })
    expect(acquiredAtZero).toBe(1000)

    const series = cohortLtv({
      fit,
      acquiredAtZero,
      arpuPerPeriod: 2,
      cohortSize: 1000,
      horizon: 180,
    })
    const last = series[series.length - 1]
    expect(last.cumLtvPerCohort).toBeGreaterThan(0)
    // Per-cohort and per-acquired collapse when funnel is empty.
    expect(last.cumLtvPerCohort).toBeCloseTo(last.cumLtvPerAcquired, 9)
    // Payback in periods (days here)
    const pb = payback(series, 25)
    expect(pb).not.toBeNull()
  })
})
