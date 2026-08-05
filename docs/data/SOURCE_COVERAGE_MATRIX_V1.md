# SOURCE_COVERAGE_MATRIX_V1.md

Version: v1.0  
Status: Draft  
Project: RaceNext（下一场）  
Based on: `REPORT_RUNCHINA.md`, `REPORT_ZUICOOL.md`

---

# 1. Background

Source Coverage Matrix 用来回答三个问题：

1. 每个字段有哪些 Source 可以提供。
2. 哪个 Source 覆盖能力最好。
3. MVP 阶段在当前数据源组合下建议采用哪个 Source。

它只分析“覆盖能力”，不改变字段治理规则。

## 1.1 Relationship

RaceNext 的数据治理文档分工如下：

| Document | Role | 是否由本文修改 |
|---|---|---|
| `SOURCE_REGISTRY.md` | 定义有哪些 Source、Source 类型、接入状态 | 否 |
| `FIELD_OWNERSHIP.md` | 定义字段最终 Owner | 否 |
| `FIELD_PRIORITY_MATRIX.md` | 定义多源冲突时的优先级 | 否 |
| `MERGE_RULES.md` | 定义合并与去重规则 | 否 |
| `SOURCE_COVERAGE_MATRIX_V1.md` | 分析当前 Source 对字段的覆盖能力 | 本文 |

Coverage 不等于 Priority。

例如：

- Zuicool 对 `registrationFee` 覆盖强。
- 但 `registrationFee` 的 Owner 仍应是 Official。
- Official 缺失时，Zuicool 可以作为 MVP 补充来源。

---

# 2. Current Sources

本版只分析已完成调研的两个数据源：

| Source ID | Source | Type | Current Role | Evidence |
|---|---|---|---|---|
| `runchina` | 中国马拉松信息平台 / 中国马拉松官网 | Aggregator / quasi-official | 中国路跑赛事基准事实源 | `../research/REPORT_RUNCHINA.md` |
| `zuicool` | 最酷 Zuicool | Aggregator / registration platform | 报名、费用、介绍、图片、越野长尾补充源 | `../research/REPORT_ZUICOOL.md` |

未来保留位置：

| Source Group | Expected Role | Current Status |
|---|---|---|
| Official | 赛事官网、官方报名入口、官方公告 | Planned |
| ITRA | 越野难度、爬升、积分、国际赛事标准 | Planned |
| UTMB | UTMB Index、Running Stones | Planned |
| Community | 用户体验、氛围、补给、交通、真实反馈 | Planned |
| Map | 经纬度、交通、POI、停车 | Planned |
| Weather | 天气风险、历史气候 | Planned |
| Commercial | 酒店、交通、装备、保险 | Planned |
| RaceNext | 推荐、评分、派生字段、治理字段 | Internal |

## 2.1 Rating Scale

| Rating | Meaning |
|---|---|
| ★★★★★ | 强，字段稳定、直接、结构化或高价值 |
| ★★★★☆ | 较强，可稳定获取，但需要少量解析或不是最高权威 |
| ★★★☆☆ | 中，可获取但不完整、结构不稳定或需要明显推断 |
| ★★☆☆☆ | 弱，偶尔出现或只能作为辅助信号 |
| ★☆☆☆☆ | 很弱，基本不可依赖 |
| ☆☆☆☆☆ | 无，本轮未发现覆盖 |

---

# 3. Layer Coverage

## 3.1 Layer 1｜Identity

