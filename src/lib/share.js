// Round-trips the calculator state through a base64url-encoded JSON payload
// in the URL hash so users can share their setup as a link.
//
// We deliberately do NOT serialize the long text inputs (paste / DAU): they
// can run into thousands of characters and their *resolved* output (the
// retention points) is already part of the snapshot. The recipient lands on
// the same fit; if they want to re-edit they can paste again.
//
// Schema v2: flat unified state — no separate session/subscription paths,
// the period is part of the payload directly. v1 links from the old two-
// mode app are intentionally not decodable (they returned null even before
// because of the version check).

const VERSION = 2

function toBase64Url(str) {
  // btoa wants binary string. JSON is already ASCII-safe except for
  // non-ASCII chars in custom preset labels etc.; encode to UTF-8 bytes
  // first via the unescape/encodeURIComponent trick (still works in
  // every evergreen browser).
  const b64 = btoa(unescape(encodeURIComponent(str)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s) {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  return decodeURIComponent(escape(atob(padded)))
}

function pickPoints(points) {
  if (!Array.isArray(points)) return []
  return points
    .filter((p) => p && Number.isFinite(p.t) && Number.isFinite(p.percent))
    .map((p) => [p.t, p.percent])
}

function pickFunnel(funnel) {
  if (!Array.isArray(funnel)) return []
  return funnel
    .filter(
      (s) => s && typeof s.label === 'string' && Number.isFinite(s.conversionPct),
    )
    .map((s) => [s.label, s.conversionPct])
}

function pickPreset(p) {
  if (!p || typeof p !== 'object') return null
  const out = {}
  if (typeof p.presetId === 'string') out.id = p.presetId
  if (typeof p.quality === 'string') out.q = p.quality
  if (typeof p.geo === 'string') out.g = p.geo
  return out
}

const PERIOD_TO_CODE = { day: 'd', week: 'w', month: 'm' }
const CODE_TO_PERIOD = { d: 'day', w: 'week', m: 'month' }

/**
 * @param {{
 *   period: 'day'|'week'|'month',
 *   points: Array<{t:number, percent:number}>,
 *   funnel: Array<{label:string, conversionPct:number}>,
 *   cohortSize: number,
 *   arpuPerPeriod: number,
 *   cacInput: string|number|null,
 *   horizon: number,
 *   presetState: {presetId:string|null, quality:string, geo:string},
 *   adjustMode: 'pure'|'adjusted',
 *   bandSigma: 1|2,
 * }} state
 * @returns {string}
 */
export function encodeState(state) {
  const payload = {
    v: VERSION,
    pe: PERIOD_TO_CODE[state.period] ?? 'd',
    p: pickPoints(state.points),
    f: pickFunnel(state.funnel),
    cs: state.cohortSize,
    a: state.arpuPerPeriod,
    k:
      state.cacInput === '' || state.cacInput == null
        ? null
        : Number(state.cacInput),
    h: state.horizon,
    pr: pickPreset(state.presetState),
    m: state.adjustMode === 'adjusted' ? 'a' : 'p',
    s: state.bandSigma,
  }
  return toBase64Url(JSON.stringify(payload))
}

/**
 * @param {string} encoded
 * @returns {null | {
 *   period: 'day'|'week'|'month',
 *   points: Array<{t:number, percent:number}>,
 *   funnel: Array<{label:string, conversionPct:number}>,
 *   cohortSize: number,
 *   arpuPerPeriod: number,
 *   cacInput: string,
 *   horizon: number,
 *   presetState: {presetId:string|null, quality:string, geo:string},
 *   adjustMode: 'pure'|'adjusted',
 *   bandSigma: 1|2,
 * }}
 */
export function decodeState(encoded) {
  if (typeof encoded !== 'string' || !encoded) return null
  let payload
  try {
    payload = JSON.parse(fromBase64Url(encoded))
  } catch {
    return null
  }
  if (!payload || payload.v !== VERSION) return null

  const period = CODE_TO_PERIOD[payload.pe] ?? 'day'

  const points = Array.isArray(payload.p)
    ? payload.p
        .filter((row) => Array.isArray(row) && row.length === 2)
        .filter(([t, pct]) => Number.isFinite(t) && Number.isFinite(pct))
        .map(([t, percent]) => ({ t, percent }))
    : []

  const funnel = Array.isArray(payload.f)
    ? payload.f
        .filter(
          (row) =>
            Array.isArray(row) &&
            row.length === 2 &&
            typeof row[0] === 'string' &&
            Number.isFinite(row[1]),
        )
        .map(([label, conversionPct]) => ({ label, conversionPct }))
    : []

  const cohortSize = Number.isFinite(payload.cs) ? payload.cs : 1000
  const arpuPerPeriod = Number.isFinite(payload.a) ? payload.a : 2
  const horizon = Number.isFinite(payload.h) ? payload.h : 180
  const cacInput =
    payload.k == null
      ? ''
      : Number.isFinite(payload.k)
      ? String(payload.k)
      : ''

  const pr = payload.pr && typeof payload.pr === 'object' ? payload.pr : {}
  const presetState = {
    presetId: typeof pr.id === 'string' ? pr.id : null,
    quality: typeof pr.q === 'string' ? pr.q : 'median',
    geo: typeof pr.g === 'string' ? pr.g : 'tier_1',
  }

  const adjustMode = payload.m === 'a' ? 'adjusted' : 'pure'
  const bandSigma = payload.s === 2 ? 2 : 1

  return {
    period,
    points,
    funnel,
    cohortSize,
    arpuPerPeriod,
    cacInput,
    horizon,
    presetState,
    adjustMode,
    bandSigma,
  }
}

/**
 * Builds an absolute share URL. Works with HashRouter's `#/?s=...` shape.
 *
 * @param {string} encoded
 * @param {string} origin   typeof window !== 'undefined' ? window.location.origin + pathname
 * @returns {string}
 */
export function buildShareUrl(encoded, origin) {
  return `${origin}#/?s=${encoded}`
}
