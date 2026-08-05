# FIELD_OWNERSHIP.md

Version: v1.0
Status: Draft
Project: RaceNext（下一场）

---

# 1. Background

RaceNext 会同时接入多个数据源：

- Official
- RunChina
- Zuicool
- ITRA
- Community
- Map
- Commercial
- RaceNext AI

同一个字段可能同时存在多个来源。

例如：

比赛日期：

Official：
2026-11-29

RunChina：
2026-11-29

Zuicool：
2026-11-30

因此：

必须定义：

谁拥有这个字段。

FIELD_OWNERSHIP 的目标：

不是决定：

相信谁。

而是决定：

谁拥有最终解释权（Source of Truth）。

Priority 将由：

FIELD_PRIORITY_MATRIX.md

定义。

---

# 2. Core Concepts

RaceNext 定义三个概念：

Owner

Contributor

Consumer

Owner：

字段最终拥有者。

Contributor：

提供候选数据。

Consumer：

消费字段的数据模块。

例如：

DifficultyScore

Owner：

RaceNext

Contributor：

ITRA

Official

Consumer：

Recommendation Engine

Frontend

Training

---

# 3. Ownership Principles

## Principle 1

Every Field Has One Owner

每一个字段：

必须只有一个 Owner。

不得存在：

多个最终 Owner。

---

## Principle 2

Owner Never Changes Frequently

Owner 一旦确定：

尽量保持长期稳定。

新增数据源：

不会改变 Owner。

---

## Principle 3

Contributor Can Be Multiple

Contributor：

允许多个。

例如：

elevationGain

Contributor：

Official

ITRA

RunChina

Owner：

International

---

## Principle 4

Consumer Never Owns Data

前端：

不是 Owner。

AI：

不是 Owner。

Recommendation：

不是 Owner。

他们：

只消费数据。

---

## Principle 5

Recommendation Never Owns Official Facts

Recommendation：

只能拥有：

推荐字段。

不能拥有：

官方事实。

例如：

比赛日期：

Owner：

Official

不是：

RaceNext

---

# 4. Owner Types

RaceNext 定义以下六类 Owner。

| Owner | 中文 | 职责 |
|--------|------|------|
| Official | 官方 | 官方事实 |
| Aggregator | 聚合平台 | 官方缺失时补充 |
| International | 国际平台 | 国际赛事及越野标准 |
| Community | 社区 | 用户体验 |
| Commercial | 商业平台 | 商业服务 |
| RaceNext | RaceNext | AI、推荐、治理 |

---

# 5. Layer Ownership

## Layer 1

Identity

| 字段 | Owner | Contributor |
|------|--------|-------------|
| canonicalName | Official | Aggregator |
| originalNames | Aggregator | Official |
| aliases | Aggregator | Community |
| eventId | RaceNext | - |
| editionId | RaceNext | - |
| categoryId | RaceNext | - |
| slug | RaceNext | - |
| lifecycleStatus | RaceNext | Official |

说明：

Identity 由 RaceNext 建立唯一身份。

官方负责：

赛事名称。

系统负责：

ID。

---

## Layer 2

Time & Location

| 字段 | Owner | Contributor |
|------|--------|-------------|
| raceDate | Official | Aggregator |
| registrationOpen | Official | Aggregator |
| registrationClose | Official | Aggregator |
| registrationStatus | Official | Aggregator |
| province | Official | Aggregator |
| city | Official | Aggregator |
| district | Official | Aggregator |
| venue | Official | Aggregator |
| latitude | Map | Official |
| longitude | Map | Official |
| timezone | RaceNext | - |
| season | RaceNext | Official |

说明：

位置：

官方负责地点。

地图负责坐标。

---

## Layer 3

Race Profile

| 字段 | Owner | Contributor |
|------|--------|-------------|
| raceType | Official | Aggregator |
| categoryName | Official | Aggregator |
| distanceKm | Official | International |
| raceDistances | Official | Aggregator |
| elevationGain | International | Official |
| elevationLoss | International | Official |
| terrainType | International | Community |
| surfaceType | Official | Community |
| courseType | Official | Community |
| cutoffTime | Official | Aggregator |
| qualification | Official | International |
| mandatoryGear | Official | International |
| ITRA Points | International | Official |
| UTMB Index | International | Official |
| GPX | Official | International |
| courseHighlights | Community | Official |

