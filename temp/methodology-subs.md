# Источники и методология subscription presets

Дополнение к `methodology.md` — описание источников по 7 вертикалям consumer subscription apps в `presets-subs.json`.

**Главное отличие от первой пачки:** retention считается от paying subscribers (не installs), и есть дополнительные поля `install_to_trial`, `trial_to_paid`, `rpi_d14`, `rpi_d60`. Это нативный формат сегмента.

---

## Глобальные источники

| Источник | Что покрывает | Ссылка |
|---|---|---|
| **RevenueCat State of Subscription Apps 2025** | 75K+ apps, $10B+ revenue 2024, по категориям (Utilities, Health & Fitness, Education, Social & Lifestyle, Photo & Video, AI). Стандарт сегмента. | https://www.revenuecat.com/state-of-subscription-apps-2025/ |
| **RevenueCat State of Subscription Apps 2026** | Свежий отчёт, AI category breakdown, web billing | https://www.revenuecat.com/state-of-subscription-apps/ |
| **Adapty State of In-App Subscriptions 2026** | Альтернативный платформенный отчёт, лучше для weekly plans data, LTV per category | https://adapty.io/state-of-in-app-subscriptions/ |
| **Appfigures AI Companion Apps Report (TechCrunch, 2025)** | Категория AI companions: $221M lifetime spend, $1.18 RPD H1 2025 | https://techcrunch.com/2025/08/12/ai-companion-apps-on-track-to-pull-in-120m-in-2025/ |
| **Duolingo 10-Q (2024)** | Гольден стандарт для Language Learning unit economics | https://www.sec.gov/Archives/edgar/data/0001562088/ |
| **Match Group 10-K / 10-Q (2024)** | Tinder, Hinge, Match unit economics | https://ir.mtch.com/ |
| **Bumble 10-Q (2024)** | Bumble + Badoo ARPPU и paid users | https://ir.bumble.com/ |
| **Business of Apps Dating Market** | Aggregated dating app stats, Tinder/Bumble | https://www.businessofapps.com/data/dating-app-market/ |
| **AppTweak Apple Ads Benchmarks 2025** | CPI by category US ($1B ad spend dataset) | https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks |
| **mktclarity AI Companion Market 2025** | Replika, Character.AI, Chai детальные числа | https://mktclarity.com/blogs/news/ai-companion-market |
| **Athletech News (RevenueCat 2025 H&F)** | Health & Fitness категория deep dive | https://athletechnews.com/fitness-apps-monetizable-winner-take-all-or-most/ |

---

## 1. Utilities (VPN, cleaners, scanners)

**Качество данных:** ✅ robust. RevenueCat + Adapty 2026 хорошо покрывают этот сегмент (Utilities — одна из крупнейших RevenueCat-категорий).

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | Adapty 2026 (Utilities first-renewal 58.1% — highest of all categories); RevenueCat 2025 (top quartile retention 1.7-3× median) | Adapty 2026 (Utilities trial users $68.90 LTV 12m) | AppTweak 2025 (Utilities US $2.90); Liftoff/Adjust top quartile estimates |
| median T1 | RevenueCat 2025 (Utilities trial start 86%); Adapty 2026 (median first-renewal) | RevenueCat 2025 (Utilities D60 RPI median); Adapty 2026 weekly-dominant | AppTweak 2025 ($2.90 US) |
| bottom_quartile T1 | RevenueCat 2025 bottom-quartile (3-14× worse than top) | Long-tail estimates | Estimates |
| median T2 | RevenueCat 2025 EU geo data | RevenueCat EU geo | AppTweak EU |
| median T3 | RevenueCat 2025 (LATAM median 25%, top 53.3%) | LATAM/SEA estimates | Mapendo, Liftoff LATAM |

**Главная переменная:** weekly vs. annual plan mix. Pure VPN (NordVPN, Surfshark) использует annual sub-economics ($60-100/yr); "TurboVPN"-style — weekly trap ($4.99/week → ~$260/yr если не отменить). Это создаёт огромный variance в ARPU.

---

## 2. Lifestyle / Wellness

**Качество данных:** ✅ robust, но с caveat — RevenueCat группирует Lifestyle с Social Networking и Dating в "Social & Lifestyle". Чистые числа для wellness требуют изоляции.

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | RevenueCat 2025 Social & Lifestyle top quartile; Calm/Headspace operator commentary | RevenueCat 2025 (top apps 5-7× median); Headspace S-1 era data | AppTweak Lifestyle category |
| median T1 | RevenueCat 2025 Social & Lifestyle median (lower retention overall vs. H&F) | RevenueCat 2025 median | AppTweak 2025 |
| bottom_quartile T1 | RevenueCat 2025 bottom-quartile | Long-tail estimates | Estimates |
| median T2 | RevenueCat 2025 EU | EU benchmarks | AppTweak EU |
| median T3 | RevenueCat 2025 LATAM/SEA | LATAM benchmarks | Mapendo |

