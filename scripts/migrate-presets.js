// One-shot migration script: collapses docs/presets.json (session) + docs/presets-subscription.json
// (subscription) into a single docs/presets-unified.json under the new schema
// for the unified calculator.
//
// Run:  node scripts/migrate-presets.js
// Output: docs/presets-unified.json (review diff, then rename to presets.json)
//
// The transformation preserves all numeric values verbatim — only field names,
// shape, and grouping are reorganized:
//
//   - retention: {D1, D7, ...} OR retention + retention_weekly
//     → retention: { day: {...} | week: {...} | month: {...} }
//   - arpu_per_day | arpdau            → arpu_per_period.day
//   - arpu_paid_monthly                → arpu_per_period.month
//   - arpu_paid_weekly                 → arpu_per_period.week
//   - cac | cac_per_ftd | cpi_blended  → cac_per_acquired
//   - install_to_trial / trial_to_paid → funnel: [{label, conversionPct}, ...]
//   - cadence_default / cadence_supported derived from dominant_plan + weekly_data_status

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const session = JSON.parse(readFileSync(join(ROOT, 'docs/presets.json'), 'utf8'))
const subs = JSON.parse(
  readFileSync(join(ROOT, 'docs/presets-subscription.json'), 'utf8'),
)

// Subscription presets carry funnel data; their dominant plan determines
// what period the form opens in by default. Only utilities + photo_video
// have publicly-disclosed weekly retention curves.
const SUBS_CADENCE_DEFAULT = {
  weekly: 'week',
  monthly: 'month',
  annual: 'month',
  annual_then_monthly: 'month',
  monthly_with_some_weekly: 'week',
}

function retentionFromKeys(obj, prefix) {
  const out = {}
  for (const [key, value] of Object.entries(obj || {})) {
    if (key.startsWith(prefix)) out[key] = value
  }
  return Object.keys(out).length > 0 ? out : null
}

function migrateSessionVariant(raw) {
  const retentionDay = retentionFromKeys(raw.retention, 'D') ?? {}
  const arpuPerDay =
    raw.arpu_per_day != null ? raw.arpu_per_day :
    raw.arpdau != null ? raw.arpdau :
    null
  const cacPerAcquired =
    raw.cac != null ? raw.cac :
    raw.cac_per_ftd != null ? raw.cac_per_ftd :
    raw.cpi_blended != null ? raw.cpi_blended :
    null

  const display = {}
  if (raw.arpu_monthly != null) display.arpu_monthly = raw.arpu_monthly
  if (raw.arpu_annual != null) display.arpu_annual = raw.arpu_annual
  if (raw.arpdau != null) display.arpdau = raw.arpdau
  if (raw.cpi_ios != null) display.cpi_ios = raw.cpi_ios
  if (raw.cpi_android != null) display.cpi_android = raw.cpi_android
  if (raw.cpi_blended != null) display.cpi_blended = raw.cpi_blended
  if (raw.cac_per_ftd != null) display.cac_per_ftd = raw.cac_per_ftd

  return {
    funnel: [],
    retention: { day: retentionDay },
    arpu_per_period: { day: arpuPerDay },
    cac_per_acquired: cacPerAcquired,
    display,
  }
}

