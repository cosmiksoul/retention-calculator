import { describe, it, expect } from 'vitest'
import {
  deconvolveDAU,
  reconstructDAU,
  validateDAUInput,
} from '../../src/lib/deconvolution.js'

// Synthetic "ground truth" retention curve — power-law-ish, monotone non-increasing.
function trueR(N) {
  const R = new Array(N)
  R[0] = 1
  for (let t = 1; t < N; t++) R[t] = Math.max(0, 0.5 * Math.pow(t, -0.5))
  // monotonicity (already by construction)
  for (let t = 1; t < N; t++) if (R[t] > R[t - 1]) R[t] = R[t - 1]
  return R
}

function steadyAcquisition(N, baseline = 100) {
  return Array.from({ length: N }, () => baseline)
}

describe('reconstructDAU', () => {
  it('round-trips the convolution definition', () => {
    const newUsers = [100, 110, 90, 120]
    const R = [1, 0.4, 0.2, 0.1]
    const dau = reconstructDAU(newUsers, R)
    expect(dau[0]).toBeCloseTo(100, 9)                 // 100*1
    expect(dau[1]).toBeCloseTo(110 + 100 * 0.4, 9)     // = 150
    expect(dau[2]).toBeCloseTo(90 + 110 * 0.4 + 100 * 0.2, 9)
    expect(dau[3]).toBeCloseTo(120 + 90 * 0.4 + 110 * 0.2 + 100 * 0.1, 9)
  })
})

describe('deconvolveDAU', () => {
  it('recovers the true retention curve from clean synthetic DAU', () => {
    const N = 30
    const newUsers = steadyAcquisition(N)
    const R = trueR(N)
    const dau = reconstructDAU(newUsers, R)

    const recovered = deconvolveDAU(newUsers, dau)
    for (let t = 0; t < N; t++) {
      expect(recovered[t]).toBeCloseTo(R[t], 6)
    }
  })

  it('R[0] = 1 by construction', () => {
    const newUsers = steadyAcquisition(20)
    const R = trueR(20)
    const dau = reconstructDAU(newUsers, R)
    expect(deconvolveDAU(newUsers, dau)[0]).toBe(1)
  })

  it('output is non-increasing (no fake reactivation)', () => {
    const N = 30
    const newUsers = steadyAcquisition(N)
    const R = trueR(N)
    const dau = reconstructDAU(newUsers, R)
    // Inject noise so naive deconvolution would oscillate
    const noisy = dau.map((v, i) => v * (1 + (i % 2 === 0 ? 0.05 : -0.05)))
    const recovered = deconvolveDAU(newUsers, noisy)
    for (let t = 1; t < N; t++) {
      expect(recovered[t]).toBeLessThanOrEqual(recovered[t - 1] + 1e-12)
    }
  })

  it('clamps negative residuals to zero (NNLS behaviour)', () => {
    // Pathological: DAU drops below what newUsers alone would produce.
    const newUsers = [100, 100, 100]
    const dau = [100, 50, 50] // by day 1, dau < newUsers ⇒ R must clamp to 0
    const R = deconvolveDAU(newUsers, dau)
    for (const r of R) expect(r).toBeGreaterThanOrEqual(0)
  })

  it('throws on length mismatch and zero-acquisition day 0', () => {
    expect(() => deconvolveDAU([1, 2], [1])).toThrow()
    expect(() => deconvolveDAU([0, 100], [0, 100])).toThrow(/newUsers\[0\]/)
  })

  it('moving-average smoothing keeps R[0] = 1 and stays monotone', () => {
    const N = 20
    const newUsers = steadyAcquisition(N)
    const R = trueR(N)
    const noisy = reconstructDAU(newUsers, R).map((v, i) => v * (1 + (Math.random() - 0.5) * 0.04))
    const smoothed = deconvolveDAU(newUsers, noisy, { smoothWindow: 3 })
    expect(smoothed[0]).toBe(1)
    for (let t = 1; t < N; t++) {
      expect(smoothed[t]).toBeGreaterThanOrEqual(0)
      expect(smoothed[t]).toBeLessThanOrEqual(smoothed[t - 1] + 1e-12)
    }
  })
})

describe('validateDAUInput', () => {
  const ok = (N = 20) => ({
    newUsers: Array.from({ length: N }, () => 100),
    dau: Array.from({ length: N }, (_, i) => 100 + i * 5),
  })

  it('passes a clean baseline', () => {
    expect(validateDAUInput(ok()).valid).toBe(true)
  })

  it('errors on length mismatch', () => {
    expect(validateDAUInput({ newUsers: [1, 2], dau: [1] }).valid).toBe(false)
  })

  it('errors when newUsers[0] = 0', () => {
    const { newUsers, dau } = ok()
    newUsers[0] = 0
    const r = validateDAUInput({ newUsers, dau })
    expect(r.valid).toBe(false)
    expect(r.errors.join(' ')).toMatch(/First-day/)
  })

  it('warns for short windows but still passes if ≥7', () => {
    const r = validateDAUInput(ok(10))
    expect(r.valid).toBe(true)
    expect(r.warnings.join(' ')).toMatch(/recommend ≥14/)
  })

  it('warns when DAU < newUsers (likely misaligned columns)', () => {
    const newUsers = Array(20).fill(100)
    const dau = Array(20).fill(50)
    const r = validateDAUInput({ newUsers, dau })
    expect(r.warnings.join(' ')).toMatch(/new_users > DAU/)
  })

  it('warns on volatile acquisition (CV > 0.5)', () => {
    const newUsers = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 10 : 200))
    const dau = newUsers.map((v) => v * 5)
    const r = validateDAUInput({ newUsers, dau })
    expect(r.warnings.join(' ')).toMatch(/volatile/)
  })
})
