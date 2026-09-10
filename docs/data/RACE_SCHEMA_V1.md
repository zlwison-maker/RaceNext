Race Schema v1.0

Version: v1.0

Status: Frozen

Project: RaceNext（下一场）

Current State: Architecture Frozen; Public Distribution Ready; Real AI Provider Adapter Ready with Runtime Verification Deferred.

⸻

1. Background

RaceNext 是一个围绕跑者「下一场比赛」决策的一站式赛事平台。

平台不仅聚合赛事信息，更希望帮助跑者完成整个决策过程：

发现赛事 → 对比赛事 → 决定报名 → 完成比赛 → 获得更好的赛事体验。

因此，Race Schema 的目标不是存储赛事数据，而是建立一套能够长期支撑产品演进、推荐系统、商业化能力的数据基础设施。

本 Schema 作为整个项目唯一的数据标准（Single Source of Truth）。

所有：

* 数据抓取
* 数据清洗
* 数据合并
* 数据库设计
* API
* 推荐系统
* AI
* 后台管理

均必须以本 Schema 为准。

⸻

2. Design Principles

Race Schema 遵循以下原则：

Principle 1

业务优先，而非数据库优先。

Schema 首先服务产品，而不是服务代码。

⸻

Principle 2

按照用户决策过程组织数据，而不是按照技术模块组织数据。

用户最终关注的是：

* 这是什么比赛？
* 在哪里？
* 难不难？
* 能不能报名？
* 为什么推荐？
* 值不值得去？
* 我还能获得哪些服务？

因此 Schema 按照决策链路进行分层。

⸻

Principle 3

客观事实与产品价值完全分离。

赛事官方信息属于客观事实。

推荐、体验、商业能力属于 RaceNext 创造的价值。

二者不能混合。

⸻

Principle 4

Schema 必须支持未来五年以上演进。

新增商业能力、新增推荐算法、新增 AI 能力时，应通过增加字段，而不是推翻 Schema。

⸻

3. Eight Layer Architecture

Race Schema 共分为八层。

⸻

Layer 1

Identity（赛事身份层）

回答：

这到底是哪一场赛事？

负责：

* 唯一标识
* Merge
* Canonical
* URL
* 搜索
* 去重

数据来源：

Data Source / System

⸻

Layer 2

Time & Location（时间地点层）

回答：

比赛什么时候举行？

比赛在哪里举行？

负责：

* 日历
* 地图
* 城市筛选
* 时间筛选
* 国际赛事支持

数据来源：

Data Source

⸻

Layer 3

Race Profile（赛事画像层）

回答：

这是一场怎样的比赛？

负责：

* 距离
* 爬升
* 地形
* 路线
* 补给
* ITRA
* UTMB

这一层决定赛事本身。

数据来源：

Data Source

⸻

Layer 4

Registration（报名信息层）

回答：

现在能不能报名？

负责：

* 报名状态
* 报名时间
* 抽签
* 官网
* 报名入口

数据来源：

Data Source

⸻

Layer 5

Recommendation（赛事推荐层）

回答：

为什么推荐这场比赛？

负责：

* 难度
* 推荐理由
* 推荐人群
* 风险提示
* RaceNext Score

这一层开始属于 RaceNext 自己创造的数据。

数据来源：

RaceNext

⸻

Layer 6

Experience（赛事体验层）

回答：

值不值得去？

负责：

* 风景
* 交通
* 酒店
* 家庭友好
* 城市旅行价值
* 赛事体验

数据来源：

RaceNext + AI + Manual

⸻

Layer 7

Race Service（赛事服务层）

回答：

RaceNext 还能帮助用户完成什么？

负责：

* 酒店
* 装备
* 训练
* 路线
* 提醒
* 保险
* 联盟合作

这一层是未来商业化能力的基础。

数据来源：

RaceNext / Partner

⸻

Layer 8

Data Governance（数据治理层）

回答：

这些数据可靠吗？

负责：

* Source
* Merge
* Confidence
* Review
* Pipeline
* Version

这一层永远不面向用户。

仅用于后台治理。

数据来源：

System

⸻

4. Layer Ownership

Layer    Owner
Identity    Data Source
Time & Location    Data Source
Race Profile    Data Source
Registration    Data Source
Recommendation    RaceNext
Experience    RaceNext
Race Service    RaceNext
Data Governance    System

⸻

5. Data Flow

整个数据流统一采用：

RawRecord

↓

NormalizedRecord

↓

Dedupe

↓

Merge

↓

CanonicalRecord

↓

Entity Split

↓

Event / Edition / Category

↓

Recommendation Engine

↓

Frontend

任何新的数据源，都必须进入该 Pipeline。