说明：

越野：

International

优先拥有：

爬升

积分

资格。

官方：

拥有：

比赛事实。

---

## Layer 4

Registration

全部官方拥有。

| 字段 | Owner | Contributor |
|------|--------|-------------|
| officialWebsite | Official | Aggregator |
| registrationUrl | Official | Aggregator |
| registrationPlatform | Official | Aggregator |
| registrationFee | Official | Aggregator |
| capacity | Official | Aggregator |
| remainingQuota | Official | Aggregator |
| lotteryRequired | Official | Aggregator |
| lotteryDate | Official | Aggregator |
| qualificationRules | Official | International |
| rulebookUrl | Official | Aggregator |

说明：

报名信息：

Official

永远第一。

---

## Layer 5

Recommendation

全部属于：

RaceNext。

| 字段 | Owner | Contributor |
|------|--------|-------------|
| difficultyLevel | RaceNext | International |
| difficultyScore | RaceNext | International |
| beginnerFriendly | RaceNext | Community |
| recommendedFor | RaceNext | Community |
| recommendationReasons | RaceNext | Community |
| recommendationTags | RaceNext | Community |
| riskWarnings | RaceNext | Community |
| raceNextScore | RaceNext | International |
| trainingSuggestion | RaceNext | Community |

说明：

Recommendation：

永远不能覆盖官方事实。

---

## Layer 6

Experience

| 字段 | Owner | Contributor |
|------|--------|-------------|
| sceneryRating | Community | Official |
| organizationRating | Community | Official |
| aidStationRating | Community | Official |
| trafficConvenience | Map | Community |
| parkingConvenience | Map | Community |
| accommodationConvenience | Commercial | Community |
| cityTravelRating | Commercial | Community |
| familyFriendly | Community | Official |
| weatherRisk | RaceNext | Weather API |
| altitudeRisk | RaceNext | International |
| experienceSummary | RaceNext | Community |

说明：

体验：

主要来自：

Community。

---

## Layer 7

Race Service

| 字段 | Owner | Contributor |
|------|--------|-------------|
| hotelRecommendation | RaceNext | Commercial |
| gearRecommendation | RaceNext | Commercial |
| nutritionRecommendation | RaceNext | Commercial |
| insuranceRecommendation | Commercial | RaceNext |
| travelRecommendation | Commercial | Community |
| transportationRecommendation | Commercial | Map |
| routeRecommendation | RaceNext | Official |
| reminderService | RaceNext | Official |

说明：

商业平台：

拥有：

商业资源。

RaceNext：

拥有：

推荐逻辑。

---

## Layer 8

Data Governance

全部：

RaceNext。

| 字段 | Owner |
|------|--------|
| confidence | RaceNext |
| mergeTrace | RaceNext |
| fieldSources | RaceNext |
| verificationStatus | RaceNext |
| missingFields | RaceNext |
| dataQuality | RaceNext |
| pipelineVersion | RaceNext |
| schemaVersion | RaceNext |
| tagsVersion | RaceNext |
| difficultyVersion | RaceNext |
| lastUpdatedAt | RaceNext |

说明：

治理：

永远属于：

RaceNext。

---

# 6. Ownership Rules

任何字段：

只能有：

一个 Owner。

多个 Contributor。

例如：

elevationGain

Owner：

International

Contributor：

Official

RunChina

ITRA

Merge 时：

Owner

拥有最终解释权。

---

# 7. Ownership Change Policy

允许：

新增 Contributor。

允许：

新增 Consumer。

禁止：

未经 Version 升级：

修改 Owner。

修改 Owner：

属于：

Major Version。

例如：

v2.0。

---

# 8. Relationship With Other Documents

SOURCE_REGISTRY

定义：

有哪些数据源。

↓

FIELD_OWNERSHIP

定义：

谁拥有字段。

↓

FIELD_PRIORITY_MATRIX

定义：

多个来源相信谁。

↓

MERGE_RULES

定义：

如何 Merge。

四份文档：

共同组成：

Source Governance。

---

# 9. Freeze

FIELD_OWNERSHIP

作为 RaceNext 字段所有权规范。

任何：

Crawler

Merge

Recommendation

Database

Frontend

都必须遵循：

Field Ownership。

Version：

v1.0

Status：

Draft（待 Freeze）
