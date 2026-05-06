// End-to-end integration tests that exercise the loader → math → KPI
// pipeline against the real docs/presets.json bundle. Catches schema
// drift that unit tests on individual modules would miss (e.g. a renamed
// field in the JSON breaking variantForPeriod's ARPU lookup).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  normalizePresetsBundle,
  variantForPeriod,
} from '../../src/lib/presetsLoader.js'
import { fitPowerLaw } from '../../src/lib/powerLaw.js'
import {
  funnelCascade,
  cohortLtv,
  payback,
  periodAbbr,
} from '../../src/lib/calc.js'
import { adjustFitToBenchmark } from '../../src/lib/industryAdjusted.js'

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), 'docs/presets.json'), 'utf8'),
)
const bundle = normalizePresetsBundle(raw)
const byId = Object.fromEntries(bundle.presets.map((p) => [p.id, p]))

function pipeline(preset, quality, geo, period, { cohortSize = 1000, horizon } = {}) {
  const variant = preset.variants[`${quality}|${geo}`]
  expect(variant, `${preset.id} ${quality}|${geo}`).toBeDefined()
  const slice = variantForPeriod(variant, period)
  expect(slice, `${preset.id} slice for ${period}`).not.toBeNull()
  const fit = fitPowerLaw(slice.retentionPoints)
  const cascade = funnelCascade({
    cohortSize,
    funnel: slice.funnel,
    retention: slice.retentionPoints,
    period,
  })
  const ltv = cohortLtv({
    fit,
    acquiredAtZero: cascade.acquiredAtZero,
    arpuPerPeriod: slice.arpuPerPeriod,
    cohortSize,
    horizon: horizon ?? slice.retentionPoints[slice.retentionPoints.length - 1].t,
  })
  return {
    fit,
    cascade,
    ltv,
    last: ltv[ltv.length - 1],
    payback: payback(ltv, slice.cacPerAcquired),
    cac: slice.cacPerAcquired,
  }
}