禁止直接写入 Event / Edition / Category。

说明：

- RawRecord / NormalizedRecord / CanonicalRecord 是 Pipeline 阶段的中性记录命名。
- Event / Edition / Category 是 v1.0 正式实体模型。
- RawRace / NormalizedRace / CanonicalRace 是早期 POC 命名，仅可作为历史代码兼容名，不再作为文档主线。

⸻

6. Data Source Principles

允许存在多个数据源。

例如：

* 中国田协
* 最酷
* ITRA
* UTMB
* 爱燃烧
* 我要赛
* 官方网站
* 人工维护

同一赛事允许来自多个来源。

最终统一合并进入 CanonicalRecord，再拆分为 Event / Edition / Category。

⸻

7. Schema Evolution

Race Schema 使用版本管理。

规则：

Patch：

修正文案说明。

Minor：

新增字段，例如 v1.1。

Major：

修改字段含义、移动字段 Layer、删除字段、修改实体关系或修改字段结构，例如 v2.0。

删除字段默认禁止，除非 Major Version 且有明确迁移说明。

不允许在不升级版本的情况下直接修改 v1.0。

例如：

v1.0

↓

v1.1

↓

v1.2

↓

v2.0

⸻

# 8 · Field Specification Matrix（Full Version）

本章节定义 Race Schema v1.0 的完整字段规范。

本章节是 Race Schema v1.0 的正式组成部分，不是临时草稿。

所有数据抓取、清洗、Normalize、Dedupe、Merge、Canonical、数据库设计、API、推荐算法、AI 能力、商业化服务，均必须遵循本章节字段规范。

---

## 字段规范说明

字段列说明：

- Field：英文字段名
- 中文名：字段中文名称
- Type：字段类型
- Required：是否业务必需
- Nullable：是否允许为空
- Source：字段来源
- Editable：是否允许人工编辑
- Index：是否建议建立索引
- MVP：MVP 阶段是否需要

Source 可选值：

- System：系统生成
- DataSource：外部数据源
- RaceNext：RaceNext 自己生产
- AI：AI 生成
- Manual：人工补充
- Partner：商业合作方

注意：

1. Required = ✅ 不代表该字段永远不为空。
   如果真实数据源暂时缺失，允许先用 null / unknown / placeholder，但必须记录在 missingFields 中。

2. Nullable = ✅ 表示字段允许为空。
   Nullable = ❌ 表示正常情况下不应为空。

3. Race Schema v1.0 是产品数据规范，不等同于最终数据库表结构。
   数据库设计将在后续 EVENT_MODEL_V1.md / Database Schema 中进一步拆分。

4. categories 下的字段属于组别子字段，不是赛事顶层字段。

---

# Layer 1：Identity｜赛事身份层

这一层回答：

这到底是哪一场赛事？

用途：

- 唯一标识
- URL
- 搜索
- 多源合并
- 去重
- Canonical Race 生成

| Field | 中文名 | Type | Required | Nullable | Source | Editable | Index | MVP |
|---|---|---|---|---|---|---|---|---|
| recordId | Canonical Record 唯一 ID | UUID/String | ✅ | ❌ | System | ❌ | ✅ | ✅ |
| eventId | Event 唯一 ID | UUID/String | ✅ | ❌ | System | ❌ | ✅ | ✅ |
| editionId | Edition 唯一 ID | UUID/String | ✅ | ❌ | System | ❌ | ✅ | ✅ |
| categoryId | Category 唯一 ID | UUID/String | ✅ | ❌ | System | ❌ | ✅ | ✅ |
| slug | 赛事 URL 标识 | String | ✅ | ❌ | System | ✅ | ✅ | ✅ |
| canonicalName | 标准赛事名称 | String | ✅ | ❌ | DataSource/Manual | ✅ | ✅ | ✅ |
| originalNames | 原始赛事名称列表 | String[] | ✅ | ❌ | DataSource | ❌ | ❌ | ✅ |
| aliases | 赛事别名 | String[] | ❌ | ✅ | Manual/AI | ✅ | ✅ | ✅ |
| eventBrand | 赛事品牌 | String | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| editionName | 赛事届次名称 | String | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| editionYear | 赛事年份 | Number | ✅ | ❌ | DataSource/System | ✅ | ✅ | ✅ |
| raceType | 赛事类型 | Enum | ✅ | ❌ | DataSource/System | ✅ | ✅ | ✅ |
| sourceType | 赛事来源类型 | Enum | ✅ | ❌ | System | ❌ | ✅ | ✅ |
| lifecycleStatus | 赛事生命周期状态 | Enum | ✅ | ❌ | System/Manual | ✅ | ✅ | ✅ |

