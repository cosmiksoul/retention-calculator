# spec-v2 — Subscription Mode

> **Post-refactor note (2026-05-06):** этот документ описывает v2 как
> отдельный режим (mode-toggle, parallel state, dual cadence). После
> refactor `unified-calculator` v2 поглощён единой моделью с переключаемым
> `period` и n-step funnel; `presets-subscription.json` и
> `presets.json` объединены в один bundle с `cadence_default`/
> `cadence_supported` per preset. Subscription cascade =
> `funnel: [install→trial, trial→paid] + period: 'month'|'week'`.
> Документ сохранён как исторический контекст и source-of-truth для
> предметных требований (KPI набор, funnel waterfall, плановые
> бейджи). Текущая архитектура — в `CLAUDE.md`.

> Это **дополнение** к `docs/spec.md`. v1 (Session retention mode) уже задеплоен и работает. v2 добавляет вторую модель калькулятора — **Subscription mode** — для consumer subscription apps (VPN, fitness, photo editors, dating, AI companions, etc.). Существующая модель не меняется. v2 — additive.
>
> **Где этот файл живёт:** при разработке v2 — в `temp/spec-v2-subscription.md` (gitignored, локально). Claude Code в рамках работы над v2-ткой переносит этот файл в `docs/spec-v2-subscription.md` (см. §10).

## 0. Контекст и связь с v1

`docs/spec.md` (далее «v1 spec») остаётся каноническим документом. v2 ссылается на него для всего общего:

- Тех. стек (§5 v1) — без изменений: React + Vite + Recharts + Tailwind + HashRouter + react-markdown
- Жёсткие ограничения (GH Pages-only, без бэкенда) — без изменений
- Layout, theming, mobile responsive, header navigation — те же подходы
- Core math для session mode — не трогаем
- Methodology page — расширяется (§7 этого документа)

После реализации v2 в `docs/spec.md` обновляются только два места: §0 (карта документов с v2 файлом) и §10 (subscription из «вне скоупа v1» снимается с пометкой «реализован в v2»).

## 1. Зачем v2

Половина продуктовых разработчиков в СНГ-сегменте работают на subscription apps (VPN, photo editors, fitness, AI chat companions). У них своя метрическая модель: `install → trial → paid` funnel + retention paying subscribers + ARPU. Текущий калькулятор не говорит на их языке: ввод «D7 retention 5%» для них бессмысленен, потому что они не считают retention так.

Subscription mode даёт им:
1. **Родной интерфейс**: вижу funnel, вижу retention paying, вижу LTV per install
2. **Видимую точку утечки**: trial-to-paid? первый billing cycle? annual renewal cliff?
3. **Виральность**: «вот тебе калькулятор который понимает unit economics твоей VPN/диеты/AI-companion»

### Две cadence — weekly и monthly

Subscription apps работают на двух типичных billing-режимах:
- **Weekly billing** ($4.99–$9.99/week): VPN, photo editors, casual utilities. Главная фишка — «trial trap» pattern: W1 retention обычно 70-85%, но многие из этих юзеров просто забыли отменить
- **Monthly / Annual billing** ($9.99/mo, $59.99/yr): wellness, language learning, dating, AI companions. Retention считается в месяцах, главные точки M1/M3/M12

Калькулятор поддерживает **обе cadence через toggle**. Weekly cohort и Monthly cohort — две стороны одного продукта; для weekly-trap apps честнее показывать недельную динамику (видно W1 cliff), для annual subscriptions — месячную (видно M12 renewal). Юзер выбирает что ему ближе по природе продукта.

## 2. Общий UX — Mode Toggle

В верхней части input panel (выше блока «Industry preset») сегмент-toggle:

```
[ Session retention ]   [ Subscription ]
```

**Переключение:**
- Кликом — мгновенно меняется input panel (форма) и output (KPI/чарты)
- Автоматически — при выборе пресета. Subscription preset → mode = Subscription. Session preset → mode = Session
- URL state: query параметр `?mode=subscription` поверх hash route. Дефолт — `session`. Шеринг через URL должен сохранять mode

