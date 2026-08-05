# FIELD_PRIORITY_MATRIX.md

Version: v1.0
Status: Draft
Project: RaceNext（下一场）

---

# 1. Background

多个数据源可能同时提供同一个字段。

例如：

raceDate

Official：
2026-11-29

RunChina：
2026-11-29

Zuicool：
2026-11-30

FIELD_PRIORITY_MATRIX 的作用：

不是决定：

谁拥有字段。

而是决定：

当多个 Contributor 同时存在时，

最终采用哪个值。

---

# 2. Relationship

Source Registry

↓

Field Ownership

↓

Field Priority Matrix

↓

Merge Rules

↓

Canonical Record

Priority 永远建立在 Ownership 之后。

---

# 3. Matrix Definition

每一个字段定义：

| Column | 说明 |
|---------|------|
| Field | 字段 |
| Owner | 最终 Owner |
| Contributors | 候选来源 |
| Priority | 优先级 |
| Resolution Strategy | 冲突处理策略 |
| Derived | 是否派生字段 |

---

# 4. Resolution Strategy

RaceNext 定义以下策略。

| Strategy | 说明 |
|-----------|------|
| First Available | 按 Priority 找第一个有效值 |
| Merge All | 合并所有有效值并去重 |
| Latest Timestamp Wins | 同优先级下采用最新更新时间 |
| Highest Confidence | 采用可信度最高来源 |
| Manual Review | 自动标记人工审核 |
| Ignore External | 完全忽略外部数据 |
| Derived | 系统计算生成 |

---

# 5. Layer 1｜Identity

| Field | Owner | Contributors | Priority | Strategy | Derived |
|--------|--------|--------------|----------|----------|----------|
| canonicalName | Official | Official、RunChina、Zuicool | Official → RunChina → Zuicool | First Available | ❌ |
| originalNames | Aggregator | Official、RunChina、Zuicool | Merge All | Merge All | ❌ |
| aliases | Aggregator | Community、RunChina、Zuicool | Merge All | Merge All | ❌ |
| eventId | RaceNext | - | RaceNext | Ignore External | ❌ |
| editionId | RaceNext | - | RaceNext | Ignore External | ❌ |
| categoryId | RaceNext | - | RaceNext | Ignore External | ❌ |
| slug | RaceNext | - | RaceNext | Derived | ✅ |
| lifecycleStatus | RaceNext | Official | Official | First Available | ❌ |

---

# 6. Layer 2｜Time & Location

| Field | Owner | Contributors | Priority | Strategy | Derived |
|--------|--------|--------------|----------|----------|----------|
| raceDate | Official | Official、RunChina、Zuicool、ITRA | Official → RunChina → Zuicool → ITRA | First Available | ❌ |
| registrationOpen | Official | Official、Zuicool、RunChina | Official → Zuicool → RunChina | First Available | ❌ |
| registrationClose | Official | Official、Zuicool、RunChina | Official → Zuicool → RunChina | First Available | ❌ |
| registrationStatus | Official | Official、Zuicool、RunChina | Official → Zuicool → RunChina | Latest Timestamp Wins | ❌ |
| province | Official | Official、RunChina、Zuicool | Official → RunChina → Zuicool | First Available | ❌ |
| city | Official | Official、RunChina、Zuicool | Official → RunChina → Zuicool | First Available | ❌ |
| district | Official | Official、RunChina | Official → RunChina | First Available | ❌ |
| venue | Official | Official、RunChina | Official → RunChina | First Available | ❌ |
| latitude | Map | AMap、Baidu、Official | AMap → Baidu → Official | Highest Confidence | ❌ |
| longitude | Map | AMap、Baidu、Official | AMap → Baidu → Official | Highest Confidence | ❌ |
| timezone | RaceNext | - | RaceNext | Derived | ✅ |
| raceWeekday | RaceNext | - | RaceNext | Derived | ✅ |
| season | RaceNext | - | RaceNext | Derived | ✅ |

---

# 7. Layer 3｜Race Profile

| Field | Owner | Contributors | Priority | Strategy | Derived |
|--------|--------|--------------|----------|----------|----------|
| raceType | Official | Official、RunChina | Official → RunChina | First Available | ❌ |
| categoryName | Official | Official、RunChina | Official → RunChina | First Available | ❌ |
| distanceKm | Official | Official、ITRA、RunChina | Official → ITRA → RunChina | First Available | ❌ |
| raceDistances | Official | Official、RunChina | Merge All | Merge All | ❌ |
| elevationGain | International | ITRA、Official | ITRA → Official | Highest Confidence | ❌ |
| elevationLoss | International | ITRA、Official | ITRA → Official | Highest Confidence | ❌ |
| terrainType | International | ITRA、Community | ITRA → Community | Highest Confidence | ❌ |
| surfaceType | Official | Official、Community | Official → Community | First Available | ❌ |
| courseType | Official | Official、Community | Official → Community | First Available | ❌ |
| cutoffTime | Official | Official、RunChina | Official → RunChina | First Available | ❌ |
| qualification | Official | Official、ITRA | Official → ITRA | First Available | ❌ |
| mandatoryGear | Official | Official、ITRA | Official → ITRA | Merge All | ❌ |
| ITRAPoints | International | ITRA | ITRA | Ignore External | ❌ |
| UTMBIndex | International | UTMB | UTMB | Ignore External | ❌ |
| courseHighlights | Community | Community、Official | Merge All | Merge All | ❌ |
| aidStationSpacingKm | RaceNext | - | RaceNext | Derived | ✅ |