| Field | RunChina | Zuicool | MVP Recommended Source | Notes |
|---|---:|---:|---|---|
| `canonicalName` | ★★★★★ | ★★★★☆ | RunChina | RunChina 更接近中国路跑权威命名；Zuicool 常含商业冠名和营销后缀 |
| `originalNames` | ★★★★☆ | ★★★★★ | Merge All | 两者都应保留原始名，Zuicool 对别名/冠名更丰富 |
| `aliases` | ★★☆☆☆ | ★★★☆☆ | Merge All + manual review | 两者都不是专门别名源 |
| `sourceId` / external id | ★★★★★ | ★★★★☆ | RunChina for road races, Zuicool for registration records | RunChina 有 `raceId`；Zuicool 有主站 `eventId` 与报名站 `regRaceId` |
| `eventId` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 系统生成 |
| `editionId` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 系统生成 |
| `categoryId` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 系统生成 |
| `slug` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 派生字段 |
| `lifecycleStatus` | ★★☆☆☆ | ★★★☆☆ | Zuicool + manual review | Zuicool 可显示延期、关闭等提示；仍需人工确认 |

Layer 1 summary:

- RunChina 是中国路跑身份基准源。
- Zuicool 是报名平台身份与长尾赛事发现源。
- RaceNext 必须自行生成内部 ID。

## 3.2 Layer 2｜Time & Location

| Field | RunChina | Zuicool | MVP Recommended Source | Notes |
|---|---:|---:|---|---|
| `raceDate` | ★★★★★ | ★★★★☆ | RunChina for road races, Zuicool fallback | RunChina 结构化日期强；Zuicool 可补延期/待定提示 |
| `startTime` | ★★☆☆☆ | ★★★★☆ | Zuicool | Zuicool 详情/报名正文常出现起跑时间 |
| `endTime` | ★☆☆☆☆ | ★★☆☆☆ | Zuicool if present | 多见于越野关门/结束信息，不稳定 |
| `registrationOpen` | ★★☆☆☆ | ★★★★☆ | Zuicool | RunChina 样本未稳定返回；Zuicool 正文常包含 |
| `registrationClose` | ★★☆☆☆ | ★★★★★ | Zuicool | 列表和报名页均可出现 |
| `registrationStatus` | ★★☆☆☆ | ★★★★★ | Zuicool | Zuicool 报名中/已关闭/点此报名更直接 |
| `province` | ★★★★★ | ★★★★☆ | RunChina | RunChina 结构化省市区更适合归一 |
| `city` | ★★★★★ | ★★★★☆ | RunChina | 同上 |
| `district` | ★★★★☆ | ★★★☆☆ | RunChina | Zuicool 地点文本更自由 |
| `venue` | ★★☆☆☆ | ★★★★☆ | Zuicool | Zuicool 常含具体起终点/场馆 |
| `region` | ★★★★☆ | ★★★☆☆ | RaceNext derived from location | 根据省市映射生成 |
| `latitude` | ☆☆☆☆☆ | ☆☆☆☆☆ | Map source | 需要高德/百度地图 |
| `longitude` | ☆☆☆☆☆ | ☆☆☆☆☆ | Map source | 需要高德/百度地图 |
| `timezone` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 派生字段 |
| `raceWeekday` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 派生字段 |
| `season` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 派生字段 |

Layer 2 summary:

- 比赛日期、省市区：RunChina 最适合作为中国路跑基准。
- 报名时间、起跑时间、具体地点：Zuicool 更有补充价值。
- 经纬度与交通相关能力仍缺 Map source。

## 3.3 Layer 3｜Race Profile

