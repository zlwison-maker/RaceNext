# Event Model v1.0

Version: v1.0
Status: Draft
Project: RaceNext（下一场）

---

## 1. Background

Race Schema v1.0 定义了 RaceNext 赛事数据的字段分层。

Event Model v1.0 进一步定义：

这些字段分别属于哪个实体。

RaceNext 不能把所有赛事信息都平铺成一张 Race 表。

原因是：

同一个赛事品牌会每年举办一次；
同一年赛事会包含多个组别；
不同数据源可能抓到赛事品牌、年度赛事、具体组别中的任意一层。

因此，RaceNext 采用：

Event
↓
Edition
↓
Category

三层模型。

---

## 2. Core Structure

### Event

赛事品牌。

回答：

这是什么赛事？

示例：

- 上海马拉松
- 北京马拉松
- 莫干山越野赛
- 崇礼168
- 港百
- UTMB Mont-Blanc

Event 是跨年份存在的。

---

### Edition

某一年具体赛事。

回答：

哪一年的这场赛事？

示例：

- 2026 上海马拉松
- 2025 上海马拉松
- 2026 莫干山越野赛
- 2026 港百

Edition 是赛事日历、报名状态、比赛日期的核心实体。

---

### Category

某一年赛事下的具体组别。

回答：

我报哪个组别？

示例：

2026 上海马拉松：

- 全程马拉松
- 健身跑

2026 莫干山越野赛：

- 30K
- 50K
- 70K

Category 是距离、爬升、关门时间、报名费、资格要求的核心实体。

---

## 3. Entity Relationship

Event 1:N Edition

一个 Event 可以有多个 Edition。

例如：

上海马拉松
↓
2024 上海马拉松
2025 上海马拉松
2026 上海马拉松

---

Edition 1:N Category

一个 Edition 可以有多个 Category。

例如：

2026 莫干山越野赛
↓
30K
50K
70K

---

## 4. Why Not Use One Race Table

不要把所有信息放在一个 Race 里。

错误示例：

上海马拉松
2026
42.2KM
报名中

问题：

- 2025 和 2026 会混在一起
- 全马、半马、健康跑会混在一起
- 报名状态属于 Edition，不属于 Event
- 距离和爬升属于 Category，不属于 Event
- 多源 Merge 会越来越混乱

---

## 5. Event Entity

Event 表示赛事品牌。

### Event Fields

| Field | 中文名 | 说明 |
|---|---|---|
| eventId | Event ID | 系统唯一 ID |
| canonicalName | 标准赛事名称 | 赛事品牌标准名称 |
| aliases | 赛事别名 | 简称、英文名、历史名称 |
| eventType | 赛事类型 | marathon / trail / utmb / road_running / other |
| homeCountry | 所属国家 | 默认举办国家 |
| homeProvince | 常驻省份 | 国内赛事使用 |
| homeCity | 常驻城市 | 常驻举办城市 |
| officialWebsite | 官方网站 | 赛事品牌官网 |
| organizer | 主办方 | 主办机构 |
| lifecycleStatus | 生命周期状态 | active / archived / cancelled / uncertain |
| createdAt | 创建时间 | 系统字段 |
| updatedAt | 更新时间 | 系统字段 |

### Event 适合存放

- 赛事品牌名称
- 赛事别名
- 主办方
- 官方网站
- 常驻城市
- 赛事长期定位

### Event 不应该存放

- 某一年比赛日期
- 某一年报名状态
- 某一年报名链接
- 具体组别距离
- 具体组别爬升

---

## 6. Edition Entity

Edition 表示某一年具体赛事。

### Edition Fields

| Field | 中文名 | 说明 |
|---|---|---|
| editionId | Edition ID | 系统唯一 ID |
| eventId | Event ID | 所属 Event |
| editionName | 届次名称 | 例如 2026 上海马拉松 |
| editionYear | 赛事年份 | 例如 2026 |
| raceDate | 比赛日期 | 正式比赛日 |
| raceWeekday | 星期 | 系统自动计算 |
| season | 赛事季节 | 春夏秋冬 |
| country | 国家 | 举办国家 |
| province | 省份 | 举办省份 |
| city | 城市 | 举办城市 |
| district | 区县 | 举办区县 |
| venue | 起终点地点 | 主会场或起终点 |
| latitude | 纬度 | 地图定位 |
| longitude | 经度 | 地图定位 |
| region | 所属区域 | 华东 / 华南 / 西南等 |
| timezone | 时区 | 国际赛事使用 |
| registrationStatus | 报名状态 | 即将开放 / 报名中 / 已截止等 |
| registrationOpenDate | 报名开始时间 | 报名开放时间 |
| registrationCloseDate | 报名截止时间 | 报名截止时间 |
| lotteryRequired | 是否抽签 | 是否需要抽签 |
| lotteryResultDate | 抽签结果时间 | 抽签公布时间 |
| registrationPlatform | 报名平台 | 数字心动 / 最酷 / 官网等 |
| registrationUrl | 报名链接 | 最终报名入口 |
| officialWebsite | 官方网站 | 本届赛事官网 |
| rulebookUrl | 竞赛规程 | 竞赛规程链接 |
| capacity | 总名额 | 本届赛事总名额 |
| lifecycleStatus | 生命周期状态 | active / archived / cancelled / uncertain |
| createdAt | 创建时间 | 系统字段 |
| updatedAt | 更新时间 | 系统字段 |