**Сохранение состояния:** `localStorage` запоминает последний выбранный mode для возврата на сайт (но URL переопределяет, если в нём есть `mode=`).

### 2.1. Cadence sub-toggle (внутри Subscription)

Под mode-toggle, внутри Subscription панели:

```
Cadence:  [ Weekly cohort ]   [ Monthly cohort ]
```

- **Monthly cohort** (дефолт) — retention в месяцах M1/M3/M6/M12, ARPU paid per month, horizon в месяцах
- **Weekly cohort** — retention в неделях W1/W2/W4/W8/W12/W26, ARPU paid per week, horizon в неделях
- Переключение мгновенное, форма ввода и единицы output меняются
- URL state: `?mode=subscription&cadence=weekly` или `?mode=subscription&cadence=monthly`. Дефолт — monthly
- При выборе пресета: если пресет отдаёт сигнал предпочтительной cadence (поле `dominant_plan`) — cadence auto-set:
  - `weekly` или `monthly_with_some_weekly` → cadence = weekly
  - `monthly`, `annual`, `annual_then_monthly` → cadence = monthly
- Если пресет не имеет данных под выбранную cadence — cadence-toggle disabled с tooltip: «No weekly cohort data for this preset; switch to manual input or pick monthly»

## 3. Subscription Mode — Inputs

Полная замена input panel. Все поля с разумными дефолтами + tooltip-объяснение что это (важно для аудитории — не каждый знает разницу между trial-to-paid и conversion rate).

Структура одинаковая для weekly и monthly cadence — отличаются только метки и единицы:

### 3.1. Funnel

| Поле | Тип | Дефолт | Tooltip |
|---|---|---|---|
| Install → Trial | %, 0-100 | 8.6 | % инсталлов, начавших free trial. RevenueCat медиана для Utilities. Ниже = плохой onboarding или невыразительный paywall |
| Trial → Paid | %, 0-100 | 35.0 | % triаls, оплативших после trial. **Главная переменная subscription unit economics** |

### 3.2. Retention (% of paying)

Минимум 2 точки, максимум 4-6 в зависимости от cadence. По дефолту все.

**Monthly cadence:**

| Поле | Дефолт | Описание |
|---|---|---|
| M1 | 50 | % paying пользователей живых на месяце 1 |
| M3 | 32 | На месяце 3 |
| M6 | 22 | На месяце 6 |
| M12 | 12 | На месяце 12 (annual renewal point) |

**Weekly cadence:**

| Поле | Дефолт | Описание |
|---|---|---|
| W1 | 75 | % paying живых после первого weekly billing cycle. Главная точка для weekly-trap apps |
| W2 | 65 | После 2-го billing |
| W4 | 50 | После месяца weekly billing |
| W8 | 38 | После 2 месяцев |
| W12 | 30 | После квартала |
| W26 | 18 | Полугодовая точка (опц.) |

**Валидация:** retention monotonic non-increasing (M1 ≥ M3 ≥ M6 ≥ M12 для monthly; W1 ≥ W2 ≥ W4 ≥ W8 ≥ W12 ≥ W26 для weekly; могут быть равны). Если ввели меньше 2 точек или нарушен порядок — disable «Calculate», показать ошибку.

### 3.3. Pricing & Cohort

| Поле | Дефолт (monthly) | Дефолт (weekly) | Описание |
|---|---|---|---|
| ARPU paid | $12/mo | $7.99/wk | Средний доход на платящего юзера за один billing cycle |
| CAC per install | $2.10 | $2.10 | Стоимость одного инсталла (не платящего!). Не зависит от cadence |
| Cohort size | 1000 installs | 1000 installs | Размер изучаемой когорты |

### 3.4. Plan & Horizon

| Поле | Тип | Дефолт (monthly) | Дефолт (weekly) |
|---|---|---|---|
| Plan dominant | Select: weekly / monthly / annual (display-only из пресета) | monthly | weekly |
| Horizon | Slider | 24 months (range 6–36) | 26 weeks (range 4–52) |

