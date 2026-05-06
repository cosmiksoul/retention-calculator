import { describe, it, expect } from 'vitest'
import { encodeState, decodeState, buildShareUrl } from '../../src/lib/share.js'

const sample = () => ({
  period: 'day',
  points: [
    { t: 1, percent: 100 },
    { t: 7, percent: 35.5 },
    { t: 30, percent: 12 },
  ],
  funnel: [],
  cohortSize: 1500,
  arpuPerPeriod: 2.5,
  cacInput: '12.5',
  horizon: 180,
  presetState: { presetId: 'mobile_casual', quality: 'top_quartile', geo: 'tier_2' },
  adjustMode: 'adjusted',
  bandSigma: 2,
})

describe('share encode/decode (v2 unified schema)', () => {
  it('round-trips a full DAU-mode state (empty funnel)', () => {
    const decoded = decodeState(encodeState(sample()))
    expect(decoded).toEqual(sample())
  })

  it('round-trips a subscription-style state with funnel and weekly period', () => {
    const subState = {
      period: 'week',
      points: [
        { t: 1, percent: 75 },
        { t: 4, percent: 50 },
        { t: 26, percent: 18 },
      ],
      funnel: [
        { label: 'Install → Trial', conversionPct: 8.6 },
        { label: 'Trial → Paid', conversionPct: 35 },
      ],
      cohortSize: 1000,
      arpuPerPeriod: 7.99,
      cacInput: '2.1',
      horizon: 26,
      presetState: { presetId: 'subs_utilities', quality: 'median', geo: 'tier_1' },
      adjustMode: 'pure',
      bandSigma: 1,
    }
    const decoded = decodeState(encodeState(subState))
    expect(decoded).toEqual(subState)
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

  it('returns null on a wrong version (v1 share links no longer decode)', () => {
    // Hand-craft a v1 payload — the old format should be rejected cleanly.
    const v1Bad = btoa(JSON.stringify({ v: 1, p: [] }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(decodeState(v1Bad)).toBeNull()
  })

  it('drops malformed retention rows instead of crashing', () => {
    const enc = encodeState({
      ...sample(),
      points: [{ t: 1, percent: 100 }, { t: 'oops', percent: 50 }, null],
    })
    const decoded = decodeState(enc)
    expect(decoded.points).toEqual([{ t: 1, percent: 100 }])
  })

  it('drops malformed funnel rows instead of crashing', () => {
    const enc = encodeState({
      ...sample(),
      funnel: [
        { label: 'Step', conversionPct: 50 },
        { label: 'Bad', conversionPct: 'NaN' },
        null,
      ],
    })
    const decoded = decodeState(enc)
    expect(decoded.funnel).toEqual([{ label: 'Step', conversionPct: 50 }])
  })

  it('falls back to defaults when fields are missing', () => {
    const min = btoa(JSON.stringify({ v: 2 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const decoded = decodeState(min)
    expect(decoded.period).toBe('day')
    expect(decoded.cohortSize).toBe(1000)
    expect(decoded.arpuPerPeriod).toBe(2)
    expect(decoded.horizon).toBe(180)
    expect(decoded.cacInput).toBe('')
    expect(decoded.funnel).toEqual([])
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

  it('survives non-ASCII content (cyrillic preset id, funnel labels)', () => {
    const s = sample()
    s.presetState.presetId = 'тест_id'
    s.funnel = [{ label: 'Активация', conversionPct: 50 }]
    const decoded = decodeState(encodeState(s))
    expect(decoded.presetState.presetId).toBe('тест_id')
    expect(decoded.funnel[0].label).toBe('Активация')
  })

  it('encodes month period and round-trips it', () => {
    const decoded = decodeState(encodeState({ ...sample(), period: 'month' }))
    expect(decoded.period).toBe('month')
  })
})

describe('buildShareUrl', () => {
  it('appends ?s= to the hash route', () => {
    const url = buildShareUrl('abc', 'https://example.com/calc/')
    expect(url).toBe('https://example.com/calc/#/?s=abc')
  })
})
