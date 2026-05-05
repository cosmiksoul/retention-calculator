import { useEffect, useMemo, useState } from 'react'
import RetentionInput, {
  DEFAULT_POINTS,
  newPointId,
} from '../components/RetentionInput.jsx'
import HoverHint from '../components/HoverHint.jsx'
import PresetSelector from '../components/PresetSelector.jsx'
import CohortPaste from '../components/CohortPaste.jsx'
import DAUInput from '../components/DAUInput.jsx'
import DAUChart from '../components/DAUChart.jsx'
import KPICards from '../components/KPICards.jsx'
import RetentionChart from '../components/RetentionChart.jsx'
import LTVChart from '../components/LTVChart.jsx'
import RevenueChart from '../components/RevenueChart.jsx'
import ResultsTable from '../components/ResultsTable.jsx'
import CohortPL from '../components/CohortPL.jsx'
import { parseCohortTable } from '../lib/parseCohort.js'
import { parseDAUTable } from '../lib/parseDAU.js'
import {
  deconvolveDAU,
  reconstructDAU,
  validateDAUInput,
} from '../lib/deconvolution.js'
import { loadPresets } from '../lib/presetsLoader.js'
import {
  fitPowerLaw,
  retentionCurve,
  retentionBand,
  extrapolationLevel,
} from '../lib/powerLaw.js'
import { ltvSeries, ltvBand, breakevenDay } from '../lib/ltv.js'
import { adjustFitToBenchmark } from '../lib/industryAdjusted.js'
import {
  validateRetentionPoints,
  validateNumericInputs,
} from '../lib/validate.js'
import { buildCsv, buildFilename } from '../lib/exportCsv.js'
import { encodeState, decodeState, buildShareUrl } from '../lib/share.js'
import {
  readInitialMode,
  readInitialCadence,
  persistMode,
  persistCadence,
  syncUrlState,
} from '../lib/modeState.js'
import ModeToggle from '../components/ModeToggle.jsx'
import CadenceToggle from '../components/subscription/CadenceToggle.jsx'
import SubscriptionInput from '../components/subscription/SubscriptionInput.jsx'
import SubscriptionKPI from '../components/subscription/SubscriptionKPI.jsx'
import FunnelWaterfall from '../components/subscription/FunnelWaterfall.jsx'
import SubscriptionCohortPL from '../components/subscription/SubscriptionCohortPL.jsx'
import { defaultsFor, validateSubscriptionInputs } from '../lib/subscriptionInputs.js'
import {
  funnelCascade,
  subscriptionLtv,
  subscriptionPayback,
} from '../lib/subscriptionMath.js'
import { predict } from '../lib/powerLaw.js'

const inputCls =
  'rounded border border-line-strong bg-bg-subtle px-2 py-1 text-sm tabular-nums ' +
  'text-fg-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'

function fmtMoney(v) {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1000) return `$${v.toFixed(0)}`
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`
  return `$${v.toFixed(2)}`
}

function NumberField({ label, value, onChange, hint, error, min, step, suffix, ru, tooltip, tooltipAlign = 'left' }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center text-sm font-medium text-fg-muted">
        <span>{label}</span>
        {tooltip && <HoverHint align={tooltipAlign}>{tooltip}</HoverHint>}
      </span>
      <input
        type="number"
        min={min}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} w-full`}
      />
      {suffix && (
        <span className="mt-1 block text-xs text-fg-faint">{suffix}</span>
      )}
      {hint && !error && (
        <span className="mt-1 block text-xs text-fg-faint">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
      {ru && (
        <span className="mt-1 block text-[11px] italic leading-snug text-fg-faint">
          {ru}
        </span>
      )}
    </label>
  )
}

function BandSigmaToggle({ sigma, onChange, disabled }) {
  const radio = (k, label) => (
    <label
      className={`flex items-center gap-1.5 text-xs ${
        disabled ? 'text-fg-disabled' : 'text-fg-muted'
      }`}
    >
      <input
        type="radio"
        name="band-sigma"
        value={k}
        checked={sigma === k}
        onChange={() => onChange(k)}
        disabled={disabled}
        className="accent-accent"
      />
      {label}
    </label>
  )
  return (
    <div className="rounded border border-line bg-bg-elev/30 p-2">
      <div className="mb-0.5 flex items-center text-xs font-medium text-fg-muted">
        <span>Confidence band</span>
        <HoverHint align="left">
          <p>
            Полоса вокруг прогноза, отражающая неопределённость подгонки
            модели — насколько уверенно мы знаем параметры степенной кривой
            при текущем числе точек и их разбросе.
          </p>
          <p className="mt-1.5">
            ±1σ ≈ 68% вероятности, ±2σ ≈ 95%. Чем меньше точек и хуже R²,
            тем шире полоса. В industry-adjusted режиме скрыта —
            синтетическая подгонка не несёт остаточной неопределённости.
          </p>
        </HoverHint>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {radio(1, '±1σ ≈ 68%')}
        {radio(2, '±2σ ≈ 95%')}
      </div>
      {disabled && (
        <div className="mt-1 text-[11px] leading-snug text-fg-faint">
          Band requires ≥3 user points (residual degrees of freedom). It is also
          hidden in industry-adjusted mode.
        </div>
      )}
    </div>
  )
}