| Field | RunChina | Zuicool | MVP Recommended Source | Notes |
|---|---:|---:|---|---|
| `raceType` | ★★★★☆ | ★★★★☆ | RunChina for certified road races, Zuicool for trail/long-tail | Zuicool 类型覆盖更宽，RunChina 路跑更权威 |
| `categoryName` | ★★★☆☆ | ★★★★★ | Zuicool | Zuicool 组别细，含报名组别 |
| `distanceKm` | ★★★☆☆ | ★★★★★ | Zuicool for category distance, RunChina fallback | RunChina 多为项目名；Zuicool 可到 21.0975 / 100km |
| `raceDistances` | ★★★☆☆ | ★★★★★ | Merge All, Zuicool preferred for category granularity | Zuicool 组别多且细 |
| `elevationGain` | ★☆☆☆☆ | ★★★★☆ | Zuicool until ITRA | 越野样本可提取累计爬升，但 ITRA 仍应是未来主源 |
| `elevationLoss` | ☆☆☆☆☆ | ★★☆☆☆ | ITRA | Zuicool 不稳定 |
| `terrainType` | ☆☆☆☆☆ | ★★☆☆☆ | ITRA / Community | Zuicool 文案可辅助但不稳定 |
| `surfaceType` | ☆☆☆☆☆ | ★★☆☆☆ | Official / Community | 两者都弱 |
| `courseType` | ☆☆☆☆☆ | ★★☆☆☆ | Official / Community | 两者都弱 |
| `cutoffTime` | ★☆☆☆☆ | ★★★★☆ | Zuicool until Official/ITRA | 越野详情常有关门时间 |
| `qualification` | ★☆☆☆☆ | ★★★☆☆ | Zuicool + manual review | Zuicool 报名须知中可出现成绩要求 |
| `mandatoryGear` | ☆☆☆☆☆ | ★★☆☆☆ | ITRA / Official | Zuicool 正文可能出现，但结构化不稳定 |
| `ITRAPoints` | ☆☆☆☆☆ | ★★☆☆☆ | ITRA | Zuicool 可出现 ITRA 文本，但不能替代 ITRA |
| `UTMBIndex` | ☆☆☆☆☆ | ★★☆☆☆ | UTMB / ITRA | Zuicool 可出现 UTMB 文本，但不应作为权威 |
| `courseHighlights` | ★☆☆☆☆ | ★★★☆☆ | Zuicool + Community | Zuicool 文案可辅助展示，需避免当作事实 |
| `aidStationSpacingKm` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext derived / Official | 当前无覆盖 |

Layer 3 summary:

- RunChina 能支撑路跑项目和认证等级。
- Zuicool 能显著补足组别、距离、越野爬升、关门时间。
- ITRA/UTMB 仍是越野难度与积分字段的必要后续来源。

## 3.4 Layer 4｜Registration

| Field | RunChina | Zuicool | MVP Recommended Source | Notes |
|---|---:|---:|---|---|
| `officialWebsite` | ★★☆☆☆ | ★★☆☆☆ | Official, fallback manual | 两者都不稳定 |
| `registrationUrl` | ★★☆☆☆ | ★★★★★ | Zuicool | Zuicool 报名站入口清晰 |
| `registrationPlatform` | ★☆☆☆☆ | ★★★★★ | Zuicool | `reg.zuicool.com` 可明确平台 |
| `registrationFee` | ☆☆☆☆☆ | ★★★★★ | Zuicool until Official | 组别价格强 |
| `registrationOpen` | ★★☆☆☆ | ★★★★☆ | Zuicool | 常在正文中，需要解析 |
| `registrationClose` | ★★☆☆☆ | ★★★★★ | Zuicool | 列表和报名页覆盖强 |
| `registrationStatus` | ★★☆☆☆ | ★★★★★ | Zuicool | 报名中、已关闭、点此报名等 |
| `capacity` | ★★☆☆☆ | ★★★★☆ | Zuicool + RunChina fallback | Zuicool 正文可出现规模；RunChina `raceScale` 样本多为空 |
| `remainingQuota` | ☆☆☆☆☆ | ★☆☆☆☆ | Official | 当前不可靠 |
| `lotteryRequired` | ☆☆☆☆☆ | ★★★★☆ | Zuicool + manual review | 报名须知常出现抽签规则 |
| `lotteryDate` | ☆☆☆☆☆ | ★★★★☆ | Zuicool + manual review | 抽签时间常在正文 |
| `rulebookUrl` | ☆☆☆☆☆ | ★★☆☆☆ | Official | Zuicool 有正文规程，不一定有独立 URL |
| `refundPolicy` | ☆☆☆☆☆ | ★★★☆☆ | Zuicool + manual review | 报名须知可出现 |