function migrateSubsVariant(raw) {
  const retentionMonth = retentionFromKeys(raw.retention, 'M') ?? {}
  const retentionWeek = raw.retention_weekly
    ? retentionFromKeys(raw.retention_weekly, 'W') ?? null
    : null

  const retention = { month: retentionMonth }
  if (retentionWeek) retention.week = retentionWeek

  const arpuPerPeriod = {}
  if (raw.arpu_paid_monthly != null) arpuPerPeriod.month = raw.arpu_paid_monthly
  if (raw.arpu_paid_weekly != null) arpuPerPeriod.week = raw.arpu_paid_weekly

  const cacPerAcquired =
    raw.cpi_blended != null ? raw.cpi_blended :
    raw.cpi_ios != null ? raw.cpi_ios :
    raw.cpi_android != null ? raw.cpi_android :
    null

  const funnel = []
  if (raw.install_to_trial != null) {
    funnel.push({
      label: 'Install → Trial',
      conversionPct: raw.install_to_trial,
    })
  }
  if (raw.trial_to_paid != null) {
    funnel.push({
      label: 'Trial → Paid',
      conversionPct: raw.trial_to_paid,
    })
  }

  const display = {}
  if (raw.rpi_d14 != null) display.rpi_d14 = raw.rpi_d14
  if (raw.rpi_d60 != null) display.rpi_d60 = raw.rpi_d60
  if (raw.arpu_paid_monthly != null) display.arpu_paid_monthly = raw.arpu_paid_monthly
  if (raw.arpu_paid_weekly != null) display.arpu_paid_weekly = raw.arpu_paid_weekly
  if (raw.cpi_ios != null) display.cpi_ios = raw.cpi_ios
  if (raw.cpi_android != null) display.cpi_android = raw.cpi_android
  if (raw.cpi_blended != null) display.cpi_blended = raw.cpi_blended
  if (raw.ltv_12m_per_paying_user != null) {
    display.ltv_12m_per_paying_user = raw.ltv_12m_per_paying_user
  }

  return {
    funnel,
    retention,
    arpu_per_period: arpuPerPeriod,
    cac_per_acquired: cacPerAcquired,
    display,
  }
}

function migrateSessionPreset(raw) {
  const variants = {}
  for (const [key, v] of Object.entries(raw.variants || {})) {
    variants[key] = migrateSessionVariant(v)
  }
  return {
    id: raw.id,
    label: raw.label,
    category: raw.category,
    metric_type: raw.metric_type,
    data_quality: raw.data_quality,
    quality_warning: raw.quality_warning,
    cadence_default: 'day',
    cadence_supported: ['day'],
    variants,
  }
}

function migrateSubsPreset(raw) {
  const variants = {}
  let anyWeekly = false
  for (const [key, v] of Object.entries(raw.variants || {})) {
    variants[key] = migrateSubsVariant(v)
    if (variants[key].retention.week) anyWeekly = true
  }

  const cadenceDefault = SUBS_CADENCE_DEFAULT[raw.dominant_plan] ?? 'month'
  const cadenceSupported = anyWeekly ? ['week', 'month'] : ['month']

  return {
    id: raw.id,
    label: raw.label,
    category: raw.category,
    metric_type: raw.metric_type,
    data_quality: raw.data_quality,
    quality_warning: raw.quality_warning,
    dominant_plan: raw.dominant_plan ?? null,
    cadence_default: cadenceDefault,
    cadence_supported: cadenceSupported,
    examples: raw.examples ?? [],
    variants,
  }
}

const unified = {
  $schema_version: '2.0',
  $last_updated: '2026-05-06',
  $notes:
    'Unified preset bundle. Each preset declares cadence_default + cadence_supported; each variant carries period-keyed retention and arpu_per_period maps plus an optional funnel array. Numeric values are unchanged from v1 (docs/presets.json) and v2 (docs/presets-subscription.json) — only field shape was migrated.',
  $tier_legend: session.$tier_legend,
  $period_legend: {
    day: 'Daily session retention (DAU-style)',
    week: 'Weekly subscription cadence',
    month: 'Monthly subscription cadence',
  },
  presets: [
    ...session.presets.map(migrateSessionPreset),
    ...subs.presets.map(migrateSubsPreset),
  ],
}

const out = join(ROOT, 'docs/presets-unified.json')
writeFileSync(out, JSON.stringify(unified, null, 2) + '\n')
console.log(`Wrote ${out}`)
console.log(`Presets: ${unified.presets.length} (${session.presets.length} session + ${subs.presets.length} subscription)`)