function InputModeToggle({ mode, onChange }) {
  const radio = (key, label) => (
    <label className="flex items-center gap-1.5 text-xs text-fg-muted">
      <input
        type="radio"
        name="input-mode"
        value={key}
        checked={mode === key}
        onChange={() => onChange(key)}
        className="accent-accent"
      />
      {label}
    </label>
  )
  return (
    <div>
      <div className="mb-1 flex items-center text-xs font-medium text-fg-muted">
        <span>Input mode</span>
        <HoverHint align="left">
          <p>Три способа задать кривую ретеншена:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              <strong className="text-fg">Manual</strong> — точки t/%
              вручную, минимум 3.
            </li>
            <li>
              <strong className="text-fg">Paste cohort table</strong> —
              таблица абсолютных или процентных значений из BI / экспорта.
            </li>
            <li>
              <strong className="text-fg">Paste DAU + new users</strong>
              {' '}— DAU и новые юзеры по дням; ретеншен восстанавливается
              через свёрточную деконволюцию.
            </li>
          </ul>
        </HoverHint>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {radio('manual', 'Manual input')}
        {radio('paste', 'Paste cohort table')}
        {radio('dau', 'Paste DAU + new users')}
      </div>
    </div>
  )
}

function ForecastModeToggle({ mode, onChange, avgRatio }) {
  const radio = (key, label) => (
    <label className="flex items-center gap-1.5 text-xs text-fg-muted">
      <input
        type="radio"
        name="adjust-mode"
        value={key}
        checked={mode === key}
        onChange={() => onChange(key)}
        className="accent-accent"
      />
      {label}
    </label>
  )
  return (
    <div className="rounded border border-line bg-bg-elev/30 p-2">
      <div className="mb-0.5 flex items-center text-xs font-medium text-fg-muted">
        <span>Forecast mode</span>
        <HoverHint align="left">
          <p>
            <strong className="text-fg">Pure fit</strong> — подгоняет
            степенную модель только по вашим точкам. Лучше всего работает
            при ≥4 хорошо выстроенных точках с высоким R².
          </p>
          <p className="mt-1.5">
            <strong className="text-fg">Industry-adjusted</strong> —
            берёт форму индустриального бенчмарка (выбранный пресет) и
            масштабирует под ваш уровень: считается среднегеометрическое
            отношение ваших точек к бенчмарку и применяется ко всему хвосту.
            Полезно когда у вас 1–3 точки — даёт прогноз с реалистичной
            формой кривой за пределами ваших данных.
          </p>
        </HoverHint>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {radio('pure', 'Pure fit')}
        {radio('adjusted', 'Industry-adjusted')}
      </div>
      {mode === 'adjusted' && avgRatio != null && (
        <div className="mt-1.5 text-[11px] leading-snug text-fg-faint">
          Adjusted = benchmark × {avgRatio.toFixed(2)}× (geometric mean of your
          point/benchmark ratios). Confidence band hidden — synthetic fit doesn't
          carry residual uncertainty.
        </div>
      )}
      {mode === 'pure' && (
        <div className="mt-1 text-[11px] leading-snug text-fg-faint">
          Fits your points directly. Switch to industry-adjusted if you have
          fewer than 4 points and want a benchmark-shaped tail.
        </div>
      )}
    </div>
  )
}

function ExtrapolationBanner({ level, lastUserT, horizon }) {
  const cls =
    level === 'severe'
      ? 'border-red-700/50 bg-red-950/30 text-red-200'
      : 'border-amber-700/50 bg-amber-950/30 text-amber-200'
  const text =
    level === 'severe'
      ? `Forecast horizon (D${horizon}) is more than 10× past your last input point (D${lastUserT}). Results are indicative — add intermediate retention points or shorten the horizon.`
      : `Forecast horizon (D${horizon}) is more than 3× past your last input point (D${lastUserT}). Treat the extrapolation with caution.`
  return (
    <div className={`rounded-lg border p-3 text-xs ${cls}`}>{text}</div>
  )
}

