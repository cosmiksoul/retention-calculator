// Buckets the per-day LTV series into the canonical period ranges used
// throughout the app (D1-7, D8-14, D15-30, …) and sums revenue inside each.
//
// Boundaries match ResultsTable checkpoints: [1, 7, 14, 30, 60, 90, 180, 365].
// We treat them as inclusive *upper edges* so that bucket i = (prev, edge].

const EDGES = [1, 7, 14, 30, 60, 90, 180, 365]

/**
 * @param {Array<{t:number, revenue:number}>} series  per-day series from ltvSeries
 * @param {number} horizon                             clamps the last bucket
 * @returns {Array<{label:string, from:number, to:number, revenue:number}>}
 */
export function bucketRevenue(series, horizon) {
  if (!Array.isArray(series) || series.length === 0) return []
  const out = []
  let prevEdge = 0
  for (const edge of EDGES) {
    const from = prevEdge + 1
    if (from > horizon) break
    const to = Math.min(edge, horizon)
    let sum = 0
    for (let t = from; t <= to; t++) {
      const idx = t - 1
      if (idx >= 0 && idx < series.length) sum += series[idx].revenue
    }
    out.push({
      label: from === to ? `D${from}` : `D${from}–${to}`,
      from,
      to,
      revenue: sum,
    })
    if (edge >= horizon) break
    prevEdge = edge
  }
  return out
}
