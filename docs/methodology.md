# Источники и методология пресетов

Краткое описание того, откуда взяты цифры в `presets.json` / `presets.md`. Для каждого слайса (вертикаль × quality × geo) — список источников и как они смешаны.

**Формат данных:** classic cohort retention (не rolling), дневная шкала, USD, вин­тажность 2024–2025.

**Тиры:** T1 = US/UK/CA/AU/DACH/Nordics; T2 = W/S Europe + JP/KR; T3 = LATAM/SEA/India/EE.

---

## Глобальные источники

| Источник | Что покрывает | Ссылка |
|---|---|---|
| AppsFlyer | Performance Index, State of Gaming/eCommerce; ~10B+ installs/quarter, trim 10% top/bottom | https://www.appsflyer.com/benchmarks/faq/ |
| Adjust (Mobile Games Insights 2025) | CPI, ARPMAU, retention по жанрам и гео | https://gamedevreports.substack.com/p/adjust-mobile-games-insights-report |
| Liftoff (2025 Casual Gaming Apps Report) | ~2.4B installs / $11.9B spend Feb '24–Feb '25, IAA-skewed | https://liftoff.ai/2025-casual-gaming-apps-report/ |
| GameAnalytics (2025 Mobile Gaming Benchmarks) | ~10K+ projects, 2.7B MAU, retention по quartile | https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks |
| AppMagic (2025 Mobile Games Monetization) | Per-title ARPDAU/D1 для top-grossing игр | https://gamedevreports.substack.com/p/appmagic-mobile-games-monetization |
| Sendbird/Statista (2023) | Mobile app retention by industry (D1/D7/D30) | https://sendbird.com/blog/app-retention-benchmarks-broken-down-by-industry |
| Shopify / First Page Sage | E-commerce CAC by category | https://www.shopify.com/enterprise/blog/44310083 |
| Mobiloud (2026) | E-commerce CAC by geo | https://www.mobiloud.com/blog/average-customer-acquisition-cost-for-ecommerce |
| Plotline / Sendbird fintech | D30 retention медиана для финтеха | https://sendbird.com/blog/app-retention-benchmarks-broken-down-by-industry |
| Goodwater Capital | Neobank ARPU (Chime, Nubank IPO analysis) | https://www.goodwatercap.com/insights/thesis/understanding-chime-the-largest-neobank-in-the-us/ |
| Robeco (2024) | Neobank growth/CAC commentary (Revolut, Nubank) | https://www.robeco.com/en-int/insights/2024/09/the-neobank-era-has-arrived |
| DraftKings 10-Q / earnings | Sportsbook+iGaming ARPMUP, CAC trajectory | https://www.pymnts.com/earnings/2024/draftkings-isnt-gambling-on-its-innovation-fueled-customer-acquisition-strategy/ |
| Eilers & Krejcik via SBC Americas | iGaming Online Casino tracker citations | https://sbcamericas.com/2024/07/25/fantini-eilers-krejcik-gaming-report/ |

---

## 1. iGaming — Online Casino

**Качество данных:** ⚠️ estimated. Триангуляция из operator earnings + регуляторов + affiliate-сетей. Прямых публичных бенчмарков (тип AppsFlyer) для real-money казино не существует.

| Slice | Откуда retention | Откуда ARPU | Откуда CAC |
|---|---|---|---|
| top_quartile T1 | Xtremepush 2026 ("30–40% top-tier D30") | DraftKings Q1 2024 ARPMUP $114/mo (combined SB+iGaming, mature US) → casino-only ~$200–400 | Affiliate-network disclosures Tier-1 SEO ($80–$150) |
| median T1 | Xtremepush 2026 + Eilers & Krejcik via SBC Americas Q1 2024 (US iGaming GGR $2B / 3.5M MUPs) | Gr8.tech: "$100–200 monthly ARPU healthy benchmark" | DraftKings 2020 filings ($371 historical CAC); SportsHandle 2022 |
| bottom_quartile T1 | Xtremepush 2026 + paid-social affiliate disclosures | Lower-tier US/EU brands operator commentary | SportsHandle 2022 (US online casino CAC > $500); state-launch period |
| median T2 | UK Gambling Commission quarterly aggregates; W.EU regulator data (DK, SE, IT) | Regulator transparency (depositor avg) | Industry estimates from operator-vendor blogs |
| median T3 | Affiliate program disclosures (888Starz Reg2Dep>35%, retention >50%); RichAds 2024 | Affroom 2026 affiliate program data | Affroom 2026 (.com offshore CPA $20–$80) |

