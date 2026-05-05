import HoverHint from './HoverHint.jsx'

function fmtUsd(x) {
  if (!Number.isFinite(x)) return '—'
  if (Math.abs(x) >= 1000) return `$${x.toFixed(0)}`
  if (Math.abs(x) >= 10) return `$${x.toFixed(1)}`
  return `$${x.toFixed(2)}`
}

function rsqTone(r2) {
  if (r2 >= 0.95) return { tone: 'text-emerald-300', label: 'Excellent' }
  if (r2 >= 0.85) return { tone: 'text-fg', label: 'Good' }
  return { tone: 'text-amber-300', label: 'Weak fit — extrapolation is risky' }
}

function ltvCacTone(ratio) {
  if (!Number.isFinite(ratio)) return 'text-fg'
  if (ratio >= 3) return 'text-emerald-300'
  if (ratio >= 1) return 'text-amber-300'
  return 'text-red-400'
}

function Card({ label, value, hint, tooltip, tooltipAlign = 'left', tone = 'text-fg-strong', delta }) {
  return (
    <div className="rounded-lg border border-line bg-bg-elev/50 px-4 py-3">
      <div className="flex items-center whitespace-nowrap text-xs uppercase tracking-wide text-fg-faint">
        <span>{label}</span>
        {tooltip && <HoverHint align={tooltipAlign}>{tooltip}</HoverHint>}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
      {delta && (
        <div className={`mt-0.5 text-xs tabular-nums ${delta.tone}`}>
          {delta.text}
        </div>
      )}
      {hint && !delta && <div className="mt-0.5 text-xs text-fg-faint">{hint}</div>}
    </div>
  )
}

function pctDelta(current, base, { higherIsBetter }) {
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(base) ||
    base === 0
  ) {
    return null
  }
  const pct = ((current - base) / base) * 100
  if (Math.abs(pct) < 0.05) {
    return { text: '= baseline', tone: 'text-fg-faint' }
  }
  const sign = pct > 0 ? '+' : ''
  const better = higherIsBetter ? pct > 0 : pct < 0
  const tone = better ? 'text-emerald-300' : 'text-red-400'
  return { text: `${sign}${pct.toFixed(1)}% vs baseline`, tone }
}

function dayDelta(current, base, { lowerIsBetter }) {
  if (current == null && base == null) return null
  if (current == null && base != null) {
    return { text: 'Not reached vs baseline', tone: 'text-red-400' }
  }
  if (current != null && base == null) {
    return { text: 'reached vs N/A', tone: 'text-emerald-300' }
  }
  const diff = current - base
  if (diff === 0) {
    return { text: '= baseline', tone: 'text-fg-faint' }
  }
  const sign = diff > 0 ? '+' : ''
  const better = lowerIsBetter ? diff < 0 : diff > 0
  const tone = better ? 'text-emerald-300' : 'text-red-400'
  return { text: `${sign}${diff}d vs baseline`, tone }
}

/**
 * @param {{
 *   ltvAtHorizon: number,
 *   horizon: number,
 *   rSquared: number,
 *   beDay: number|null,
 *   cac: number|null,
 *   horizonRetention: number,
 *   baseline?: {
 *     ltvAtHorizon: number,
 *     ratio: number|null,
 *     beDay: number|null,
 *     horizonRetention: number,
 *   } | null,
 * }} props
 */