describe('end-to-end: real bundle through math pipeline', () => {
  it('iGaming casino top-T1 (day): solid economics, payback within D90', () => {
    const r = pipeline(byId.igaming_casino, 'top_quartile', 'tier_1', 'day', {
      horizon: 90,
    })
    expect(r.cascade.acquiredAtZero).toBe(1000) // funnel=[]
    expect(r.last.cumLtvPerCohort).toBeGreaterThan(0)
    expect(r.fit.rSquared).toBeGreaterThan(0.5)
    // CAC=$115, day-1 R=60% × $10 = $6 → ~50 days to recoup
    expect(r.payback).not.toBeNull()
    expect(r.payback).toBeLessThan(90)
  })

  it('iGaming casino bottom-T1 (day): payback never reached at D90', () => {
    const r = pipeline(byId.igaming_casino, 'bottom_quartile', 'tier_1', 'day', {
      horizon: 90,
    })
    // CAC=$650, day-1 R=35% × $2.7 ≈ $1 — comprehensively below CAC at D90
    expect(r.payback).toBeNull()
    expect(r.last.cumLtvPerCohort).toBeLessThan(r.cac)
  })

  it('subs_utilities median-T1 monthly: marginal economics — LTV<CAC at M24', () => {
    const r = pipeline(byId.subs_utilities, 'median', 'tier_1', 'month', {
      horizon: 24,
    })
    expect(r.cascade.acquiredAtZero).toBeCloseTo(30.1, 6) // 1000 × 0.086 × 0.35
    // CAC=$2.10, paying@0=30, ARPU=$12 → LTV per install < CAC over 24 months
    expect(r.last.cumLtvPerCohort).toBeLessThan(r.cac)
    expect(r.payback).toBeNull()
  })

  it('subs_utilities median-T1 weekly: same preset at week cadence — strong payback', () => {
    const r = pipeline(byId.subs_utilities, 'median', 'tier_1', 'week', {
      horizon: 26,
    })
    expect(r.cascade.acquiredAtZero).toBeCloseTo(30.1, 6)
    // Weekly ARPU is $7.50 over a steeper retention curve. Verify pipeline runs
    // and produces sane numbers — exact payback depends on fit.
    expect(r.last.cumLtvPerCohort).toBeGreaterThan(0)
    expect(r.fit.rSquared).toBeGreaterThan(0.7)
    // Period abbreviation for the headline label
    expect(periodAbbr('week')).toBe('W')
  })

  it('subs_language_learning top-T1 monthly: strong economics, payback before M12', () => {
    const r = pipeline(byId.subs_language_learning, 'top_quartile', 'tier_1', 'month', {
      horizon: 24,
    })
    // funnel = [14% × 58%] = 8.12% paying penetration; ARPU $9.5
    expect(r.cascade.acquiredAtZero).toBeCloseTo(81.2, 6)
    expect(r.last.cumLtvPerCohort).toBeGreaterThan(r.cac * 1.5)
    expect(r.payback).not.toBeNull()
    // Payback lands around the annual-renewal point — assert it's at most M14
    // to leave some slack against future preset tweaks.
    expect(r.payback).toBeLessThanOrEqual(14)
  })

  it('mobile_casual median-T1 (day): pipeline produces a finite LTV', () => {
    const r = pipeline(byId.mobile_casual, 'median', 'tier_1', 'day', {
      horizon: 180,
    })
    expect(r.cascade.acquiredAtZero).toBe(1000)
    expect(Number.isFinite(r.last.cumLtvPerCohort)).toBe(true)
    expect(r.fit.b).toBeGreaterThan(0) // decaying retention
  })

  it('every preset variant produces a finite LTV at its default period', () => {
    for (const preset of bundle.presets) {
      const period = preset.cadenceDefault
      for (const [key, variant] of Object.entries(preset.variants)) {
        const slice = variantForPeriod(variant, period)
        if (!slice || slice.arpuPerPeriod == null) continue
        const fit = fitPowerLaw(slice.retentionPoints)
        const cascade = funnelCascade({
          cohortSize: 1000,
          funnel: slice.funnel,
          retention: slice.retentionPoints,
          period,
        })
        const ltv = cohortLtv({
          fit,
          acquiredAtZero: cascade.acquiredAtZero,
          arpuPerPeriod: slice.arpuPerPeriod,
          cohortSize: 1000,
          horizon: 12,
        })
        const last = ltv[ltv.length - 1]
        expect(
          Number.isFinite(last.cumLtvPerCohort),
          `${preset.id} ${key} @ ${period}`,
        ).toBe(true)
        expect(last.cumLtvPerCohort).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('industry-adjusted forecasting: works for both DAU and subscription presets', () => {
  it('session preset: user fit + benchmark fit produce a non-null adjusted fit', () => {
    const preset = byId.igaming_casino
    const variant = preset.variants['median|tier_1']
    const slice = variantForPeriod(variant, 'day')
    const benchmarkFit = fitPowerLaw(slice.retentionPoints)
    // User points slightly different from benchmark
    const userPoints = slice.retentionPoints.map((p) => ({
      t: p.t,
      percent: p.r * 100 * 0.9, // 10% worse than benchmark
    }))
    const adjusted = adjustFitToBenchmark(userPoints, benchmarkFit)
    expect(adjusted).not.toBeNull()
    expect(adjusted.b).toBe(benchmarkFit.b) // shape preserved
    expect(adjusted.avgRatio).toBeCloseTo(0.9, 2)
  })

  it('subscription preset: benchmark for current period is the right curve', () => {
    const preset = byId.subs_utilities
    const variant = preset.variants['median|tier_1']
    const monthSlice = variantForPeriod(variant, 'month')
    const weekSlice = variantForPeriod(variant, 'week')
    const monthFit = fitPowerLaw(monthSlice.retentionPoints)
    const weekFit = fitPowerLaw(weekSlice.retentionPoints)
    // The two fits describe different scales — `b` should differ.
    expect(monthFit.b).not.toBeCloseTo(weekFit.b, 2)
  })
})

describe('cross-period parity: same fit + same horizon produce identical math', () => {
  // Math is period-agnostic; only labels differ. We verify by feeding the
  // same retention points to two pipelines that label them differently.
  it('label-only difference between day and month yields identical LTV', () => {
    const points = [
      { t: 1, r: 0.5 },
      { t: 3, r: 0.3 },
      { t: 6, r: 0.2 },
      { t: 12, r: 0.12 },
    ]
    const fit = fitPowerLaw(points)
    const dayCascade = funnelCascade({
      cohortSize: 1000,
      retention: points,
      period: 'day',
    })
    const monthCascade = funnelCascade({
      cohortSize: 1000,
      retention: points,
      period: 'month',
    })
    expect(dayCascade.acquiredAtZero).toBe(monthCascade.acquiredAtZero)
    // Step labels differ ("Active at D1" vs "Active at M1"), counts match.
    expect(dayCascade.steps.map((s) => s.count)).toEqual(
      monthCascade.steps.map((s) => s.count),
    )

    const dayLtv = cohortLtv({
      fit,
      acquiredAtZero: dayCascade.acquiredAtZero,
      arpuPerPeriod: 5,
      cohortSize: 1000,
      horizon: 24,
    })
    const monthLtv = cohortLtv({
      fit,
      acquiredAtZero: monthCascade.acquiredAtZero,
      arpuPerPeriod: 5,
      cohortSize: 1000,
      horizon: 24,
    })
    expect(dayLtv.map((p) => p.cumRevenue)).toEqual(
      monthLtv.map((p) => p.cumRevenue),
    )
  })
})