字段说明：

- recordId：Pipeline 阶段 CanonicalRecord 的唯一 ID，用于合并、追踪和实体拆分前的中间记录。
- eventId：Event 实体唯一 ID，表示跨年份赛事品牌。
- editionId：Edition 实体唯一 ID，表示某一年具体赛事。
- categoryId：Category 实体唯一 ID，表示某一届赛事下的具体组别。
- raceId：早期单层模型命名，v1.0 正式实现中不再作为实体主键使用。若代码中暂时存在 raceId，应按迁移计划逐步迁移到 recordId / eventId / editionId / categoryId。
- slug：用于前端 URL 与 SEO。
- canonicalName：清洗后的统一赛事名称，例如“上海马拉松”。
- originalNames：不同数据源抓到的原始名称，不允许丢失。
- aliases：用户常用名称、简称、英文别名，例如“上马”。
- eventBrand：跨年份不变的赛事品牌，例如“上海马拉松”“莫干山越野赛”。
- editionName：某一年具体赛事名称，例如“2026 上海马拉松”。
- editionYear：赛事所属年份。
- raceType：赛事类型，如 marathon / trail / utmb。
- sourceType：主要来源类型，如 official / registration_platform / media / community / manual。
- lifecycleStatus：赛事记录本身是否有效，如 active / archived / cancelled / uncertain。

---

# Layer 2：Time & Location｜时间与地点层

这一层回答：

比赛什么时候举办？在哪里举办？

用途：

- 赛事日历
- 时间筛选
- 地区筛选
- 推荐
- 酒店
- 交通
- 天气
- 旅行服务

| Field | 中文名 | Type | Required | Nullable | Source | Editable | Index | MVP |
|---|---|---|---|---|---|---|---|---|
| raceDate | 比赛日期 | Date | ✅ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| raceWeekday | 星期 | String | ✅ | ✅ | System | ❌ | ❌ | ✅ |
| season | 赛事季节 | Enum | ❌ | ✅ | System | ❌ | ✅ | ✅ |
| country | 国家 | String | ✅ | ❌ | DataSource/System | ✅ | ✅ | ✅ |
| province | 省份 | String | ✅ | ✅ | DataSource/System | ✅ | ✅ | ✅ |
| city | 城市 | String | ✅ | ✅ | DataSource/System | ✅ | ✅ | ✅ |
| district | 区县 | String | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| venue | 起终点地点 | String | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| latitude | 纬度 | Decimal | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| longitude | 经度 | Decimal | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| region | 所属区域 | Enum | ✅ | ❌ | System | ✅ | ✅ | ✅ |
| timezone | 时区 | String | ❌ | ✅ | System | ✅ | ❌ | ✅ |

字段说明：

- raceDate：正式比赛日，如 2026-11-29。若只知道年月，则允许为空，但必须保留 editionYear / month 信息。
- raceWeekday：根据 raceDate 自动计算，如“周日”。
- season：根据 raceDate 自动计算，春季 / 夏季 / 秋季 / 冬季。
- country：国内赛事默认为中国，国际赛事使用真实国家。
- province：省份，国内赛事重要筛选字段。
- city：城市，赛事推荐与商业化重要字段。
- district：区县，例如崇礼区。
- venue：起终点或主会场。
- latitude / longitude：地图与酒店推荐预留。
- region：统一区域，例如华东 / 华南 / 华北 / 华中 / 西南 / 西北 / 东北 / 港澳台 / 海外。
- timezone：国际赛事使用，国内默认为 Asia/Shanghai。

---

# Layer 3：Race Profile｜赛事画像层

这一层回答：

这是一场怎样的比赛？

用途：

- 赛事卡片
- 筛选
- 难度体系
- 推荐算法
- 训练计划
- 装备推荐
- 路线服务

