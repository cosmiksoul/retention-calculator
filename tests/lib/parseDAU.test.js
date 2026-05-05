import { describe, it, expect } from 'vitest'
import { parseDAUTable } from '../../src/lib/parseDAU.js'

describe('parseDAUTable', () => {
  it('parses TSV with named columns (Date / New Users / DAU)', () => {
    const text = `Date\tNew Users\tDAU
2026-04-01\t150\t1200
2026-04-02\t140\t1180
2026-04-03\t160\t1210
2026-04-04\t155\t1230`
    const r = parseDAUTable(text)
    expect(r.errors).toEqual([])
    expect(r.rows).toHaveLength(4)
    expect(r.newUsers).toEqual([150, 140, 160, 155])
    expect(r.dau).toEqual([1200, 1180, 1210, 1230])
    expect(r.dates[0]).toBe('2026-04-01')
  })

  it('handles columns in any order via header recognition', () => {
    const text = `DAU,Date,Installs
1200,2026-04-01,150
1180,2026-04-02,140
1210,2026-04-03,160
1230,2026-04-04,155`
    const r = parseDAUTable(text)
    expect(r.errors).toEqual([])
    expect(r.newUsers).toEqual([150, 140, 160, 155])
    expect(r.dau).toEqual([1200, 1180, 1210, 1230])
  })

  it('falls back to positional layout when no header is recognized', () => {
    const text = `2026-04-01,150,1200
2026-04-02,140,1180
2026-04-03,160,1210
2026-04-04,155,1230`
    const r = parseDAUTable(text)
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => /No header row/.test(w))).toBe(true)
    expect(r.newUsers).toEqual([150, 140, 160, 155])
  })

  it('rejects rows where new_users or DAU cannot be parsed', () => {
    const text = `Date,New Users,DAU
2026-04-01,150,1200
2026-04-02,foo,1180
2026-04-03,160,1210
2026-04-04,155,1230`
    const r = parseDAUTable(text)
    expect(r.errors[0]).toMatch(/Row 3/)
  })

  it('detects semicolon separator and strips thousands separators', () => {
    const text = `Date;New Users;DAU
2026-04-01;1,200;5,400
2026-04-02;1,180;5,200
2026-04-03;1,210;5,500
2026-04-04;1,300;5,800`
    const r = parseDAUTable(text)
    expect(r.errors).toEqual([])
    expect(r.separator).toBe(';')
    expect(r.newUsers[0]).toBe(1200)
    expect(r.dau[0]).toBe(5400)
  })

  it('errors when too few rows', () => {
    const text = `Date,New Users,DAU
2026-04-01,150,1200
2026-04-02,140,1180`
    const r = parseDAUTable(text)
    expect(r.errors.join(' ')).toMatch(/at least one header/i)
  })
})
