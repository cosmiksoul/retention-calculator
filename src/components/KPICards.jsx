function fmtUsd(x) {
  if (!Number.isFinite(x)) return '—'
  if (Math.abs(x) >= 1000) return `$${x.toFixed(0)}`
  if (Math.abs(x) >= 10) return `$${x.toFixed(1)}`
  return `$${x.toFixed(2)}`
}

function rsqTone(r2) {
  if (r2 >= 0.95) return { tone: 'text-emerald-300', label: 'Excellent' }
  if (r2 >= 0.85) return { tone: 'text-slate-200', label: 'Good' }
  return { tone: 'text-amber-300', label: 'Weak fit — extrapolation is risky' }
}

function ltvCacTone(ratio) {
  if (!Number.isFinite(ratio)) return 'text-slate-200'
  if (ratio >= 3) return 'text-emerald-300'
  if (ratio >= 1) return 'text-amber-300'
  return 'text-red-400'
}

function Card({ label, value, hint, ru, tone = 'text-slate-100' }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-bg-elev/50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
      {ru && (
        <div className="mt-1 border-t border-slate-800/60 pt-1 text-[11px] italic leading-snug text-slate-500">
          {ru}
        </div>
      )}
    </div>
  )
}

/**
 * @param {{
 *   ltvAtHorizon: number,
 *   horizon: number,
 *   rSquared: number,
 *   beDay: number|null,
 *   cac: number|null,
 * }} props
 */
export default function KPICards({
  ltvAtHorizon,
  horizon,
  rSquared,
  beDay,
  cac,
}) {
  const r2 = rsqTone(rSquared)
  const showCacCards = cac != null && cac > 0
  const ratio = showCacCards ? ltvAtHorizon / cac : null

  return (
    <div
      className={`grid gap-3 ${
        showCacCards
          ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5'
          : 'grid-cols-2'
      }`}
    >
      <Card
        label="Predicted LTV"
        ru={`Прогнозируемый доход с одного юзера за ${horizon} дней.`}
        value={fmtUsd(ltvAtHorizon)}
        hint="per acquired user"
      />
      <Card
        label="Model fit (R²)"
        ru="Качество подгонки степенной модели (1.0 = идеально, <0.85 — слабо)."
        value={Number.isFinite(rSquared) ? rSquared.toFixed(3) : '—'}
        hint={r2.label}
        tone={r2.tone}
      />
      {showCacCards && (
        <>
          <Card
            label="Breakeven"
            ru="День, когда накопленный LTV покрывает CAC."
            value={beDay != null ? `Day ${beDay}` : 'Not reached'}
            hint={beDay != null ? `at horizon D${horizon}` : `LTV < CAC at D${horizon}`}
            tone={beDay != null ? 'text-slate-100' : 'text-amber-300'}
          />
          <Card
            label="LTV / CAC"
            ru="Во сколько раз доход покрывает стоимость привлечения. ≥3 — здоровая юнит-экономика."
            value={ratio != null && Number.isFinite(ratio) ? ratio.toFixed(2) : '—'}
            hint={
              ratio == null
                ? null
                : ratio >= 3
                ? 'healthy'
                : ratio >= 1
                ? 'borderline'
                : 'unprofitable'
            }
            tone={ltvCacTone(ratio)}
          />
          <Card
            label="Payback"
            ru="За сколько дней окупается привлечение."
            value={beDay != null ? `${beDay}d` : '—'}
          />
        </>
      )}
    </div>
  )
}