export default function KPICards({
  ltvAtHorizon,
  horizon,
  rSquared,
  beDay,
  cac,
  horizonRetention,
  baseline,
}) {
  const r2 = rsqTone(rSquared)
  const showCacCards = cac != null && cac > 0
  const ratio = showCacCards ? ltvAtHorizon / cac : null

  const ltvDelta = baseline
    ? pctDelta(ltvAtHorizon, baseline.ltvAtHorizon, { higherIsBetter: true })
    : null
  const ratioDelta =
    baseline && ratio != null && baseline.ratio != null
      ? pctDelta(ratio, baseline.ratio, { higherIsBetter: true })
      : null
  const beDelta = baseline ? dayDelta(beDay, baseline.beDay, { lowerIsBetter: true }) : null
  const retDelta = baseline
    ? pctDelta(horizonRetention, baseline.horizonRetention, { higherIsBetter: true })
    : null

  const paybackValue = beDay != null ? `Day ${beDay}` : 'Not reached'
  const paybackTone = beDay != null ? 'text-fg-strong' : 'text-amber-300'
  const paybackHint =
    beDay != null
      ? `at D${beDay}`
      : `LTV < CAC at D${horizon}`

  return (
    <div
      className={`grid gap-3 ${
        showCacCards
          ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5'
          : 'grid-cols-2 md:grid-cols-3'
      }`}
    >
      <Card
        label="Predicted LTV"
        value={fmtUsd(ltvAtHorizon)}
        hint={`at D${horizon}`}
        delta={ltvDelta}
        tooltip={
          <>
            <p>
              Считается как ARPU × Σ R(t) для t = 1…{horizon} — складываются
              ожидаемые дневные доходы по степенной кривой ретеншена.
            </p>
            <p className="mt-1.5">
              Чем дальше горизонт, тем больше неопределённость — после ~3× от
              вашей последней точки данных модель экстраполирует, и прогноз
              стоит брать с поправкой на полосу ±σ.
            </p>
          </>
        }
      />
      <Card
        label="Model fit (R²)"
        value={Number.isFinite(rSquared) ? rSquared.toFixed(3) : '—'}
        hint={r2.label}
        tone={r2.tone}
        tooltip={
          <>
            <p>
              Доля дисперсии ваших точек, объяснённая моделью R(t) = a·t<sup>−b</sup>.
              Считается на лог-преобразованных данных.
            </p>
            <p className="mt-1.5">
              ≥ 0.95 — отличная подгонка, прогноз надёжен. 0.85–0.95 —
              приемлемо. &lt; 0.85 — модель плохо ложится на ваши данные;
              экстраполяция рискованна, попробуйте сменить пресет или добавить
              промежуточных точек.
            </p>
          </>
        }
      />
      {showCacCards && (
        <>
          <Card
            label="Payback"
            value={paybackValue}
            hint={paybackHint}
            tone={paybackTone}
            delta={beDelta}
            tooltip={
              <>
                <p>
                  Первый день, на котором накопленный доход ≥ CAC. После этой
                  точки когорта переходит в плюс.
                </p>
                <p className="mt-1.5">
                  Если payback позже горизонта — показывается «Not reached»:
                  юнит-экономика на текущих параметрах не сходится в выбранном
                  окне.
                </p>
              </>
            }
          />
          <Card
            label="LTV / CAC"
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
            delta={ratioDelta}
            tooltip={
              <>
                <p>
                  Стандартная метрика юнит-экономики. ≥ 3.0 — здоровый
                  бизнес, можно масштабировать paid acquisition. 1.0–3.0 — на
                  грани, экономика хрупкая. &lt; 1.0 — теряете деньги на
                  каждом привлечённом юзере.
                </p>
                <p className="mt-1.5">
                  Считается на горизонте D{horizon}; на коротком горизонте
                  отношение будет ниже — ретеншен ещё генерирует доход после
                  обрезки.
                </p>
              </>
            }
          />
        </>
      )}
      <Card
        label="Long-term retention"
        value={
          Number.isFinite(horizonRetention)
            ? `${(horizonRetention * 100).toFixed(2)}%`
            : '—'
        }
        hint={`at D${horizon}`}
        tooltipAlign="right"
        delta={retDelta}
        tooltip={
          <>
            <p>
              Прогноз ретеншена в самой дальней точке горизонта (D{horizon}) —
              значение фита R(t) = a·t<sup>−b</sup> на конце окна.
            </p>
            <p className="mt-1.5">
              Это grade проверки правдоподобности модели: если число выглядит
              нереалистично высоким или низким — фит, скорее всего, плохо
              экстраполируется и стоит добавить точек или сменить пресет.
            </p>
          </>
        }
      />
    </div>
  )
}