`Plan dominant` влияет только на display badges и предупреждения (см. §5). На математику не влияет.

> **Дизайн-принцип:** одно и то же приложение нельзя одновременно иметь разные значения в Weekly и Monthly. Переключение cadence сбрасывает форму на дефолты выбранного режима (или подставляет данные из текущего пресета если они есть). Для warning перед сбросом — показать toast «Switching cadence will reset your inputs. Continue?».

## 4. Subscription Mode — Math

### 4.1. Funnel cascade

```
paying_at_month_0 = cohort × (install_to_trial / 100) × (trial_to_paid / 100)
```

Это абсолютное число платящих юзеров на момент окончания trial-to-paid конверсии (условно «месяц 0+», начало платящей жизни).

### 4.2. Retention curve fit

**Power law fit** на введённые точки. Шкала t зависит от cadence:
- Monthly cadence: t — месяцы (фит на M1/M3/M6/M12)
- Weekly cadence: t — недели (фит на W1/W2/W4/W8/W12/W26)

```
R(t) = a × t^(-b),   t ∈ [1, horizon]
```

Линейная регрессия в log-пространстве по введённым точкам. Реализация в `src/lib/subscriptionMath.js` — параметризуется cadence, но формула одна. Между опорными точками кривая интерполируется фитом.

**Constraint:** `R(t) ≤ R(1)` физически — retention paying users не растёт. Если фит даёт `R(t) > R(1)` — clamp.

**R²:** считается стандартно. Caveat для UI:
- R² > 0.95 — «Power law хорошо описывает кривую»
- R² 0.85–0.95 — «Приемлемый фит, есть отклонения»
- R² < 0.85 — **жёлтый warning** (контекст-зависимый):
  - Monthly cadence: «Subscription retention часто имеет S-shape с annual renewal cliff. Power law не моделирует cliff — используй фит как ориентир»
  - Weekly cadence: «Weekly retention часто имеет резкий W1 cliff. Power law может занижать спад в первой неделе — используй фит как ориентир»

### 4.3. Revenue & LTV

Формула одинаковая для обеих cadence — отличается шкала t (месяцы или недели) и ARPU (per-month или per-week):

```
paying_users(t) = paying_at_t_0 × R(t)
revenue(t) = paying_users(t) × arpu_paid_per_cycle
cumulative_revenue(T) = Σ revenue(t), t=1..T

LTV_per_install(T) = cumulative_revenue(T) / cohort_size
LTV_per_paying_user(T) = cumulative_revenue(T) / paying_at_t_0
LTV/CAC = LTV_per_install / CAC_per_install
```

**Payback:**

```
payback_t = min(T) where Σ revenue(1..T) ≥ cohort × CAC
```

UI показывает payback в единицах cadence: «Month 8» или «Week 12». Если за horizon не достигнут — KPI показывает «Not reached» с warning.

### 4.4. Что важно понимать про математику (для Methodology)

- Считаем LTV **per install**, не per paying user. Это правильная база для CAC-сравнения, потому что CAC платится за инсталл
- LTV per paying user отдельно показывается как secondary metric — полезно понять «сколько платит средний платящий»
- LTV в weekly и monthly cadence для одного и того же продукта **должны примерно сходиться** при правильном вводе (разница в долях из-за разрешения шкалы и фит-погрешностей). Если расхождение >20% — где-то ошибка в input. Calculator может показывать sanity-check warning при расхождении (опционально, nice-to-have)
- Power law не учитывает annual renewal cliff на M12 (monthly) или W52 (weekly). Для апок с annual-dominant подпиской — caveat
- Power law может недооценивать W1 cliff для weekly-trap apps. Для них honest-input — несколько ранних точек (W1, W2, W3 если есть данные)
- Не учитывается reactivation (вернулись после churn). Power law их не моделирует
- Не учитывается plan upgrade/downgrade. ARPU считается blended

## 5. Subscription Mode — Outputs

### 5.1. KPI Cards (5 штук)

