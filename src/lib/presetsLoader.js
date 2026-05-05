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

const SUBS_ID_TO_ANCHOR = {
  subs_utilities: '1-utilities-vpn-cleaners-scanners',
  subs_lifestyle_wellness: '2-lifestyle--wellness',
  subs_health_fitness: '3-health--fitness',
  subs_photo_video: '4-photo--video-editors',
  subs_language_learning: '5-language-learning',
  subs_dating: '6-dating-apps',
  subs_ai_companions: '7-ai-companions--chatbots',
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
    mode: 'session',
    presets: (data.presets || []).map(normalizePreset),
  }
}

// Subscription preset shape is fundamentally different from session: each
// variant carries funnel rates (install_to_trial, trial_to_paid), monthly
// retention checkpoints (M1/M3/M6/M12), and OPTIONALLY weekly checkpoints
// (W1/W2/W4/W8/W12/W26). Keep both retention sets so the calculator can
// switch cadence without re-fetching, and surface display-only fields
// (rpi_d14, examples) for the preset card.
function normalizeSubscriptionVariant(raw) {
  const monthlyRetention = { ...(raw.retention || {}) }
  const monthlyPoints = Object.entries(monthlyRetention)
    .map(([k, v]) => ({ t: parseInt(String(k).slice(1), 10), r: v / 100 }))
    .filter((p) => Number.isFinite(p.t) && p.t > 0)
    .sort((a, b) => a.t - b.t)

  const weeklyRetention = raw.retention_weekly
    ? { ...raw.retention_weekly }
    : null
  const weeklyPoints = weeklyRetention
    ? Object.entries(weeklyRetention)
        .map(([k, v]) => ({ t: parseInt(String(k).slice(1), 10), r: v / 100 }))
        .filter((p) => Number.isFinite(p.t) && p.t > 0)
        .sort((a, b) => a.t - b.t)
    : null

  return {
    installToTrial: raw.install_to_trial ?? null,
    trialToPaid: raw.trial_to_paid ?? null,
    monthly: {
      retention: monthlyRetention,
      retentionPoints: monthlyPoints,
      arpuPaid: raw.arpu_paid_monthly ?? null,
    },
    weekly: weeklyPoints
      ? {
          retention: weeklyRetention,
          retentionPoints: weeklyPoints,
          arpuPaid: raw.arpu_paid_weekly ?? null,
        }
      : null,
    cac: raw.cpi_blended ?? raw.cpi_ios ?? raw.cpi_android ?? null,
    display: {
      rpi_d14: raw.rpi_d14,
      rpi_d60: raw.rpi_d60,
      arpu_paid_monthly: raw.arpu_paid_monthly,
      arpu_paid_weekly: raw.arpu_paid_weekly,
      cpi_ios: raw.cpi_ios,
      cpi_android: raw.cpi_android,
      cpi_blended: raw.cpi_blended,
    },
  }
}

function normalizeSubscriptionPreset(raw) {
  const variants = {}
  for (const [key, v] of Object.entries(raw.variants || {})) {
    variants[key] = normalizeSubscriptionVariant(v)
  }
  return {
    id: raw.id,
    label: raw.label,
    category: raw.category,
    metricType: raw.metric_type,
    dataQuality: raw.data_quality,
    qualityWarning: raw.quality_warning,
    dominantPlan: raw.dominant_plan,
    weeklyDataStatus: raw.weekly_data_status ?? 'not_applicable',
    examples: raw.examples ?? [],
    methodologyAnchor: SUBS_ID_TO_ANCHOR[raw.id] ?? null,
    variants,
  }
}

/**
 * Pure normalization step for subscription preset bundles.
 * @param {object} data  parsed presets-subscription.json
 */
export function normalizeSubscriptionBundle(data) {
  return {
    schemaVersion: data.$schema_version,
    lastUpdated: data.$last_updated,
    mode: 'subscription',
    presets: (data.presets || []).map(normalizeSubscriptionPreset),
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
 * Fetch presets-subscription.json and normalize. Mirrors loadPresets.
 */
export async function loadSubscriptionPresets(
  url = 'presets-subscription.json',
) {
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`loadSubscriptionPresets: HTTP ${resp.status}`)
  }
  const data = await resp.json()
  return normalizeSubscriptionBundle(data)
}

/**
 * Fetch both bundles in parallel. Returns `{session, subscription}` so the
 * calculator has everything for the preset selector in one shot.
 */
export async function loadAllPresets(baseUrl = '') {
  const [session, subscription] = await Promise.all([
    loadPresets(`${baseUrl}presets.json`),
    loadSubscriptionPresets(`${baseUrl}presets-subscription.json`),
  ])
  return { session, subscription }
}