**Главная переменная:** канал привлечения. SEO/affiliate-когорты показывают на 30–50% лучше D7/D30 retention по сравнению с paid social (888Starz, RichAds disclosures). Это не отражено в пресетах — оставлено на ввод пользователя в калькуляторе.

---

## 2. iGaming — Sportsbook

**Качество данных:** ⚠️ estimated. Лучшие данные — operator earnings (DraftKings/Flutter/BetMGM), Wonder/SportAd reports, и regulator data (UK GC, NJ DGE).

| Slice | Откуда retention | Откуда ARPU | Откуда CAC |
|---|---|---|---|
| top_quartile T1 | Wonder/SportAd NJ data (D30/D60/D90 = 50%/35%/28%); operator commentary (FanDuel) | DraftKings Q1 2024 ARPMUP $114/mo, +25% YoY | DraftKings 2024 commentary (-40% CAC YoY); FanDuel 2018 CAC $68 (Wonder) |
| median T1 | Industry blended (Scaleo 2025; PYMNTS/DraftKings 2024) | Pure sportsbook ~30–40% ниже blended ARPMUP → ~$60/mo | PYMNTS 2024; Slate analysis 2024 |
| bottom_quartile T1 | New-state launch cohorts 2020–2023 | Promo-churn cohort estimates | BetMGM ~$300M marketing для 14% market share; SportsHandle 2022 |
| median T2 | UK GC quarterly; Italian/Spanish regulator data | UK GC operator submissions; AAMS/Italy data | EU operator disclosures |
| median T3 | LATAM affiliate disclosures; Africa GGR estimates | Africa/LATAM regulator + affiliate data | LATAM affiliate networks (CPA $15–$60) |

**Главная переменная (помимо канала):** сезонность. NFL/Premier League драйвят 60–70% годового handle, поэтому когорты Q3 и Q1 имеют разный retention curve.

---

## 3. Mobile Games — Hyper-casual

**Качество данных:** ✅ robust. GameAnalytics + Adjust + Liftoff покрывают сегмент полностью.

| Slice | Откуда retention | Откуда ARPDAU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | GameAnalytics 2025 (top 25% D1 26.48–27.69%, D7 7–8%, D28 <3%) | Miri Growth (top 25% ~$0.10 ARPDAU); Appodeal 2025 hyper-casual $0.86/mo ad ARPU | Adjust 2025 (NAMER/DACH $1.20); Liftoff 2025 |
| median T1 | GameAnalytics 2025 median; Adjust 2025 (avg D1 27%, D30 5%) | Miri Growth (2–5¢ baseline) | Liftoff 2025 (iOS $1.41 / Android $0.14); Adjust 2024 (avg $0.40) |
| bottom_quartile T1 | GameAnalytics 2025 bottom-25% | Adjust 2024 lower percentiles | Adjust 2024 lower percentiles |
| median T2 | Adjust 2024 (Singapore/JP/KR/S.Europe) | Adjust 2024 ARPM ($1.57 APAC vs. $4.71 NAMER) | Adjust 2024 |
| median T3 | Adjust 2024 (LATAM/SEA/India) | Adjust 2024 | Adjust 2024 |

**Тренд:** D1 retention падает YoY (28%→27% Adjust 2024). Если в 2026–2027 будут свежие отчёты — пересчитать дефолты.

---

## 4. Mobile Games — Casual (Match-3, Puzzle, Lifestyle)

**Качество данных:** ✅ robust. Уникально хорошая публикация per-title бенчмарков от AppMagic.