| Карточка | Значение | Цветовая индикация |
|---|---|---|
| **LTV per install** | $X.XX | — (главное число) |
| **LTV / CAC** | X.XX | красный <1, жёлтый 1-3, зелёный >3 |
| **Payback** | X months / X weeks или «Not reached» | красный если не достигнут на horizon |
| **Trial → Paid** | XX.X% | — (выводится из inputs, но визуально подчёркнут как «ключевая ручка») |
| **Long-term retention** | XX.X% (M12 или W26 в зависимости от cadence) | — (показывает stickiness) |

### 5.2. Funnel Waterfall

Визуальный вертикальный funnel. Шаги retention зависят от cadence:

**Monthly cadence (пример):**
```
1000 installs
   ↓ × 8.6% install_to_trial
86 trials started
   ↓ × 35% trial_to_paid
30 paying users (month 0)
   ↓ × M1 retention 50%
15 active at month 1
   ↓ × (M3 / M1)
9.6 active at month 3
   ↓ × (M6 / M3)
6.6 active at month 6
   ↓ × (M12 / M6)
3.6 active at month 12
```

**Weekly cadence (пример):**
```
1000 installs
   ↓ × 8.6% install_to_trial
86 trials started
   ↓ × 35% trial_to_paid
30 paying users (week 0)
   ↓ × W1 retention 75%
22.5 active at week 1
   ↓ × (W2 / W1)
19.5 active at week 2
   ↓ × (W4 / W2)
15 active at week 4
   ↓ × (W12 / W4)
9 active at week 12
```

Каждая строка: абсолют + drop-off %. На каждом этапе tooltip объясняющий что это (для аудитории не-фаундеров).

**Реализация:** простой SVG или divs с flexbox. Не нужно тяжёлое.

### 5.3. Retention Curve

Линия retention paying users:
- Monthly: точки M1/M3/M6/M12 (синие), power law fit (синяя сплошная). X-axis: month, Y-axis: % of paying
- Weekly: точки W1/W2/W4/W8/W12/W26, аналогично. X-axis: week

Если выбран subscription preset с данными под текущую cadence — серая пунктирная линия benchmark (как в session mode).

### 5.4. Cumulative LTV per Install

Аналог графика из v1, в шкале cadence:
- Y-axis: $/install (не total $)
- X-axis: months или weeks (1..horizon)
- Зелёная линия: cumulative LTV per install
- Красная горизонтальная пунктирная: CAC
- Вертикальная пунктирная: payback (month / week)
- Цветовые зоны (красная до payback, зелёная после)

### 5.5. Cohort P&L (расширенный)

Метрика «Paying users at t=0» и «Payback» используют единицу cadence (M0/Week 0; Month 8 / Week 12).

| Метрика | Формула | Пример (monthly) | Пример (weekly) |
|---|---|---|---|
| Cohort size | input | **1000 installs** | **1000 installs** |
| Acquisition cost | cohort × CAC | **$2,100** | **$2,100** |
| Trials started | cohort × install_to_trial | **86** | **86** |
| Paying users (cycle 0) | trials × trial_to_paid | **30** | **30** |
| Revenue at horizon | Σ revenue(t) | **$4,320** | **$1,650** |
| Profit at horizon | Revenue − Acquisition | **$2,220** | **−$450** |
| ROI at horizon | Profit / Acquisition × 100% | **106%** | **−21%** |
| LTV per install | revenue / cohort | **$4.32** | **$1.65** |
| LTV per paying user | revenue / paying_at_0 | **$144** | **$55** |
| Payback | first cycle profit ≥ 0 | **Month 8** | **Week 14** |

> Weekly horizon короче (26 недель против 24 месяцев), поэтому weekly LTV в абсолюте меньше — это нормально и ожидаемо. Для honest сравнения двух cadence используй одинаковые временные окна (например, monthly horizon 6 vs weekly horizon 26 ≈ полгода).

### 5.6. Plan Type Badge & Warnings

Под dominant plan badge — контекстный warning:

