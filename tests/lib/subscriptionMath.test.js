import { describe, it, expect } from 'vitest'
import {
  cadenceLabel,
  cadenceUnit,
  funnelCascade,
  subscriptionLtv,
  subscriptionPayback,
} from '../../src/lib/subscriptionMath.js'
import { fitPowerLaw } from '../../src/lib/powerLaw.js'

describe('cadenceLabel / cadenceUnit', () => {
  it('formats month / week prefixes correctly', () => {
    expect(cadenceLabel(1, 'monthly')).toBe('M1')
    expect(cadenceLabel(12, 'monthly')).toBe('M12')
    expect(cadenceLabel(1, 'weekly')).toBe('W1')
    expect(cadenceLabel(26, 'weekly')).toBe('W26')
  })

  it('returns lowercase singular unit', () => {
    expect(cadenceUnit('monthly')).toBe('month')
    expect(cadenceUnit('weekly')).toBe('week')
  })
})

describe('funnelCascade', () => {
  const baseRetention = [
    { t: 1, r: 0.5 },
    { t: 3, r: 0.32 },
    { t: 6, r: 0.22 },
    { t: 12, r: 0.12 },
  ]

  it('computes monthly cascade with utilities-median-T1 numbers', () => {
    const { steps, payingAtZero } = funnelCascade({
      cohortSize: 1000,
      installToTrial: 0.086,
      trialToPaid: 0.35,
      retention: baseRetention,
      cadence: 'monthly',
    })
    // Installs → 1000, trials = 1000 * 0.086 = 86, paying@0 = 86 * 0.35 = 30.1
    expect(steps[0]).toMatchObject({ label: 'Installs', count: 1000, dropoffPct: null })
    expect(steps[1].count).toBeCloseTo(86, 6)
    expect(steps[2].count).toBeCloseTo(30.1, 6)
    expect(steps[2].label).toBe('Paying users (month 0)')
    expect(payingAtZero).toBeCloseTo(30.1, 6)
  })

  it('appends one step per retention checkpoint with cadence-aware label', () => {
    const { steps } = funnelCascade({
      cohortSize: 1000,
      installToTrial: 0.086,
      trialToPaid: 0.35,
      retention: baseRetention,
      cadence: 'monthly',
    })
    expect(steps).toHaveLength(3 + baseRetention.length)
    expect(steps.slice(3).map((s) => s.label)).toEqual([
      'Active at M1',
      'Active at M3',
      'Active at M6',
      'Active at M12',
    ])
  })

  it('uses W-prefixed labels in weekly cadence', () => {
    const { steps } = funnelCascade({
      cohortSize: 1000,
      installToTrial: 0.086,
      trialToPaid: 0.35,
      retention: [{ t: 1, r: 0.58 }, { t: 4, r: 0.31 }],
      cadence: 'weekly',
    })
    expect(steps[2].label).toBe('Paying users (week 0)')
    expect(steps.slice(3).map((s) => s.label)).toEqual([
      'Active at W1',
      'Active at W4',
    ])
  })

  it('drop-off percentage equals 1 minus the conversion ratio', () => {
    const { steps } = funnelCascade({
      cohortSize: 1000,
      installToTrial: 0.086,
      trialToPaid: 0.35,
      retention: baseRetention,
      cadence: 'monthly',
    })
    // step 1: trials, dropoff = 1 - 0.086 = 0.914
    expect(steps[1].dropoffPct).toBeCloseTo(0.914, 6)
    // step 2: paying, dropoff vs trials = 1 - 0.35 = 0.65
    expect(steps[2].dropoffPct).toBeCloseTo(0.65, 6)
    // step 3: M1 active = paying * 0.5 → drop vs paying = 0.5
    expect(steps[3].dropoffPct).toBeCloseTo(0.5, 6)
    // step 4: M3 active = paying * 0.32 → drop vs M1 (0.5) = 1 - 0.32/0.5 = 0.36
    expect(steps[4].dropoffPct).toBeCloseTo(0.36, 6)
  })

  it('handles empty retention array — funnel stops at paying@0', () => {
    const { steps, payingAtZero } = funnelCascade({
      cohortSize: 1000,
      installToTrial: 0.086,
      trialToPaid: 0.35,
      retention: [],
    })
    expect(steps).toHaveLength(3)
    expect(payingAtZero).toBeCloseTo(30.1, 6)
  })

  it('zero cohort: every step is zero, drop-off still defined', () => {
    const { steps, payingAtZero } = funnelCascade({
      cohortSize: 0,
      installToTrial: 0.086,
      trialToPaid: 0.35,
      retention: baseRetention,
    })
    expect(payingAtZero).toBe(0)
    expect(steps.every((s) => s.count === 0)).toBe(true)
    // Drop-off vs zero = 0 (handled defensively)
    expect(steps[3].dropoffPct).toBe(0)
  })

  it('throws on negative cohort size', () => {
    expect(() =>
      funnelCascade({ cohortSize: -1, installToTrial: 0.1, trialToPaid: 0.3, retention: [] }),
    ).toThrow()
  })
})

