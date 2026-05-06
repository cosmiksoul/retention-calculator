// Industry preset selector. Surfaces the unified-schema bundle as one
// dropdown with optgroups by category (Mobile games / iGaming / Subscription
// apps / Fintech / E-commerce). Each preset declares its own
// cadence_default + cadence_supported; the parent decides whether to also
// apply the preset's cadence on selection.

import { Link } from 'react-router-dom'
import HoverHint from './HoverHint.jsx'
import { variantForPeriod } from '../lib/presetsLoader.js'

const QUALITY_LABELS = {
  top_quartile: 'Top quartile',
  median: 'Median',
  bottom_quartile: 'Bottom quartile',
}

const GEO_LABELS = {
  tier_1: 'Tier 1 — US/UK/CA/AU/DACH/Nordics',
  tier_2: 'Tier 2 — W/S Europe + JP/KR',
  tier_3: 'Tier 3 — LATAM/SEA/India/EE',
}

const QUALITY_BADGE = {
  robust: { label: '🟢 Robust', cls: 'border-emerald-700/50 bg-emerald-900/30 text-emerald-300' },
  moderate: { label: '🟡 Moderate', cls: 'border-amber-700/50 bg-amber-900/30 text-amber-300' },
  estimated: { label: '🟠 Estimated', cls: 'border-orange-700/50 bg-orange-900/30 text-orange-300' },
}

const METRIC_HINTS = {
  depositor_retention:
    'Cohort = first-time depositors. CAC is per-FTD, not per-install — interpret your "cohort size" accordingly.',
  session_retention: 'Cohort = installs / new sessions.',
  subscription:
    'Cohort = installs. Funnel converts installs to paying subscribers; retention is on paying users.',
}

const DOMINANT_PLAN_LABEL = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  annual: 'Annual',
  annual_then_monthly: 'Annual → monthly',
  monthly_with_some_weekly: 'Monthly (some weekly)',
}

// Category order is the visual grouping in the dropdown. Anything else
// falls into "Other".
const CATEGORY_ORDER = [
  'Mobile games',
  'iGaming',
  'Subscription Apps',
  'E-commerce',
  'Fintech',
]

const selectCls =
  'block w-full rounded border border-line-strong bg-bg-subtle px-2 py-1.5 text-sm ' +
  'text-fg-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'

function groupByCategory(presets) {
  const buckets = new Map()
  for (const p of presets) {
    const cat = p.category || 'Other'
    if (!buckets.has(cat)) buckets.set(cat, [])
    buckets.get(cat).push(p)
  }
  // Stable order: known categories first in CATEGORY_ORDER, then the rest A-Z.
  const known = CATEGORY_ORDER.filter((c) => buckets.has(c))
  const unknown = [...buckets.keys()]
    .filter((c) => !CATEGORY_ORDER.includes(c))
    .sort()
  return [...known, ...unknown].map((c) => [c, buckets.get(c)])
}

/**
 * @param {{
 *   bundle: { presets: Array<object> } | null,
 *   value: { presetId: string|null, quality: string, geo: string },
 *   period: 'day'|'week'|'month',
 *   onChange: (
 *     next: { presetId: string|null, quality: string, geo: string },
 *     variant: object|null,
 *     meta?: { preset: object|null }
 *   ) => void,
 * }} props
 */
