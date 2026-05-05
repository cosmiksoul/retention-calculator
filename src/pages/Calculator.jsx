import { useEffect, useMemo, useState } from 'react'
import RetentionInput, {
  DEFAULT_POINTS,
  newPointId,
} from '../components/RetentionInput.jsx'
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

const inputCls =
  'rounded border border-slate-700 bg-bg-subtle px-2 py-1 text-sm tabular-nums ' +
  'text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40'

function NumberField({ label, value, onChange, hint, error, min, step, suffix }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">
        {label}
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
        <span className="mt-1 block text-xs text-slate-500">{suffix}</span>
      )}
      {hint && !error && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  )
}

function BandSigmaToggle({ sigma, onChange, disabled }) {
  const radio = (k, label) => (
    <label
      className={`flex items-center gap-1.5 text-xs ${
        disabled ? 'text-slate-600' : 'text-slate-300'
      }`}
    >
      <input
        type="radio"
        name="band-sigma"
        value={k}
        checked={sigma === k}
        onChange={() => onChange(k)}
        disabled={disabled}
        className="accent-cyan-500"
      />
      {label}
    </label>
  )
  return (
    <div className="rounded border border-slate-800 bg-bg-elev/30 p-2">
      <div className="mb-1.5 text-xs font-medium text-slate-300">
        Confidence band
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {radio(1, '±1σ ≈ 68%')}
        {radio(2, '±2σ ≈ 95%')}
      </div>
      {disabled && (
        <div className="mt-1 text-[11px] leading-snug text-slate-500">
          Band requires ≥3 user points (residual degrees of freedom). It is also
          hidden in industry-adjusted mode.
        </div>
      )}
    </div>
  )
}

function InputModeToggle({ mode, onChange }) {
  const radio = (key, label) => (
    <label className="flex items-center gap-1.5 text-xs text-slate-300">
      <input
        type="radio"
        name="input-mode"
        value={key}
        checked={mode === key}
        onChange={() => onChange(key)}
        className="accent-cyan-500"
      />
      {label}
    </label>
  )
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {radio('manual', 'Manual input')}
      {radio('paste', 'Paste cohort table')}
      {radio('dau', 'Paste DAU + new users')}
    </div>
  )
}

function ModeToggle({ mode, onChange, avgRatio }) {
  const radio = (key, label) => (
    <label className="flex items-center gap-1.5 text-xs text-slate-300">
      <input
        type="radio"
        name="adjust-mode"
        value={key}
        checked={mode === key}
        onChange={() => onChange(key)}
        className="accent-cyan-500"
      />
      {label}
    </label>
  )
  return (
    <div className="rounded border border-slate-800 bg-bg-elev/30 p-2">
      <div className="mb-1.5 text-xs font-medium text-slate-300">Forecast mode</div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {radio('pure', 'Pure fit')}
        {radio('adjusted', 'Industry-adjusted')}
      </div>
      {mode === 'adjusted' && avgRatio != null && (
        <div className="mt-1.5 text-[11px] leading-snug text-slate-500">
          Adjusted = benchmark × {avgRatio.toFixed(2)}× (geometric mean of your
          point/benchmark ratios). Confidence band hidden — synthetic fit doesn't
          carry residual uncertainty.
        </div>
      )}
      {mode === 'pure' && (
        <div className="mt-1 text-[11px] leading-snug text-slate-500">
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
  const [points, setPoints] = useState(DEFAULT_POINTS)
  const [cohortSize, setCohortSize] = useState(1000)
  const [arpu, setArpu] = useState(2)
  const [cacInput, setCacInput] = useState('10')
  const [horizon, setHorizon] = useState(180)

  const [bundle, setBundle] = useState(null)
  const [bundleError, setBundleError] = useState(null)
  const [presetState, setPresetState] = useState({
    presetId: null,
    quality: 'median',
    geo: 'tier_1',
  })
  const [adjustMode, setAdjustMode] = useState('pure') // 'pure' | 'adjusted'
  const [inputMode, setInputMode] = useState('manual') // 'manual' | 'paste' | 'dau'
  const [pasteText, setPasteText] = useState('')
  const [dauText, setDauText] = useState('')
  const [dauSmoothWindow, setDauSmoothWindow] = useState(0)
  const [bandSigma, setBandSigma] = useState(1) // 1 ≈ 68%, 2 ≈ 95%

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
        <h1 className="text-3xl font-semibold tracking-tight">Calculator</h1>
        <p className="mt-1 text-sm text-slate-400">
          Power law fit of retention curve, then ARPU × Σ R(t) for LTV.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[360px,1fr]">
        <aside className="space-y-5 rounded-lg border border-slate-800 bg-bg-elev/40 p-4">
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
            <ModeToggle
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

          <div className="space-y-3 border-t border-slate-800 pt-4">
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

          <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
            <NumberField
              label="Cohort size"
              value={cohortSize}
              min={1}
              step={1}
              suffix="users"
              onChange={(v) => setCohortSize(Number(v))}
              error={numericErrors.errors.cohortSize}
            />
            <NumberField
              label="ARPU"
              value={arpu}
              min={0}
              step={0.01}
              suffix="$ / day"
              onChange={(v) => setArpu(Number(v))}
              error={numericErrors.errors.arpu}
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
            />
            <NumberField
              label="Horizon"
              value={horizon}
              min={30}
              step={1}
              suffix="days"
              onChange={(v) => setHorizon(Number(v))}
              error={numericErrors.errors.horizon}
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
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const timestamp = new Date().toISOString()
                    const presetLabel = presetLabelFor(selectedPreset, presetState)
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
                  className="rounded border border-slate-700 bg-bg-subtle px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                >
                  Download CSV
                </button>
              </div>
              <KPICards
                ltvAtHorizon={ltvAtHorizon}
                horizon={horizon}
                rSquared={fit.rSquared}
                beDay={beDay}
                cac={cac}
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
                horizon={horizon}
                lastUserT={lastUserT}
              />
              <LTVChart
                series={ltv}
                bandSeries={ltvBandSeries}
                bandSigma={bandSigma}
                cac={cac}
                beDay={beDay}
                horizon={horizon}
                lastUserT={lastUserT}
              />
              <RevenueChart
                series={ltv}
                cohortSize={cohortSize}
                horizon={horizon}
              />
              <ResultsTable
                series={ltv}
                points={points}
                horizon={horizon}
                cohortSize={cohortSize}
                cac={cac}
              />
              {cac != null && cac > 0 ? (
                <CohortPL
                  series={ltv}
                  cohortSize={cohortSize}
                  cac={cac}
                  beDay={beDay}
                  horizon={horizon}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-800 p-4 text-xs text-slate-500">
                  Enter a CAC to see the per-cohort P&amp;L block.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </section>
  )
}
