// Mode + cadence state persistence and URL sync.
//
// Two pieces of state govern which calculator the user sees:
//
//   mode     — 'session' (v1) | 'subscription' (v2)
//   cadence  — 'monthly' | 'weekly'  (only meaningful when mode='subscription')
//
// They round-trip through three places, in priority order:
//
//   1. URL query (`#/?mode=subscription&cadence=weekly`) — always wins on
//      cold load. Lets people share links that drop the recipient straight
//      into the right view.
//   2. localStorage — remembers the last mode/cadence the same browser used,
//      so a returning user lands where they left off.
//   3. Defaults: mode='session', cadence='monthly'.
//
// Session mode strips both params from the URL — there's no cadence to set
// when the calculator is in v1 mode, and a bare URL means "default mode".

const MODE_KEY = 'rcl_mode'
const CADENCE_KEY = 'rcl_cadence'

const VALID_MODES = new Set(['session', 'subscription'])
const VALID_CADENCES = new Set(['monthly', 'weekly'])

function getHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  const hash = window.location.hash
  const q = hash.indexOf('?')
  return new URLSearchParams(q >= 0 ? hash.slice(q + 1) : '')
}

function readStorage(key, valid) {
  try {
    const v = localStorage.getItem(key)
    return v && valid.has(v) ? v : null
  } catch {
    return null
  }
}

export function readInitialMode() {
  const fromUrl = getHashParams().get('mode')
  if (fromUrl && VALID_MODES.has(fromUrl)) return fromUrl
  return readStorage(MODE_KEY, VALID_MODES) ?? 'session'
}

export function readInitialCadence() {
  const fromUrl = getHashParams().get('cadence')
  if (fromUrl && VALID_CADENCES.has(fromUrl)) return fromUrl
  return readStorage(CADENCE_KEY, VALID_CADENCES) ?? 'monthly'
}

export function persistMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // private mode etc. — silent
  }
}

export function persistCadence(cadence) {
  try {
    localStorage.setItem(CADENCE_KEY, cadence)
  } catch {
    // ditto
  }
}

/**
 * Update `?mode=...&cadence=...` in the hash route, preserving any other
 * query params (e.g. `?s=...` from a share link). Session mode strips both.
 */
export function syncUrlState({ mode, cadence }) {
  if (typeof window === 'undefined') return
  const hash = window.location.hash
  const q = hash.indexOf('?')
  const route = q >= 0 ? hash.slice(0, q) : hash || '#/'
  const params = new URLSearchParams(q >= 0 ? hash.slice(q + 1) : '')

  if (mode === 'session') {
    params.delete('mode')
    params.delete('cadence')
  } else {
    params.set('mode', mode)
    params.set('cadence', cadence)
  }

  const queryStr = params.toString()
  const newHash = (route || '#/') + (queryStr ? `?${queryStr}` : '')
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}${newHash}`,
  )
}