- **Weekly:** «⚠️ Weekly trap pattern: значительная часть revenue у юзеров забывших отменить. Этичность под вопросом, регуляторы (Apple, EU) ужесточают transparency-требования»
- **Annual:** «📅 Annual renewal cliff: M12 retention критичен — большинство revenue зависит от того, продлят или нет. Power law не моделирует cliff, держи это в голове»
- **Monthly:** «📈 Monthly cadence — самая предсказуемая модель. Power law fit самый честный из трёх»

## 6. Пресеты

### 6.1. Файл

`docs/presets-subscription.json` (после переноса из `temp/presets-subs.json`).

7 вертикалей × до 5 quality/geo вариантов = 35 пресетов:

| ID | Label | Dominant plan |
|---|---|---|
| `subs_utilities` | Utilities (VPN, cleaners, scanners) | weekly |
| `subs_lifestyle_wellness` | Lifestyle / Wellness | annual_then_monthly |
| `subs_health_fitness` | Health & Fitness | annual |
| `subs_photo_video` | Photo / Video Editors | weekly |
| `subs_language_learning` | Language Learning | annual |
| `subs_dating` | Dating Apps | monthly |
| `subs_ai_companions` | AI Companions / Chatbots | monthly_with_some_weekly |

### 6.2. Расширение схемы пресетов под cadence

Текущий `temp/presets-subs.json` содержит monthly данные (M1/M3/M6/M12 + arpu_paid_monthly). v2 расширяет схему **опциональными** weekly полями в каждом варианте:

```json
"top_quartile|tier_1": {
  "install_to_trial": 12.0,
  "trial_to_paid": 60.0,
  "retention": {"M1": 70, "M3": 55, "M6": 45, "M12": 35},
  "retention_weekly": {"W1": 80, "W2": 70, "W4": 60, "W8": 50, "W12": 45, "W26": 38},
  "arpu_paid_monthly": 30,
  "arpu_paid_weekly": 7.5,
  ...
}
```

**Где их взять:** weekly retention данных в публичных бенчмарках (RevenueCat / Adapty / 10-Q) меньше — это уже глубже отчёты. **В рамках v2 weekly данные в пресеты НЕ заносятся** (это требует отдельной research-задачи). Поведение калькулятора:

- Для пресета с `retention_weekly` — Weekly cadence-toggle активен, при переключении подставляются weekly числа
- Для пресета без `retention_weekly` — Weekly cadence-toggle disabled при выборе этого пресета (с tooltip «No weekly cohort data for this preset; switch to Custom (no preset) to use Weekly cadence manually»)
- Custom (no preset) — обе cadence доступны всегда, юзер вводит сам

Это позволяет выкатить v2 с существующими monthly данными и поэтапно дополнять weekly данными по мере исследования источников. Сама задача «найти и закоммитить weekly retention данные для weekly-trap вертикалей (Utilities, Photo/Video)» помечена в roadmap §12 как Phase 2 of v2.

### 6.3. Загрузка пресетов в калькулятор

Калькулятор грузит **оба** файла пресетов параллельно:
- `presets.json` (session retention) — 7 вертикалей из v1
- `presets-subscription.json` (subscription) — 7 вертикалей из v2

В выпадающем списке Industry preset — два визуально разделённых блока:

```
─── Session retention ───
iGaming — Online Casino
iGaming — Sportsbook
Mobile Games — Hyper-casual
... (7 штук)

─── Subscription apps ───
Utilities (VPN, cleaners)
Lifestyle / Wellness
... (7 штук)

Custom (no preset)
```

При выборе subs-пресета mode auto-switch на Subscription и наоборот.

### 6.3. Карточка пресета (Subscription)

Расширенная по сравнению с session-карточкой:
- Data quality badge
- Quality warning text
- **Funnel preview**: «install_to_trial: 8.6%, trial_to_paid: 35%»
- **Dominant plan badge**: weekly / monthly / annual (с warning из §5.6)
- **Examples**: «NordVPN, Surfshark, CCleaner» (поле `examples` из JSON)
- Deep-link: «See methodology →» ведёт на `/methodology#subscription-1-utilities` или соответствующий anchor