| Slice | Откуда retention | Откуда ARPDAU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | AppMagic per-title (Royal Match D1 44%, Candy Crush D1 48%, Homescapes D1 40%, Monopoly Go D1 39%) | AppMagic per-title (Royal Match $0.51, Monopoly Go $1.28, Gossip Harbor $0.97) | Liftoff 2025 NAMER $6.78 (top quartile похож) |
| median T1 | GameAnalytics 2025 median (D1 23%, D7 ~10%) | Miri Growth ($0.10–0.15); Appodeal 2025 Match $2.99/mo | Liftoff 2025 (blended $2.17, NAMER $6.78); Adjust 2025 |
| bottom_quartile T1 | GameAnalytics 2025 bottom-25% | Long-tail estimates | Adjust 2024 lower percentiles |
| median T2 | GameAnalytics 2025 EMEA/APAC | Liftoff 2025 EMEA/APAC | Liftoff 2025 (EMEA $1.11 / APAC $1.05) |
| median T3 | GameAnalytics 2025 LATAM | Liftoff 2025 LATAM | Liftoff 2025 (LATAM $0.44) |

**Главное:** разброс ARPDAU между топом и медианой 5–10× — самый большой из всех вертикалей. В калькуляторе стоит явно показывать, что медиана ≠ «хороший» продукт.

---

## 5. Mobile Games — Midcore (Strategy, RPG, Shooter)

**Качество данных:** ✅ robust для retention/CPI; ⚠️ ARPDAU искажён мегахитами (Genshin/RAID/Whiteout Survival).

| Slice | Откуда retention | Откуда ARPDAU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | GameAnalytics 2025 (sessions 6–7/day midcore highest); AppMagic 2025 Strategy +25.6% YoY | Miri Growth ($0.40–1.50 top 25%); AppMagic top-grossing strategy data | Liftoff 2025 Shooter $7.47 (highest CPI / highest D7 ROAS 6.1%) |
| median T1 | Newzoo/MAAS midcore baseline (D1 25% / D7 5% / D30 1%); GameAnalytics 2025 | Adjust 2024 (RPG ARPMAU $6.48 ≈ $0.21/day; Strategy $5.34 ≈ $0.18/day) | Liftoff 2025 (Shooter $7.47, Strategy $2–4); Adjust 2025 |
| bottom_quartile T1 | GameAnalytics 2025 bottom-25% | Long-tail estimates | Adjust 2024 lower percentiles |
| median T2 | Liftoff 2025 EMEA/APAC midcore | Adjust 2024 EMEA/APAC | Liftoff 2025 EMEA/APAC |
| median T3 | Liftoff 2025 LATAM midcore | Adjust 2024 LATAM | Liftoff 2025 (LATAM RPG $0.27) |

**Оговорка:** ATT opt-in для midcore только ~30–35% NAMER → top-quartile iOS retention/ROAS *вероятно занижены* в публичных отчётах. Если у пользователя есть собственные MMP-данные — они могут быть точнее наших дефолтных значений.

---

## 6. E-commerce (mobile + web shopping)

**Качество данных:** ✅ robust для retention; CAC сильно скачет по категории (luxury vs. apparel vs. digital).

| Slice | Откуда retention | Откуда ARPU | Откуда CAC |
|---|---|---|---|
| top_quartile T1 | Sendbird/Statista 2023 (marketplace D1 33.7%, D7 16.1%, D30 8.7%) | AppsFlyer 2024 (60% iOS first-time buyers convert to loyal) | Shopify median ($129 apparel); Tapcart DTC KPIs |
| median T1 | Sendbird/Statista 2023 (general shopping D1 24.5%, D7 10.7%, D30 4.83–5.6%); Adjust 2025 | Saras Analytics 2024 (~$300 LTV typical e-commerce) | First Page Sage 2024 (apparel $129, beauty $130–180) |
| bottom_quartile T1 | Sendbird lower percentiles; Adjust 2025 | DTC single-purchase apparel | First Page Sage (digital products $42–80) |
| median T2 | AppsFlyer EMEA 2024; Adjust 2025 EMEA | EMEA AOV/frequency data | Mobiloud 2026 (EMEA estimate) |
| median T3 | AppsFlyer LATAM/SEA 2024; Adjust 2025 | LATAM/SEA AOV data | Mobiloud 2026 (SEA 40–60% lower); Mapendo 2024 |