### Edition 适合存放

- 比赛日期
- 举办城市
- 报名状态
- 报名入口
- 抽签信息
- 本届赛事官网
- 本届赛事规程

### Edition 不应该存放

- 跨年份赛事品牌信息
- 具体组别距离
- 具体组别爬升
- 组别报名费
- 组别关门时间

---

## 7. Category Entity

Category 表示某一届赛事下的具体组别。

### Category Fields

| Field | 中文名 | 说明 |
|---|---|---|
| categoryId | Category ID | 系统唯一 ID |
| editionId | Edition ID | 所属 Edition |
| categoryName | 组别名称 | 全马 / 半马 / 30K / 50K |
| distanceKm | 组别距离 | 单位 KM |
| elevationGain | 累计爬升 | 单位米 |
| elevationLoss | 累计下降 | 单位米 |
| cutoffTimeHours | 关门时间 | 单位小时 |
| fee | 报名费 | 当前组别报名费 |
| currency | 币种 | CNY / USD / EUR 等 |
| capacity | 组别名额 | 当前组别名额 |
| remainingQuota | 剩余名额 | 如公开可获取 |
| minAge | 最低参赛年龄 | 参赛年龄要求 |
| qualificationRequired | 是否需要资格 | 是否需要资格证明 |
| qualificationRules | 资格规则 | ITRA积分、完赛证明等 |
| mandatoryGear | 强制装备 | 越野强制装备 |
| itraPoints | ITRA 积分 | ITRA 体系 |
| mountainLevel | ITRA 山地等级 | ITRA Mountain Level |
| utmbIndex | UTMB 指数 | UTMB Index |
| runningStones | Running Stones | UTMB 跑石 |
| courseType | 路线类型 | 环线 / 点到点 / 折返 |
| surfaceType | 路面类型 | road / trail / mixed |
| terrainType | 地形类型 | flat / mountain / technical |
| altitudeMin | 最低海拔 | 单位米 |
| altitudeMax | 最高海拔 | 单位米 |
| altitudeAverage | 平均海拔 | 单位米 |
| aidStationCount | 补给站数量 | 官方补给站数量 |
| aidStationSpacingKm | 平均补给间距 | 系统计算 |
| officialCourseMapUrl | 官方路线图 | 官方路线图链接 |
| gpxUrl | GPX 文件 | GPX 路线文件 |
| courseDescription | 路线简介 | 路线描述 |
| courseHighlights | 路线亮点 | 路线特色 |
| createdAt | 创建时间 | 系统字段 |
| updatedAt | 更新时间 | 系统字段 |

### Category 适合存放

- 距离
- 爬升
- 关门时间
- 报名费
- 组别名额
- 资格要求
- 强制装备
- ITRA / UTMB 信息
- 路线信息

### Category 不应该存放

- 赛事品牌名称
- 比赛日期
- 举办城市
- 总体报名状态

---

## 8. Recommendation Data Ownership

推荐相关字段不属于 Event。

推荐字段主要挂在 Edition 或 Category 上。

### 推荐到 Edition

适合：

- 这场赛事是否值得去
- 是否适合作为旅行赛事
- 赛事体验评分
- 城市旅行价值

示例字段：

- sceneryRating
- organizationRating
- trafficConvenience
- accommodationConvenience
- cityTravelRating
- experienceSummary

---

### 推荐到 Category

适合：

- 这个组别是否适合用户
- 难度
- 风险
- 推荐理由

示例字段：

- difficultyLevel
- difficultyScore
- beginnerFriendly
- recommendedFor
- recommendationReasons
- riskWarnings
- raceNextScore

---

## 9. Service Data Ownership

商业化和服务字段不属于 Event。

大部分服务字段挂在 Edition 或 Category 上。

### 挂在 Edition 的服务

适合：

- 酒店
- 交通
- 报名提醒
- 城市旅行
- 保险

示例：

- accommodationServices
- transportationServices
- bookingServices
- raceReminderServices
- insuranceServices

---

### 挂在 Category 的服务

适合：

- 装备
- 训练计划
- 补给计划
- 路线攻略

示例：

- gearRecommendations
- trainingServices
- nutritionServices
- routeServices

---

## 10. Data Governance Ownership

数据治理字段需要覆盖 Pipeline 与三个实体层级：

CanonicalRecord
Event
Edition
Category

每一层都应有自己的：

