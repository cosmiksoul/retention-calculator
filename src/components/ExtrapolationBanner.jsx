// Warning banner shown when the forecast horizon extends well past the
// last user data point. Cadence-aware: prefix is 'D' (DAU), 'W' (weekly),
// or 'M' (monthly subscription). Levels match `extrapolationLevel()`:
//   'caution' → ratio > 3
//   'severe'  → ratio > 10

const PREFIX = { daily: 'D', weekly: 'W', monthly: 'M' }

/**
 * @param {{
 *   level: 'caution'|'severe',
 *   lastUserT: number,
 *   horizon: number,
 *   cadence?: 'daily'|'weekly'|'monthly',
 * }} props
 */
export default function ExtrapolationBanner({
  level,
  lastUserT,
  horizon,
  cadence = 'daily',
}) {
  const cls =
    level === 'severe'
      ? 'border-red-700/50 bg-red-950/30 text-red-200'
      : 'border-amber-700/50 bg-amber-950/30 text-amber-200'
  const p = PREFIX[cadence] ?? 'D'
  const text =
    level === 'severe'
      ? `Forecast horizon (${p}${horizon}) is more than 10× past your last input point (${p}${lastUserT}). Results are indicative — add intermediate retention points or shorten the horizon.`
      : `Forecast horizon (${p}${horizon}) is more than 3× past your last input point (${p}${lastUserT}). Treat the extrapolation with caution.`
  return (
    <div className={`rounded-lg border p-3 text-xs ${cls}`}>{text}</div>
  )
}
