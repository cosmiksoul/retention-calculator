// Plan-type badge for subscription mode (spec-v2 §5.6).
//
// Renders one of three context warnings based on the dominant billing
// plan of the selected preset (when available) or the current cadence
// (for Custom inputs). Compact card placed above KPI row.

import HoverHint from '../HoverHint.jsx'

// Compact one-liner shown on the badge; the long-form warning lives in
// the tooltip and on Methodology. Matches the wording from §5.6.
const VARIANTS = {
  weekly: {
    label: '⚠️ Weekly trap pattern',
    tone: 'border-amber-700/50 bg-amber-950/30 text-amber-200',
    blurb:
      'Часть revenue у юзеров, забывших отменить. Этичность под вопросом, регуляторы (Apple, EU) ужесточают transparency-требования.',
  },
  monthly: {
    label: '📈 Monthly cadence — predictable',
    tone: 'border-emerald-700/40 bg-emerald-950/20 text-emerald-200',
    blurb:
      'Самая предсказуемая модель из трёх. Power law fit самый честный — нет аннуального cliff, нет weekly cancellation churn.',
  },
  annual: {
    label: '📅 Annual renewal cliff',
    tone: 'border-sky-700/50 bg-sky-950/30 text-sky-200',
    blurb:
      'M12 retention критичен — большинство revenue зависит от того, продлят или нет. Power law не моделирует cliff, держи это в голове.',
  },
}

// Maps preset.dominantPlan → variant key. Includes the hybrid plans
// declared in presets-subscription.json (annual_then_monthly,
// monthly_with_some_weekly).
function variantFor(dominantPlan, cadence) {
  if (dominantPlan === 'weekly') return 'weekly'
  if (dominantPlan === 'monthly') return 'monthly'
  if (dominantPlan === 'annual') return 'annual'
  if (dominantPlan === 'annual_then_monthly') return 'annual'
  if (dominantPlan === 'monthly_with_some_weekly') return 'monthly'
  // No preset — infer from cadence.
  return cadence === 'weekly' ? 'weekly' : 'monthly'
}

/**
 * @param {{
 *   dominantPlan: string|null,
 *   cadence: 'weekly'|'monthly',
 * }} props
 */
export default function PlanBadge({ dominantPlan, cadence }) {
  const variant = VARIANTS[variantFor(dominantPlan, cadence)]
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${variant.tone}`}>
      <span className="font-medium">{variant.label}</span>
      <HoverHint align="left">
        <p>{variant.blurb}</p>
        {dominantPlan && (
          <p className="mt-1.5 text-fg-faint">
            Plan badge выведен из dominant_plan выбранного пресета. Для
            Custom (без пресета) badge основан на текущей cadence.
          </p>
        )}
      </HoverHint>
    </div>
  )
}