| Field | 中文名 | Type | Required | Nullable | Source | Editable | Index | MVP |
|---|---|---|---|---|---|---|---|---|
| raceDistanceKm | 主距离 | Decimal | ✅ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| raceDistances | 全部距离组别 | Decimal[] | ✅ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| primaryCategoryName | 主组别名称 | String | ✅ | ✅ | DataSource/System | ✅ | ✅ | ✅ |
| categories | 赛事组别 | Object[] | ✅ | ❌ | DataSource/Manual | ✅ | ❌ | ✅ |
| categories.categoryId | 组别 ID | String | ✅ | ❌ | System | ❌ | ✅ | ✅ |
| categories.categoryName | 组别名称 | String | ✅ | ❌ | DataSource/Manual | ✅ | ❌ | ✅ |
| categories.distanceKm | 组别距离 | Decimal | ✅ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| categories.elevationGain | 组别累计爬升 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| categories.elevationLoss | 组别累计下降 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| categories.cutoffTimeHours | 组别关门时间 | Decimal | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| categories.fee | 组别报名费 | Decimal | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| categories.capacity | 组别名额 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| categories.minAge | 最低参赛年龄 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |
| categories.qualificationRequired | 是否需要资格 | Boolean | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| elevationGain | 主累计爬升 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| elevationLoss | 主累计下降 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| cutoffTimeHours | 主关门时间 | Decimal | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| courseType | 路线类型 | Enum | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| surfaceType | 路面类型 | Enum | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| terrainType | 地形类型 | Enum | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| altitudeMin | 最低海拔 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |
| altitudeMax | 最高海拔 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| altitudeAverage | 平均海拔 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |
| aidStationCount | 补给站数量 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |
| aidStationSpacingKm | 平均补给间距 | Decimal | ❌ | ✅ | System/DataSource | ✅ | ❌ | ❌ |
| mandatoryGear | 强制装备 | String[] | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| qualificationRules | 参赛资格规则 | String | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| itraPoints | ITRA 积分 | Number | ❌ | ✅ | DataSource | ✅ | ✅ | ✅ |
| mountainLevel | ITRA 山地等级 | Number/String | ❌ | ✅ | DataSource | ✅ | ✅ | ✅ |
| utmbIndex | UTMB 指数 | String | ❌ | ✅ | DataSource | ✅ | ✅ | ✅ |
| runningStones | Running Stones | Number | ❌ | ✅ | DataSource | ✅ | ✅ | ✅ |
| officialCourseMapUrl | 官方路线图链接 | URL/String | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| gpxUrl | GPX 路线文件链接 | URL/String | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |
| courseDescription | 路线简介 | Text | ❌ | ✅ | DataSource/AI/Manual | ✅ | ❌ | ✅ |
| courseHighlights | 路线亮点 | String[] | ❌ | ✅ | AI/Manual | ✅ | ✅ | ✅ |

字段说明：

- raceDistanceKm：主展示距离。例如全马为 42.2，越野主组别可为 30 / 50 / 100。
- raceDistances：全部距离组别，例如 [30, 50, 100]。
- primaryCategoryName：默认展示组别，如“全程马拉松”“30KM”。
- categories：赛事所有组别的结构化信息，是后续 Event / Edition / Group 模型的重要基础。
- elevationGain：主组别累计爬升，越野赛事重要字段。
- elevationLoss：主组别累计下降。
- cutoffTimeHours：主组别关门时间。
- courseType：point_to_point / loop / out_and_back / multiple_loops / unknown。
- surfaceType：road / trail / mixed / track / gravel / snow / desert / unknown。
- terrainType：flat / rolling / mountain / high_altitude / technical / city / scenic / unknown。
- altitudeMin / altitudeMax / altitudeAverage：用于高海拔风险判断。
- aidStationCount / aidStationSpacingKm：用于补给策略与装备推荐。
- mandatoryGear：越野强制装备。
- qualificationRules：报名资格说明。
- itraPoints / mountainLevel：ITRA 体系数据。
- utmbIndex / runningStones：UTMB 体系数据。
- officialCourseMapUrl / gpxUrl：路线服务预留。
- courseDescription / courseHighlights：路线理解和 AI 推荐使用。

---

# Layer 4：Registration｜报名信息层

这一层回答：

用户现在能不能报名？怎么报名？什么时候报名？

用途：

- 赛事卡片
- 推荐卡片
- 报名提醒
- 日历提醒
- 报名分佣
- 官方入口跳转

| Field | 中文名 | Type | Required | Nullable | Source | Editable | Index | MVP |
|---|---|---|---|---|---|---|---|---|
| registrationStatus | 报名状态 | Enum | ✅ | ❌ | DataSource/System | ✅ | ✅ | ✅ |
| registrationOpenDate | 报名开始时间 | DateTime | ✅ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| registrationCloseDate | 报名截止时间 | DateTime | ✅ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| lotteryRequired | 是否需要抽签 | Boolean | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| lotteryResultDate | 抽签结果公布时间 | DateTime | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| registrationFee | 报名费用 | Decimal | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| registrationCurrency | 报名币种 | Enum/String | ❌ | ✅ | DataSource/System | ✅ | ❌ | ✅ |
| registrationPlatform | 报名平台 | String | ✅ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| registrationUrl | 报名链接 | URL/String | ✅ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| officialWebsite | 官方网站 | URL/String | ✅ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| rulebookUrl | 竞赛规程 | URL/String | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| capacity | 赛事总名额 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| remainingQuota | 剩余名额 | Number | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |
| registrationRequirement | 报名要求 | Text | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ✅ |
| qualificationProofRequired | 是否需要成绩证明 | Boolean | ❌ | ✅ | DataSource/Manual | ✅ | ✅ | ✅ |
| cancellationPolicy | 退赛政策 | Text | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |
| transferAllowed | 是否支持名额转让 | Boolean | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |
| bibMailing | 是否邮寄参赛包 | Boolean | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |
| resultQueryUrl | 成绩查询入口 | URL/String | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |
| certificateUrl | 电子证书入口 | URL/String | ❌ | ✅ | DataSource/Manual | ✅ | ❌ | ❌ |

