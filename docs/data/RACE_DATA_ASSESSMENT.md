# RaceNext Race Data Assessment

Last Updated: 2026-07-31

Status: Active assessment for First50 data work.

## 1. Executive Summary

当前 Race Decision Page 的信息架构方向正确，但数据能力不足以稳定回答高质量赛事决策问题。

核心结论：

- Race 级基础事实覆盖较好：名称、日期、地点、来源链接、图片基本可用。
- Race Category 级决策字段覆盖不足：距离只有 58%，费用 46%，爬升 8%，关门时间 9%。
- 报名入口覆盖不足：赛事级报名 URL 13%，组别级报名 URL 46%。
- 页面当前很多“决策内容”来自规则派生，不是经过 AI 生成、人工审核或 JSON 配置维护的内容资产。
- Top100 的广覆盖不适合下一阶段；应收缩为 RaceNext First50，优先补足最有搜索价值、商业价值和决策价值的 50 场赛事。

## 2. Current Data Sources

当前实际数据入口：

- `data/seed/future_top100_seed.json`
- `lib/raceDataSource.ts`
- fallback: `data/merged/merged_sample.json`

当前已抓取或调研的数据源：

| Source | Current Role | Status | Current Value | Main Limitation |
|---|---|---|---|---|
| Zuicool | 赛事发现、报名、组别、费用、图片 | 实际 seed 主来源 | 覆盖 99 / 100 seed records | 非官方真值，类别和文案需清洗 |
| RunChina | 中国路跑身份和日期参考 | 少量混入 seed | 覆盖 3 / 100 seed records | 当前接入不稳定，报名和费用弱 |
| ITRA | 越野难度和积分候选源 | 调研阶段 | 尚未进入有效 seed | JS/API/登录和维护成本待确认 |
| Manual / RaceNext | 决策内容、审核、补充字段 | 尚未系统化 | 页面有规则派生 | 缺少可维护内容文件 |

## 3. Current Data Model

项目中并存三套结构：

### Legacy Race Model

File: `types/race.ts`

特点：

- 单层 `Race` 模型。
- `RaceCategory` 内有距离、爬升、难度、beginnerFriendly。
- `RaceDecision` 内有 popularity/scenery/organization/transport/technical score。
- 已标记 deprecated。

问题：

- 把 Race、Edition、Category 和推荐层混在一起。
- 难度和评分字段目前无法由真实数据支撑。
- 不适合作为 First50 资产主模型。

### Event / Edition / Category Model

File: `types/event.ts`

特点：

- Event: 赛事品牌。
- Edition: 某一年赛事。
- Category: 具体报名组别。
- Recommendation / Experience / Service 字段也有预留。

判断：

- 方向正确。
- 当前不应大规模数据库化或填空字段。
- First50 可以先用 JSON/Markdown 维护一个轻量 ViewModel，再逐步映射回 Event / Edition / Category。

### Current Source Record Model

File: `types/sourceRecord.ts`

当前 Race Decision Page 实际使用的是 `MergedConnectorRecord`：

Race-level fields:

- `id`
- `normalizedName`
- `originalNames`
- `editionYear`
- `raceDate`
- `province`
- `city`
- `district`
- `venue`
- `registrationStatus`
- `registrationUrl`
- `coverImage`
- `sourceIds`
- `sources`
- `fieldSources`
- `missingFields`
- `confidence`

Category-level fields:

- `categoryName`
- `distanceKm`
- `elevationGain`
- `cutoffTime`
- `registrationFee`
- `categoryRegistrationUrl`

问题：

- 没有 official website / official registration URL 的可信区分。
- 没有报名开始和报名截止。
- 没有路线、补给、海拔、强制装备、资格要求等关键越野字段。
- 没有 RaceNext 内容层的可维护存储。

## 4. Seed Data Coverage

Source file: `data/seed/future_top100_seed.json`

Generated at: `2026-07-08T02:21:53.561Z`

Race records: 100

Category records: 154