## 7. Methodology — расширение

`/methodology` страница теперь рендерит **два** markdown файла последовательно:

1. `docs/methodology.md` (v1, session retention)
2. `docs/methodology-subscription.md` (v2, subscription) — новый, перенесён из `temp/methodology-subs.md`

**TOC sticky-меню** получает второй раздел «Subscription Apps» с anchor-deep-link от каждого subscription пресета.

В существующей секции «Power Law Retention Model» (которая будет добавлена при v1 implementation если ещё нет) — добавить пометку:

> **Применимость к monthly subscription retention:** Power law даёт приемлемый fit на M1/M3/M6/M12 для большинства subscription verticals, но не моделирует annual renewal cliff на M12 и trial-to-paid funnel. В Subscription mode калькулятор использует power law как aproximation; для honest-extrapolation добавь больше точек или используй preset.

## 8. Definition of Done v2

- [ ] Mode toggle (Session / Subscription) работает в UI визуально и функционально
- [ ] **Cadence sub-toggle (Weekly / Monthly)** работает внутри Subscription mode; форма и единицы output корректно меняются
- [ ] Subscription mode форма ввода с правильной валидацией (retention monotonic non-increasing, % range, ARPU > 0; для каждой cadence своя валидация)
- [ ] Power law fit работает для **обеих cadence** (monthly: t=месяцы; weekly: t=недели), R² корректный, контекст-зависимый warning при R² < 0.85
- [ ] LTV per install, LTV per paying user, LTV/CAC, payback считаются и совпадают с ручной проверкой на 3 контрольных пресетах (например: utilities median T1, language_learning top T1, ai_companions median T1)
- [ ] Funnel waterfall визуализирует cascade с абсолютными числами и drop-off % в обеих cadence
- [ ] Retention curve (% of paying) и Cumulative LTV per install графики рендерятся в обеих cadence (правильные метки осей и единицы)
- [ ] Cohort P&L расширенный показывает funnel breakdown и обе LTV-метрики, payback в правильной единице (month / week)
- [ ] Plan dominant badge показывается с правильным warning из §5.6
- [ ] Все 7 subscription пресетов загружаются и автозаполняют форму (35 вариантов через quality × geo) — в monthly cadence
- [ ] Cadence-toggle корректно disabled при выборе пресета без `retention_weekly` (с tooltip)
- [ ] При выборе subs-пресета mode auto-switch на Subscription **+ cadence auto-set** по `dominant_plan`; при session-пресете — обратно
- [ ] URL state `?mode=subscription&cadence=monthly|weekly` шеринг работает; URL переопределяет localStorage
- [ ] При переключении cadence показывается toast-warning «inputs will reset» и сброс к дефолтам выбранной cadence
- [ ] `/methodology` страница рендерит **обе** методологии с TOC и anchor-навигацией; добавлена секция про две cadence
- [ ] Юнит-тесты на subscription math: `powerLawFit(points, cadence)`, `funnelCascade`, `ltvPerInstall`, `paybackTime` — все параметризованы по cadence. Минимум 20 новых тестов (по 10 на каждую cadence), общий пакет ≥ 65 тестов после v2
- [ ] Mobile responsive в Subscription mode (input/output single-column, funnel waterfall scrollable)
- [ ] CI/CD workflow продолжает работать; build + test + deploy зелёные на v2 ветке

## 9. Что вне скоупа v2

- **Custom plan billing cycles** (3-month plans, semi-annual). Только weekly / monthly / annual через display
- **Multi-tier pricing** (Premium $X vs Pro $Y). ARPU считается blended
- **Trial длительность** как параметр (3 / 7 / 30 дней). Trial-to-paid берётся как агрегат
- **Cohort-based churn extrapolation**. Только power law fit на M-точках
- **B2B SaaS** (NRR/GRR cohort logo retention) — это отдельная итерация v3 если будет
- **Switching mode для одной сессии без потери параметров** — параметры теряются при переключении (показать confirm-dialog)
- **Сравнение сценариев в Subscription mode** (Add scenario из v1) — переносится в v3