describe('subscriptionLtv', () => {
  it('with R(t)=1 (a=1, b=0): cumLtv = arpu × paying@0 × t', () => {
    const series = subscriptionLtv({
      fit: { a: 1, b: 0 },
      payingAtZero: 30,
      arpuPaid: 12,
      cohortSize: 1000,
      horizon: 4,
    })
    // R(t)=1, paying = 30, revenue/cycle = 30*12 = 360
    expect(series.map((p) => p.revenue)).toEqual([360, 360, 360, 360])
    expect(series.map((p) => p.cumRevenue)).toEqual([360, 720, 1080, 1440])
    expect(series[3].cumLtvPerInstall).toBeCloseTo(1.44, 6) // 1440 / 1000
    expect(series[3].cumLtvPerPayingUser).toBeCloseTo(48, 6) // 1440 / 30
  })

  it('cumRevenue is monotonically non-decreasing', () => {
    const series = subscriptionLtv({
      fit: { a: 0.5, b: 0.5 },
      payingAtZero: 30,
      arpuPaid: 12,
      cohortSize: 1000,
      horizon: 24,
    })
    for (let i = 1; i < series.length; i++) {
      expect(series[i].cumRevenue).toBeGreaterThanOrEqual(series[i - 1].cumRevenue - 1e-12)
    }
  })

  it('returns horizon-length array', () => {
    expect(
      subscriptionLtv({
        fit: { a: 0.5, b: 0.5 },
        payingAtZero: 30,
        arpuPaid: 12,
        cohortSize: 1000,
        horizon: 26,
      }),
    ).toHaveLength(26)
  })

  it('clamps retention to R(1) when fit gives R(t) > R(1)', () => {
    // Degenerate fit with b=-0.5: predict(t, fit) grows with t.
    // R(1) = 0.3 * 1^0.5 = 0.3; without clamp R(2) = 0.3 * 2^0.5 ≈ 0.424.
    // We expect retention to be capped at 0.3.
    const series = subscriptionLtv({
      fit: { a: 0.3, b: -0.5 },
      payingAtZero: 30,
      arpuPaid: 12,
      cohortSize: 1000,
      horizon: 5,
    })
    for (const p of series) {
      expect(p.retention).toBeLessThanOrEqual(0.3 + 1e-12)
    }
  })

  it('cumLtvPerInstall = cumRevenue / cohortSize at every t', () => {
    const series = subscriptionLtv({
      fit: { a: 0.5, b: 0.5 },
      payingAtZero: 30,
      arpuPaid: 12,
      cohortSize: 1000,
      horizon: 12,
    })
    for (const p of series) {
      expect(p.cumLtvPerInstall).toBeCloseTo(p.cumRevenue / 1000, 9)
    }
  })

  it('cumLtvPerPayingUser = cumRevenue / payingAtZero', () => {
    const series = subscriptionLtv({
      fit: { a: 0.5, b: 0.5 },
      payingAtZero: 30,
      arpuPaid: 12,
      cohortSize: 1000,
      horizon: 12,
    })
    for (const p of series) {
      expect(p.cumLtvPerPayingUser).toBeCloseTo(p.cumRevenue / 30, 9)
    }
  })

  it('payingUsers = payingAtZero × retention', () => {
    const series = subscriptionLtv({
      fit: { a: 0.5, b: 0.5 },
      payingAtZero: 30,
      arpuPaid: 12,
      cohortSize: 1000,
      horizon: 6,
    })
    for (const p of series) {
      expect(p.payingUsers).toBeCloseTo(30 * p.retention, 9)
    }
  })

  it('throws on invalid horizon, arpu, payingAtZero, cohortSize', () => {
    const fit = { a: 0.5, b: 0.5 }
    expect(() =>
      subscriptionLtv({ fit, payingAtZero: 30, arpuPaid: 12, cohortSize: 1000, horizon: 0 }),
    ).toThrow()
    expect(() =>
      subscriptionLtv({ fit, payingAtZero: 30, arpuPaid: NaN, cohortSize: 1000, horizon: 12 }),
    ).toThrow()
    expect(() =>
      subscriptionLtv({ fit, payingAtZero: NaN, arpuPaid: 12, cohortSize: 1000, horizon: 12 }),
    ).toThrow()
    expect(() =>
      subscriptionLtv({ fit, payingAtZero: 30, arpuPaid: 12, cohortSize: 0, horizon: 12 }),
    ).toThrow()
  })

  it('zero payingAtZero gives zero cumLtvPerPayingUser without dividing by zero', () => {
    const series = subscriptionLtv({
      fit: { a: 0.5, b: 0.5 },
      payingAtZero: 0,
      arpuPaid: 12,
      cohortSize: 1000,
      horizon: 3,
    })
    expect(series.every((p) => p.cumLtvPerPayingUser === 0)).toBe(true)
    expect(series.every((p) => p.cumRevenue === 0)).toBe(true)
  })
})

