import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizePresetsBundle } from '../../src/lib/presetsLoader.js'

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), 'docs/presets.json'), 'utf8'),
)

describe('normalizePresetsBundle', () => {
  const bundle = normalizePresetsBundle(raw)
  const byId = Object.fromEntries(bundle.presets.map((p) => [p.id, p]))

  it('returns 7 presets', () => {
    expect(bundle.presets).toHaveLength(7)
  })

  it('preserves bundle metadata', () => {
    expect(bundle.schemaVersion).toBe('1.0')
    expect(bundle.tierLegend).toBeTruthy()
  })

  it('maps preset.id → methodology anchor for every vertical', () => {
    expect(byId.igaming_casino.methodologyAnchor).toBe('1-igaming--online-casino')
    expect(byId.igaming_sportsbook.methodologyAnchor).toBe('2-igaming--sportsbook')
    expect(byId.mobile_hyper_casual.methodologyAnchor).toBe('3-mobile-games--hyper-casual')
    expect(byId.mobile_casual.methodologyAnchor).toBe('4-mobile-games--casual-match-3-puzzle-lifestyle')
    expect(byId.mobile_midcore.methodologyAnchor).toBe('5-mobile-games--midcore-strategy-rpg-shooter')
    expect(byId.ecommerce.methodologyAnchor).toBe('6-e-commerce-mobile--web-shopping')
    expect(byId.fintech.methodologyAnchor).toBe('7-fintech--banking-apps')
  })

  it('normalizes mobile games arpdau → arpuPerDay and cpi_blended → cac', () => {
    const v = byId.mobile_hyper_casual.variants['top_quartile|tier_1']
    expect(v.arpuPerDay).toBe(0.15)
    expect(v.cac).toBe(1.5)
    expect(v.display.arpdau).toBe(0.15)        // raw kept for display
    expect(v.display.cpi_blended).toBe(1.5)
  })

  it('normalizes iGaming cac_per_ftd → cac and keeps arpu_per_day', () => {
    const v = byId.igaming_casino.variants['top_quartile|tier_1']
    expect(v.arpuPerDay).toBe(10.0)
    expect(v.cac).toBe(115)
    expect(v.display.cac_per_ftd).toBe(115)
    expect(v.display.arpu_monthly).toBe(300)
  })

  it('keeps e-commerce/fintech cac and arpu_per_day untouched', () => {
    const ecom = byId.ecommerce.variants['median|tier_1']
    expect(ecom.arpuPerDay).toBe(0.55)
    expect(ecom.cac).toBe(90)

    const fin = byId.fintech.variants['top_quartile|tier_1']
    expect(fin.arpuPerDay).toBe(0.28)
    expect(fin.cac).toBe(20)
  })

  it('converts retention percent → fraction in retentionPoints', () => {
    const v = byId.igaming_casino.variants['top_quartile|tier_1']
    const d1 = v.retentionPoints.find((p) => p.t === 1)
    const d90 = v.retentionPoints.find((p) => p.t === 90)
    expect(d1.r).toBeCloseTo(0.6, 9)
    expect(d90.r).toBeCloseTo(0.22, 9)
    // raw % is preserved separately for the table view
    expect(v.retention.D1).toBe(60)
  })

  it('preserves data quality fields', () => {
    expect(byId.mobile_hyper_casual.dataQuality).toBe('robust')
    expect(byId.fintech.dataQuality).toBe('moderate')
    expect(byId.igaming_casino.dataQuality).toBe('estimated')
    expect(byId.mobile_hyper_casual.qualityWarning).toContain('hyper-casual')
  })

  it('every variant has retentionPoints sorted ascending by t', () => {
    for (const p of bundle.presets) {
      for (const v of Object.values(p.variants)) {
        const ts = v.retentionPoints.map((pt) => pt.t)
        expect(ts).toEqual([...ts].sort((a, b) => a - b))
        expect(ts.length).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('every variant resolves to non-null arpuPerDay and cac', () => {
    for (const p of bundle.presets) {
      for (const [key, v] of Object.entries(p.variants)) {
        expect(v.arpuPerDay, `${p.id}/${key} arpuPerDay`).not.toBeNull()
        expect(v.cac, `${p.id}/${key} cac`).not.toBeNull()
      }
    }
  })
})
