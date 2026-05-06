// Loads docs/presets.json (copied to public/presets.json at dev/build time)
// in the unified v2.0 schema and normalizes each preset/variant into the
// shape the calculator and UI consume.
//
// Schema overview:
//   preset.cadence_default     'day' | 'week' | 'month'
//   preset.cadence_supported   array of periods that have data
//   preset.variants[q|geo].funnel               [{label, conversionPct}]
//   preset.variants[q|geo].retention.{day|week|month}    {<periodLabel>: pct}
//   preset.variants[q|geo].arpu_per_period.{day|week|month}    number
//   preset.variants[q|geo].cac_per_acquired     number  (per cohort entrant)
//
// The normalized variant exposes retentionPoints (fraction-valued, sorted
// by t) per period so callers don't repeat the parsing.

const ID_TO_ANCHOR = {
  igaming_casino: '1-igaming--online-casino',
  igaming_sportsbook: '2-igaming--sportsbook',
  mobile_hyper_casual: '3-mobile-games--hyper-casual',
  mobile_casual: '4-mobile-games--casual-match-3-puzzle-lifestyle',
  mobile_midcore: '5-mobile-games--midcore-strategy-rpg-shooter',
  ecommerce: '6-e-commerce-mobile--web-shopping',
  fintech: '7-fintech--banking-apps',
  subs_utilities: '1-utilities-vpn-cleaners-scanners',
  subs_lifestyle_wellness: '2-lifestyle--wellness',
  subs_health_fitness: '3-health--fitness',
  subs_photo_video: '4-photo--video-editors',
  subs_language_learning: '5-language-learning',
  subs_dating: '6-dating-apps',
  subs_ai_companions: '7-ai-companions--chatbots',
}

// Each retention key in the JSON ("D1", "W4", "M12") starts with the period
// abbreviation and continues with the integer t.
function pointsFromMap(map) {
  if (!map) return []
  return Object.entries(map)
    .map(([k, v]) => ({ t: parseInt(String(k).slice(1), 10), r: v / 100 }))
    .filter((p) => Number.isFinite(p.t) && p.t > 0)
    .sort((a, b) => a.t - b.t)
}

function normalizeVariant(raw) {
  const retention = raw.retention || {}
  const retentionPoints = {}
  for (const period of Object.keys(retention)) {
    retentionPoints[period] = pointsFromMap(retention[period])
  }
  return {
    funnel: Array.isArray(raw.funnel)
      ? raw.funnel.map((s) => ({
          label: s.label,
          conversionPct: s.conversionPct,
        }))
      : [],
    retention,
    retentionPoints,
    arpuPerPeriod: { ...(raw.arpu_per_period || {}) },
    cacPerAcquired: raw.cac_per_acquired ?? null,
    display: raw.display ?? {},
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
    metricType: raw.metric_type,
    dataQuality: raw.data_quality,
    qualityWarning: raw.quality_warning,
    cadenceDefault: raw.cadence_default,
    cadenceSupported: Array.isArray(raw.cadence_supported)
      ? raw.cadence_supported
      : [raw.cadence_default],
    dominantPlan: raw.dominant_plan ?? null,
    examples: Array.isArray(raw.examples) ? raw.examples : [],
    methodologyAnchor: ID_TO_ANCHOR[raw.id] ?? null,
    variants,
  }
}

/**
 * Pure normalization step — easy to unit-test without `fetch`.
 * @param {object} data parsed presets.json (v2.0)
 */
export function normalizePresetsBundle(data) {
  return {
    schemaVersion: data.$schema_version,
    lastUpdated: data.$last_updated,
    tierLegend: data.$tier_legend,
    periodLegend: data.$period_legend,
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

/**
 * Convenience: returns the variant slice for a specific period, or null
 * when the variant has no data for that period.
 *
 * @param {object} variant         normalized variant
 * @param {'day'|'week'|'month'} period
 * @returns {{
 *   funnel: Array<{label:string, conversionPct:number}>,
 *   retentionPoints: Array<{t:number, r:number}>,
 *   arpuPerPeriod: number|null,
 *   cacPerAcquired: number|null,
 * }|null}
 */
export function variantForPeriod(variant, period) {
  if (!variant) return null
  const retentionPoints = variant.retentionPoints?.[period]
  if (!retentionPoints || retentionPoints.length === 0) return null
  return {
    funnel: variant.funnel,
    retentionPoints,
    arpuPerPeriod: variant.arpuPerPeriod?.[period] ?? null,
    cacPerAcquired: variant.cacPerAcquired,
  }
}