Layer 4 summary:

- Zuicool 是当前 Registration 层最强来源。
- RunChina 不能单独支撑报名体验。
- Official 仍应作为长期事实 Owner 与最终校验来源。

## 3.5 Layer 5｜Recommendation

| Field | RunChina | Zuicool | MVP Recommended Source | Notes |
|---|---:|---:|---|---|
| `difficultyLevel` | ☆☆☆☆☆ | ★★☆☆☆ | RaceNext derived, with ITRA later | Zuicool 文案如“极难，慎报”只能作为参考 |
| `difficultyScore` | ☆☆☆☆☆ | ★★☆☆☆ | RaceNext derived, with ITRA later | 当前无法可靠计算 |
| `beginnerFriendly` | ☆☆☆☆☆ | ★★☆☆☆ | RaceNext derived + Community later | Zuicool 文案可辅助 |
| `recommendedFor` | ☆☆☆☆☆ | ★☆☆☆☆ | RaceNext | 外部源不应覆盖 |
| `recommendationReasons` | ☆☆☆☆☆ | ★★☆☆☆ | RaceNext | Zuicool 营销文案不能直接作为推荐理由 |
| `recommendationTags` | ★☆☆☆☆ | ★★★☆☆ | RaceNext derived | Zuicool 标签和简介可辅助 |
| `riskWarnings` | ☆☆☆☆☆ | ★★☆☆☆ | RaceNext + manual review | Zuicool 可出现“慎报”等提示 |
| `raceNextScore` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 内部计算 |
| `trainingSuggestion` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 内部生成 |

Layer 5 summary:

- RunChina + Zuicool 不足以形成 RaceNext 推荐层。
- Zuicool 的文案只能作为辅助信号，不能替代 RaceNext 推荐逻辑。
- ITRA、Community、RaceNext 内部模型是后续关键。

## 3.6 Layer 6｜Experience

| Field | RunChina | Zuicool | MVP Recommended Source | Notes |
|---|---:|---:|---|---|
| `sceneryRating` | ☆☆☆☆☆ | ★★☆☆☆ | Community later | Zuicool 图文可辅助，但不是评分 |
| `organizationRating` | ☆☆☆☆☆ | ★☆☆☆☆ | Community later | 当前无可靠评分 |
| `aidStationRating` | ☆☆☆☆☆ | ★☆☆☆☆ | Community later | 当前无可靠评分 |
| `trafficConvenience` | ☆☆☆☆☆ | ★☆☆☆☆ | Map source | Zuicool 可能有地点，不能评价交通便利 |
| `parkingConvenience` | ☆☆☆☆☆ | ☆☆☆☆☆ | Map / Community | 当前无覆盖 |
| `accommodationConvenience` | ☆☆☆☆☆ | ☆☆☆☆☆ | Commercial | 当前无覆盖 |
| `cityTravelRating` | ☆☆☆☆☆ | ★☆☆☆☆ | Commercial / Community | 当前无覆盖或很弱 |
| `familyFriendly` | ☆☆☆☆☆ | ★★☆☆☆ | Community + manual | 亲子赛事可辅助识别，不等于体验评价 |
| `weatherRisk` | ☆☆☆☆☆ | ☆☆☆☆☆ | Weather / RaceNext | 当前无覆盖 |
| `altitudeRisk` | ☆☆☆☆☆ | ★★☆☆☆ | RaceNext + ITRA | Zuicool 越野正文可能出现海拔，但不稳定 |
| `experienceSummary` | ☆☆☆☆☆ | ★★★☆☆ | RaceNext using Zuicool as input | Zuicool 富文本可作为摘要输入 |
| `mediaImages` | ☆☆☆☆☆ | ★★★★★ | Zuicool | logo、banner、正文图强，但需版权判断 |
| `courseDescription` | ★☆☆☆☆ | ★★★★☆ | Zuicool | 富文本路线和体验描述强 |