**Caveat:** "Lifestyle" — широкая категория. Habit trackers (Streaks, Fabulous) монетизируются хуже meditation apps (Calm, Headspace). Top quartile в основном meditation apps; bottom — generic habit trackers. Это размывает median.

---

## 3. Health & Fitness

**Качество данных:** ✅ **robust — лучший сегмент в RevenueCat data.** Это категория, в которой RevenueCat публикует больше всего деталей.

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | RevenueCat 2025 (top 10% trial-to-paid 68.3%, P90 RPI $2.97 — highest of all categories) | RevenueCat 2025 (P90 D60 RPI $2.97); Strava/Whoop operator data | AppTweak 2025 H&F US |
| median T1 | RevenueCat 2025 (median trial-to-paid 39.9%, RPI D14 $0.44, D60 $0.63) | RevenueCat 2025 (median D14 $0.44, D60 $0.63 — both highest of categories) | AppTweak 2025 |
| bottom_quartile T1 | RevenueCat 2025 bottom-quartile (Adapty: H&F first-renewal 30.3% — lowest, compensated by ARPU) | Long-tail estimates | Estimates |
| median T2 | RevenueCat 2025 EU geo | RevenueCat EU | AppTweak EU |
| median T3 | RevenueCat 2025 LATAM (median 25%, top 53.3%) | RevenueCat LATAM | Mapendo |

**CIS-важное:** **BetterMe** — крупнейший CIS-built H&F app (украинский), сильный пример top quartile retention. В public data конкретные BetterMe цифры не раскрываются, но их модель (quiz onboarding + hard paywall) даёт characteristic top-quartile pattern.

---

## 4. Photo / Video Editors

**Качество данных:** ✅ robust. RevenueCat детально покрывает Photo & Video.

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | RevenueCat 2025 (Photo/Video top quartile 5-7× median); Reface viral data | RevenueCat 2025 top quartile | AppTweak 2025 Photo |
| median T1 | RevenueCat 2024 (Photo/Video trial-to-paid **26.2% — lowest of categories**); RevenueCat 2025 | RevenueCat 2024/2025 median | AppTweak 2025 |
| bottom_quartile T1 | RevenueCat 2025 bottom (Photo/Video имеет largest spread top vs. bottom) | Long-tail | Estimates |
| median T2 | RevenueCat EU | RevenueCat EU | AppTweak EU |
| median T3 | RevenueCat LATAM/SEA | RevenueCat LATAM | Mapendo |

**Caveat:** Photo/Video — категория с самыми высокими refund rates (RevenueCat 2024: "sneaky 7d trial in onboarding to annual" даёт 4× refund vs. monthly). Net revenue после refunds может быть на 15-25% ниже gross numbers выше. CIS-built leaders (Reface, FaceApp, Prequel) исторически использовали этот pattern.

---

## 5. Language Learning

**Качество данных:** ✅ robust. **Duolingo S-1 + 10-Q — гольден стандарт.**

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | Duolingo 10-Q Q1-Q4 2024 (paid penetration 8.5-8.9% of 113M MAU); RevenueCat 2025 Education top quartile | Duolingo 10-Q (subscription ARPU ~$19/quarter / paying user ≈ $75/yr); Q1 2025 $191M sub revenue / 9.9M paid subs | Duolingo CAC fell $158 (2021) → $28 (2024) — outlier organic-driven; AppTweak Education $3-5 US |
| median T1 | RevenueCat 2025 Education (D14 RPI $0.40, D60 $0.45) | RevenueCat 2025 Education category | AppTweak 2025 |
| bottom_quartile T1 | RevenueCat 2025 Education bottom | Long-tail | Estimates |
| median T2 | RevenueCat 2025 EU Education | RevenueCat EU | AppTweak EU |
| median T3 | RevenueCat 2025 LATAM Education | RevenueCat LATAM | Mapendo |

**Caveat:** Duolingo's CAC ($28) и organic mix — outliers. Babbel, Memrise, Mondly с reliance на paid acquisition ближе к $30-80 CAC. Для "median T1" использован blended.

---

## 6. Dating Apps

**Качество данных:** ✅ robust благодаря публичным 10-Q (Match Group, Bumble Inc).

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | Match Group commentary (Tinder churn structurally high); Bumble Q1 2024 retention | Bumble Q1 2024 ARPPU $27.75/mo (Bumble app); Tinder $200/yr ARPU | Match Group marketing spend / new payer disclosures |
| median T1 | RevenueCat 2025 Social & Lifestyle median; Match Group Tinder ARPMUP $16.50/mo | Bumble Inc combined ARPPU $21.84/mo Q1 2024; Tinder ARPU calculation from $1.94B / 9.6M subs / 12 | AppTweak Dating $5-7 US |
| bottom_quartile T1 | RevenueCat Social & Lifestyle bottom | Long-tail | Estimates |
| median T2 | Match Group EU/Asia revenue split (~$12-14 ARPMUP) | Bumble international expansion data | AppTweak EU |
| median T3 | Statista Tinder LATAM IAP revenue 2019-2023; Badoo emerging markets | Tinder LATAM disclosures | Mapendo LATAM |