字段说明：

- registrationStatus：upcoming / registration_open / lottery / waiting_list / registration_closed / race_finished / cancelled / unknown。
- registrationOpenDate：报名开始时间。
- registrationCloseDate：报名截止时间。
- lotteryRequired：是否需要抽签。
- lotteryResultDate：抽签公布时间。
- registrationFee：当前主组别或最低报名费。
- registrationCurrency：CNY / JPY / USD / EUR 等。
- registrationPlatform：数字心动 / 最酷 / 爱燃烧 / 官网等。
- registrationUrl：最终报名入口，卡片 CTA 优先使用。
- officialWebsite：赛事官网。
- rulebookUrl：竞赛规程 PDF 或网页。
- capacity：赛事总名额。
- remainingQuota：剩余名额，如公开可抓取。
- registrationRequirement：报名要求，例如完赛证明、ITRA 积分。
- qualificationProofRequired：是否需要上传成绩证明。
- cancellationPolicy：退赛政策。
- transferAllowed：是否支持名额转让。
- bibMailing：是否支持参赛包邮寄。
- resultQueryUrl / certificateUrl：赛后服务预留。

---

# Layer 5：Recommendation｜赛事推荐层

这一层回答：

这场比赛适合谁？为什么推荐？有什么风险？

用途：

- 推荐算法
- 推荐卡片
- 推荐理由
- 风险提示
- AI 推荐
- 用户决策

| Field | 中文名 | Type | Required | Nullable | Source | Editable | Index | MVP |
|---|---|---|---|---|---|---|---|---|
| difficultyLevel | 难度等级 | Enum(L1-L10) | ✅ | ❌ | RaceNext | ✅ | ✅ | ✅ |
| difficultyScore | 难度评分 | Number | ✅ | ❌ | RaceNext | ✅ | ✅ | ✅ |
| beginnerFriendly | 新手友好 | Boolean | ✅ | ❌ | RaceNext | ✅ | ✅ | ✅ |
| recommendedFor | 推荐人群 | String[] | ✅ | ❌ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| recommendationReasons | 推荐理由 | String[] | ✅ | ❌ | RaceNext/AI/Manual | ✅ | ❌ | ✅ |
| riskWarnings | 风险提示 | String[] | ✅ | ❌ | RaceNext/AI/Manual | ✅ | ❌ | ✅ |
| suitableExperience | 建议参赛经验 | String[] | ❌ | ✅ | RaceNext/Manual | ✅ | ✅ | ✅ |
| suitableTrainingLevel | 建议训练水平 | String | ❌ | ✅ | RaceNext/Manual | ✅ | ❌ | ✅ |
| bestSeasonRecommendation | 最佳参赛阶段 | String | ❌ | ✅ | RaceNext/Manual | ✅ | ✅ | ✅ |
| pbFriendly | PB 友好 | Boolean | ❌ | ✅ | RaceNext/Manual | ✅ | ✅ | ✅ |
| scenicRecommendation | 风景推荐 | Boolean | ❌ | ✅ | RaceNext/Manual | ✅ | ✅ | ✅ |
| travelRecommendation | 旅行推荐 | Boolean | ❌ | ✅ | RaceNext/Manual | ✅ | ✅ | ✅ |
| familyRecommendation | 家庭同行推荐 | Boolean | ❌ | ✅ | RaceNext/Manual | ✅ | ✅ | ✅ |
| raceNextScore | RaceNext 推荐指数 | Number | ✅ | ❌ | RaceNext | ✅ | ✅ | ✅ |
| recommendationConfidence | 推荐可信度 | Number | ❌ | ✅ | RaceNext/System | ❌ | ✅ | ✅ |
| recommendationVersion | 推荐算法版本 | String | ❌ | ✅ | System | ❌ | ❌ | ✅ |

字段说明：