Layer 6 summary:

- Zuicool 能补图片、介绍、路线描述。
- 真正的体验评分仍缺 Community / Map / Commercial。
- 图片展示权利需要单独产品和合规判断。

## 3.7 Layer 7｜Race Service

| Field | RunChina | Zuicool | MVP Recommended Source | Notes |
|---|---:|---:|---|---|
| `hotelRecommendation` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext + Commercial | 当前无覆盖 |
| `gearRecommendation` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext + Commercial | 当前无覆盖 |
| `nutritionRecommendation` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext + Community | 当前无覆盖 |
| `insuranceRecommendation` | ☆☆☆☆☆ | ☆☆☆☆☆ | Commercial | 当前无覆盖 |
| `travelRecommendation` | ☆☆☆☆☆ | ★☆☆☆☆ | Commercial / Community | Zuicool 图文可有旅游信息但不稳定 |
| `transportationRecommendation` | ☆☆☆☆☆ | ☆☆☆☆☆ | Map / Commercial | 当前无覆盖 |
| `routeRecommendation` | ☆☆☆☆☆ | ★★☆☆☆ | RaceNext + Official/GPX | Zuicool 可有路线正文或图片，缺 GPX |
| `reminderService` | ☆☆☆☆☆ | ★★☆☆☆ | RaceNext derived | 可基于 Zuicool 报名截止生成提醒 |
| `resultUrl` | ☆☆☆☆☆ | ★★★☆☆ | Zuicool if available | Zuicool 有成绩查询入口，但非赛事服务完整源 |
| `newsUrl` | ☆☆☆☆☆ | ★★★☆☆ | Zuicool if available | 资讯标签可辅助 |

Layer 7 summary:

- 当前两源不能支撑商业服务。
- Zuicool 可以提供报名服务入口、成绩入口、资讯入口。
- 酒店、交通、装备、保险仍需独立 Source。

## 3.8 Layer 8｜Governance

| Field | RunChina | Zuicool | MVP Recommended Source | Notes |
|---|---:|---:|---|---|
| `sourceUrl` | ★★★★★ | ★★★★★ | Source-specific | 两者都可保留 URL |
| `rawId` | ★★★★★ | ★★★★☆ | Source-specific | RunChina `raceId`；Zuicool `eventId` / `regRaceId` |
| `rawData` | ★★★★★ | ★★★★★ | Source-specific | RunChina JSON；Zuicool HTML/text/raw blocks |
| `lastFetchedAt` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 系统生成 |
| `lastUpdatedAt` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 系统生成或源更新时间补充 |
| `dataQuality` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 系统评估 |
| `verified` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext / manual | 人工或系统校验 |
| `confidence` | ☆☆☆☆☆ | ☆☆☆☆☆ | RaceNext | 系统计算 |
| `sourceReliability` | ★★★★☆ | ★★★☆☆ | RaceNext governance | 根据调研与历史稳定性评估 |
| `complianceRisk` | ★★★☆☆ | ★★★★☆ | RaceNext governance | RunChina 有 EdgeOne/风控；Zuicool HTML 公开但版权/报名流程需注意 |

Layer 8 summary:

- Layer 8 本质属于 RaceNext。
- 外部 Source 只提供 URL、原始 ID 和原始数据。
- 数据质量、置信度、验证状态必须由系统和人工生成。

---

# 4. Coverage Summary

## 4.1 RunChina Advantages

RunChina 的优势：

- 中国路跑赛事身份基准。
- 日期、省、市、区结构化程度高。
- 赛事 ID 稳定。
- 认证等级、田协相关信息价值高。
- JSON API 可访问，Parser 成本低于 HTML。
- 适合支撑中国马拉松/半马 Top100 / Top200 的基础事实库。

