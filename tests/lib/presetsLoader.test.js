import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  normalizePresetsBundle,
  variantForPeriod,
} from '../../src/lib/presetsLoader.js'

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), 'docs/presets.json'), 'utf8'),
)

describe('normalizePresetsBundle (unified schema v2.0)', () => {
  const bundle = normalizePresetsBundle(raw)
  const byId = Object.fromEntries(bundle.presets.map((p) => [p.id, p]))

  it('returns 14 presets (7 session + 7 subscription)', () => {
    expect(bundle.presets).toHaveLength(14)
  })

  it('preserves bundle metadata', () => {
    expect(bundle.schemaVersion).toBe('2.0')
    expect(bundle.tierLegend).toBeTruthy()
    expect(bundle.periodLegend).toBeTruthy()
  })

  it('maps preset.id → methodology anchor for every vertical', () => {
    expect(byId.igaming_casino.methodologyAnchor).toBe('1-igaming--online-casino')
    expect(byId.mobile_hyper_casual.methodologyAnchor).toBe(
      '3-mobile-games--hyper-casual',
    )
    expect(byId.subs_utilities.methodologyAnchor).toBe(
      '1-utilities-vpn-cleaners-scanners',
    )
    expect(byId.subs_ai_companions.methodologyAnchor).toBe(
      '7-ai-companions--chatbots',
    )
  })

  it('session presets have day-only cadence and empty funnel', () => {
    const sessionIds = [
      'igaming_casino',
      'igaming_sportsbook',
      'mobile_hyper_casual',
      'mobile_casual',
      'mobile_midcore',
      'ecommerce',
      'fintech',
    ]
    for (const id of sessionIds) {
      const p = byId[id]
      expect(p.cadenceDefault).toBe('day')
      expect(p.cadenceSupported).toEqual(['day'])
      for (const v of Object.values(p.variants)) {
        expect(v.funnel).toEqual([])
        expect(Object.keys(v.retentionPoints)).toEqual(['day'])
      }
    }
  })

  it('subscription presets carry an install→trial→paid funnel', () => {
    const v = byId.subs_utilities.variants['median|tier_1']
    expect(v.funnel).toHaveLength(2)
    expect(v.funnel[0]).toMatchObject({
      label: 'Install → Trial',
      conversionPct: 8.6,
    })
    expect(v.funnel[1]).toMatchObject({
      label: 'Trial → Paid',
      conversionPct: 35,
    })
  })

  it('subs_utilities exposes both week and month retention; cadence_supported reflects that', () => {
    const p = byId.subs_utilities
    expect(p.cadenceDefault).toBe('week')
    expect(p.cadenceSupported.sort()).toEqual(['month', 'week'])

    const v = p.variants['median|tier_1']
    expect(v.retentionPoints.month).toEqual([
      { t: 1, r: 0.5 },
      { t: 3, r: 0.32 },
      { t: 6, r: 0.22 },
      { t: 12, r: 0.12 },
    ])
    expect(v.retentionPoints.week).toEqual([
      { t: 1, r: 0.58 },
      { t: 2, r: 0.44 },
      { t: 4, r: 0.31 },
      { t: 8, r: 0.18 },
      { t: 12, r: 0.12 },
      { t: 26, r: 0.07 },
    ])
    expect(v.arpuPerPeriod).toEqual({ month: 12, week: 7.5 })
  })

  it('annual-dominant subs (e.g. lifestyle) keep month-only data', () => {
    const p = byId.subs_lifestyle_wellness
    expect(p.cadenceDefault).toBe('month')
    expect(p.cadenceSupported).toEqual(['month'])
    const v = p.variants['median|tier_1']
    expect(Object.keys(v.retentionPoints)).toEqual(['month'])
  })

  it('iGaming variant has correct day retention points and CAC per acquired (per-FTD)', () => {
    const v = byId.igaming_casino.variants['top_quartile|tier_1']
    expect(v.retentionPoints.day).toEqual([
      { t: 1, r: 0.6 },
      { t: 7, r: 0.45 },
      { t: 30, r: 0.35 },
      { t: 90, r: 0.22 },
    ])
    expect(v.arpuPerPeriod).toEqual({ day: 10 })
    expect(v.cacPerAcquired).toBe(115)
    expect(v.display.cac_per_ftd).toBe(115)
    expect(v.display.arpu_monthly).toBe(300)
  })

  it('mobile games (arpdau) flatten into arpu_per_period.day', () => {
    const v = byId.mobile_hyper_casual.variants['top_quartile|tier_1']
    expect(v.arpuPerPeriod.day).toBe(0.15)
    expect(v.cacPerAcquired).toBe(1.5)
    expect(v.display.arpdau).toBe(0.15)
    expect(v.display.cpi_blended).toBe(1.5)
  })

  it('preserves data quality fields and warnings', () => {
    expect(byId.mobile_hyper_casual.dataQuality).toBe('robust')
    expect(byId.fintech.dataQuality).toBe('moderate')
    expect(byId.igaming_casino.dataQuality).toBe('estimated')
    expect(byId.subs_utilities.qualityWarning).toContain('weekly')
  })

  it('every variant has retention points sorted ascending by t', () => {
    for (const p of bundle.presets) {
      for (const v of Object.values(p.variants)) {
        for (const points of Object.values(v.retentionPoints)) {
          const ts = points.map((pt) => pt.t)
          expect(ts).toEqual([...ts].sort((a, b) => a - b))
          expect(ts.length).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it('every variant resolves to non-null arpu and cac for its default period', () => {
    for (const p of bundle.presets) {
      const period = p.cadenceDefault
      for (const [key, v] of Object.entries(p.variants)) {
        expect(
          v.arpuPerPeriod[period],
          `${p.id}/${key} arpu for ${period}`,
        ).not.toBeNull()
        expect(v.cacPerAcquired, `${p.id}/${key} cac`).not.toBeNull()
      }
    }
  })

  it('subscription presets surface examples list', () => {
    expect(byId.subs_utilities.examples).toContain('NordVPN')
    expect(byId.subs_language_learning.examples.length).toBeGreaterThan(0)
  })

  it('session presets have empty examples (no field in raw data)', () => {
    expect(byId.igaming_casino.examples).toEqual([])
  })
})

describe('variantForPeriod', () => {
  const bundle = normalizePresetsBundle(raw)
  const byId = Object.fromEntries(bundle.presets.map((p) => [p.id, p]))

  it('returns slice for a supported period', () => {
    const v = byId.subs_utilities.variants['median|tier_1']
    const slice = variantForPeriod(v, 'week')
    expect(slice).not.toBeNull()
    expect(slice.retentionPoints[0].t).toBe(1)
    expect(slice.arpuPerPeriod).toBe(7.5)
    expect(slice.cacPerAcquired).toBe(2.1)
    expect(slice.funnel).toHaveLength(2)
  })

  it('returns null when the variant has no data for the requested period', () => {
    const v = byId.igaming_casino.variants['top_quartile|tier_1']
    expect(variantForPeriod(v, 'week')).toBeNull()
    expect(variantForPeriod(v, 'month')).toBeNull()
    expect(variantForPeriod(v, 'day')).not.toBeNull()
  })

  it('returns null on missing variant', () => {
    expect(variantForPeriod(null, 'day')).toBeNull()
    expect(variantForPeriod(undefined, 'month')).toBeNull()
  })
})