- difficultyLevel：RaceNext L1-L10 难度等级。
- difficultyScore：0-100 连续难度评分。
- beginnerFriendly：是否适合作为第一场比赛。
- recommendedFor：推荐人群，如首马、首越、PB、进阶跑者、百公里准备、家庭跑者、城市旅行。
- recommendationReasons：推荐理由列表。
- riskWarnings：风险提示列表。
- suitableExperience：建议已有经验，如完成过半马、完成过首越、完成过 50KM。
- suitableTrainingLevel：建议训练水平，如每周 30KM、每周 60KM。
- bestSeasonRecommendation：最佳参赛阶段，如春季目标赛事、秋季目标赛事。
- pbFriendly：是否适合刷新 PB。
- scenicRecommendation：是否属于风景型赛事。
- travelRecommendation：是否适合赛事旅行。
- familyRecommendation：是否适合家庭同行。
- raceNextScore：RaceNext 综合推荐指数。
- recommendationConfidence：推荐结果可信度。
- recommendationVersion：推荐算法版本号。

边界规则：

- Layer 5 只能增加 RaceNext 的推荐判断，不能覆盖官方事实数据。
- 官方距离、爬升、比赛日期、报名状态不能由 Layer 5 修改。
- Layer 5 只能生成“适合谁”“为什么推荐”“有什么风险”“推荐指数”等判断型字段。

---

# Layer 6：Experience｜赛事体验层

这一层回答：

这场比赛值不值得去？体验怎么样？

用途：

- 旅行决策
- 赛事体验判断
- 推荐理由
- 商业化入口
- AI 内容生成
- 用户长期心智

| Field | 中文名 | Type | Required | Nullable | Source | Editable | Index | MVP |
|---|---|---|---|---|---|---|---|---|
| sceneryRating | 风景评分 | Number | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| organizationRating | 赛事组织评分 | Number | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| aidStationRating | 补给评分 | Number | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| courseExperience | 赛道体验 | String[] | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| sceneryHighlights | 风景亮点 | String[] | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| trafficConvenience | 交通便利度 | Number | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| nearestTransport | 最近交通方式 | String[] | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ❌ | ✅ |
| accommodationConvenience | 住宿便利度 | Number | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| cityTravelRating | 城市旅行指数 | Number | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| familyFriendly | 家庭同行友好 | Boolean | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| spectatorFriendly | 观赛友好 | Boolean | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| weatherCharacteristics | 赛事天气特点 | String[] | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| altitudeCharacteristics | 高海拔特点 | String | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ✅ |
| foodHighlights | 当地美食 | String[] | ❌ | ✅ | AI/Manual | ✅ | ❌ | ❌ |
| travelHighlights | 周边推荐 | String[] | ❌ | ✅ | AI/Manual | ✅ | ❌ | ❌ |
| volunteerExperience | 志愿者服务体验 | Number | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ❌ | ❌ |
| atmosphereRating | 赛事氛围评分 | Number | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ✅ | ❌ |
| finisherGiftRating | 完赛物资评分 | Number | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ❌ | ❌ |
| experienceSummary | 赛事体验总结 | Text | ❌ | ✅ | RaceNext/AI/Manual | ✅ | ❌ | ✅ |

字段说明：

- sceneryRating：赛道风景综合评分，1-5。
- organizationRating：赛事组织成熟度评分，1-5。
- aidStationRating：补给丰富度评分，1-5。
- courseExperience：赛道整体特点，如城市经典、山林穿越、湖景路线、高山草甸、古村落。
- sceneryHighlights：风景亮点，如西湖、长城、雪山、竹海、峡谷。
- trafficConvenience：交通便利度，1-5。
- nearestTransport：最近交通方式，如高铁站、机场、地铁、火车站。
- accommodationConvenience：住宿便利度，1-5。
- cityTravelRating：城市旅行指数，1-5。
- familyFriendly：是否适合带家人同行。
- spectatorFriendly：是否适合家属观赛。
- weatherCharacteristics：赛事天气特点，如炎热、寒冷、多雨、昼夜温差大。
- altitudeCharacteristics：海拔对参赛影响，如无明显影响、高海拔需适应。
- foodHighlights：当地美食。
- travelHighlights：周边景点。
- volunteerExperience：志愿者服务体验评分。
- atmosphereRating：赛事氛围评分。
- finisherGiftRating：完赛物资评分。
- experienceSummary：一句话体验总结。

---

# Layer 7：Race Service｜赛事服务层

这一层回答：

RaceNext 还能帮助用户完成什么？

用途：

- 报名服务
- 酒店
- 装备
- 训练
- 补给
- 保险
- 交通
- 路线
- 提醒
- 商业化