## 10. Файловые операции (Claude Code должен сделать в рамках v2)

### Перенос из temp/ в canonical docs/

```bash
git mv temp/presets-subs.json docs/presets-subscription.json
git mv temp/methodology-subs.md docs/methodology-subscription.md
git mv temp/spec-v2-subscription.md docs/spec-v2-subscription.md
git mv temp/start-prompt-v2.md docs/start-prompt-v2.md   # если будет
```

(Альтернативно — обычный `mv` + `git add` если git mv не работает с gitignored источником.)

### Обновления существующих файлов

**`docs/spec.md` §0 «Карта документов»** — добавить строки:

```
| `docs/spec-v2-subscription.md` | Спека для Subscription mode (v2) |
| `docs/methodology-subscription.md` | Методология subscription пресетов (рендерится в /methodology) |
| `docs/presets-subscription.json` | Канонические данные subscription пресетов (35 вариантов) |
```

**`docs/spec.md` §10 «Что вне скоупа v1»** — модифицировать пункт про SaaS B2B / Subscription Apps:

```
- ~~**Subscription Apps**~~ — реализованы в v2 (см. `docs/spec-v2-subscription.md`)
- **SaaS B2B / NRR/GRR** — пока вне скоупа, кандидат на v3
```

**`CLAUDE.md`** — добавить упоминание v2 файлов в карту, указание что Subscription mode реализован, рекомендацию читать spec-v2-subscription.md для всего что касается subscription логики.

**`README.md`** — расширить секцию «Что внутри» добавлением Subscription mode как фичи; обновить «Стек» если нужно (новых зависимостей не должно быть).

### Новые файлы в коде (Claude Code создаст)

```
src/lib/subscriptionMath.js     # powerLawMonthly, ltvPerInstall, payback, funnelCascade
src/components/ModeToggle.jsx
src/components/subscription/
    SubscriptionInput.jsx        # form для funnel/retention/pricing
    FunnelWaterfall.jsx
    SubscriptionKPI.jsx          # 5 KPI cards
    SubscriptionCohortPnL.jsx    # P&L таблица
src/pages/Calculator.jsx         # mode dispatch, переписать чтобы рендерить либо v1 input/output, либо v2
src/pages/Methodology.jsx        # рендер обоих markdown, TOC объединённый
tests/lib/subscriptionMath.test.js
```

Структура `src/lib/` и `src/components/` существующая трогается минимально — основное добавляется как новые файлы. `src/pages/Calculator.jsx` рефакторится для mode-dispatch.

## 11. Локализация и тон

Без изменений от v1: UI на английском, methodology русскоязычная (в т.ч. новый методологический файл). Тон тот же — краткий, технический, без воды. **Особенность для subs-аудитории:** избегать жаргона. Если используется термин «trial-to-paid» — рядом tooltip с объяснением.

## 12. Roadmap дальше

**Phase 2 of v2 (после core релиза, отдельная research-задача):**
- Сбор weekly retention данных для weekly-trap вертикалей (Utilities/VPN, Photo/Video) из RevenueCat / Adapty deeper reports / 10-Q данных. Заполнение `retention_weekly` и `arpu_paid_weekly` полей в `presets-subscription.json`. Обновление methodology.
- Возможные источники: Adapty State of In-App Subscriptions 2026 (есть weekly breakdowns в полных отчётах), RevenueCat 2026 advanced metrics, AppMagic per-title weekly data, NordVPN/ExpressVPN open commentary.

**v3 кандидаты:**
- B2B SaaS mode: NRR/GRR/cohort logo retention, monthly NRR cohort
- Scenario comparison в Subscription mode: «что если поднимем trial-to-paid с 35% до 45%?»
- Embeddable widget: маленький iframe-friendly калькулятор для встраивания в блогпосты
- Side-by-side cadence view: одновременный показ weekly и monthly retention curves для одного продукта (если данные есть в обеих cadence)
- A/B симулятор: сравнение двух конфигураций retention, ROAS дельта