RunChina 的弱项：

- 报名状态不稳定。
- 报名入口、报名费用、报名时间弱。
- 赛事介绍、图片、路线说明弱。
- 越野赛事覆盖弱。
- Experience、Service、Recommendation 基本不覆盖。

## 4.2 Zuicool Advantages

Zuicool 的优势：

- 报名状态、报名截止、报名入口强。
- 组别价格强。
- 多组别、距离、越野爬升、关门时间强。
- 图片、banner、正文图、赛事介绍强。
- 覆盖越野、线上赛、亲子、徒步、海外和长尾赛事。
- 可补足 RunChina 的 Registration、Experience 和 Trail Profile 缺口。

Zuicool 的弱项：

- 核心数据主要是 SSR HTML，没有发现稳定赛事 JSON API。
- 商业冠名、营销文案较多，不能直接作为 canonicalName 或推荐理由。
- HTML Parser 维护成本高。
- 非权威身份源。
- 正文信息需要人工复核。

## 4.3 Overlapping Fields

两者重叠字段：

| Field Group | RunChina | Zuicool | Recommended Handling |
|---|---|---|---|
| 赛事名称 | 强 | 强 | RunChina 优先做路跑 canonical；Zuicool 原始名保留 |
| 比赛日期 | 强 | 较强 | RunChina 优先；Zuicool 用于补充变更/待定提示 |
| 省市区/地点 | 强 | 较强 | RunChina 归一；Zuicool 补具体 venue |
| 赛事项目 | 中 | 强 | 合并；Zuicool 拆 Category |
| 赛事规模 | 弱到中 | 中 | 互相补充，人工复核 |
| 认证/标签 | 强 | 中 | RunChina 认证优先；Zuicool 标签保留为辅助 |

## 4.4 Complementary Fields

互补字段：

| Field Group | Best Current Source | Notes |
|---|---|---|
| 报名入口 | Zuicool | `reg.zuicool.com` |
| 报名费用 | Zuicool | Category-level price |
| 报名截止 | Zuicool | 列表和报名页均有 |
| 抽签规则 | Zuicool | 正文解析 + 人工复核 |
| 赛事介绍 | Zuicool | 富文本强 |
| 图片 | Zuicool | logo / og:image / 正文图 |
| 越野距离 | Zuicool | 后续需 ITRA 校验 |
| 越野爬升 | Zuicool | 后续需 ITRA 校验 |
| 关门时间 | Zuicool | 详情/报名页正文 |
| 中国路跑认证事实 | RunChina | 认证等级与基准身份 |

## 4.5 Fields Covered By Neither

两者都无法可靠覆盖：

- 官方网站权威确认。
- 官方报名入口最终真值。
- 经纬度。
- GPX / route file。
- 天气风险。
- 海拔风险的完整计算输入。
- 用户体验评分。
- 组织评分。
- 补给评分。
- 交通便利度。
- 停车便利度。
- 酒店便利度。
- 商业推荐。
- RaceNext 推荐理由。
- RaceNext Score。
- 训练建议。

---

# 5. Gap Analysis

## 5.1 Official

Official 仍必须负责：

- 官方日期最终确认。
- 官方报名入口。
- 官方报名规则。
- 官方规程。
- 名额、抽签、退赛、延期公告。
- 官方网站。

原因：

- RunChina 和 Zuicool 都是聚合/平台性质。
- 报名和赛历变更最终仍应以官方为准。

## 5.2 ITRA / UTMB

ITRA / UTMB 需要负责：

- 越野赛事难度。
- 爬升/下降。
- ITRA Points。
- UTMB Index。
- Running Stones。
- 资格要求。
- 国际越野赛事标准化。

原因：

- Zuicool 能提供越野文本，但不是积分和难度权威源。
- RunChina 基本不覆盖越野。

## 5.3 Community

Community 需要负责：