| Field | 中文名 | Type | Required | Nullable | Source | Editable | Index | MVP |
|---|---|---|---|---|---|---|---|---|
| bookingServices | 报名服务 | Object[] | ❌ | ✅ | Partner/RaceNext | ✅ | ❌ | ✅ |
| accommodationServices | 住宿服务 | Object[] | ❌ | ✅ | Partner/RaceNext | ✅ | ❌ | ❌ |
| transportationServices | 交通服务 | Object[] | ❌ | ✅ | Partner/RaceNext | ✅ | ❌ | ❌ |
| gearRecommendations | 装备推荐 | Object[] | ❌ | ✅ | Partner/RaceNext | ✅ | ❌ | ❌ |
| insuranceServices | 保险服务 | Object[] | ❌ | ✅ | Partner/RaceNext | ✅ | ❌ | ❌ |
| trainingServices | 训练服务 | Object[] | ❌ | ✅ | RaceNext/AI | ✅ | ❌ | ❌ |
| nutritionServices | 补给服务 | Object[] | ❌ | ✅ | Partner/RaceNext | ✅ | ❌ | ❌ |
| routeServices | 路线服务 | Object[] | ❌ | ✅ | RaceNext/Partner | ✅ | ❌ | ❌ |
| companionServices | 同行服务 | Object[] | ❌ | ✅ | RaceNext | ✅ | ❌ | ❌ |
| raceReminderServices | 赛事提醒服务 | Object[] | ❌ | ✅ | RaceNext/System | ✅ | ❌ | ✅ |
| affiliatePartners | 合作伙伴 | Object[] | ❌ | ✅ | Partner/RaceNext | ✅ | ✅ | ❌ |
| commercialStatus | 商业化状态 | Enum | ❌ | ✅ | RaceNext/System | ✅ | ✅ | ✅ |

字段说明：

- bookingServices：报名服务渠道。
- accommodationServices：酒店 / 民宿推荐。
- transportationServices：高铁、飞机、自驾、接驳车等交通服务。
- gearRecommendations：针对赛事的装备推荐。
- insuranceServices：赛事保险服务。
- trainingServices：训练计划、AI 教练入口。
- nutritionServices：能量胶、电解质、补给计划。
- routeServices：路线解析、GPX、赛道攻略。
- companionServices：拼房、拼车、同行跑友。
- raceReminderServices：报名提醒、抽签提醒、装备提醒、出发提醒。
- affiliatePartners：合作伙伴，如携程、飞猪、淘宝联盟、京东联盟。
- commercialStatus：none / partial / completed。

---

# Layer 8：Data Governance｜数据治理层

这一层回答：

这些数据可靠吗？从哪里来？是否需要审核？

用途：

- 数据源管理
- 字段可信度
- Merge
- 审核
- Pipeline
- 版本追踪
- 后台运营

| Field | 中文名 | Type | Required | Nullable | Source | Editable | Index | MVP |
|---|---|---|---|---|---|---|---|---|
| sources | 数据来源列表 | Object[] | ✅ | ❌ | System | ❌ | ❌ | ✅ |
| fieldSources | 字段来源 | Object | ✅ | ❌ | System | ❌ | ❌ | ✅ |
| sourcePriority | 数据源优先级 | Object/Number | ✅ | ❌ | System | ❌ | ❌ | ✅ |
| confidence | 数据可信度 | Number | ✅ | ❌ | System | ❌ | ✅ | ✅ |
| verified | 是否人工确认 | Boolean | ❌ | ✅ | Manual/System | ✅ | ✅ | ✅ |
| verificationStatus | 审核状态 | Enum | ❌ | ✅ | System/Manual | ✅ | ✅ | ✅ |
| missingFields | 缺失字段 | String[] | ✅ | ❌ | System | ❌ | ✅ | ✅ |
| mergeNotes | 合并备注 | String[] | ❌ | ✅ | System/Manual | ✅ | ❌ | ✅ |
| mergeTrace | 合并追踪记录 | Object[] | ❌ | ✅ | System | ❌ | ❌ | ✅ |
| lastCrawledAt | 最近抓取时间 | DateTime | ✅ | ❌ | System | ❌ | ✅ | ✅ |
| lastUpdatedAt | 最近更新时间 | DateTime | ✅ | ❌ | System | ❌ | ✅ | ✅ |
| pipelineVersion | 数据处理版本 | String | ❌ | ✅ | System | ❌ | ❌ | ✅ |
| schemaVersion | Schema 版本 | String | ❌ | ✅ | System | ❌ | ❌ | ✅ |
| recommendationVersion | 推荐算法版本 | String | ❌ | ✅ | System | ❌ | ❌ | ✅ |
| tagsVersion | 标签体系版本 | String | ❌ | ✅ | System | ❌ | ❌ | ✅ |
| difficultyVersion | 难度体系版本 | String | ❌ | ✅ | System | ❌ | ❌ | ✅ |
| dataQualityLevel | 数据质量等级 | Enum(A/B/C/D) | ❌ | ✅ | System | ✅ | ✅ | ✅ |
| reviewNotes | 人工备注 | Text | ❌ | ✅ | Manual | ✅ | ❌ | ❌ |
| internalFlags | 内部标记 | String[] | ❌ | ✅ | System | ✅ | ✅ | ✅ |

