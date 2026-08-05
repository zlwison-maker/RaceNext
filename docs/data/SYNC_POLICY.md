# SYNC_POLICY.md

Version: v1.0
Status: Draft
Project: RaceNext（下一场）

---

# 1. Background

RaceNext 的赛事数据不是一次性导入。

而是持续同步。

不同数据：

更新频率不同。

例如：

赛事名称：

几年都不会变。

报名状态：

每天都会变。

剩余名额：

可能每分钟都在变化。

因此：

需要统一定义：

数据同步策略（Synchronization Policy）。

---

# 2. Goals

SYNC_POLICY 的目标：

1.

保证赛事数据持续更新。

2.

降低重复抓取成本。

3.

保证 Official 优先。

4.

支持增量同步。

5.

支持全量重建。

6.

支持未来几十个数据源。

---

# 3. Sync Architecture

所有数据统一经过：

Source

↓

Crawler

↓

Raw Record

↓

Normalize

↓

Merge

↓

Canonical Record

↓

Entity Split

↓

Event

Edition

Category

↓

Recommendation

↓

Frontend

任何数据：

不得绕过 Sync Pipeline。

---

# 4. Sync Types

RaceNext 定义四种同步方式。

---

## Full Sync

全量同步。

作用：

重新抓取整个 Source。

适用于：

- 首次接入
- 数据结构升级
- Source 大版本变化

特点：

耗时最长。

优先级最低。

---

## Incremental Sync

增量同步。

作用：

只抓新增或变更数据。

适用于：

日常运行。

这是默认同步方式。

---

## Manual Sync

人工同步。

管理员主动触发。

适用于：

官方突然更新。

赛事延期。

赛事取消。

---

## Emergency Sync

紧急同步。

立即执行。

用于：

赛事取消。

赛事延期。

报名提前结束。

重大公告。

---

# 5. Sync Frequency

不同数据源：

更新频率不同。

---

## Official

比赛前：

每天同步。

报名期间：

每 2 小时同步一次。

比赛结束后：

每周同步一次。

---

## Aggregator

每天同步一次。

即可。

---

## International

ITRA

UTMB

每周同步。

即可。

---

## Community

每天同步一次。

即可。

---

## Commercial

每天同步一次。

即可。

---

## Internal

Recommendation

每天重新计算。

---

# 6. Event Lifecycle Policy

不同阶段：

同步策略不同。

---

## Upcoming

距离比赛：

90 天以上。

每周同步。

---

## Registration

报名中。

每天同步。

重要字段：

每两小时同步。

---

## Countdown

距离比赛：

30 天内。

每天同步。

---

## Race Day

比赛当天。

必要时：

Emergency Sync。

---

## Finished

比赛结束。

一周同步一次。

---

## Archived

历史赛事。

默认：

不主动同步。

仅人工触发。

---

# 7. Incremental Strategy

Incremental Sync：

只更新：

发生变化的数据。

例如：

registrationStatus

remainingQuota

rulebook

announcement

避免：

重新抓取全部字段。

---

# 8. Merge Trigger

以下情况：

触发 Merge。

新增：

Raw Record。

Source：

更新。

人工：

修改。

Recommendation：

重新计算。

Schema：

升级。

---

# 9. Recommendation Trigger

以下情况：

重新计算推荐。

赛事新增。

赛事日期变化。

报名状态变化。

Difficulty 更新。

天气变化。

用户画像变化。

Recommendation：

不依赖：

Full Sync。

---

# 10. Expiration Policy

数据：

存在有效期。

例如：

报名状态：

24 小时。

剩余名额：

2 小时。

天气：

24 小时。

酒店价格：

24 小时。

超过：

TTL。

自动重新抓取。

---

# 11. Retry Policy

同步失败：

自动重试。

第一次：

5 分钟。

第二次：

30 分钟。

第三次：

2 小时。

连续失败：

进入：

Source Health。

---

# 12. Source Health

每个 Source：

维护：

Health Status。

状态：

Healthy

Warning

Error

Disabled

连续失败：

超过阈值。

自动：

Warning。

管理员：

收到提醒。

---

# 13. Conflict Handling

同步发现：

字段冲突。

进入：

Merge Rules。

不得：

直接覆盖。

Official：

优先。

---

# 14. Deletion Policy

赛事：

取消。

不得：

物理删除。

采用：

Soft Delete。

字段：

lifecycleStatus

↓

Cancelled

保留：

历史数据。

---

# 15. Version Policy

Schema 升级。

允许：

重新 Merge。

无需：

重新 Crawl。

Source：

升级。

允许：

重新 Normalize。

---

# 16. Audit Log

所有同步：

记录：

Source

Start Time

End Time

Records

Updated

Failed

Duration

Operator

方便：

排查问题。

---

# 17. KPI

系统持续统计：

Source Success Rate

Sync Duration

Merge Success Rate

Conflict Rate

Manual Review Rate

Data Freshness

Source Availability

这些指标：

用于：

监控整个数据平台。

---

# 18. MVP Scope

MVP：

实现：

Incremental Sync

Manual Sync

Retry

Audit Log

暂不实现：

实时消息队列。

分布式调度。

多 Region。

实时 Streaming。

---

# 19. Future Evolution

未来：

支持：

Scheduler

Webhook

Official API

Event Bus

AI Scheduler

Priority Queue

Streaming Pipeline

---

# 20. Relationship

Source Registry

↓

Field Ownership

↓

Field Priority Matrix

↓

Merge Rules

↓

Sync Policy

↓

Canonical Record

↓

Recommendation

↓

Frontend

---

# 21. Freeze

SYNC_POLICY

作为 RaceNext 数据同步唯一规范。

任何：

Crawler

Scheduler

Merge

Recommendation

都必须遵循：

SYNC_POLICY。

Version：

v1.0

Status：

Draft（待 Freeze）
