# Стартовый промт для Claude Code — v2 Subscription Mode

Скопировать и вставить в Claude Code как первое сообщение в новой сессии **на ветке `v2-subscription-mode`**.

---

Привет. v1 калькулятора задеплоен и работает (см. main). Сейчас работаем над v2: добавляем **Subscription mode** — вторую модель калькулятора для consumer subscription apps (VPN, fitness, photo editors, dating, AI companions). v1 не трогаем, только расширяем.

Не пиши пока код — сначала разберись и согласуй план со мной.

## Задачи на эту сессию (по порядку)

1. **Прочитай контекст в порядке**:
   - `temp/spec-v2-subscription.md` — спека на v2, главный документ этой сессии
   - `temp/presets-subs.json` — данные subscription пресетов (35 вариантов monthly + 4 варианта с weekly retention)
   - `temp/methodology-subs.md` — методология и источники subscription пресетов (включая секцию Weekly retention sourcing)
   - `temp/weekly-research-findings.md` — audit trail исследования weekly данных (просто пробежать чтобы понять confidence levels)
   - Затем — `docs/spec.md` (v1 спека, чтобы понимать как устроено существующее)
   - Затем — `CLAUDE.md`, `docs/methodology.md`, `docs/presets.json` для общего контекста

   После каждого файла — короткий «прочитал».

   **Важно про weekly данные:** только 4 варианта в JSON имеют `retention_weekly` поле — `subs_utilities` (top + median T1) и `subs_photo_video` (top + median T1). Остальные пресеты имеют `weekly_data_status: "not_applicable"`. Calculator должен корректно показывать cadence-toggle disabled state для пресетов без weekly data — это критично для honest UX.

2. **После чтения — задай 5-10 уточняющих вопросов** по местам где спека v2 неоднозначна или где у тебя сомнения. Особое внимание:
   - Mode-dispatch в `Calculator.jsx`: рефакторинг существующих компонентов или wrapper-pattern?
   - Power law fit для двух cadence (monthly и weekly) — переиспользуем `src/lib/powerLaw.js` параметризацией t, или новый модуль с явной cadence-аргументацией?
   - URL state: как именно переиспользовать существующий router-state-manager для `mode` + `cadence`?
   - Cadence-toggle disabled state когда пресет не имеет `retention_weekly` — visual treatment?
   - При переключении cadence — confirm-dialog или toast undo?
   - Methodology page: один markdown chunk или два section'а с anchor namespacing?
   - Дизайн funnel waterfall — простой SVG/divs или взять recharts Funnel?

   Жди мои ответы.

3. **После ответов — предложи план реализации v2** с разбивкой:
   - Stage 1: перенос файлов из `temp/` в `docs/` + обновление cross-refs (spec.md §0/§10, CLAUDE.md, README.md). Это первый коммит на ветке
   - Stage 2: math-ядро (`src/lib/subscriptionMath.js`) с юнит-тестами **до** UI; функции параметризованы по cadence (monthly / weekly)
   - Stage 3: ModeToggle + Cadence sub-toggle + dispatch в Calculator.jsx
   - Stage 4: Subscription input form (одна форма с cadence-зависимой меткой/единицами)
   - Stage 5: Subscription KPI + Funnel waterfall + Cohort P&L (поддержка обеих cadence)
   - Stage 6: charts (Retention curve и Cumulative LTV — оси и метки зависят от cadence)
   - Stage 7: Methodology page — рендер обоих файлов с объединённым TOC; добавление секции про cadence
   - Stage 8: integration с пресетами (загрузка обоих JSON, авто-mode-switch + auto-cadence по `dominant_plan`, disabled state если weekly данных нет)
   - Stage 9: visual polish + mobile responsive проверка
   - Stage 10: финальная сверка с DoD из spec-v2 §8

   На каждом stage — точка моего подтверждения перед движением дальше. Не лети марафон в одно сообщение.

4. **После моего «ок» на план** — стартуй со Stage 1 (перенос файлов). Проверь, что после переноса temp/ пусто или содержит только этот файл-промт.

## Жёсткие ограничения

- **v1 не ломаем.** Все changes additive. Существующие тесты должны продолжать проходить
- **Только GitHub Pages** — никакого бэкенда, никаких новых рантайм-зависимостей помимо тех что уже есть (можно добавить только если очень нужно — обсуди со мной)
- **Источники цифр** живут в `docs/methodology-subscription.md` — в `presets-subscription.json` поле `sources` уже удалено, не добавляй обратно
- **Math чистота** — никаких хаков типа «давай power law напрямую на funnel-conversion-как-retention». Subscription model описана в spec-v2 §4 — следуй ей
- **Branch:** ты сейчас на `v2-subscription-mode`. Не мерджи в main без моего ручного указания

## Что ожидать

- Объём работы — больше чем v1 не был. Spec-v2 содержит ~12 секций; planируй итерациями по stage
- Будет много моментов где я попрошу остановиться и проверить визуально на localhost
- В конце — pull request в main с DoD checklist в описании

## Если в процессе видишь противоречие в спеке или с v1

Останавливайся, показывай конкретное место (cite файл и строку), предлагай 2 варианта разрешения, жди мой ответ. Не правь молча.

Начинай с шага 1 — чтение файлов.