字段说明：

- sources：该赛事来自哪些数据源。
- fieldSources：每个字段最终来自哪个数据源。
- sourcePriority：数据源优先级。
- confidence：正式 Event / Edition / Category 模型中的整条数据可信度统一为 0–1；旧链路中的 0–100 值须在后续迁移边界转换，不能直接混用。
- verified：是否人工确认。
- verificationStatus：pending / verified / rejected / auto_verified。
- missingFields：当前缺失的重要字段。
- mergeNotes：Merge 过程中产生的说明。
- mergeTrace：结构化记录每个关键字段在 Merge 后采用哪个数据源以及原因。例如 raceDate 来自 Official，因为官方优先级最高；elevationGain 来自 ITRA，因为 ITRA 对越野爬升更可信；registrationUrl 来自 Zuicool，因为该字段仅该来源提供。mergeNotes 偏人工备注，mergeTrace 偏结构化追踪。
- lastCrawledAt：最近一次抓取时间。
- lastUpdatedAt：当前记录最近更新时间。
- pipelineVersion：生成该数据所使用的数据 Pipeline 版本。
- schemaVersion：当前数据采用的 Schema 版本。
- recommendationVersion：当前推荐结果使用的算法版本。
- tagsVersion：标签体系版本。
- difficultyVersion：难度体系版本。
- dataQualityLevel：A / B / C / D。
- reviewNotes：人工备注。
- internalFlags：系统内部标记，如 duplicate_candidate / need_manual_review / source_conflict / missing_registration。

---

# Freeze

Race Schema v1.0 Field Specification Matrix 已冻结。

本章节作为 Race Schema v1.0 的正式组成部分。

后续所有实现必须遵循本章节。

Freeze Rule：

- 新增字段：Minor Version，例如 v1.1。
- 修改字段含义：Major Version，例如 v2.0。
- 移动字段 Layer：Major Version。
- 删除字段：默认禁止，除非 Major Version 且有迁移说明。
- 修改实体关系：Major Version。
- 修正文案说明：Patch Version。
- 不允许在不升级版本的情况下直接修改 v1.0。

9. Out of Scope

以下内容不属于 Race Schema：

* Tag System
* Difficulty System
* Recommendation Algorithm
* Event / Edition / Category Model
* Database ER Diagram
* API Design

以上内容均拥有独立文档。

⸻

10. Related Documents

本 Schema 与以下文档共同组成 RaceNext 数据体系：

* DATA_DICTIONARY.md
* TAG_SYSTEM.md
* DIFFICULTY_SYSTEM.md
* EVENT_MODEL.md
* DATA_SOURCE_POC.md

⸻

11. Freeze

Race Schema v1.0 已冻结。

后续所有开发：

* 数据抓取
* Merge
* CanonicalRecord
* Entity Split
* API
* Database
* Recommendation
* AI

均必须遵循本 Schema。

任何修改均通过版本升级完成，不允许直接修改 v1.0。

⸻

12. Race Graph V1 Foundation 增量同步（v1.1）

本节是对已冻结 v1.0 的 additive minor update，只同步正式 Event / Edition / Category 实体所需的最小字段；实体归属与完整语义以 `EVENT_MODEL_V1.md` v1.1 为准。

新增字段：

* Edition：`endDate`、`coverImage`、`primaryCategoryId`
* Category：`startAt`、`startLocation`、`finishLocation`、`registrationUrl`、`displayOrder`
* Category P1 可选字段：`shortName`
* Data Governance：`verifiedAt`

同步规则：

* `eventType` 是 Road / Trail 类型的唯一正式事实来源，不在 Edition 新增 `raceType`。
* `primaryCategoryId` 是核心组别正式关系；`primaryCategoryName` 仅保留为兼容展示摘要。
* `raceDate` 表示首个赛事日，`endDate` 表示最后一个赛事日，单日赛 endDate 为 null。
* `startAt` 按来源精度保存：只确认组别日期时使用 ISO date-only；确认准确时间时使用带时区的完整 ISO 8601 日期时间。禁止补猜时间。
* `displayOrder` 只控制展示，不能参与 categoryId 生成。
* 正式治理 confidence 使用 0–1。