### Race-Level Coverage

| Field | Coverage | Assessment |
|---|---:|---|
| `name` | 100 / 100 (100%) | 可用 |
| `type` | 100 / 100 (100%) | 需清洗和复核 |
| `province` | 100 / 100 (100%) | 可用，但线上赛需排除 |
| `city` | 96 / 100 (96%) | 基本可用 |
| `district` | 95 / 100 (95%) | 基本可用 |
| `raceDate` | 99 / 100 (99%) | 基本可用，需官方复核 |
| `registrationStatus` | 100 / 100 (100%) | 粗粒度可用，需标准化 |
| `registrationUrl` | 13 / 100 (13%) | 严重不足 |
| `sourceUrl` | 100 / 100 (100%) | 可追溯，不等于官方链接 |
| `coverImage` | 99 / 100 (99%) | 可用但需版权/热链策略 |

### Category-Level Coverage

| Field | Coverage | Assessment |
|---|---:|---|
| `categoryName` | 154 / 154 (100%) | 可用但需清洗 |
| `distanceKm` | 89 / 154 (58%) | 不足，P0/P1 边界字段 |
| `elevationGain` | 13 / 154 (8%) | 严重不足，越野决策短板 |
| `registrationFee` | 71 / 154 (46%) | 不足，但可通过详情/报名页补 |
| `cutoffTime` | 14 / 154 (9%) | 严重不足 |
| `categoryRegistrationUrl` | 71 / 154 (46%) | 不足，但比 race-level URL 强 |

### Derived Coverage Notes

- Multi-category races: 21 / 100 (21%)
- Races with no category distance: 61 / 100 (61%)
- Races with any elevation gain: 5 / 100 (5%)
- Races with any fee: 23 / 100 (23%)
- Races with any cutoff time: 5 / 100 (5%)
- Races with any category registration URL: 23 / 100 (23%)

## 5. Current Page Field Dependencies

Current page files:

- `components/RaceDecisionPage.tsx`
- `lib/raceDecision.ts`

### Page Modules And Fields

| Module | Actual Fields Used | Current Data Status |
|---|---|---|
| Decision Card | name, coverImage, city/province, categories, registrationStatus, raceDate, category registration URL | 可展示，但质量取决于 Category |
| Category Switcher | categoryName | 覆盖高，语义需清洗 |
| One-line Verdict | type, distanceKm, elevationGain | 当前为规则派生，不是内容资产 |
| RaceNext Advice | distanceKm, elevationGain, cutoffTime | 当前为规则派生，不是审核内容 |
| Recommended / Not Recommended | type, distanceKm, elevationGain | 当前为规则派生 |
| Registration Guide | registrationStatus, raceDate, registrationUrl, fee | 缺 registrationOpen/Close |
| Core Data | distanceKm, elevationGain, cutoffTime, location, raceDate | 爬升和关门时间严重不足 |
| Course Analysis | none rendered | 缺路线图、GPX、海拔图、补给点 |
| AI Guide | type, distanceKm, elevationGain, cutoffTime | 当前为静态规则，需转成 RaceNext Content |
| Travel Guide | none rendered | 缺住宿/交通/领物/停车/餐饮 |
| FAQ | static text | 可用，但需按赛事差异人工/AI 维护 |
| Selected Reviews | none rendered | 缺人工整理内容 |
| Next Races | type/province/raceDate/confidence | 简单规则可用 |
| About Race | sourceUrl only | 缺介绍、历史、主办方、官网 |

## 6. Field Quality Problems

### Race-Level

- `type` 需要复核：当前页面仍有根据名称和爬升推断的逻辑。
- `registrationStatus` 过粗：有报名 URL 就被判定为报名中，不等于官方状态。
- `registrationUrl` 和 `sourceUrl` 混淆：聚合平台链接不能标为官网。
- `coverImage` 可能有版权和热链风险。
- 线上赛、徒步、亲子跑、训练赛可能混入 First50 候选，不一定符合核心越野/路跑决策目标。

