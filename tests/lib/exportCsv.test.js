import { describe, it, expect } from 'vitest'
import { buildCsv, buildFilename } from '../../src/lib/exportCsv.js'

const baseSnapshot = () => ({
  timestamp: '2026-05-05T17:30:00.000Z',
  mode: 'pure',
  presetLabel: 'Mobile Casual · median · Tier 1',
  bandSigma: 1,
  inputs: { arpuPerDay: 2, cac: 10, cohortSize: 1000, horizon: 3 },
  fit: { a: 1, b: 0.5, se: 0.02, rSquared: 0.95, n: 5 },
  kpi: { ltvAtHorizon: 4.5, beDay: 30, ltvCacRatio: 0.45, paybackDays: 30 },
  userPoints: [
    { t: 1, percent: 100 },
    { t: 7, percent: 35.5 },
  ],
  series: [
    { t: 1, retention: 1.0, revenue: 2.0, cumLtv: 2.0 },
    { t: 2, retention: 0.7, revenue: 1.4, cumLtv: 3.4 },
    { t: 3, retention: 0.55, revenue: 1.1, cumLtv: 4.5 },
  ],
})

describe('buildCsv', () => {
  it('emits sections in order: metadata, inputs, fit, KPIs, breakdown', () => {
    const out = buildCsv(baseSnapshot())
    expect(out).toMatch(/Retention & LTV Calculator export/)
    const sections = ['Inputs', 'Power-law fit', 'KPIs', 'Per-period breakdown']
    let prev = -1
    for (const s of sections) {
      const idx = out.indexOf(s)
      expect(idx).toBeGreaterThan(prev)
      prev = idx
    }
  })

  it('writes one row per day in the breakdown', () => {
    const out = buildCsv(baseSnapshot())
    // First column is "Day" then numeric rows 1..3
    expect(out).toMatch(/\n1,100\.00,/)
    expect(out).toMatch(/\n2,,70\.00,/)
    expect(out).toMatch(/\n3,,55\.00,/)
  })

  it('includes LTV/CAC column only when CAC > 0', () => {
    const withCac = buildCsv(baseSnapshot())
    expect(withCac).toMatch(/LTV \/ CAC/)
    const noCac = buildCsv({
      ...baseSnapshot(),
      inputs: { arpuPerDay: 2, cac: null, cohortSize: 1000, horizon: 3 },
      kpi: { ltvAtHorizon: 4.5, beDay: null, ltvCacRatio: null, paybackDays: null },
    })
    expect(noCac).not.toMatch(/LTV \/ CAC/)
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

  it('omits breakeven / payback rows when not provided', () => {
    const out = buildCsv({
      ...baseSnapshot(),
      kpi: { ltvAtHorizon: 4.5, beDay: null, ltvCacRatio: null, paybackDays: null },
    })
    expect(out).not.toMatch(/^Breakeven,/m)
    expect(out).not.toMatch(/^Payback,/m)
    expect(out).toMatch(/Predicted LTV @ D3/)
  })

  it('marks user-input rows with a percent value, fit-only rows leave it blank', () => {
    const out = buildCsv(baseSnapshot())
    const lines = out.split('\n')
    const dayRows = lines.filter((l) => /^\d+,/.test(l))
    expect(dayRows[0]).toMatch(/^1,100\.00,/) // user point at t=1
    expect(dayRows[1]).toMatch(/^2,,/) // no user point at t=2
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