- 真实体验。
- 组织水平。
- 补给评价。
- 风景评价。
- 亲友友好度。
- 避坑信息。
- 赛后口碑。

原因：

- Zuicool 有营销文案，不等于用户体验。
- RunChina 不提供体验数据。

## 5.4 Map

Map source 需要负责：

- 经纬度。
- 起终点 POI。
- 交通便利度。
- 停车。
- 高铁站/机场距离。
- 周边酒店位置。

原因：

- 两个赛事源只提供文本地点。

## 5.5 Weather

Weather source 需要负责：

- 历史温度。
- 降雨概率。
- 台风/高温/寒冷风险。
- 比赛月份气候风险。

原因：

- RaceNext 的“下一场比赛”决策需要天气风险。
- 当前两个源都不覆盖。

## 5.6 Commercial

Commercial source 需要负责：

- 酒店推荐。
- 交通套餐。
- 装备推荐。
- 保险。
- 旅行服务。

原因：

- 当前两源只解决赛事信息，不解决服务闭环。

---

# 6. MVP Coverage

基于 RunChina + Zuicool，当前 Race Schema 八层覆盖率估算如下。

| Layer | Current MVP Coverage | Main Contributors | Notes |
|---|---:|---|---|
| Layer 1 Identity | 90% | RunChina + Zuicool | 足够支撑 Top100 / Top200 的赛事识别和去重初版 |
| Layer 2 Time & Location | 85% | RunChina + Zuicool | 日期城市强，坐标和交通缺失 |
| Layer 3 Race Profile | 70% | Zuicool + RunChina | 路跑/组别可用，越野权威难度仍缺 ITRA |
| Layer 4 Registration | 80% | Zuicool | 报名入口/费用强，但官方最终确认缺失 |
| Layer 5 Recommendation | 25% | RaceNext + weak source signals | 需要 RaceNext 自建，当前外部源只给输入信号 |
| Layer 6 Experience | 45% | Zuicool | 图文介绍可用，真实体验评分缺 Community |
| Layer 7 Race Service | 25% | Zuicool + RaceNext derived | 报名/成绩入口可用，商业服务缺失 |
| Layer 8 Governance | 70% | RaceNext + raw source metadata | URL/rawId/rawData 可做，质量体系需实现 |

整体覆盖率估算：61%。

解释：

- 对“发现并展示 Top100 / Top200 候选赛事”已经基本可用。
- 对“帮助跑者决策下一场比赛”还不完整。
- 最大短板在 Recommendation、Experience 真实评价、Map、Weather、Commercial 和 Official final verification。

---

# 7. Next Source Recommendation

基于当前 Coverage Matrix，后续建议调查顺序如下：

| Priority | Source Group | Why |
|---:|---|---|
| 1 | ITRA | 最大补口是越野难度、爬升、积分、资格；Zuicool 已证明越野覆盖有价值，但缺权威校验 |
| 2 | Official | 官方日期、报名规则、延期公告、官网链接仍是最终事实源；Top100 必须逐步补官方校验 |
| 3 | Map | 地点文本已经有了，下一步需要经纬度、交通、停车、到达成本 |
| 4 | Weather | “下一场”决策强相关，尤其高温、雨季、海拔、台风季 |
| 5 | Community | 体验、补给、组织、风景评分需要真实用户反馈 |
| 6 | Commercial | 酒店、交通、保险、装备属于商业闭环，可在 MVP 后置 |

不建议近期调查：

- 小红书、微信公众号、微信小程序、App-only 数据源。
- 原因是合规和维护成本高，不适合当前 MVP POC 阶段。

---

# 8. Architecture Review

## 8.1 Race Schema Review

结论：目前无需调整 Race Schema 八层结构。

原因：

- RunChina 主要落在 Layer 1-3。
- Zuicool 主要补 Layer 3-6。
- 两者无法覆盖 Layer 5/7 的事实，正好验证了“客观事实”和“RaceNext 增值层”分离是必要的。