const QUALITY_LABEL = {
  top_quartile: 'top quartile',
  median: 'median',
  bottom_quartile: 'bottom quartile',
}
const GEO_LABEL = { tier_1: 'Tier 1', tier_2: 'Tier 2', tier_3: 'Tier 3' }

function presetLabelFor(preset, presetState) {
  if (!preset) return null
  return `${preset.label} · ${QUALITY_LABEL[presetState.quality] ?? presetState.quality} · ${GEO_LABEL[presetState.geo] ?? presetState.geo}`
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Reads `?s=<encoded>` from the hash route on mount. Returns null when
// no share token is present. Failures (malformed token / wrong version)
// also produce null — the calc just falls back to its default state.
function readInitialFromUrl() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  const q = hash.indexOf('?')
  if (q < 0) return null
  const params = new URLSearchParams(hash.slice(q + 1))
  const s = params.get('s')
  return s ? decodeState(s) : null
}

function safeFit(points) {
  try {
    return fitPowerLaw(points.map((p) => ({ t: p.t, r: p.percent / 100 })))
  } catch {
    return null
  }
}

function safeBenchmarkFit(variant) {
  if (!variant) return null
  try {
    return fitPowerLaw(variant.retentionPoints)
  } catch {
    return null
  }
}

export default function Calculator() {
  // Mode + cadence — top-level dispatch between v1 (session retention,
  // daily scale) and v2 (subscription, weekly/monthly cadence). Initial
  // values come from URL > localStorage > defaults; both round-trip back
  // to URL on every change so a refresh keeps you in the same view.
  const [mode, setMode] = useState(readInitialMode) // 'session' | 'subscription'
  const [cadence, setCadence] = useState(readInitialCadence) // 'monthly' | 'weekly'

  useEffect(() => {
    persistMode(mode)
    persistCadence(cadence)
    syncUrlState({ mode, cadence })
  }, [mode, cadence])

  // Subscription input state. Initialised from cadence-specific defaults;
  // cadence switch resets to fresh defaults of the new cadence (per
  // spec-v2 §3.4 design principle). Stage 8 will override on preset select.
  const [subInput, setSubInput] = useState(() => defaultsFor(readInitialCadence()))
  const handleCadenceChange = (next) => {
    if (next === cadence) return
    setCadence(next)
    setSubInput(defaultsFor(next))
  }
  const subValidation = useMemo(
    () => validateSubscriptionInputs(subInput),
    [subInput],
  )

  // Subscription model: funnel cascade + power-law fit on retention paying
  // users + per-cycle revenue/LTV series + payback. Built once per input
  // change. `null` when inputs are invalid (UI hides outputs in that case).
  const subModel = useMemo(() => {
    if (!subValidation.valid) return null
    const retentionFractions = subInput.retention
      .filter((p) => Number.isFinite(p.percent) && p.percent > 0)
      .map((p) => ({ t: p.t, r: p.percent / 100 }))
    if (retentionFractions.length < 2) return null

    const funnel = funnelCascade({
      cohortSize: subInput.cohortSize,
      installToTrial: subInput.installToTrial / 100,
      trialToPaid: subInput.trialToPaid / 100,
      retention: retentionFractions,
      cadence,
    })

    let fit
    try {
      fit = fitPowerLaw(retentionFractions)
    } catch {
      return null
    }

    const series = subscriptionLtv({
      fit,
      payingAtZero: funnel.payingAtZero,
      arpuPaid: subInput.arpuPaid,
      cohortSize: subInput.cohortSize,
      horizon: subInput.horizon,
    })
    const payback = subscriptionPayback(series, subInput.cohortSize, subInput.cac)

    // Long-term retention anchor: M12 for monthly, W26 for weekly. Computed
    // from the fit (not a raw input lookup) so it works regardless of which
    // checkpoints the user keeps in the form.
    const longTermAnchor = cadence === 'weekly' ? 26 : 12
    const r1 = predict(1, fit)
    const longTermRetention = Math.max(
      0,
      Math.min(predict(longTermAnchor, fit), r1),
    )

    return {
      funnel,
      fit,
      series,
      payback,
      longTermAnchor,
      longTermRetention,
      trialsStarted: subInput.cohortSize * (subInput.installToTrial / 100),
      payingAtZero: funnel.payingAtZero,
    }
  }, [subInput, cadence, subValidation.valid])

  // Read once — share-link decoding seeds the initial state below.
  const [shareInitial] = useState(readInitialFromUrl)

  const [points, setPoints] = useState(() =>
    shareInitial?.points?.length
      ? shareInitial.points.map((p) => ({
          id: newPointId(),
          t: p.t,
          percent: p.percent,
        }))
      : DEFAULT_POINTS,
  )
  const [cohortSize, setCohortSize] = useState(
    () => shareInitial?.cohortSize ?? 1000,
  )
  const [arpu, setArpu] = useState(() => shareInitial?.arpu ?? 2)
  const [cacInput, setCacInput] = useState(() =>
    shareInitial?.cacInput != null ? shareInitial.cacInput : '10',
  )
  const [horizon, setHorizon] = useState(() => shareInitial?.horizon ?? 180)

  const [bundle, setBundle] = useState(null)
  const [bundleError, setBundleError] = useState(null)
  const [presetState, setPresetState] = useState(
    () =>
      shareInitial?.presetState ?? {
        presetId: null,
        quality: 'median',
        geo: 'tier_1',
      },
  )
  const [adjustMode, setAdjustMode] = useState(
    () => shareInitial?.adjustMode ?? 'pure',
  ) // 'pure' | 'adjusted'
  const [inputMode, setInputMode] = useState('manual') // 'manual' | 'paste' | 'dau'
  const [pasteText, setPasteText] = useState('')
  const [dauText, setDauText] = useState('')
  const [dauSmoothWindow, setDauSmoothWindow] = useState(0)
  const [bandSigma, setBandSigma] = useState(
    () => shareInitial?.bandSigma ?? 1,
  ) // 1 ≈ 68%, 2 ≈ 95%
  const [shareCopied, setShareCopied] = useState(false)
  // Frozen snapshot of the current outputs — pinned via the "Pin as baseline"
  // button. The live calculator becomes the comparison; charts overlay the
  // baseline as a faded dashed line and KPI cards show Δ from baseline.
  // Shape: { summary, fitSeries, ltv, ltvAtHorizon, beDay, ratio, horizon }
  const [baseline, setBaseline] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadPresets(`${import.meta.env.BASE_URL}presets.json`)
      .then((b) => {
        if (!cancelled) setBundle(b)
      })
      .catch((e) => {
        if (!cancelled) setBundleError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Strip ?s=... from the URL bar after we've consumed it. Keeps subsequent
  // share links from carrying a stale snapshot.
  useEffect(() => {
    if (!shareInitial) return
    const hash = window.location.hash
    const q = hash.indexOf('?')
    if (q < 0) return
    const cleaned = hash.slice(0, q) || '#/'
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}${cleaned}`,
    )
  }, [shareInitial])

  const handlePresetChange = (next, variant) => {
    setPresetState(next)
    if (!variant) return
    setPoints(
      variant.retentionPoints.map((p) => ({
        id: newPointId(),
        t: p.t,
        percent: Math.round(p.r * 1000) / 10,
      })),
    )
    if (variant.arpuPerDay != null) setArpu(variant.arpuPerDay)
    if (variant.cac != null) setCacInput(String(variant.cac))
  }

  const cac = cacInput === '' || cacInput == null ? null : Number(cacInput)

  // Parse the paste-mode input on every keystroke; the result feeds points
  // automatically via the effect below.
  const pasteParsed = useMemo(
    () => (inputMode === 'paste' && pasteText ? parseCohortTable(pasteText) : null),
    [inputMode, pasteText],
  )
  useEffect(() => {
    if (inputMode !== 'paste' || !pasteParsed?.avgPoints) return
    setPoints(
      pasteParsed.avgPoints.map((p) => ({
        id: newPointId(),
        t: p.t,
        percent: Math.round(p.percent * 10) / 10,
      })),
    )
  }, [inputMode, pasteParsed])

  // DAU mode: parse → validate → deconvolve → resample to canonical periods.
  const dauParsed = useMemo(
    () => (inputMode === 'dau' && dauText ? parseDAUTable(dauText) : null),
    [inputMode, dauText],
  )
  const dauValidation = useMemo(
    () =>
      dauParsed && dauParsed.rows.length > 0
        ? validateDAUInput({ newUsers: dauParsed.newUsers, dau: dauParsed.dau })
        : null,
    [dauParsed],
  )
  const dauR = useMemo(() => {
    if (!dauParsed || !dauValidation?.valid) return null
    try {
      return deconvolveDAU(dauParsed.newUsers, dauParsed.dau, {
        smoothWindow: dauSmoothWindow,
      })
    } catch {
      return null
    }
  }, [dauParsed, dauValidation, dauSmoothWindow])
  const dauReconstructed = useMemo(
    () => (dauR ? reconstructDAU(dauParsed.newUsers, dauR) : null),
    [dauR, dauParsed],
  )
  const dauRmsePct = useMemo(() => {
    if (!dauReconstructed || !dauParsed) return null
    let sumSq = 0
    let count = 0
    for (let i = 0; i < dauReconstructed.length; i++) {
      const obs = dauParsed.dau[i]
      if (obs > 0) {
        const rel = (dauReconstructed[i] - obs) / obs
        sumSq += rel * rel
        count++
      }
    }
    return count > 0 ? Math.sqrt(sumSq / count) * 100 : null
  }, [dauReconstructed, dauParsed])

  useEffect(() => {
    if (inputMode !== 'dau' || !dauR) return
    // Resample the dense N-day curve to canonical periods so RetentionInput
    // (max 10 points) and the model fit work cleanly.
    const candidates = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180]
    const sampled = candidates
      .filter((t) => t < dauR.length && dauR[t] > 0)
      .map((t) => ({
        id: newPointId(),
        t,
        percent: Math.round(dauR[t] * 1000) / 10,
      }))
    if (sampled.length >= 3) setPoints(sampled)
  }, [inputMode, dauR])

  const pointErrors = useMemo(() => validateRetentionPoints(points), [points])
  const numericErrors = useMemo(
    () => validateNumericInputs({ cohortSize, arpu, cac, horizon }),
    [cohortSize, arpu, cac, horizon],
  )
  const allValid = pointErrors.valid && numericErrors.valid

  const selectedPreset = useMemo(
    () =>
      bundle && presetState.presetId
        ? bundle.presets.find((p) => p.id === presetState.presetId)
        : null,
    [bundle, presetState.presetId],
  )
  const presetLabel = selectedPreset
    ? presetLabelFor(selectedPreset, presetState)
    : null
  const selectedVariant = useMemo(
    () =>
      selectedPreset
        ? selectedPreset.variants[
            `${presetState.quality}|${presetState.geo}`
          ] ?? null
        : null,
    [selectedPreset, presetState.quality, presetState.geo],
  )

  const userFit = useMemo(
    () => (allValid ? safeFit(points) : null),
    [allValid, points],
  )
  const benchmarkFit = useMemo(
    () => safeBenchmarkFit(selectedVariant),
    [selectedVariant],
  )
  // Adjusted-mode synthetic fit: only meaningful with both a benchmark and user data.
  const adjustedFit = useMemo(
    () =>
      adjustMode === 'adjusted' && benchmarkFit && allValid
        ? adjustFitToBenchmark(points, benchmarkFit)
        : null,
    [adjustMode, benchmarkFit, points, allValid],
  )
  const fit = adjustedFit ?? userFit
  const fitSeries = useMemo(
    () => (fit ? retentionCurve(fit, horizon) : null),
    [fit, horizon],
  )
  // When in adjusted mode, also surface the pure user fit as a dashed alternate.
  const alternateFitSeries = useMemo(
    () => (adjustedFit && userFit ? retentionCurve(userFit, horizon) : null),
    [adjustedFit, userFit, horizon],
  )
  // ±1σ band only meaningful when we have residual dof (se > 0). Adjusted fit
  // sets se = 0 deliberately (see industryAdjusted.js), so band is hidden in
  // adjusted mode — that's correct: the synthetic fit doesn't carry residual
  // uncertainty in a defensible way.
  const retBand = useMemo(
    () => (fit && fit.se > 0 ? retentionBand(fit, horizon, bandSigma) : null),
    [fit, horizon, bandSigma],
  )
  const ltv = useMemo(
    () => (fit ? ltvSeries(fit, arpu, horizon) : null),
    [fit, arpu, horizon],
  )
  const ltvBandSeries = useMemo(
    () => (fit && fit.se > 0 ? ltvBand(fit, arpu, horizon, bandSigma) : null),
    [fit, arpu, horizon, bandSigma],
  )
  const beDay = useMemo(
    () => (ltv ? breakevenDay(ltv, cac) : null),
    [ltv, cac],
  )
  const lastUserT = useMemo(
    () => (points.length ? Math.max(...points.map((p) => p.t)) : 0),
    [points],
  )
  const extrap = useMemo(
    () => extrapolationLevel(lastUserT, horizon),
    [lastUserT, horizon],
  )
  const benchmarkSeries = useMemo(
    () => (benchmarkFit ? retentionCurve(benchmarkFit, horizon) : null),
    [benchmarkFit, horizon],
  )

  const ltvAtHorizon = ltv ? ltv[ltv.length - 1].cumLtv : null

  return (
    <section>
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Calculator</h1>
          <ModeToggle value={mode} onChange={setMode} />
        </div>
        <p className="mt-1 text-sm text-fg-dim">
          {mode === 'session'
            ? 'Power law fit of retention curve, then ARPU × Σ R(t) for LTV.'
            : 'Funnel cascade + retention paying users + LTV per install — for consumer subscription apps.'}
        </p>
      </header>

      {mode === 'subscription' && (
        <div className="grid gap-8 lg:grid-cols-[360px,minmax(0,1fr)]">
          <aside className="space-y-5 rounded-lg border border-line bg-bg-elev/40 p-4">
            <CadenceToggle value={cadence} onChange={handleCadenceChange} />
            <SubscriptionInput
              state={subInput}
              cadence={cadence}
              validation={subValidation}
              onPatch={(partial) =>
                setSubInput((prev) => ({ ...prev, ...partial }))
              }
            />
          </aside>
          <div className="space-y-5">
            {!subValidation.valid && (
              <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">
                Fix the input panel to see the model output.
              </div>
            )}
            {subModel && (
              <>
                <SubscriptionKPI
                  ltvPerInstall={
                    subModel.series[subModel.series.length - 1].cumLtvPerInstall
                  }
                  cac={subInput.cac}
                  payback={subModel.payback}
                  trialToPaid={subInput.trialToPaid}
                  longTermRetention={subModel.longTermRetention}
                  longTermAnchor={subModel.longTermAnchor}
                  horizon={subInput.horizon}
                  cadence={cadence}
                />
                <FunnelWaterfall steps={subModel.funnel.steps} />
                <SubscriptionCohortPL
                  cohortSize={subInput.cohortSize}
                  cac={subInput.cac}
                  trialsStarted={subModel.trialsStarted}
                  payingAtZero={subModel.payingAtZero}
                  ltvSeries={subModel.series}
                  horizon={subInput.horizon}
                  payback={subModel.payback}
                  cadence={cadence}
                />
                <div className="rounded-lg border border-dashed border-line bg-bg-elev/30 p-4 text-xs text-fg-faint">
                  Retention curve и Cumulative LTV chart — Stage 6.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'session' && (
      <div className="grid gap-8 lg:grid-cols-[360px,minmax(0,1fr)]">
        <aside className="space-y-5 rounded-lg border border-line bg-bg-elev/40 p-4">
          {bundleError && (
            <div className="rounded border border-red-900/50 bg-red-950/40 p-2 text-xs text-red-300">
              Failed to load presets: {bundleError}
            </div>
          )}

          <PresetSelector
            bundle={bundle}
            value={presetState}
            onChange={handlePresetChange}
          />

          {selectedPreset && (
            <ForecastModeToggle
              mode={adjustMode}
              onChange={setAdjustMode}
              avgRatio={adjustedFit?.avgRatio}
            />
          )}

          <BandSigmaToggle
            sigma={bandSigma}
            onChange={setBandSigma}
            disabled={!retBand}
          />

          <div className="space-y-3 border-t border-line pt-4">
            <InputModeToggle mode={inputMode} onChange={setInputMode} />
            {inputMode === 'manual' && (
              <>
                <RetentionInput
                  points={points}
                  onChange={setPoints}
                  errors={pointErrors.byId}
                />
                {pointErrors.formError && (
                  <div className="text-xs text-red-400">
                    {pointErrors.formError}
                  </div>
                )}
              </>
            )}
            {inputMode === 'paste' && (
              <CohortPaste
                text={pasteText}
                onTextChange={setPasteText}
                parsed={pasteParsed}
              />
            )}
            {inputMode === 'dau' && (
              <DAUInput
                text={dauText}
                onTextChange={setDauText}
                parsed={dauParsed}
                validation={dauValidation}
                smoothWindow={dauSmoothWindow}
                onSmoothChange={setDauSmoothWindow}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
            <NumberField
              label="Cohort size"
              value={cohortSize}
              min={1}
              step={1}
              suffix="users"
              onChange={(v) => setCohortSize(Number(v))}
              error={numericErrors.errors.cohortSize}
              tooltip={
                <>
                  <p>
                    Размер привлекаемой когорты — сколько новых юзеров приходит
                    в один заход.
                  </p>
                  <p className="mt-1.5">
                    Влияет только на абсолютные значения в Cohort P&amp;L
                    (умножает revenue и CAC). Per-user метрики (LTV, R²,
                    LTV/CAC) от размера когорты не зависят.
                  </p>
                </>
              }
            />
            <NumberField
              label="ARPU"
              value={arpu}
              min={0}
              step={0.01}
              suffix="$ / day"
              onChange={(v) => setArpu(Number(v))}
              error={numericErrors.errors.arpu}
              tooltipAlign="right"
              tooltip={
                <>
                  <p>
                    Average Revenue Per User — каноническая величина в этом
                    калькуляторе именно дневная (per-day), а не ARPDAU и не
                    monthly.
                  </p>
                  <p className="mt-1.5">
                    Для подписочных продуктов берите monthly subscription / 30.
                    Для рекламной монетизации — общий дневной доход / число
                    DAU. Для iGaming — daily NGR на активного депозитора.
                  </p>
                </>
              }
            />
            <NumberField
              label="CAC"
              value={cacInput}
              min={0}
              step={0.01}
              suffix="$ (optional)"
              onChange={setCacInput}
              error={numericErrors.errors.cac}
              hint="Empty hides breakeven"
              tooltip={
                <>
                  <p>
                    Customer Acquisition Cost — полная стоимость привлечения
                    одного юзера: paid acquisition + креативы + агентские fees.
                  </p>
                  <p className="mt-1.5">
                    Для iGaming используйте CAC per FTD (per first-time
                    depositor), не per install — иначе соотношение с LTV
                    бессмысленно. Если оставить пусто, KPI Breakeven, LTV/CAC
                    и Payback не считаются.
                  </p>
                </>
              }
            />
            <NumberField
              label="Horizon"
              value={horizon}
              min={30}
              step={1}
              suffix="days"
              onChange={(v) => setHorizon(Number(v))}
              error={numericErrors.errors.horizon}
              tooltipAlign="right"
              tooltip={
                <>
                  <p>
                    Окно прогноза LTV в днях. Predicted LTV =
                    Σ ARPU·R(t) от t=1 до t=horizon.
                  </p>
                  <p className="mt-1.5">
                    Чем больше горизонт, тем больше неопределённость прогноза —
                    после ~3× от вашей последней точки данных модель
                    экстраполирует. Стандартные значения: 30 / 60 / 90 / 180 /
                    365.
                  </p>
                </>
              }
            />
          </div>
        </aside>

        <section aria-label="Outputs" className="space-y-5">
          {inputMode === 'dau' && dauReconstructed && dauParsed && (
            <DAUChart
              observed={dauParsed.dau}
              reconstructed={dauReconstructed}
              rmsePct={dauRmsePct}
            />
          )}

          {!allValid && (
            <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">
              Fix the input panel to see the model output.
            </div>
          )}

          {allValid && fit && ltv && fitSeries && (
            <>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (baseline) {
                      setBaseline(null)
                      return
                    }
                    setBaseline({
                      fitSeries: fitSeries.map((p) => ({ t: p.t, r: p.r })),
                      ltv: ltv.map((p) => ({
                        t: p.t,
                        cumLtv: p.cumLtv,
                        revenue: p.revenue,
                      })),
                      ltvAtHorizon,
                      beDay,
                      ratio: cac != null && cac > 0 ? ltvAtHorizon / cac : null,
                      rSquared: fit.rSquared,
                      horizon,
                      cohortSize,
                      cac,
                      arpu,
                      presetLabel: presetLabel ?? 'Custom',
                    })
                  }}
                  className={`rounded border px-3 py-1.5 text-xs transition-colors ${
                    baseline
                      ? 'border-accent/60 bg-accent-surface/30 text-accent-fg hover:border-accent'
                      : 'border-line-strong bg-bg-subtle text-fg-muted hover:border-accent/50 hover:text-accent-fg'
                  }`}
                >
                  {baseline ? '× Clear baseline' : '📌 Pin as baseline'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const encoded = encodeState({
                      points,
                      cohortSize,
                      arpu,
                      cacInput,
                      horizon,
                      presetState,
                      adjustMode,
                      bandSigma,
                    })
                    const url = buildShareUrl(
                      encoded,
                      window.location.origin + window.location.pathname,
                    )
                    try {
                      await navigator.clipboard.writeText(url)
                      setShareCopied(true)
                      setTimeout(() => setShareCopied(false), 2000)
                    } catch {
                      window.prompt('Copy share link:', url)
                    }
                  }}
                  className={`rounded border px-3 py-1.5 text-xs transition-colors ${
                    shareCopied
                      ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300'
                      : 'border-line-strong bg-bg-subtle text-fg-muted hover:border-accent/50 hover:text-accent-fg'
                  }`}
                >
                  {shareCopied ? 'Copied ✓' : 'Copy share link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const timestamp = new Date().toISOString()
                    const csv = buildCsv({
                      timestamp,
                      mode: adjustMode,
                      presetLabel,
                      bandSigma,
                      inputs: {
                        arpuPerDay: arpu,
                        cac,
                        cohortSize,
                        horizon,
                      },
                      fit: {
                        a: fit.a,
                        b: fit.b,
                        se: fit.se,
                        rSquared: fit.rSquared,
                        n: fit.n ?? points.length,
                      },
                      kpi: {
                        ltvAtHorizon,
                        beDay,
                        ltvCacRatio:
                          cac != null && cac > 0 ? ltvAtHorizon / cac : null,
                        paybackDays: cac != null && cac > 0 ? beDay : null,
                      },
                      userPoints: points.map((p) => ({ t: p.t, percent: p.percent })),
                      series: ltv,
                    })
                    downloadFile(
                      csv,
                      buildFilename({ timestamp, presetLabel }),
                      'text/csv;charset=utf-8',
                    )
                  }}
                  className="rounded border border-line-strong bg-bg-subtle px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-accent-fg"
                >
                  Download CSV
                </button>
              </div>
              {baseline && (
                <div className="relative rounded border border-accent/40 bg-accent-surface/20 py-2 pl-3 pr-8 text-xs">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
                    <span className="text-fg-faint">📌 Baseline</span>
                    {[
                      ['ARPU', `$${baseline.arpu}`],
                      ['CAC', baseline.cac != null ? `$${baseline.cac}` : '—'],
                      ['LTV', fmtMoney(baseline.ltvAtHorizon)],
                      ['R²', Number.isFinite(baseline.rSquared) ? baseline.rSquared.toFixed(3) : '—'],
                      ['BE', baseline.beDay != null ? `D${baseline.beDay}` : 'not reached'],
                      ...(baseline.ratio != null
                        ? [['LTV/CAC', baseline.ratio.toFixed(2)]]
                        : []),
                      ...(baseline.cac != null && baseline.cac > 0
                        ? [['Payback', baseline.beDay != null ? `${baseline.beDay}d` : '—']]
                        : []),
                    ].map(([label, value]) => (
                      <span key={label} className="flex items-baseline gap-1 whitespace-nowrap">
                        <span className="text-fg-faint">·</span>
                        <span className="text-fg-faint">{label}</span>
                        <span className="text-fg">{value}</span>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBaseline(null)}
                    aria-label="Clear baseline"
                    className="absolute right-2 top-1.5 text-fg-faint transition-colors hover:text-fg"
                  >
                    ×
                  </button>
                </div>
              )}
              <KPICards
                ltvAtHorizon={ltvAtHorizon}
                horizon={horizon}
                rSquared={fit.rSquared}
                beDay={beDay}
                cac={cac}
                baseline={baseline}
              />
              {extrap !== 'none' && (
                <ExtrapolationBanner level={extrap} lastUserT={lastUserT} horizon={horizon} />
              )}
              <RetentionChart
                userPoints={points}
                fitSeries={fitSeries}
                alternateFitSeries={alternateFitSeries}
                alternateLabel="Pure user fit"
                bandSeries={retBand}
                bandSigma={bandSigma}
                benchmarkSeries={benchmarkSeries}
                baselineSeries={baseline?.fitSeries}
                horizon={horizon}
                lastUserT={lastUserT}
                presetLabel={presetLabel}
              />
              <LTVChart
                series={ltv}
                bandSeries={ltvBandSeries}
                bandSigma={bandSigma}
                cac={cac}
                beDay={beDay}
                horizon={horizon}
                lastUserT={lastUserT}
                baselineSeries={baseline?.ltv}
                presetLabel={presetLabel}
              />
              <RevenueChart
                series={ltv}
                cohortSize={cohortSize}
                horizon={horizon}
                baselineSeries={baseline?.ltv}
                baselineCohortSize={baseline?.cohortSize}
                presetLabel={presetLabel}
              />
              <ResultsTable
                series={ltv}
                points={points}
                horizon={horizon}
                cohortSize={cohortSize}
                cac={cac}
                presetLabel={presetLabel}
              />
              {cac != null && cac > 0 ? (
                <CohortPL
                  series={ltv}
                  cohortSize={cohortSize}
                  cac={cac}
                  beDay={beDay}
                  horizon={horizon}
                  baselineSeries={baseline?.ltv}
                  baselineCohortSize={baseline?.cohortSize}
                  presetLabel={presetLabel}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-line p-4 text-xs text-fg-faint">
                  Enter a CAC to see the per-cohort P&amp;L block.
                </div>
              )}
            </>
          )}
        </section>
      </div>
      )}
    </section>
  )
}

