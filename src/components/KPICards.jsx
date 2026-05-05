import HoverHint from './HoverHint.jsx'

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

function Card({ label, value, hint, tooltip, tooltipAlign = 'left', tone = 'text-slate-100' }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-bg-elev/50 px-4 py-3">
      <div className="flex items-center whitespace-nowrap text-xs uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        {tooltip && <HoverHint align={tooltipAlign}>{tooltip}</HoverHint>}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
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
        value={fmtUsd(ltvAtHorizon)}
        hint="per acquired user"
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
        tooltipAlign={showCacCards ? 'left' : 'right'}
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
            label="Breakeven"
            value={beDay != null ? `Day ${beDay}` : 'Not reached'}
            hint={beDay != null ? `at horizon D${horizon}` : `LTV < CAC at D${horizon}`}
            tone={beDay != null ? 'text-slate-100' : 'text-amber-300'}
            tooltip={
              <>
                <p>
                  Первый день t, на котором Σ выручки на юзера ≥ CAC. После
                  этой точки когорта переходит в плюс.
                </p>
                <p className="mt-1.5">
                  Если breakeven позже горизонта — показывается «Not reached»:
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
          <Card
            label="Payback"
            value={beDay != null ? `${beDay}d` : '—'}
            tooltipAlign="right"
            tooltip={
              <>
                <p>
                  Численно совпадает с Breakeven — это первый день, когда
                  накопленный доход покрыл CAC.
                </p>
                <p className="mt-1.5">
                  Дублируется как отдельный KPI потому, что в продуктовой
                  аналитике это разные ментальные модели: «когда выйду в
                  плюс» (breakeven) vs «насколько долго мои деньги связаны»
                  (payback).
                </p>
              </>
            }
          />
        </>
      )}
    </div>
  )
}
