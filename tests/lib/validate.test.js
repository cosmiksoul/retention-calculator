import { describe, it, expect } from 'vitest'
import {
  validateRetentionPoints,
  validateNumericInputs,
} from '../../src/lib/validate.js'

const okPoints = () => [
  { id: 'a', t: 1, percent: 40 },
  { id: 'b', t: 7, percent: 20 },
  { id: 'c', t: 14, percent: 15 },
  { id: 'd', t: 30, percent: 10 },
]

describe('validateRetentionPoints', () => {
  it('passes a clean monotonic 4-point set', () => {
    const r = validateRetentionPoints(okPoints())
    expect(r.valid).toBe(true)
    expect(r.byId.size).toBe(0)
    expect(r.formError).toBeNull()
  })

  it('requires at least 3 points', () => {
    const r = validateRetentionPoints([
      { id: 'a', t: 1, percent: 40 },
      { id: 'b', t: 7, percent: 20 },
    ])
    expect(r.valid).toBe(false)
    expect(r.formError).toMatch(/at least 3/i)
  })

  it('flags retention > 100', () => {
    const pts = okPoints()
    pts[0].percent = 120
    const r = validateRetentionPoints(pts)
    expect(r.valid).toBe(false)
    expect(r.byId.get('a')).toMatch(/0–100/)
  })

  it('flags retention < 0', () => {
    const pts = okPoints()
    pts[1].percent = -5
    const r = validateRetentionPoints(pts)
    expect(r.byId.get('b')).toMatch(/0–100/)
  })

  it('flags non-positive or non-integer t', () => {
    const r = validateRetentionPoints([
      { id: 'a', t: 0, percent: 40 },
      { id: 'b', t: 7, percent: 20 },
      { id: 'c', t: 14, percent: 10 },
    ])
    expect(r.byId.get('a')).toMatch(/positive integer/)

    const r2 = validateRetentionPoints([
      { id: 'a', t: 1.5, percent: 40 },
      { id: 'b', t: 7, percent: 20 },
      { id: 'c', t: 14, percent: 10 },
    ])
    expect(r2.byId.get('a')).toMatch(/positive integer/)
  })

  it('flags duplicate periods', () => {
    const r = validateRetentionPoints([
      { id: 'a', t: 7, percent: 30 },
      { id: 'b', t: 7, percent: 25 },
      { id: 'c', t: 14, percent: 10 },
    ])
    expect(r.valid).toBe(false)
    expect(r.byId.get('b')).toMatch(/Duplicate/)
  })

  it('flags non-monotonic retention', () => {
    const r = validateRetentionPoints([
      { id: 'a', t: 1, percent: 30 },
      { id: 'b', t: 7, percent: 40 },        // grew
      { id: 'c', t: 14, percent: 20 },
    ])
    expect(r.valid).toBe(false)
    expect(r.byId.get('b')).toMatch(/cannot grow/)
  })

  it('does not flag monotonicity if there are already row errors', () => {
    const r = validateRetentionPoints([
      { id: 'a', t: 1, percent: 200 },         // out of range
      { id: 'b', t: 7, percent: 50 },
      { id: 'c', t: 14, percent: 10 },
    ])
    expect(r.byId.get('a')).toMatch(/0–100/)
    expect(r.byId.get('b')).toBeUndefined()
  })
})

describe('validateNumericInputs', () => {
  const ok = { cohortSize: 1000, arpu: 2, cac: 10, horizon: 180 }

  it('passes a clean baseline', () => {
    expect(validateNumericInputs(ok).valid).toBe(true)
  })

  it('CAC empty/null is allowed', () => {
    expect(validateNumericInputs({ ...ok, cac: null }).valid).toBe(true)
    expect(validateNumericInputs({ ...ok, cac: '' }).valid).toBe(true)
    expect(validateNumericInputs({ ...ok, cac: undefined }).valid).toBe(true)
  })

  it('rejects non-positive cohort size', () => {
    expect(validateNumericInputs({ ...ok, cohortSize: 0 }).errors.cohortSize).toBeTruthy()
    expect(validateNumericInputs({ ...ok, cohortSize: -1 }).errors.cohortSize).toBeTruthy()
  })

  it('rejects negative ARPU', () => {
    expect(validateNumericInputs({ ...ok, arpu: -1 }).errors.arpu).toBeTruthy()
  })

  it('requires integer horizon ≥ 1', () => {
    expect(validateNumericInputs({ ...ok, horizon: 0 }).errors.horizon).toBeTruthy()
    expect(validateNumericInputs({ ...ok, horizon: 1.5 }).errors.horizon).toBeTruthy()
  })
})