---

# 8. Layer 4｜Registration

| Field | Owner | Contributors | Priority | Strategy | Derived |
|--------|--------|--------------|----------|----------|----------|
| officialWebsite | Official | Official、RunChina | Official → RunChina | First Available | ❌ |
| registrationUrl | Official | Official、Zuicool、RunChina | Official → Zuicool → RunChina | First Available | ❌ |
| registrationPlatform | Official | Official、Zuicool | Official → Zuicool | First Available | ❌ |
| registrationFee | Official | Official、Zuicool | Official → Zuicool | First Available | ❌ |
| capacity | Official | Official、RunChina | Official → RunChina | First Available | ❌ |
| remainingQuota | Official | Official | Official | Latest Timestamp Wins | ❌ |
| lotteryRequired | Official | Official | Official | First Available | ❌ |
| lotteryDate | Official | Official | Official | First Available | ❌ |
| rulebookUrl | Official | Official | Official | First Available | ❌ |

---

# 9. Layer 5｜Recommendation

Layer 5 全部属于 RaceNext。

外部数据：

只能作为参考。

不得覆盖。

| Field | Owner | Contributors | Priority | Strategy | Derived |
|--------|--------|--------------|----------|----------|----------|
| difficultyLevel | RaceNext | ITRA | RaceNext | Ignore External | ✅ |
| difficultyScore | RaceNext | ITRA、Official | RaceNext | Derived | ✅ |
| beginnerFriendly | RaceNext | Community | RaceNext | Derived | ✅ |
| recommendedFor | RaceNext | Community | RaceNext | Derived | ✅ |
| recommendationReasons | RaceNext | Community | RaceNext | Derived | ✅ |
| recommendationTags | RaceNext | Community | RaceNext | Derived | ✅ |
| riskWarnings | RaceNext | Community | RaceNext | Derived | ✅ |
| raceNextScore | RaceNext | ITRA、Community | RaceNext | Derived | ✅ |
| trainingSuggestion | RaceNext | Community | RaceNext | Derived | ✅ |

---

# 10. Layer 6｜Experience

| Field | Owner | Contributors | Priority | Strategy | Derived |
|--------|--------|--------------|----------|----------|----------|
| sceneryRating | Community | Community、Official | Community → Official | Highest Confidence | ❌ |
| organizationRating | Community | Community、Official | Community → Official | Highest Confidence | ❌ |
| aidStationRating | Community | Community | Community | Highest Confidence | ❌ |
| trafficConvenience | Map | AMap、Baidu | AMap → Baidu | Highest Confidence | ❌ |
| parkingConvenience | Map | AMap、Community | AMap → Community | Highest Confidence | ❌ |
| accommodationConvenience | Commercial | Ctrip、Fliggy | Ctrip → Fliggy | Highest Confidence | ❌ |
| cityTravelRating | Commercial | Ctrip、Community | Ctrip → Community | Highest Confidence | ❌ |
| familyFriendly | Community | Community | Community | Highest Confidence | ❌ |
| weatherRisk | RaceNext | Weather API | RaceNext | Derived | ✅ |
| altitudeRisk | RaceNext | ITRA | RaceNext | Derived | ✅ |
| experienceSummary | RaceNext | Community | RaceNext | Derived | ✅ |

---

# 11. Layer 7｜Race Service

| Field | Owner | Contributors | Priority | Strategy | Derived |
|--------|--------|--------------|----------|----------|----------|
| hotelRecommendation | RaceNext | Ctrip、Fliggy | RaceNext | Derived | ✅ |
| gearRecommendation | RaceNext | JD、Taobao、PDD | RaceNext | Derived | ✅ |
| nutritionRecommendation | RaceNext | Community | RaceNext | Derived | ✅ |
| insuranceRecommendation | Commercial | Commercial | Commercial | First Available | ❌ |
| travelRecommendation | Commercial | Community | Commercial → Community | Highest Confidence | ❌ |
| transportationRecommendation | Commercial | AMap | Commercial → AMap | Highest Confidence | ❌ |
| routeRecommendation | RaceNext | Official、GPX | RaceNext | Derived | ✅ |
| reminderService | RaceNext | Official | RaceNext | Derived | ✅ |

---

# 12. Layer 8｜Data Governance

Layer 8 全部属于 RaceNext。

所有字段：

系统生成。

不存在外部 Priority。

---

# 13. General Rules

1.

Priority 永远建立在 Ownership 之后。

2.

Owner 不变。

Priority 可以增加新的 Contributor。

3.

Derived 字段：

永远不抓取。

全部系统计算。

4.

Merge All：

用于：

- aliases
- originalNames
- courseHighlights
- sources
- internalFlags

5.

Latest Timestamp Wins：

只适用于：

- registrationStatus
- remainingQuota
- lastUpdatedAt

不得用于：

官方事实字段。

---

# 14. Relationship With Other Documents

SOURCE_REGISTRY

↓

FIELD_OWNERSHIP

↓

FIELD_PRIORITY_MATRIX

↓

MERGE_RULES

↓

Canonical Record

---

# 15. Freeze

FIELD_PRIORITY_MATRIX

作为 RaceNext 字段优先级规范。

任何 Merge Engine：

必须严格遵循：

Field Priority Matrix。

Version：

v1.0

Status：

Draft（待 Freeze）
