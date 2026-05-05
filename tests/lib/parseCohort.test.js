import { describe, it, expect } from 'vitest'
import { parseCohortTable } from '../../src/lib/parseCohort.js'

describe('parseCohortTable', () => {
  it('parses TSV with label column and absolute counts', () => {
    const text = `Cohort\tD0\tD1\tD7\tD30
2026-04-01\t1200\t480\t240\t108
2026-04-08\t980\t392\t196\t88
2026-04-15\t1100\t440\t220\t99`
    const r = parseCohortTable(text)
    expect(r.errors).toEqual([])
    expect(r.cohorts).toHaveLength(3)
    expect(r.cohorts[0].format).toBe('absolute')
    expect(r.cohorts[0].baseSize).toBe(1200)
    expect(r.cohorts[0].retentionPct[0]).toBeCloseTo(100, 6) // D0 = 100%
    expect(r.cohorts[0].retentionPct[1]).toBeCloseTo(40, 6) // 480/1200
    // averaging across the 3 cohorts at D1 ≈ 40% (each 40%)
    const d1 = r.periods.find((p) => p.t === 1)
    expect(d1.mean).toBeCloseTo(40, 6)
    expect(d1.n).toBe(3)
    // avgPoints excludes D0
    expect(r.avgPoints.map((p) => p.t)).toEqual([1, 7, 30])
  })

  it('parses CSV with no label column and percent values', () => {
    const text = `D0,D1,D7,D14,D30
100,40,20,15,10
100,42,22,16,11
100,38,19,14,9`
    const r = parseCohortTable(text)
    expect(r.errors).toEqual([])
    expect(r.hasLabelColumn).toBe(false)
    expect(r.cohorts[0].format).toBe('percent')
    expect(r.cohorts).toHaveLength(3)
    const d7 = r.periods.find((p) => p.t === 7)
    expect(d7.mean).toBeCloseTo((20 + 22 + 19) / 3, 6)
  })

  it('parses fractions (≤ 1.0) by multiplying by 100', () => {
    const text = `D1,D7,D30
0.40,0.20,0.10
0.42,0.22,0.11`
    const r = parseCohortTable(text)
    expect(r.errors).toEqual([])
    expect(r.cohorts[0].format).toBe('fraction')
    expect(r.cohorts[0].retentionPct[0]).toBeCloseTo(40, 6)
  })

  it('handles em-dash and "—" as null cells', () => {
    const text = `Cohort,D0,D1,D7,D14,D30
A,1000,400,200,—,-
B,1000,420,210,140,—
C,1000,380,190,130,90`
    const r = parseCohortTable(text)
    expect(r.errors).toEqual([])
    const d14 = r.periods.find((p) => p.t === 14)
    expect(d14.n).toBe(2) // A is null, B and C have values
    const d30 = r.periods.find((p) => p.t === 30)
    expect(d30.n).toBe(1) // only C
  })

  it('detects semicolon separator', () => {
    const text = `Cohort;D0;D1;D7;D14;D30
A;1000;400;200;130;90
B;1000;420;220;140;100
C;1000;380;190;120;80`
    const r = parseCohortTable(text)
    expect(r.errors).toEqual([])
    expect(r.separator).toBe(';')
    expect(r.cohorts).toHaveLength(3)
  })

  it('handles "Day N" period notation', () => {
    const text = `Cohort\tDay 0\tDay 1\tDay 7\tDay 30
A\t1000\t400\t200\t100
B\t1000\t380\t190\t90
C\t1000\t420\t210\t110`
    const r = parseCohortTable(text)
    expect(r.errors).toEqual([])
    expect(r.periods.map((p) => p.t)).toEqual([0, 1, 7, 30])
  })

  it('strips % from cell values', () => {
    const text = `D0,D1,D7,D30
100%,40%,20%,10%
100%,42%,22%,11%
100%,38%,19%,9%`
    const r = parseCohortTable(text)
    expect(r.errors).toEqual([])
    expect(r.cohorts[0].format).toBe('percent')
    expect(r.cohorts[0].retentionPct[1]).toBeCloseTo(40, 6)
  })

  it('errors on fewer than 2 cohort rows', () => {
    const text = `D0,D1,D7,D30
1000,400,200,100`
    const r = parseCohortTable(text)
    expect(r.avgPoints).toBeNull()
    expect(r.errors[0]).toMatch(/at least one header row/i)
  })

  it('errors on insufficient periods after averaging', () => {
    const text = `D0,D1
1000,400
1000,420
1000,380`
    const r = parseCohortTable(text)
    // only D0 and D1 → avgPoints excludes D0 → 1 point < 3
    expect(r.avgPoints).toBeNull()
    expect(r.errors.join(' ')).toMatch(/at least/i)
  })

  it('errors on non-period header column', () => {
    const text = `Cohort,Active,Banana,Cherry
A,1,2,3
B,1,2,3
C,1,2,3`
    const r = parseCohortTable(text)
    expect(r.avgPoints).toBeNull()
    expect(r.errors[0]).toMatch(/period label/)
  })

  it('warns when cohort sizes vary > 3×', () => {
    const text = `Cohort\tD0\tD1\tD7\tD30
Small\t100\t40\t20\t10
Big\t1000\t400\t200\t100
Mid\t300\t120\t60\t30`
    const r = parseCohortTable(text)
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => /vary/i.test(w))).toBe(true)
  })

  it('warns when per-period dispersion is high (σ/μ > 0.5)', () => {
    // D7 retention: 5%, 60%, 30% — mean ≈ 31.67, σ ≈ 27.5, σ/μ ≈ 0.87
    const text = `Cohort\tD0\tD1\tD7\tD30
A\t1000\t400\t50\t10
B\t1000\t400\t600\t10
C\t1000\t400\t300\t10`
    const r = parseCohortTable(text)
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => /disagree/i.test(w))).toBe(true)
  })
})
