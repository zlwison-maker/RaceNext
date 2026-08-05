# MERGE_RULES.md

Version: v1.0
Status: Draft
Project: RaceNext（下一场）

---

# 1. Background

RaceNext 会持续接入多个数据源：

- Official
- RunChina
- Zuicool
- ITRA
- Community
- Internal

同一场赛事的数据可能来自多个来源。

Merge Engine 的职责：

不是简单覆盖数据。

而是：

根据：

- Source Registry
- Field Ownership
- Field Priority Matrix

生成：

唯一可信的 Canonical Record。

---

# 2. Merge Pipeline

所有数据必须按照以下流程进入系统：

Raw Source Record

↓

Normalize

↓

Deduplicate

↓

Field Merge

↓

Canonical Record

↓

Entity Split

↓

Event

↓

Edition

↓

Category

↓

Recommendation

任何数据：

不得绕过 Merge Pipeline。

---

# 3. Merge Principles

## Principle 1

Never Write Directly

任何 Source：

不得直接写入：

Event

Edition

Category

所有数据：

必须先 Merge。

---

## Principle 2

Raw Data Never Changes

Raw Source Record：

永远保留。

Merge：

不修改 Raw 数据。

---

## Principle 3

Canonical Is The Only Truth

前端：

数据库：

Recommendation：

全部读取：

Canonical Record。

不得直接读取：

Raw Record。

---

## Principle 4

Every Merge Must Be Traceable

Merge 后：

必须知道：

每个字段：

来自：

哪个 Source。

---

# 4. Entity Merge Rules

Merge 最小单位：

不是：

赛事名称。

而是：

Entity。

---

## Event Merge

满足以下条件：

自动 Merge：

- canonicalName 高度一致
- aliases 命中
- organizer 相同或高度相似
- city 一致

否则：

进入：

Manual Review。

---

## Edition Merge

满足：

- Event 相同
- editionYear 相同
- raceDate 一致
- city 一致

自动 Merge。

如果：

日期冲突：

进入：

Conflict Queue。

---

## Category Merge

满足：

- Edition 相同
- distanceKm 相同
- categoryName 高度相似

自动 Merge。

如果：

distance 不一致：

禁止 Merge。

---

# 5. Field Merge Rules

所有字段：

Merge 时：

必须遵循：

FIELD_PRIORITY_MATRIX。

例如：

raceDate

Official

↓

RunChina

↓

Zuicool

↓

ITRA

不得：

以后抓到覆盖前面。

---

# 6. Resolution Strategy

Merge Engine 支持以下策略。

---

## First Available

按照 Priority：

找到：

第一个有效值。

停止。

适用于：

- raceDate
- city
- venue
- officialWebsite

---

## Merge All

保留：

全部来源。

自动去重。

适用于：

- aliases
- originalNames
- courseHighlights
- tags

---

## Highest Confidence

多个来源：

选择：

confidence 最高。

适用于：

- elevationGain
- trafficConvenience
- sceneryRating

---

## Latest Timestamp Wins

只适用于：

实时字段。

例如：

- registrationStatus
- remainingQuota

不能：

用于：

比赛日期。

---

## Ignore External

忽略：

所有外部来源。

只采用：

RaceNext。

适用于：

- difficultyScore
- recommendationScore
- recommendationReasons

---

## Derived

系统重新计算。

例如：

season

raceWeekday

difficultyScore

RaceNextScore

---

## Manual Review

发现冲突：

停止自动 Merge。

等待人工处理。

---

# 7. Conflict Rules

以下情况：

进入：

Conflict Queue。

- raceDate 冲突
- organizer 冲突
- distanceKm 冲突
- city 冲突
- registrationUrl 冲突
- qualification 冲突

系统：

不得自动覆盖。

---

# 8. Empty Value Rules

当前字段：

为空。

新 Source：

有值。

允许：

自动补全。

补全后：

更新：

mergeTrace。

---

# 9. Overwrite Rules

低优先级：

不得覆盖：

高优先级。

例如：

Official：

已有：

raceDate。

Zuicool：

不同。

不得覆盖。

记录：

Conflict。

---

# 10. Recommendation Rules

Recommendation：

永远不能修改：

官方事实。

例如：

可以新增：

- recommendationReasons
- raceNextScore
- riskWarnings

不能修改：

- raceDate
- distanceKm
- registrationStatus

---

# 11. Manual Override

人工确认：

最高优先级。

字段：

verified = true

自动抓取：

不得覆盖。

只能：

记录：

mergeTrace。

---

# 12. Derived Rules

Derived 字段：

永远：

系统重新计算。

不得：

抓取。

例如：

- season
- weekday
- raceNextScore
- difficultyScore
- beginnerFriendly

---

# 13. Data Quality

Merge 后：

更新：

- confidence
- completeness
- verificationStatus
- mergeTrace
- fieldSources
- updatedAt

Data Quality：

由系统重新计算。

---

# 14. Review Queue

以下情况：

必须：

人工 Review。

- Event 相似
- Edition 日期冲突
- Category 距离冲突
- Official 与 Aggregator 冲突
- confidence < 70
- registrationStatus 异常
- URL 无效

---

# 15. Merge Trace

每一次 Merge：

必须记录：

- source
- previousValue
- newValue
- strategy
- timestamp
- operator

例如：

raceDate

Official

2026-11-29

Strategy：

First Available

Timestamp：

2026-07-01

Operator：

Merge Engine

---

# 16. Review Workflow

Merge

↓

Conflict？

↓

No

↓

Canonical

↓

Frontend

------------

Yes

↓

Review Queue

↓

Manual Confirm

↓

Canonical

---

# 17. MVP Scope

MVP：

允许：

- JSON
- 人工补全
- 半自动 Merge

暂不要求：

- 后台 Review
- 自动审批
- 多版本 Merge

规则：

必须一致。

---

# 18. Future Evolution

未来：

支持：

- AI Merge
- Confidence Learning
- Auto Conflict Resolution
- Rule Engine
- YAML Config

Merge Rule：

保持兼容。

---

# 19. Relationship

Source Registry

↓

Field Ownership

↓

Field Priority Matrix

↓

Merge Rules

↓

Canonical Record

↓

Recommendation

↓

Frontend

---

# 20. Freeze

MERGE_RULES

作为 RaceNext Merge Engine 唯一规范。

任何：

Crawler

Merge

Canonical

Recommendation

必须遵循：

MERGE_RULES。

Version：

v1.0

Status：

Draft（待 Freeze）