**Оговорка:** маркетплейсы (Amazon/Temu) и DTC-бренды — это разные бизнесы. Top quartile в пресете = маркетплейс; median = generic shopping; bottom = DTC single-purchase. В калькуляторе имеет смысл добавить выбор подтипа.

---

## 7. Fintech / Banking apps

**Качество данных:** ⚠️ moderate. Большой spread между sub-segments (neobank vs. traditional bank vs. investment vs. crypto). Цифры в пресете = neobank baseline.

| Slice | Откуда retention | Откуда ARPU | Откуда CAC |
|---|---|---|---|
| top_quartile T1 | Statista/Sendbird 2023 (banking D1 30.3%, D7 17.6%); Plotline 2024 | Goodwater 2024 (Nubank ARPU $102, above market); Lumos Business (Cash App ~$50) | Robeco 2024 (Revolut/Nubank referral organic <$1–$20); Goodwater Chime IPO data |
| median T1 | Plotline 2024 (D30 11.6% fintech median); Adjust 2025 | Accenture 2025 ($45 neobank avg ARPU) | Business of Apps 2025; MEXC 2024 (US neobank avg $30–$80) |
| bottom_quartile T1 | Crypto/volatile fintech estimates (10× variance vs. neobank) | Crypto onboarding low retention → low ARPU | Liftoff 2022 (cost per registration $17.96, активация 56.3%) |
| median T2 | Adjust 2025 EMEA fintech | Revolut blended ARPU 2023 commentary | Revolut blended £20 (~$25, 2023, doubled from £10 in 2021) |
| median T3 | LATAM fintech data (Nubank cohort proxies) | Nubank LATAM disclosures | MEXC 2024 (Nubank LATAM <$1 organic CAC) |

**Оговорка:** если у пользователя традиционный банк или крипто-приложение, значения по умолчанию сильно отклоняются от реальности (разброс до 10×). В калькуляторе имеет смысл добавить выбор подсегмента: neobank / traditional / investment / crypto.

---

## Что значит "estimated" vs "robust" vs "moderate"

| Уровень | Критерий | В пресетах |
|---|---|---|
| **robust** | Минимум 2 независимых трастовых платформенных источника (AppsFlyer/Adjust/Liftoff/GameAnalytics/Sendbird) с большой выборкой (10K+ apps или 1B+ installs) | Hyper-casual, Casual, Midcore, E-commerce |
| **moderate** | Один сильный источник или агрегация 2–3 источников среднего качества | Fintech |
| **estimated** | Триангуляция из operator earnings, регуляторов, affiliate disclosures; нет прямых платформенных бенчмарков | iGaming Casino, iGaming Sportsbook |

Бейдж качества показывается на карточке выбранного пресета — он отражает уровень из этой таблицы.

---

## Когда обновлять пресеты

| Триггер | Что обновлять |
|---|---|
| RevenueCat State of Subscription Apps 2027 (Q1 2027) | Если/когда добавим subs preset |
| AppsFlyer Q1/Q2 2026 quarterly benchmarks | Mobile games (вертикали 3–5), e-commerce (6) |
| Liftoff 2026 Casual Report (Feb–March 2026) | Casual (4), Hyper-casual (3) |
| GameAnalytics 2026 Benchmarks | Все mobile gaming |
| DraftKings/Flutter quarterly 10-Q | iGaming Casino + Sportsbook (1, 2) |
| Легализация iGaming в крупном US-штате (TX/CA/FL/NY) | Sportsbook T1 CAC спайкнет 50–100% на 12 мес — flag в UI |

Минимальная частота полного обновления — раз в 12 месяцев. Mobile gaming быстрее всего устаревает (D1 retention падает YoY).
