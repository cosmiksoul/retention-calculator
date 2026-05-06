# Claude Code — контекст проекта

## Что это

Веб-калькулятор Retention & LTV. Проект для личного бренда: выкатывается на GitHub Pages, описывается в посте, разбирается широкой аудиторией продуктовиков/маркетологов/менеджеров.

**Принципиально не black box.** Раздел методологии — отдельная полноценная страница с формулой power law, ограничениями модели и источниками каждого пресета.

## С чего начать

**Калькулятор использует одну унифицированную модель** с переключаемым period (`day` / `week` / `month`) и опциональным n-step funnel:

- `funnel = []` ⇒ DAU semantics (cohort = active pool, ARPU per cohort entrant per period). Подходит для игр, iGaming, sportsbook.
- `funnel = [install→trial, trial→paid]` ⇒ subscription cascade. Acquired pool = paying users, ARPU per paying user per period. Поддерживает weekly + monthly cadence для consumer subscription apps.

До рефакторинга (май 2026) это были две отдельные модели (v1 Session retention + v2 Subscription). См. `docs/spec.md` и `docs/spec-v2-subscription.md` для исторического контекста.

1. **Прочитай `docs/spec.md`** — оригинальная спецификация v1 + раздел про unification сверху.
2. **Прочитай `docs/spec-v2-subscription.md`** — оригинальная v2 spec для контекста; модель устарела, но methodology references актуальны.
3. **Прочитай `docs/methodology.md`** и `docs/methodology-subscription.md` — source-of-truth по источникам пресетов. Рендерятся последовательно на странице `/methodology` (две группы пресетов с разными data sources).
4. **Прочитай `docs/presets.json`** — единый bundle, 14 пресетов (7 DAU-style + 7 subscription) в schema v2.0.

## Карта файлов

```
docs/spec.md                       ← v1 спецификация (с post-refactor нотой)
docs/spec-v2-subscription.md       ← v2 спецификация (исторический контекст)
docs/methodology.md                ← методология + источники DAU-стилевых пресетов
docs/methodology-subscription.md   ← методология + источники subscription-пресетов
docs/presets.json                  ← единый bundle всех пресетов (schema v2.0)
README.md                          ← витрина для GitHub
CLAUDE.md                          ← этот файл
scripts/migrate-presets.js         ← одноразовый migration tool (исторический)
scripts/copy-data.js               ← копирует docs/* в public/ для Vite
```

## Жёсткие ограничения

- **Хостинг:** только GitHub Pages (статика). Никакого бэкенда, БД, env-переменных
- **Не black box:** методология как полноценная страница с anchor-навигацией, не expandable-блок
- **Источники цифр:** для DAU-стилевых пресетов — `docs/methodology.md`; для subscription-пресетов — `docs/methodology-subscription.md`. В `presets.json` поле `sources` намеренно отсутствует — не плодим дубли
- **Преcет schema v2.0:** каждый preset declares `cadence_default` + `cadence_supported`. Variants содержат `funnel`, `retention.{day|week|month}`, `arpu_per_period.{day|week|month}`, `cac_per_acquired`, `display`. См. `src/lib/presetsLoader.js` для нормализованной формы.
- **ARPU нормализация:** канонический `arpu_per_period.<period>` per period в variants. Поля `arpu_monthly` / `arpu_annual` / `arpdau` / `arpu_paid_monthly|weekly` — display-only под `display`.

## Стек

React 18 + Vite + Recharts + Tailwind + react-router-dom (HashRouter) + react-markdown + Vitest.

Если в процессе видишь, что что-то лучше делать иначе — обсуди с пользователем перед тем как менять.

## Структура проекта (актуальное состояние)

```
src/lib/
  powerLaw.js          fitPowerLaw / predict / retentionCurve / retentionBand / extrapolationLevel
  calc.js              унифицированное math-ядро: funnelCascade, cohortLtv, cohortLtvBand, payback,
                       periodAbbr, periodUnit, periodLabel, periodTicks
  industryAdjusted.js  benchmark-based shape rescaling (period-agnostic)
  presetsLoader.js     normalizePresetsBundle, loadPresets, variantForPeriod
  share.js             v2 schema (period в payload, funnel массив)
  exportCsv.js         единый buildCsv, period-aware колонки
  validate.js          validateRetentionPoints (minPoints option), validateFunnel, validateNumericInputs
  parseCohort.js, parseDAU.js, deconvolution.js  (input modes — без изменений)
  baselineDelta.js, exportPng.js, idGen.js, useThemeColors.js  (utility)

src/components/
  PeriodSelector.jsx   day/week/month радио с per-period data indicators
  FunnelSection.jsx    collapsible n-step (до 5) funnel input
  FunnelWaterfall.jsx  generic n-step cascade visualization
  PresetSelector.jsx   единый dropdown с optgroup по category
  KPICards.jsx         унифицированный 5-card period-aware блок
  RetentionChart, LTVChart, RevenueChart, ResultsTable, CohortPL  (period-aware)
  RetentionInput, CohortPaste, DAUInput, DAUChart, ExtrapolationBanner,
  ForecastModeToggle, BandSigmaToggle, HoverHint, ExportPngButton

src/pages/
  Calculator.jsx       единый render path (нет mode-toggle); state: { period, points, funnel, ... }
  Methodology.jsx      рендер двух methodology файлов с sticky TOC

tests/lib/
  calc.test.js, integration.test.js, presetsLoader.test.js, share.test.js,
  exportCsv.test.js, validate.test.js, powerLaw.test.js, industryAdjusted.test.js,
  parseCohort.test.js, parseDAU.test.js, deconvolution.test.js
  ~165 тестов, все зелёные
```

## Чего не делать без обсуждения

- Не добавлять backend / API
- Не уходить от GitHub Pages-совместимого билда
- Не править `methodology.md` или `methodology-subscription.md` без аккуратной причины — это публичный контент
- Не добавлять `sources` обратно в `presets.json` — источники в methodology файлах
- **Не возрождать mode-toggle.** Calculator теперь единый; period — runtime-toggle, не архитектурное разветвление.

## Definition of Done

См. §7 ТЗ (`docs/spec.md`).

## Контактные точки

- Все вопросы по продукту — пользователь (владелец репо)
- Канонический язык методологии — русский (исходник `methodology.md` русскоязычный)
- Канонический язык UI — английский (см. §9 ТЗ)