describe('subscriptionPayback', () => {
  // Constant series: revenue/cycle = paying × arpu = 30 * 12 = 360.
  // With cohort=1000 and CAC=$2.10, target = $2,100. Payback at cycle 6 (cum=2160).
  const flatSeries = subscriptionLtv({
    fit: { a: 1, b: 0 },
    payingAtZero: 30,
    arpuPaid: 12,
    cohortSize: 1000,
    horizon: 24,
  })

  it('finds first cycle where cumRevenue >= cohort × cac', () => {
    expect(subscriptionPayback(flatSeries, 1000, 2.1)).toBe(6) // 6×360=2160 ≥ 2100
    expect(subscriptionPayback(flatSeries, 1000, 1.0)).toBe(3) // 3×360=1080 ≥ 1000
  })

  it('returns null when CAC never reached at horizon', () => {
    expect(subscriptionPayback(flatSeries, 1000, 100)).toBeNull()
  })

  it('returns null on missing or non-finite CAC', () => {
    expect(subscriptionPayback(flatSeries, 1000, null)).toBeNull()
    expect(subscriptionPayback(flatSeries, 1000, undefined)).toBeNull()
    expect(subscriptionPayback(flatSeries, 1000, NaN)).toBeNull()
    expect(subscriptionPayback(flatSeries, 1000, Infinity)).toBeNull()
  })

  it('returns 1 when CAC <= 0', () => {
    expect(subscriptionPayback(flatSeries, 1000, 0)).toBe(1)
    expect(subscriptionPayback(flatSeries, 1000, -5)).toBe(1)
  })
})