export default function PresetSelector({ bundle, value, period, onChange }) {
  if (!bundle) {
    return <div className="text-xs text-fg-faint">Loading presets…</div>
  }

  const { presetId, quality, geo } = value
  const preset = presetId
    ? bundle.presets.find((p) => p.id === presetId) ?? null
    : null

  const slices = preset ? Object.keys(preset.variants) : []
  const isAvailable = (q, g) => slices.includes(`${q}|${g}`)
  const variant =
    preset && isAvailable(quality, geo)
      ? preset.variants[`${quality}|${geo}`]
      : null

  const handleIndustryChange = (id) => {
    if (!id) {
      onChange({ presetId: null, quality: 'median', geo: 'tier_1' }, null, { preset: null })
      return
    }
    const p = bundle.presets.find((pp) => pp.id === id) ?? null
    const v = p?.variants['median|tier_1'] ?? null
    onChange({ presetId: id, quality: 'median', geo: 'tier_1' }, v, { preset: p })
  }

  const handleQualityChange = (q) => {
    if (!preset) return
    const finalQ = isAvailable(q, geo) ? q : 'median'
    const v = preset.variants[`${finalQ}|${geo}`] ?? null
    onChange({ presetId, quality: finalQ, geo }, v, { preset })
  }

  const handleGeoChange = (g) => {
    if (!preset) return
    const finalQ = isAvailable(quality, g) ? quality : 'median'
    const v = preset.variants[`${finalQ}|${g}`] ?? null
    onChange({ presetId, quality: finalQ, geo: g }, v, { preset })
  }

  const groups = groupByCategory(bundle.presets)
  const badge = preset ? QUALITY_BADGE[preset.dataQuality] : null
  const metricHint = preset ? METRIC_HINTS[preset.metricType] : null

  // Convenience slice for the active period — drives the preset card's
  // contextual displays (funnel, ARPU, CAC).
  const slice = variant ? variantForPeriod(variant, period) : null

  const arpuDisplays = []
  if (variant?.display?.arpu_monthly) arpuDisplays.push(`≈ $${variant.display.arpu_monthly}/mo`)
  if (variant?.display?.arpu_annual) arpuDisplays.push(`≈ $${variant.display.arpu_annual}/yr`)
  if (variant?.display?.arpdau != null) arpuDisplays.push(`ARPDAU $${variant.display.arpdau}`)
  if (variant?.display?.arpu_paid_monthly != null) {
    arpuDisplays.push(`paid $${variant.display.arpu_paid_monthly}/mo`)
  }
  if (variant?.display?.arpu_paid_weekly != null) {
    arpuDisplays.push(`paid $${variant.display.arpu_paid_weekly}/wk`)
  }

  const cacDisplays = []
  if (variant?.display?.cac_per_ftd != null) cacDisplays.push(`CAC/FTD $${variant.display.cac_per_ftd}`)
  if (variant?.display?.cpi_blended != null) cacDisplays.push(`CPI $${variant.display.cpi_blended}`)
  if (variant?.display?.cpi_ios != null) cacDisplays.push(`iOS $${variant.display.cpi_ios}`)
  if (variant?.display?.cpi_android != null) cacDisplays.push(`Android $${variant.display.cpi_android}`)

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 flex items-center text-sm font-medium text-fg-muted">
          <span>Industry preset</span>
          <HoverHint align="left">
            <p>
              Каждый пресет — отраслевой бенчмарк: дефолтные точки кривой
              ретеншена + типичные ARPU и CAC + опциональный funnel.
            </p>
            <p className="mt-1.5">
              После выбора можно тонко настроить через Quality (квартиль среди
              игроков) и Geo tier (регион). Источники по каждому пресету и
              методология подбора чисел — на странице Methodology.
            </p>
          </HoverHint>
        </label>
        <select
          value={presetId ?? ''}
          onChange={(e) => handleIndustryChange(e.target.value || null)}
          className={selectCls}
        >
          <option value="">Custom (no preset)</option>
          {groups.map(([cat, list]) => (
            <optgroup key={cat} label={cat}>
              {list.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {preset && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 flex items-center text-xs text-fg-dim">
                <span>Quality</span>
                <HoverHint align="left" width="sm">
                  <p>Уровень результата среди игроков отрасли:</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    <li><strong className="text-fg">top quartile</strong> — лучшие 25%</li>
                    <li><strong className="text-fg">median</strong> — медиана</li>
                    <li><strong className="text-fg">bottom quartile</strong> — худшие 25%</li>
                  </ul>
                  <p className="mt-1.5">
                    Если для текущей пары Industry+Geo квартиль недоступен,
                    он помечен (n/a).
                  </p>
                </HoverHint>
              </label>
              <select
                value={quality}
                onChange={(e) => handleQualityChange(e.target.value)}
                className={selectCls}
              >
                {Object.entries(QUALITY_LABELS).map(([k, label]) => {
                  const dis = !isAvailable(k, geo)
                  return (
                    <option key={k} value={k} disabled={dis}>
                      {label}
                      {dis ? ' (n/a)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-dim">Geo tier</label>
              <select
                value={geo}
                onChange={(e) => handleGeoChange(e.target.value)}
                className={selectCls}
              >
                {Object.entries(GEO_LABELS).map(([k, label]) => {
                  const dis = !isAvailable(quality, k)
                  return (
                    <option key={k} value={k} disabled={dis}>
                      {label}
                      {dis ? ' (n/a)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div className="space-y-2 rounded border border-line bg-bg-elev/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {badge && (
                <span className={`rounded border px-2 py-0.5 text-xs ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
              {preset.dominantPlan && (
                <span
                  className="rounded border border-line-strong bg-bg-subtle px-2 py-0.5 text-xs text-fg-muted"
                  title="Dominant billing plan for the vertical"
                >
                  Plan: {DOMINANT_PLAN_LABEL[preset.dominantPlan] ?? preset.dominantPlan}
                </span>
              )}
              {metricHint && (
                <span
                  className="cursor-help text-xs text-fg-faint"
                  title={metricHint}
                >
                  {preset.metricType.replace('_', ' ')} ⓘ
                </span>
              )}
            </div>
            {slice && slice.funnel.length > 0 && (
              <div className="text-xs text-fg-faint">
                <span className="text-fg-dim">Funnel: </span>
                <span className="tabular-nums">
                  {slice.funnel
                    .map((s) => `${s.label} ${s.conversionPct.toFixed(1)}%`)
                    .join(' · ')}
                </span>
              </div>
            )}
            <p className="text-xs leading-relaxed text-fg-dim">
              {preset.qualityWarning}
            </p>
            {(arpuDisplays.length > 0 || cacDisplays.length > 0) && (
              <dl className="space-y-1 text-xs text-fg-faint">
                {arpuDisplays.length > 0 && (
                  <div>
                    <dt className="inline text-fg-dim">ARPU: </dt>
                    <dd className="inline">{arpuDisplays.join(' · ')}</dd>
                  </div>
                )}
                {cacDisplays.length > 0 && (
                  <div>
                    <dt className="inline text-fg-dim">Acquisition: </dt>
                    <dd className="inline">{cacDisplays.join(' · ')}</dd>
                  </div>
                )}
              </dl>
            )}
            {preset.examples?.length > 0 && (
              <div className="text-xs text-fg-faint">
                <span className="text-fg-dim">Examples: </span>
                {preset.examples.slice(0, 6).join(', ')}
              </div>
            )}
            {preset.methodologyAnchor && (
              <Link
                to={`/methodology#${preset.methodologyAnchor}`}
                className="inline-block text-xs text-accent-soft hover:text-accent-fg"
              >
                See methodology →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
