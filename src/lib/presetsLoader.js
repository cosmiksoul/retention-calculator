// Loads docs/presets.json (copied to public/presets.json at dev/build time)
// and normalizes each variant into a uniform shape that the calculator math
// and UI can consume without caring about per-vertical naming quirks.
//
// Per spec & Stage 0 decision (option a):
//   arpdau         → arpuPerDay  (mobile games are quoted as ARPDAU)
//   cpi_blended    → cac         (mobile games' install cost = effective CAC)
//   cac_per_ftd    → cac         (iGaming's per-FTD cost; user must read cohort = depositors)
//
// Display fields (arpu_monthly, arpu_annual, cpi_ios, cpi_android, ...) are kept
// verbatim under `display` so the preset card can render informational read-outs
// like "≈ $300/mo, $3650/yr" without being part of the canonical input.

const ID_TO_ANCHOR = {
  igaming_casino: '1-igaming--online-casino',
  igaming_sportsbook: '2-igaming--sportsbook',
  mobile_hyper_casual: '3-mobile-games--hyper-casual',
  mobile_casual: '4-mobile-games--casual-match-3-puzzle-lifestyle',
  mobile_midcore: '5-mobile-games--midcore-strategy-rpg-shooter',
  ecommerce: '6-e-commerce-mobile--web-shopping',
  fintech: '7-fintech--banking-apps',
}

function normalizeVariant(raw) {
  const retentionPct = { ...(raw.retention || {}) }
  const retentionPoints = Object.entries(retentionPct)
    .map(([k, v]) => ({ t: parseInt(String(k).slice(1), 10), r: v / 100 }))
    .filter((p) => Number.isFinite(p.t) && p.t > 0)
    .sort((a, b) => a.t - b.t)

  const arpuPerDay =
    raw.arpu_per_day != null ? raw.arpu_per_day :
    raw.arpdau != null ? raw.arpdau :
    null

  const cac =
    raw.cac != null ? raw.cac :
    raw.cac_per_ftd != null ? raw.cac_per_ftd :
    raw.cpi_blended != null ? raw.cpi_blended :
    null

  const display = {
    arpu_monthly: raw.arpu_monthly,
    arpu_annual: raw.arpu_annual,
    arpdau: raw.arpdau,
    cpi_ios: raw.cpi_ios,
    cpi_android: raw.cpi_android,
    cpi_blended: raw.cpi_blended,
    cac_per_ftd: raw.cac_per_ftd,
  }

  return {
    retention: retentionPct,
    retentionPoints,
    arpuPerDay,
    cac,
    display,
  }
}

function normalizePreset(raw) {
  const variants = {}
  for (const [key, v] of Object.entries(raw.variants || {})) {
    variants[key] = normalizeVariant(v)
  }
  return {
    id: raw.id,
    label: raw.label,
    category: raw.category,
    periodUnit: raw.period_unit,
    metricType: raw.metric_type,
    dataQuality: raw.data_quality,
    qualityWarning: raw.quality_warning,
    methodologyAnchor: ID_TO_ANCHOR[raw.id] ?? null,
    variants,
  }
}

/**
 * Pure normalization step — easy to unit test without `fetch`.
 * @param {object} data  parsed presets.json
 */
export function normalizePresetsBundle(data) {
  return {
    schemaVersion: data.$schema_version,
    lastUpdated: data.$last_updated,
    tierLegend: data.$tier_legend,
    presets: (data.presets || []).map(normalizePreset),
  }
}

/**
 * Fetch presets.json from the deployed site root and normalize.
 * URL is resolved relative to the document; with Vite's `base` set, plain
 * 'presets.json' resolves to `<base>presets.json` correctly.
 */
export async function loadPresets(url = 'presets.json') {
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`loadPresets: HTTP ${resp.status}`)
  }
  const data = await resp.json()
  return normalizePresetsBundle(data)
}
