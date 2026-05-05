import { describe, it, expect } from 'vitest'
import { encodeState, decodeState, buildShareUrl } from '../../src/lib/share.js'

const sample = () => ({
  points: [
    { t: 1, percent: 100 },
    { t: 7, percent: 35.5 },
    { t: 30, percent: 12 },
  ],
  cohortSize: 1500,
  arpu: 2.5,
  cacInput: '12.5',
  horizon: 180,
  presetState: { presetId: 'mobile_casual', quality: 'top_quartile', geo: 'tier_2' },
  adjustMode: 'adjusted',
  bandSigma: 2,
})

describe('share encode/decode', () => {
  it('round-trips a full session state with v2 mode/cadence defaults', () => {
    const decoded = decodeState(encodeState(sample()))
    // v2 decoder always includes mode/cadence/subInput; session payloads
    // get mode='session' and the cadence default 'monthly'.
    expect(decoded).toEqual({
      ...sample(),
      mode: 'session',
      cadence: 'monthly',
      subInput: null,
    })
  })

  it('round-trips a subscription state with subInput', () => {
    const subSample = {
      ...sample(),
      mode: 'subscription',
      cadence: 'weekly',
      subInput: {
        installToTrial: 8.6,
        trialToPaid: 35,
        retention: [
          { t: 1, percent: 75 },
          { t: 4, percent: 50 },
          { t: 26, percent: 18 },
        ],
        arpuPaid: 7.99,
        cac: 2.1,
        cohortSize: 1000,
        horizon: 26,
      },
    }
    const decoded = decodeState(encodeState(subSample))
    expect(decoded.mode).toBe('subscription')
    expect(decoded.cadence).toBe('weekly')
    expect(decoded.subInput).toEqual(subSample.subInput)
  })

  it('encodes empty/missing CAC as empty string back', () => {
    const s = sample()
    s.cacInput = ''
    const decoded = decodeState(encodeState(s))
    expect(decoded.cacInput).toBe('')
  })

  it('returns null on garbage input', () => {
    expect(decodeState('not-base64-***')).toBeNull()
    expect(decodeState('')).toBeNull()
    expect(decodeState(null)).toBeNull()
  })

  it('returns null on a wrong version', () => {
    // Hand-craft a payload with a future version
    const bad = btoa(JSON.stringify({ v: 99, p: [] }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(decodeState(bad)).toBeNull()
  })

  it('drops malformed points instead of crashing', () => {
    const enc = encodeState({
      ...sample(),
      points: [{ t: 1, percent: 100 }, { t: 'oops', percent: 50 }, null],
    })
    const decoded = decodeState(enc)
    expect(decoded.points).toEqual([{ t: 1, percent: 100 }])
  })

  it('falls back to defaults when fields are missing', () => {
    // Encode a minimal payload directly
    const min = btoa(JSON.stringify({ v: 1 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const decoded = decodeState(min)
    expect(decoded.cohortSize).toBe(1000)
    expect(decoded.arpu).toBe(2)
    expect(decoded.horizon).toBe(180)
    expect(decoded.cacInput).toBe('')
    expect(decoded.presetState).toEqual({
      presetId: null,
      quality: 'median',
      geo: 'tier_1',
    })
    expect(decoded.adjustMode).toBe('pure')
    expect(decoded.bandSigma).toBe(1)
  })

  it('uses URL-safe characters only', () => {
    const enc = encodeState(sample())
    expect(enc).not.toMatch(/[+/=]/)
  })

  it('survives non-ASCII content (e.g. preset label with cyrillic)', () => {
    // Even though we don't typically encode labels, point arrays etc. should
    // round-trip if a future schema includes UTF-8 strings.
    const s = sample()
    s.presetState.presetId = 'тест_id'
    const decoded = decodeState(encodeState(s))
    expect(decoded.presetState.presetId).toBe('тест_id')
  })
})

describe('buildShareUrl', () => {
  it('appends ?s= to the hash route', () => {
    const url = buildShareUrl('abc', 'https://example.com/calc/')
    expect(url).toBe('https://example.com/calc/#/?s=abc')
  })
})