- sources
- fieldSources
- confidence
- verified
- verificationStatus
- missingFields
- mergeNotes
- mergeTrace
- lastCrawledAt
- lastUpdatedAt
- pipelineVersion
- schemaVersion
- dataQualityLevel
- internalFlags

原因：

不同数据源可能只提供某一层信息。

例如：

- 一个数据源只提供 Event 名称
- 一个数据源提供 Edition 日期
- 一个数据源提供 Category 爬升

不能只在最外层记录来源。

---

## 11. Layer to Entity Mapping

Race Schema v1.0 是字段全集。

Event Model v1.0 负责决定字段归属。

### Layer 1 Identity

主要分布：

- CanonicalRecord
- Event
- Edition
- Category

CanonicalRecord 用于 Pipeline 阶段的合并与追踪；Event / Edition / Category 是正式实体 ID 归属。

### Layer 2 Time & Location

主要属于：

- Edition

### Layer 3 Race Profile

主要属于：

- Category

少量汇总字段可冗余到 Edition，用于列表展示。

例如：

- raceDistanceKm
- raceDistances
- primaryCategoryName

### Layer 4 Registration

主要属于：

- Edition
- Category

Edition 存整体报名状态；
Category 存具体组别价格、名额、资格。

### Layer 5 Recommendation

主要属于：

- Category

部分 Edition 级推荐可单独维护。

### Layer 6 Experience

主要属于：

- Edition

### Layer 7 Race Service

主要属于：

- Edition
- Category

### Layer 8 Data Governance

Event / Edition / Category / CanonicalRecord 都需要。

---

## 12. Frontend Usage

前端不直接关心 Event / Edition / Category 的全部细节。

前端页面使用 ViewModel。

ViewModel 不是数据库表，而是前端展示聚合结构。前端不直接使用底层实体，API 或本地数据层应将 Event / Edition / Category 聚合为对应 ViewModel。

### RaceCardViewModel

用于赛事日历卡片。

字段来源映射：

- canonicalName ← Event
- editionName ← Edition
- raceType ← Event / Edition
- raceDate ← Edition
- city ← Edition
- region ← Edition
- registrationStatus ← Edition
- registrationUrl ← Edition
- officialWebsite ← Edition
- raceDistances ← Edition summary from Categories
- primaryCategoryName ← Edition summary from Categories
- elevationGain ← Primary Category
- difficultyLevel ← Primary Category
- tags / recommendationTags ← Category / RaceNext

---

### RecommendationCardViewModel

用于赛事推荐卡片。

字段来源映射：

- canonicalName ← Event
- editionName ← Edition
- categoryName ← Category
- distanceKm ← Category
- elevationGain ← Category
- difficultyLevel ← Category
- raceNextScore ← Category Recommendation
- recommendationReasons ← Category Recommendation
- riskWarnings ← Category Recommendation
- registrationStatus ← Edition
- registrationUrl ← Edition
- trafficConvenience ← Edition Experience
- accommodationConvenience ← Edition Experience

---

## 13. Aggregation Rules

Edition 可以冗余少量 Category 汇总字段，用于赛事日历与卡片展示。

允许冗余字段：

- raceDistanceKm
- raceDistances
- primaryCategoryName
- elevationGain
- difficultyLevel
- beginnerFriendly

规则：

- 默认使用 Primary Category 作为卡片主展示组别。
- 如果用户来自推荐页，则使用被推荐的 Category。
- Edition 级字段不得覆盖 Category 原始事实。
- 冗余字段只用于展示和筛选，不作为真实数据源。
- 真实距离、爬升、难度仍以 Category 为准。

---

## 14. MVP Implementation Scope

MVP 阶段必须实现三层实体：

- Event
- Edition
- Category

但可以先不接数据库。

当前阶段可继续使用 JSON / TypeScript 类型模拟。

MVP 必须保证：

1. 一个赛事品牌只对应一个 Event。
2. 同一年赛事只对应一个 Edition。
3. 每个距离组别对应一个 Category。
4. 推荐逻辑优先作用在 Category。
5. 赛事日历展示以 Edition 为主。
6. 赛事推荐展示以 Category 为主。

---

## 15. Example

### 上海马拉松

Event：

上海马拉松

Editions：

- 2025 上海马拉松
- 2026 上海马拉松

Categories：

2026 上海马拉松：

- 全程马拉松 42.2KM
- 健身跑

---

### 莫干山越野赛

Event：

莫干山越野赛

Editions：

- 2025 莫干山越野赛
- 2026 莫干山越野赛

Categories：

2026 莫干山越野赛：

- 30K
- 50K
- 70K

---

## 16. Freeze

Event Model v1.0 确认后，后续所有：

- 数据抓取
- Normalize
- Dedupe
- Merge
- Canonical
- API
- Database
- Recommendation
- Frontend ViewModel

都必须遵循：

Event
↓
Edition
↓
Category

三层结构。

禁止重新退回单层 Race 表。