### Category-Level

- `categoryName` 有时是套餐名或亲子组合，不是标准组别。
- `distanceKm` 从文本解析，亲子/套餐可能误提取。
- `elevationGain` 极低覆盖，无法判断越野难度。
- `cutoffTime` 是自然语言文本，未结构化为小时或分段关门。
- `registrationFee` 可能是套餐价、亲子价或早鸟价，需要保留 source note。

### RaceNext Content

- 页面当前的“一句话判断 / 建议 / 推荐人群 / AI 指南”是规则生成。
- 这些不应写回基础 Race 或 Category。
- First50 需要独立内容层：AI generated -> human reviewed -> JSON/Markdown published。

## 7. Missing Fields For Decision Page

### P0 Missing / Weak

- Reliable registration URL.
- Reliable registration status.
- Category distance for all decision-relevant categories.
- Clean physical race location.
- Official source confidence.

### P1 Missing / Weak

- Elevation gain.
- Cutoff time.
- Registration fee.
- Registration open date.
- Registration close date.
- Official course map or route description.

### P2 Missing / Weak

- Race introduction.
- Organizer.
- Official website.
- Mandatory gear.
- Qualification requirement.
- Travel notes.
- Packet pickup.
- FAQ variations.
- Manual selected reviews.

### P3 Missing / Future

- User ratings/comments.
- Personalization.
- Training plan.
- Weather risk automation.
- Hotel/transport affiliate inventory.
- Full recommendation algorithm.

## 8. Priority Recommendation

Next phase should not expand Top100. It should build First50 data depth.

Recommended order:

1. Freeze UI and current route.
2. Select First50 candidate list from current seed plus manual known races.
3. For First50, require P0 completion before page is considered publishable.
4. Add a lightweight manual enrichment file, not database migration.
5. Generate RaceNext decision content into separate JSON/Markdown files.
6. Add validation script later to report P0/P1 completeness.

## 9. Proposed Minimal Data Buckets

### Race

Objective facts for one annual race/edition:

- name
- raceDate
- province / city / district / venue
- raceType
- sourceUrl
- officialWebsite
- registrationUrl
- registrationStatus
- registrationOpenDate
- registrationCloseDate
- coverImage
- organizer
- introduction

### Race Category

Concrete user decision objects:

- categoryName
- distanceKm
- elevationGain
- cutoffTime
- registrationFee
- registrationUrl
- registrationStatus
- courseMapUrl
- courseDescription
- gpxUrl
- aidStations
- mandatoryGear
- qualificationRules

### Race Decision Content

RaceNext-owned content, not raw source data:

- oneLineVerdict
- raceNextAdvice
- recommendedFor
- notRecommendedFor
- aiGuide
- courseHighlights
- travelTips
- faq
- selectedReviews
- contentStatus: `draft | ai_generated | human_reviewed | published`
- reviewer
- reviewedAt

## 10. MVP Data Gap Classification

| Classification | Fields |
|---|---|
| 当前已有 | name, raceDate, province, city, district, sourceUrl, coverImage, categoryName |
| 可以通过已有数据清洗获得 | raceType, normalized registrationStatus, physical/online race flag, clean categoryName, primaryCategory |
| 可以通过爬取补充 | registrationOpenDate, registrationCloseDate, registrationFee, categoryRegistrationUrl, courseDescription, cover image, organizer, rulebook text |
| 需要人工补充 | officialWebsite verification, oneLineVerdict, recommendedFor, notRecommendedFor, travel tips, selected reviews, race summary |
| 暂时不要做 | user ratings, full personalization, training plans, live quota, affiliate inventory, weather automation |

## 11. First50 Readiness Definition

A race is First50-ready only when:

- P0 fields are complete.
- At least one decision-relevant Category has distance and registration path.
- Trail races have elevation gain or a manual note explaining missing elevation.
- Registration status has source and checked date.
- RaceNext Decision Content is at least human-reviewed for one primary category.

