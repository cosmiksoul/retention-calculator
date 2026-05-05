// Round-trips the calculator state through a base64url-encoded JSON payload
// in the URL hash so users can share their setup as a link.
//
// We deliberately do NOT serialize the long text inputs (paste / DAU): they
// can run into thousands of characters and their *resolved* output (the
// retention points) is already part of the snapshot. The recipient lands on
// the same fit; if they want to re-edit they can paste again.
//
// Version field lets us evolve the schema without breaking old links —
// decode returns null on a version it doesn't recognize.

const VERSION = 1

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

function pickPreset(p) {
  if (!p || typeof p !== 'object') return null
  const out = {}
  if (typeof p.presetId === 'string') out.id = p.presetId
  if (typeof p.quality === 'string') out.q = p.quality
  if (typeof p.geo === 'string') out.g = p.geo
  return out
}

function pickSubInput(sub) {
  if (!sub || typeof sub !== 'object') return null
  return {
    i2t: sub.installToTrial,
    t2p: sub.trialToPaid,
    R: Array.isArray(sub.retention)
      ? sub.retention
          .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.percent))
          .map((p) => [p.t, p.percent])
      : [],
    A: sub.arpuPaid,
    K: sub.cac,
    Cs: sub.cohortSize,
    H: sub.horizon,
  }
}

/**
 * @param {{
 *   mode?: 'session'|'subscription',
 *   cadence?: 'monthly'|'weekly',
 *   points: Array<{t:number, percent:number}>,
 *   cohortSize: number,
 *   arpu: number,
 *   cacInput: string|number|null,
 *   horizon: number,
 *   presetState: {presetId:string|null, quality:string, geo:string},
 *   adjustMode: 'pure'|'adjusted',
 *   bandSigma: 1|2,
 *   subInput?: object,
 * }} state
 * @returns {string}
 */
export function encodeState(state) {
  const payload = {
    v: VERSION,
    M: state.mode === 'subscription' ? 'sub' : 'ses',
    Cd: state.cadence === 'weekly' ? 'w' : 'm',
    p: pickPoints(state.points),
    c: state.cohortSize,
    a: state.arpu,
    k: state.cacInput === '' || state.cacInput == null ? null : Number(state.cacInput),
    h: state.horizon,
    pr: pickPreset(state.presetState),
    m: state.adjustMode === 'adjusted' ? 'a' : 'p',
    s: state.bandSigma,
  }
  if (state.mode === 'subscription') {
    payload.Sub = pickSubInput(state.subInput)
  }
  return toBase64Url(JSON.stringify(payload))
}

/**
 * @param {string} encoded
 * @returns {null | {
 *   points: Array<{t:number, percent:number}>,
 *   cohortSize: number,
 *   arpu: number,
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

  const points = Array.isArray(payload.p)
    ? payload.p
        .filter((row) => Array.isArray(row) && row.length === 2)
        .filter(([t, pct]) => Number.isFinite(t) && Number.isFinite(pct))
        .map(([t, percent]) => ({ t, percent }))
    : []

  const cohortSize = Number.isFinite(payload.c) ? payload.c : 1000
  const arpu = Number.isFinite(payload.a) ? payload.a : 2
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

  // Optional v2 subscription extensions. Old (session-only) links don't
  // carry these fields, so default mode='session' keeps full backward
  // compatibility with v1 share URLs.
  const mode = payload.M === 'sub' ? 'subscription' : 'session'
  const cadence = payload.Cd === 'w' ? 'weekly' : 'monthly'

  let subInput = null
  if (payload.Sub && typeof payload.Sub === 'object') {
    const r = Array.isArray(payload.Sub.R)
      ? payload.Sub.R
          .filter((row) => Array.isArray(row) && row.length === 2)
          .filter(([t, pct]) => Number.isFinite(t) && Number.isFinite(pct))
          .map(([t, percent]) => ({ t, percent }))
      : []
    subInput = {
      installToTrial: payload.Sub.i2t,
      trialToPaid: payload.Sub.t2p,
      retention: r,
      arpuPaid: payload.Sub.A,
      cac: payload.Sub.K,
      cohortSize: payload.Sub.Cs,
      horizon: payload.Sub.H,
    }
  }

  return {
    mode,
    cadence,
    points,
    cohortSize,
    arpu,
    cacInput,
    horizon,
    presetState,
    adjustMode,
    bandSigma,
    subInput,
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
