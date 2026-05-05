# Claude Code — контекст проекта

## Что это

Веб-калькулятор Retention & LTV. Проект для личного бренда: выкатывается на GitHub Pages, описывается в посте, разбирается широкой аудиторией продуктовиков/маркетологов/менеджеров.

**Принципиально не black box.** Раздел методологии — отдельная полноценная страница с формулой power law, ограничениями модели и источниками каждого пресета.

## С чего начать

В калькуляторе **две модели**: v1 (Session retention, дневная шкала, для игр/iGaming/sportsbook) и v2 (Subscription mode, weekly+monthly cadence, для consumer subscription apps). Обе живут параллельно через mode-toggle.

1. **Прочитай `docs/spec.md`** — спецификация v1 (session retention). Особенное внимание секциям:
   - §0 — карта документов (включает v2 файлы)
   - §3.1 Блок 4 — структура пресетов с quality × geo (35 вариантов)
   - §3.5 — страница методологии
   - §5 — стек и обоснование
   - §8 — структура проекта
2. **Прочитай `docs/spec-v2-subscription.md`** — спецификация v2 (subscription mode). Additive расширение поверх v1. Содержит модель funnel + retention paying + dual cadence, KPI/funnel/charts/methodology.
3. **Прочитай `docs/methodology.md`** и `docs/methodology-subscription.md` — оба source-of-truth по источникам пресетов. Рендерятся последовательно на странице `/methodology`.
4. **Прочитай `docs/presets.json`** и `docs/presets-subscription.json` — данные пресетов. Калькулятор грузит оба файла параллельно.

## Карта файлов

```
docs/spec.md                       ← v1 спецификация (session retention)
docs/spec-v2-subscription.md       ← v2 спецификация (subscription mode)
docs/methodology.md                ← v1 методология + источники session-пресетов
docs/methodology-subscription.md   ← v2 методология + источники subscription-пресетов
docs/presets.json                  ← session-пресеты (35 вариантов)
docs/presets-subscription.json     ← subscription-пресеты (35 вариантов)
README.md                          ← витрина для GitHub
CLAUDE.md                          ← этот файл
```

## Жёсткие ограничения

- **Хостинг:** только GitHub Pages (статика). Никакого бэкенда, БД, env-переменных
- **Не black box:** методология как полноценная страница с anchor-навигацией, не expandable-блок
- **Источники цифр:** для session-пресетов — `docs/methodology.md`; для subscription-пресетов — `docs/methodology-subscription.md`. В `presets.json` / `presets-subscription.json` поле `sources` намеренно отсутствует — не плодим дубли
- **ARPU нормализация (v1):** канонический источник в session-пресете — `arpu_per_day`. Поля `arpu_monthly` / `arpu_annual` / `arpdau` — display-only
- **ARPU нормализация (v2):** в subscription-пресете — `arpu_paid_monthly` (всегда) и `arpu_paid_weekly` (только где weekly cadence доступен). Поля cadence-специфичные, не cross-конвертируются

## Рекомендуемый стек (см. §5 ТЗ)

React 18 + Vite + Recharts + Tailwind + react-router-dom (HashRouter) + react-markdown.

Если в процессе видишь, что что-то лучше делать иначе — обсуди с пользователем перед тем как менять.

## Структура проекта (актуальное состояние)

v1 + v2 уже задеплоены/в работе. Ключевые места:

- `src/lib/powerLaw.js`, `src/lib/ltv.js` — math для session mode
- `src/lib/subscriptionMath.js` — math для subscription mode (funnel cascade, LTV per install/paying user, cadence-зависимый payback)
- `src/pages/Calculator.jsx` — корень UI, mode-dispatch (Session vs Subscription)
- `src/pages/Methodology.jsx` — рендер двух методологий с sticky TOC
- `src/components/` — session-компоненты в корне, subscription-компоненты в `subscription/`
- `scripts/copy-data.js` — копирует `docs/*.json` и `docs/methodology*.md` в `public/`

## Чего не делать без обсуждения

- Не добавлять backend / API
- Не уходить от GitHub Pages-совместимого билда
- Не править `methodology.md` или `methodology-subscription.md` без аккуратной причины — это публичный контент, видимый и в репо, и в приложении
- Не добавлять `sources` обратно в `presets.json` / `presets-subscription.json` — источники в methodology файлах
- **v1 не ломаем при работе над v2.** Все changes additive — существующие тесты должны продолжать проходить

## Definition of Done

См. §7 ТЗ.

## Контактные точки

- Все вопросы по продукту — пользователь (владелец репо)
- Канонический язык методологии — русский (исходник `methodology.md` русскоязычный)
- Канонический язык UI — английский (см. §9 ТЗ)
