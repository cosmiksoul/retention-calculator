import { describe, it, expect } from 'vitest'
import { bucketRevenue } from '../../src/lib/revenueBuckets.js'

function flatSeries(N, revPerDay = 1) {
  return Array.from({ length: N }, (_, i) => ({ t: i + 1, revenue: revPerDay }))
}

describe('bucketRevenue', () => {
  it('partitions a 30-day flat series into D1, D2-7, D8-14, D15-30', () => {
    const r = bucketRevenue(flatSeries(30), 30)
    expect(r.map((b) => b.label)).toEqual(['D1', 'D2–7', 'D8–14', 'D15–30'])
    expect(r.map((b) => b.revenue)).toEqual([1, 6, 7, 16])
    // Sum equals the total
    expect(r.reduce((s, b) => s + b.revenue, 0)).toBe(30)
  })

  it('clamps the last bucket to horizon', () => {
    const r = bucketRevenue(flatSeries(45), 45)
    const last = r[r.length - 1]
    expect(last.from).toBe(31)
    expect(last.to).toBe(45)
    expect(last.label).toBe('D31–45')
    expect(last.revenue).toBe(15)
  })

  it('stops at horizon — does not emit empty trailing buckets', () => {
    const r = bucketRevenue(flatSeries(7), 7)
    expect(r.map((b) => b.label)).toEqual(['D1', 'D2–7'])
  })

  it('horizon=1 produces a single D1 bucket', () => {
    const r = bucketRevenue(flatSeries(1), 1)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ label: 'D1', from: 1, to: 1, revenue: 1 })
  })

  it('extends to D365 for long horizons', () => {
    const r = bucketRevenue(flatSeries(365), 365)
    expect(r[r.length - 1].label).toBe('D181–365')
    expect(r[r.length - 1].revenue).toBe(185)
  })

  it('returns [] for an empty series', () => {
    expect(bucketRevenue([], 30)).toEqual([])
  })

  it('uses the actual series.revenue values, not 1s', () => {
    const series = [
      { t: 1, revenue: 2 },
      { t: 2, revenue: 1.5 },
      { t: 3, revenue: 1 },
      { t: 4, revenue: 0.8 },
      { t: 5, revenue: 0.6 },
      { t: 6, revenue: 0.5 },
      { t: 7, revenue: 0.4 },
    ]
    const r = bucketRevenue(series, 7)
    expect(r[0].revenue).toBeCloseTo(2, 9)
    expect(r[1].revenue).toBeCloseTo(1.5 + 1 + 0.8 + 0.6 + 0.5 + 0.4, 9)
  })
})