describe('end-to-end: control presets reproduce sensible numbers', () => {
  // Three control scenarios from spec-v2 §8 DoD. We verify invariants
  // (positive, monotonic, finite) and rough magnitude — exact LTV depends
  // on OLS-fit precision so we use loose bounds rather than fixed values.

  it('utilities-median-T1 (monthly): marginal economics — LTV/install < CAC, payback not reached', () => {
    // Median utilities at $2.10 CAC is intentionally a borderline case:
    // ~3% effective install→paying penetration × $12 ARPU × decaying retention
    // does not cover acquisition cost over 24 months. Calculator should
    // surface this as "Not reached" — the test pins that behaviour.
    const retention = [
      { t: 1, r: 0.50 },
      { t: 3, r: 0.32 },
      { t: 6, r: 0.22 },
      { t: 12, r: 0.12 },
    ]
    const fit = fitPowerLaw(retention)
    const { payingAtZero } = funnelCascade({
      cohortSize: 1000,
      installToTrial: 0.086,
      trialToPaid: 0.35,
      retention,
      cadence: 'monthly',
    })
    expect(payingAtZero).toBeCloseTo(30.1, 6)

    const series = subscriptionLtv({
      fit,
      payingAtZero,
      arpuPaid: 12,
      cohortSize: 1000,
      horizon: 24,
    })
    const m24 = series[23]
    expect(m24.cumRevenue).toBeGreaterThan(0)
    expect(Number.isFinite(m24.cumLtvPerInstall)).toBe(true)
    // LTV per install < CAC at horizon — the headline finding for median utilities
    expect(m24.cumLtvPerInstall).toBeLessThan(2.1)
    // …and payback is not reached
    expect(subscriptionPayback(series, 1000, 2.1)).toBeNull()
  })

  it('language_learning top-T1 (monthly): high retention → strong LTV', () => {
    // From presets-subscription.json: install_to_trial 12%, trial_to_paid 65%,
    // M1 75 / M3 60 / M6 52 / M12 45, arpu_paid_monthly $25, cpi $4.5
    const retention = [
      { t: 1, r: 0.75 },
      { t: 3, r: 0.60 },
      { t: 6, r: 0.52 },
      { t: 12, r: 0.45 },
    ]
    const fit = fitPowerLaw(retention)
    const { payingAtZero } = funnelCascade({
      cohortSize: 1000,
      installToTrial: 0.12,
      trialToPaid: 0.65,
      retention,
    })
    expect(payingAtZero).toBeCloseTo(78, 6) // 1000 × 0.12 × 0.65

    const series = subscriptionLtv({
      fit,
      payingAtZero,
      arpuPaid: 25,
      cohortSize: 1000,
      horizon: 24,
    })
    const m24 = series[23]
    // Strong unit-economics: LTV/install should be > $5
    expect(m24.cumLtvPerInstall).toBeGreaterThan(5)
    const payback = subscriptionPayback(series, 1000, 4.5)
    expect(payback).not.toBeNull()
    expect(payback).toBeLessThan(12)
  })

  it('utilities-median-T1 (weekly): LTV grows monotonically over 26 weeks', () => {
    // Weekly variant of utilities median T1. Same marginal economics as the
    // monthly cadence (3% effective penetration), but tested in cadence=weekly
    // to confirm the math is cadence-agnostic. We assert monotonicity and
    // sane magnitudes — payback may or may not be reached depending on the
    // exact W26 horizon vs. flat tail.
    const retention = [
      { t: 1, r: 0.58 },
      { t: 2, r: 0.44 },
      { t: 4, r: 0.31 },
      { t: 8, r: 0.18 },
      { t: 12, r: 0.12 },
      { t: 26, r: 0.07 },
    ]
    const fit = fitPowerLaw(retention)
    const { payingAtZero } = funnelCascade({
      cohortSize: 1000,
      installToTrial: 0.086,
      trialToPaid: 0.35,
      retention,
      cadence: 'weekly',
    })
    expect(payingAtZero).toBeCloseTo(30.1, 6)

    const series = subscriptionLtv({
      fit,
      payingAtZero,
      arpuPaid: 7.5,
      cohortSize: 1000,
      horizon: 26,
    })
    const w26 = series[25]
    expect(w26.cumRevenue).toBeGreaterThan(0)
    expect(w26.cumLtvPerInstall).toBeGreaterThan(0.3)
    // Monotonicity check across the weekly series
    for (let i = 1; i < series.length; i++) {
      expect(series[i].cumRevenue).toBeGreaterThanOrEqual(series[i - 1].cumRevenue - 1e-12)
      expect(series[i].retention).toBeLessThanOrEqual(series[i - 1].retention + 1e-12)
    }
  })
})
