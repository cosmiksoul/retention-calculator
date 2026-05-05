import { Link } from 'react-router-dom'
import HoverHint from './HoverHint.jsx'

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

// Surfaces the cohort-definition gotcha for iGaming presets.
const METRIC_HINTS = {
  depositor_retention:
    'Cohort = first-time depositors. CAC is per-FTD, not per-install — interpret your "cohort size" accordingly.',
  session_retention: 'Cohort = installs / new sessions.',
}

const selectCls =
  'block w-full rounded border border-line-strong bg-bg-subtle px-2 py-1.5 text-sm ' +
  'text-fg-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'

export default function PresetSelector({ bundle, value, onChange }) {
  if (!bundle) {
    return (
      <div className="text-xs text-fg-faint">Loading presets…</div>
    )
  }

  const { presetId, quality, geo } = value
  const preset = presetId ? bundle.presets.find((p) => p.id === presetId) : null

  const slices = preset ? Object.keys(preset.variants) : []
  const isAvailable = (q, g) => slices.includes(`${q}|${g}`)

  const variant = preset && isAvailable(quality, geo) ? preset.variants[`${quality}|${geo}`] : null

  const handleIndustryChange = (id) => {
    if (!id) {
      onChange({ presetId: null, quality: 'median', geo: 'tier_1' }, null)
      return
    }
    const p = bundle.presets.find((pp) => pp.id === id)
    // All presets ship a median|tier_1 baseline — see methodology.
    const v = p?.variants['median|tier_1'] ?? null
    onChange({ presetId: id, quality: 'median', geo: 'tier_1' }, v)
  }

  const handleQualityChange = (q) => {
    if (!preset) return
    const finalQ = isAvailable(q, geo) ? q : 'median'
    const v = preset.variants[`${finalQ}|${geo}`] ?? null
    onChange({ presetId, quality: finalQ, geo }, v)
  }

  const handleGeoChange = (g) => {
    if (!preset) return
    const finalQ = isAvailable(quality, g) ? quality : 'median'
    const v = preset.variants[`${finalQ}|${g}`] ?? null
    onChange({ presetId, quality: finalQ, geo: g }, v)
  }

  const badge = preset ? QUALITY_BADGE[preset.dataQuality] : null
  const metricHint = preset ? METRIC_HINTS[preset.metricType] : null

  const arpuDisplays = []
  if (variant?.display.arpu_monthly) arpuDisplays.push(`≈ $${variant.display.arpu_monthly}/mo`)
  if (variant?.display.arpu_annual) arpuDisplays.push(`≈ $${variant.display.arpu_annual}/yr`)
  if (variant?.display.arpdau != null) arpuDisplays.push(`ARPDAU $${variant.display.arpdau}`)

  const cacDisplays = []
  if (variant?.display.cac_per_ftd != null) cacDisplays.push(`CAC/FTD $${variant.display.cac_per_ftd}`)
  if (variant?.display.cpi_blended != null) cacDisplays.push(`CPI $${variant.display.cpi_blended}`)
  if (variant?.display.cpi_ios != null) cacDisplays.push(`iOS $${variant.display.cpi_ios}`)
  if (variant?.display.cpi_android != null) cacDisplays.push(`Android $${variant.display.cpi_android}`)

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 flex items-center text-sm font-medium text-fg-muted">
          <span>Industry preset</span>
          <HoverHint align="left">
            <p>
              Каждый пресет — отраслевой бенчмарк: дефолтные точки кривой
              ретеншена + типичные ARPU и CAC.
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
          {bundle.presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
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
                  <p>
                    Уровень результата среди игроков отрасли:
                  </p>
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
              {metricHint && (
                <span
                  className="cursor-help text-xs text-fg-faint"
                  title={metricHint}
                >
                  {preset.metricType.replace('_', ' ')} ⓘ
                </span>
              )}
            </div>
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