**Caveat:** Dating retention имеет структурную особенность — "success churn". Юзер находит match → отписывается. Это означает что низкий retention != плохой продукт. ARPU per paying user важнее retention для этой категории.

---

## 7. AI Companions / Chatbots

**Качество данных:** ⚠️ moderate — самый быстро меняющийся сегмент (категория свежая).

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | mktclarity 2025 (Replika 25% free→paid, 7+ months avg paying user); Sacra Character.AI analysis | Appfigures 2025 (revenue per download $1.18 H1 2025, up from $0.52 2024); Character.AI $9.99/mo c.ai+; Replika Pro $19.99/mo | AppTweak AI category (нестабильно, новая категория) |
| median T1 | RevenueCat 2025 AI category breakout (D60 RPI $0.63 — matches Health & Fitness highest) | RevenueCat 2025 AI category; Character.AI $32.2M / 20M MAU | AppTweak 2025 |
| bottom_quartile T1 | Appfigures 2025: 300+ struggling AI companion apps in long tail; RevenueCat bottom | Long-tail estimates | Estimates |
| median T2 | RevenueCat 2025 EU AI | RevenueCat EU AI | AppTweak EU |
| median T3 | Appfigures geo data (Philippines 11%, Brazil 10%, Indonesia 8% of AI companion downloads — high volume, low ARPU) | LATAM/SEA AI data | Mapendo |

**Caveat:** Категория растёт +64% YoY (revenue) и +88% YoY (downloads). Цифры выше — H1 2025 baseline; к H2 2026 могут выглядеть совсем иначе. Refresh quarterly.

**CIS-важное:** **Replika (Eugenia Kuyda / Luka)** — бюро foundational AI companion. ~$24-30M ARR на 2024 с subscription-only моделью, что даёт высокий ARPU per paying user (vs. freemium-heavy Character.AI). Хороший proxy для top quartile T1.

---

## Что значит "robust" vs "moderate" для subs presets

| Уровень | Критерий | В пресетах |
|---|---|---|
| **robust** | RevenueCat category breakout + ≥1 крупный публичный 10-Q или 10-K в категории, с large sample size (≥1000 apps в RevenueCat выборке для категории) | Utilities, Health & Fitness, Photo/Video, Language Learning, Dating |
| **moderate** | RevenueCat category breakout есть, но категория слишком молодая для stable benchmarks (<2 года данных) | AI Companions |
| **estimated** | (не используется в этом файле) | — |

**Важно:** Для всех 7 вертикалей RevenueCat 2025 — **первичный источник**. Adapty 2026 используется как валидация. Публичные 10-Q (Duolingo, Match, Bumble) — только для тех вертикалей, где есть крупный public-traded leader.

---

## Limitations

1. **RevenueCat sample bias.** Платформа охватывает 75K+ apps, но с уклоном в малые-средние (хобби-проекты до $1M ARR). Самые крупные приложения (Tinder, Duolingo, Calm) обычно используют свою attribution/billing infrastructure и не репортят через RevenueCat. Для top quartile это значит, что числа отражают "top of small-to-mid pool", не "industry giants".

2. **Geo data в RevenueCat ограничена.** Категорийные benchmarks по гео (T1/T2/T3) делятся только на North America / Europe / LatAm / IN+SEA, не по странам. Tier-3 в presets — blended LATAM+SEA, не чистый CIS.

3. **CIS apps часто off-RevenueCat.** BetterMe, Reface, FaceApp используют свои billing/attribution stacks. Их числа в presets — extrapolation из category averages + operator commentary, не direct measurement.

4. **Refund rate не учтён.** RevenueCat репортит gross revenue. Реальный net revenue после refunds может быть на 5-25% ниже (зависит от категории — Photo/Video и weekly trap-style apps хуже всего).

5. **App Store fee не учтён.** Все ARPU/RPI цифры — gross. Для net считай 70% (или 85% после года).

---

## Когда обновлять subs presets

| Триггер | Что обновлять |
|---|---|
| RevenueCat State of Subscription Apps 2027 (Q1 2027) | Все 7 вертикалей |
| Adapty State of In-App Subscriptions 2027 | Cross-validation Utilities, Lifestyle |
| Duolingo Q1 2026 10-Q | Language Learning |
| Match Group / Bumble Q1 2026 10-Q | Dating |
| Appfigures AI Companion quarterly updates | AI Companions (быстро меняется) |
| Apple court decision on web billing (April 2025+) | All — может изменить app-store-only числа |

**Минимальная частота полного обновления:** раз в 6 месяцев для AI Companions, раз в 12 месяцев для остальных.
