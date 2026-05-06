import { describe, it, expect } from 'vitest'
import { buildCsv, buildFilename } from '../../src/lib/exportCsv.js'

const baseSnapshot = () => ({
  timestamp: '2026-05-05T17:30:00.000Z',
  period: 'day',
  forecastMode: 'pure',
  presetLabel: 'Mobile Casual · median · Tier 1',
  bandSigma: 1,
  inputs: {
    arpuPerPeriod: 2,
    cac: 10,
    cohortSize: 1000,
    horizon: 3,
    funnel: [],
  },
  fit: { a: 1, b: 0.5, se: 0.02, rSquared: 0.95, n: 5 },
  kpi: {
    ltvAtHorizon: 4.5,
    payback: 30,
    ltvCacRatio: 0.45,
    horizonRetention: 0.55,
    acquiredAtZero: 1000,
  },
  userPoints: [
    { t: 1, percent: 100 },
    { t: 7, percent: 35.5 },
  ],
  series: [
    {
      t: 1, retention: 1.0, active: 1000,
      revenue: 2000, cumRevenue: 2000,
      cumLtvPerCohort: 2.0, cumLtvPerAcquired: 2.0,
    },
    {
      t: 2, retention: 0.7, active: 700,
      revenue: 1400, cumRevenue: 3400,
      cumLtvPerCohort: 3.4, cumLtvPerAcquired: 3.4,
    },
    {
      t: 3, retention: 0.55, active: 550,
      revenue: 1100, cumRevenue: 4500,
      cumLtvPerCohort: 4.5, cumLtvPerAcquired: 4.5,
    },
  ],
})

describe('buildCsv', () => {
  it('emits sections in order: metadata, inputs, fit, KPIs, breakdown', () => {
    const out = buildCsv(baseSnapshot())
    expect(out).toMatch(/Retention & LTV Calculator export/)
    const sections = ['Inputs', 'Power-law fit', 'KPIs', 'Per-day breakdown']
    let prev = -1
    for (const s of sections) {
      const idx = out.indexOf(s)
      expect(idx).toBeGreaterThan(prev)
      prev = idx
    }
  })

  it('writes one row per period with input retention shown only at user points', () => {
    const out = buildCsv(baseSnapshot())
    expect(out).toMatch(/\n1,100\.00,/)
    expect(out).toMatch(/\n2,,70\.00,/)
    expect(out).toMatch(/\n3,,55\.00,/)
  })

  it('includes LTV/CAC column only when CAC > 0', () => {
    const withCac = buildCsv(baseSnapshot())
    expect(withCac).toMatch(/LTV \/ CAC/)
    const noCac = buildCsv({
      ...baseSnapshot(),
      inputs: {
        arpuPerPeriod: 2,
        cac: null,
        cohortSize: 1000,
        horizon: 3,
        funnel: [],
      },
      kpi: {
        ltvAtHorizon: 4.5,
        payback: null,
        ltvCacRatio: null,
        horizonRetention: 0.55,
        acquiredAtZero: 1000,
      },
    })
    expect(noCac).not.toMatch(/LTV \/ CAC/)
  })

  it('includes per-acquired LTV column when funnel is present', () => {
    const sub = buildCsv({
      ...baseSnapshot(),
      period: 'month',
      inputs: {
        ...baseSnapshot().inputs,
        funnel: [
          { label: 'Install → Trial', conversionPct: 8.6 },
          { label: 'Trial → Paid', conversionPct: 35 },
        ],
      },
      kpi: { ...baseSnapshot().kpi, acquiredAtZero: 30.1 },
    })
    expect(sub).toMatch(/Cum LTV \/ acquired/)
    expect(sub).toMatch(/Funnel/)
    expect(sub).toMatch(/Install → Trial,8\.60,%/)
    expect(sub).toMatch(/Per-month breakdown/)
  })

  it('omits per-acquired LTV column when funnel is empty (DAU mode)', () => {
    const out = buildCsv(baseSnapshot())
    expect(out).not.toMatch(/Cum LTV \/ acquired/)
  })

  it('quotes cells that contain commas', () => {
    const out = buildCsv({
      ...baseSnapshot(),
      presetLabel: 'iGaming Casino, Tier 1, robust',
    })
    expect(out).toMatch(/"iGaming Casino, Tier 1, robust"/)
  })

  it('escapes embedded quotes by doubling them', () => {
    const out = buildCsv({
      ...baseSnapshot(),
      presetLabel: 'Custom "v2" preset',
    })
    expect(out).toMatch(/"Custom ""v2"" preset"/)
  })

  it('omits payback row when not provided', () => {
    const out = buildCsv({
      ...baseSnapshot(),
      kpi: {
        ltvAtHorizon: 4.5,
        payback: null,
        ltvCacRatio: null,
        horizonRetention: 0.55,
        acquiredAtZero: 1000,
      },
    })
    expect(out).not.toMatch(/^Payback,/m)
    expect(out).toMatch(/Predicted LTV @ D3/)
  })

  it('uses period-aware section headers and units', () => {
    const week = buildCsv({ ...baseSnapshot(), period: 'week' })
    expect(week).toMatch(/Per-week breakdown/)
    expect(week).toMatch(/Predicted LTV @ W3/)
    expect(week).toMatch(/\$\/week/)

    const month = buildCsv({ ...baseSnapshot(), period: 'month' })
    expect(month).toMatch(/Per-month breakdown/)
    expect(month).toMatch(/Predicted LTV @ M3/)
  })
})

describe('buildFilename', () => {
  it('encodes timestamp and preset slug', () => {
    const f = buildFilename({
      timestamp: '2026-05-05T17:30:00.000Z',
      presetLabel: 'Mobile Casual · median · Tier 1',
    })
    expect(f).toMatch(/^ltv-2026-05-05T17-30-mobile-casual-median-tier-1\.csv$/)
  })

  it('falls back to "manual" when no preset is selected', () => {
    const f = buildFilename({ timestamp: '2026-05-05T17:30:00.000Z', presetLabel: null })
    expect(f).toBe('ltv-2026-05-05T17-30-manual.csv')
  })
})
