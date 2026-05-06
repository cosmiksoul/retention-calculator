// Warning banner shown when the forecast horizon extends well past the
// last user data point. Period-aware: prefix is 'D' (day), 'W' (week),
// or 'M' (month). Levels match `extrapolationLevel()`:
//   'caution' → ratio > 3
//   'severe'  → ratio > 10

import { periodAbbr } from '../lib/calc.js'

/**
 * @param {{
 *   level: 'caution'|'severe',
 *   lastUserT: number,
 *   horizon: number,
 *   period?: 'day'|'week'|'month',
 * }} props
 */
export default function ExtrapolationBanner({
  level,
  lastUserT,
  horizon,
  period = 'day',
}) {
  const cls =
    level === 'severe'
      ? 'border-red-700/50 bg-red-950/30 text-red-200'
      : 'border-amber-700/50 bg-amber-950/30 text-amber-200'
  const p = periodAbbr(period)
  const text =
    level === 'severe'
      ? `Forecast horizon (${p}${horizon}) is more than 10× past your last input point (${p}${lastUserT}). Results are indicative — add intermediate retention points or shorten the horizon.`
      : `Forecast horizon (${p}${horizon}) is more than 3× past your last input point (${p}${lastUserT}). Treat the extrapolation with caution.`
  return (
    <div className={`rounded-lg border p-3 text-xs ${cls}`}>{text}</div>
  )
}
