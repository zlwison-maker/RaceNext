# SOURCE_PRIORITY_V1.md

Version: v1.0
Status: Draft
Project: RaceNext（下一场）

---

# 1. Background

RaceNext 的目标不是简单抓取赛事数据。

而是建立：

可信（Trustworthy）
可追溯（Traceable）
可维护（Maintainable）
可扩展（Scalable）

的赛事数据平台。

随着数据源不断增加：

- 官方网站
- 官方公众号
- 官方报名平台
- RunChina
- 最酷
- 爱燃烧
- ITRA
- UTMB
- Community
- RaceNext AI

同一个字段可能来自多个来源。

例如：

比赛日期：

Official：
2026-11-29

RunChina：
2026-11-29

Zuicool：
2026-11-30

系统必须知道：

- 相信谁
- 为什么
- 冲突怎么办
- 如何记录

因此建立：

Source Governance（数据源治理）。

---

# 2. Goals

SOURCE_PRIORITY_V1 的目标：

1. 定义整个 RaceNext 的数据源治理体系。

2. 保证任何字段都有唯一 Source of Truth。

3. 支持多数据源 Merge。

4. 保证所有数据可追溯。

5. 支持未来几十个数据源持续接入。

6. 支持 Recommendation Engine。

7. 支持商业化能力。

---

# 3. Scope

SOURCE_PRIORITY 不负责：

- Race Schema
- Event Model
- Database Design
- Recommendation Logic

这些内容已经由其他文档定义。

SOURCE_PRIORITY 只负责：

数据来源。

---

# 4. Core Concepts

整个 RaceNext 数据治理包含六部分：

Source Registry

↓

Field Ownership

↓

Field Priority Matrix

↓

Merge Rules

↓

Update Strategy

↓

Review Workflow

它们共同组成：

RaceNext Source Governance。

---

# 5. Governance Principles

整个数据治理遵循以下原则。

---

## Principle 1

Single Source of Truth

每一个字段：

只能有一个最终 Owner。

例如：

比赛日期

Owner：

Official

不是：

RunChina

不是：

Zuicool

不是：

Community

Owner 唯一。

Contributor 可以多个。

---

## Principle 2

Owner ≠ Contributor

Owner：

拥有最终解释权。

Contributor：

提供候选数据。

例如：

DifficultyScore

Owner：

RaceNext

Contributor：

ITRA

Official

Community

任何 Contributor

都不能直接覆盖 Owner。

---

## Principle 3

Priority Before Merge

Merge 前：

必须先确定：

Field Priority。

不能：

谁后抓到

谁覆盖。

---

## Principle 4

Everything Traceable

任何字段：

必须知道：

来自哪里。

例如：

raceDate

Source：

Official

confidence：

100

mergeTrace：

Official > RunChina

任何字段

都必须可以追溯。

---

## Principle 5

Never Lose Raw Data

Raw Source Record

永远保留。

Merge

不会删除原始数据。

所有：

Normalize

Merge

Conflict

都必须可回溯。

---

## Principle 6

Recommendation Never Overrides Facts

RaceNext Recommendation：

只能增加产品价值。

不能修改：

官方事实。

例如：

可以新增：

- 推荐理由
- 推荐指数
- 风险提示
- 训练建议

不能修改：

- 比赛日期
- 距离
- 爬升
- 报名状态

---

## Principle 7

Official Facts First

涉及：

官方事实。

全部：

Official First。

例如：

比赛日期

报名日期

报名链接

组别

价格

名额

官网

规程

---

## Principle 8

Commercial Is Independent

酒店

装备

保险

旅行

路线

属于：

Service Layer。

不会影响：

赛事事实。

---

# 6. Governance Architecture

RaceNext 数据治理架构：

Raw Source

↓

Normalize

↓

Field Ownership

↓

Priority Matrix

↓

Merge Engine

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

---

# 7. Document Structure

本体系由以下文档组成。

---

## SOURCE_REGISTRY.md

定义：

有哪些数据源。

包括：

- Source ID
- Source Type
- 覆盖范围
- MVP 是否接入

---

## FIELD_OWNERSHIP.md

定义：

每个字段：

最终属于谁。

回答：

Who owns this field？

---

## FIELD_PRIORITY_MATRIX.md

定义：

多个来源同时存在时：

相信谁。

回答：

Which source wins？

---

## MERGE_RULES.md

定义：

Merge 如何执行。

回答：

How to merge？

---

## UPDATE_STRATEGY.md

定义：

什么时候更新。

回答：

When to update？

---

# 8. Relationship With Other Documents

Race Schema

定义：

有哪些字段。

↓

Event Model

定义：

字段属于哪个 Entity。

↓

Source Priority

定义：

字段来自哪里。

↓

Recommendation Logic

定义：

如何计算推荐。

↓

Database

定义：

如何存储。

五份文档职责完全不同。

不得混用。

---

# 9. Future Evolution

未来：

新增任何数据源。

例如：

UltraSignup

TrailHub

Running Quotient

赛事官方 API

只允许：

更新：

SOURCE_REGISTRY

FIELD_PRIORITY_MATRIX

不得修改：

Race Schema。

不得修改：

Event Model。

---

# 10. Version Strategy

新增：

Source

Minor Version。

例如：

v1.1

新增：

Priority Rule

Minor Version。

修改：

Owner

Major Version。

例如：

v2.0

修改：

Merge Strategy

Major Version。

删除：

Source

Major Version。

---

# 11. Freeze

SOURCE_PRIORITY_V1

作为 RaceNext 数据治理总纲。

后续：

所有：

Crawler

Normalize

Merge

Canonical

Recommendation

Database

都必须遵循：

SOURCE_PRIORITY_V1。

新增数据源：

不得绕过：

Source Governance。

Version：

v1.0

Status：

Draft（待 Freeze）