## 8.2 Event Model Review

结论：目前无需调整 Event / Edition / Category 三层模型。

原因：

- RunChina 更接近 Edition 级别。
- Zuicool 是 Event + Edition + Category 混合结构。
- Zuicool 报名费用天然属于 Category。
- 报名状态可能属于 Edition，也可能属于 Category，需要字段层支持 group-level registration，而不是推翻模型。

建议后续实现注意：

- `sourceRefs` 需要同时容纳 RunChina `raceId`、Zuicool `eventId`、Zuicool `regRaceId`。
- Category 需要支持 `registrationUrl` 与 `registrationFee`。
- Edition 需要支持多个 source-level raw records。

## 8.3 Source Registry Review

结论：目前无需调整 Source Registry 类型。

说明：

- RunChina 和 Zuicool 放在 Aggregator 合理。
- Zuicool 同时有 registration platform 能力，但仍不是 Official。
- ITRA 后续仍应归入 International。

## 8.4 Field Priority Matrix Review

结论：本轮不修改 `FIELD_PRIORITY_MATRIX.md`。

观察：

- 两份报告支持“RunChina 优先中国路跑身份/日期/地区，Zuicool 优先报名/费用/介绍/图片”的方向。
- Zuicool 调研显示其对 `distanceKm`、`elevationGain`、`cutoffTime` 有较强覆盖能力，但当前优先级文档中部分字段尚未把 Zuicool列为 Contributor。
- 这不是矛盾，而是下一轮治理文档更新时可评估的候选调整。

---

# 9. Report Consistency Review

同步 Review 结果：

| Item | Result |
|---|---|
| Source 名称 | 一致：`RunChina` / `Zuicool` |
| Source ID | 一致：`runchina` / `zuicool` |
| URL | 一致：RunChina 使用 `https://www.runchina.org.cn/`，Zuicool 使用 `https://zuicool.com/` 与 `https://reg.zuicool.com/` |
| 定位 | 一致：RunChina 是中国路跑基准事实源；Zuicool 是补充源 |
| 字段结论 | 一致：RunChina 强身份/日期/地点；Zuicool 强报名/费用/介绍/越野 |
| 冲突处理 | 一致：路跑事实优先 RunChina，报名和图文优先 Zuicool |

未发现需要立即修正 `REPORT_RUNCHINA.md` 或 `REPORT_ZUICOOL.md` 的互相矛盾内容。

---

# 10. Conclusion

RunChina + Zuicool 已经足够支撑 RaceNext 的 Top100 / Top200 MVP 数据源候选阶段。

可以支撑：

- 中国路跑赛事发现。
- 基础身份识别。
- 年度 Edition 构建。
- 日期与城市筛选。
- 多源去重初版。
- 报名入口补充。
- 报名费用补充。
- 赛事介绍和图片补充。
- 一部分越野赛事发现和组别字段。

必须依赖 Official 的能力：

- 最终官方日期确认。
- 官方报名入口确认。
- 延期/取消公告。
- 官方规程。
- 官方名额、抽签、退费规则。
- 官方网站。

必须依赖 ITRA / UTMB 的能力：

- 越野难度。
- ITRA points。
- UTMB Index。
- 权威爬升/距离/资格。

可以以后做：

- Community 体验评分。
- Map 交通便利度。
- Weather 风险。
- Commercial 服务。
- RaceNext AI 推荐与商业化闭环。

是否建议进入正式 Connector 开发阶段：

建议进入有限范围的 Connector POC 开发阶段，但不要进入全量抓取。

推荐边界：

- RunChina Connector：公开 API、低频、候选集、路跑基准事实。
- Zuicool Connector：公开 HTML、低频、候选集、报名与图文补充。
- 两者都必须保留 rawData、sourceUrl、rawId。
- Top100 / Top200 阶段必须加入人工复核和 Official 校验。
