# Race Decision Page Spec

Version: v1.0
Status: Implemented MVP
Last Updated: 2026-07-11

## 0. MVP V2 Strategy Note

Race Decision Page 仍是 RaceNext 的长期核心页面形态，但其 Decision Layer 属于长期能力。

本文件代表 RaceNext 长期 Decision Layer 的页面规范，不再作为 MVP V2 阶段的唯一页面执行依据。

MVP V2 阶段的目标已经从优先验证 AI 赛事决策能力，进一步收敛为验证：

```text
热门赛事 SEO 流量入口
+
参赛消费服务入口
```

当前 MVP 核心路径：

```text
用户搜索赛事进入页面
↓
确认赛事信息
↓
获取参赛住宿建议
↓
点击住宿联盟入口
↓
验证商业转化
```

因此，MVP V2 页面优先支持：

> Monetization Layer。

MVP V2 阶段优先执行：

> `RACENEXT_EVENT_PAGE_MVP_V2_UI_SPEC.md`

当前阶段页面应优先承接已经决定参加热门赛事的跑者，帮助他们确认赛事信息、获取参赛住宿建议，并通过住宿联盟入口验证商业转化。

长期页面架构：

```text
Race Event Data
↓
Monetization Layer
↓
Decision Layer
↓
Personalized Agent
```

本文件中 Decision Card、AI参赛指南、推荐人群、不建议人群、赛事攻略、训练建议、下一场推荐等模块仍保留为长期 Decision Layer 的产品规范，但不应阻塞 MVP V2 的商业化页面上线。

以下能力明确属于未来 Decision Layer，不进入当前 MVP 主路径：

- Decision Card。
- AI参赛指南。
- AI决策卡。
- 推荐人群。
- 不建议人群。
- 赛事攻略。
- 训练建议。
- 复杂个性化推荐。
- 复杂推荐算法。

当前 MVP Event Page 不是赛事百科、不是赛事攻略、不是完整赛事决策系统。

未来演进关系：

```text
Event Service Page
↓
Event Service Page + Light Decision
↓
Decision Page
↓
Personalized Race Decision Agent
```

## 1. Product Goal

Race Decision Page 是 RaceNext MVP 的核心页面。

它不是旧赛事详情页的视觉优化，而是围绕“报名之前，先完成参赛决策”的新页面模板。

MVP 目标：

- 三个月内验证产品与商业模式。
- 让赛事详情页成为 SEO、AI 内容和商业化模板的基础。
- 以真实数据驱动展示，没有数据的模块默认隐藏。

## 2. Page Principles

- MVP 第一：不增加 Spec 之外的新功能。
- 数据优先：不编造赛事事实，不用 AI 猜测缺失数据。
- Race 与 Race Category 分离：赛事是整体，组别是用户真正决策对象。
- Mobile First：优先适配微信、移动搜索和手机浏览。
- Outdoor Premium：视觉方向专业、自然、现代、有运动生命力，避免后台系统风和传统资讯站风。

## 3. Module Order

页面模块顺序固定：

1. Decision Card
2. 报名指南
3. 赛事核心数据
4. 赛道解析
5. AI参赛指南
6. 出行攻略
7. FAQ
8. 精选评价
9. 下一场推荐
10. 了解赛事

没有真实数据的模块隐藏，但保留实现位置和后续扩展边界。

## 4. MVP Implementation

当前实现路径：

- Route: `/races/[slug]`
- Component: `components/RaceDecisionPage.tsx`
- ViewModel: `lib/raceDecision.ts`
- Data source: `getRaceSourceRecords()` 聚合后的真实 source records

当前 slug 使用现有 record id，例如：

- `/races/future-zuicool-55206`

## 5. Decision Card

包含：

- 赛事名称
- 组别切换
- 一句话判断
- RaceNext 建议
- 推荐人群
- 不建议人群
- 报名状态
- 报名截止日期（有数据才展示）
- 倒计时
- 提醒我
- 官网报名

明确不展示：

- 4.8 分
- 五星评分
- 用户评分
- 虚假难度

## 6. 报名指南

包含：

- 报名状态
- 报名开始（当前数据缺失，隐藏）
- 报名截止（当前数据缺失，隐藏）
- 比赛日期
- 报名方式
- 当前组别费用
- 官网报名入口
- 报名倒计时（当前数据缺失，隐藏）

报名状态由页面层根据报名链接、原始状态和比赛日期自动计算。

## 7. 赛事核心数据

包含：

- 距离
- 爬升
- 最高海拔（当前数据缺失，隐藏）
- 关门时间
- 举办地点
- 比赛日期

只展示当前真实存在的数据。

## 8. 赛道解析

优先展示：

- 官方路线图
- 官方路线说明
- GPX
- 海拔图
- 补给点

当前 source records 没有这些结构化字段，因此 MVP 隐藏该模块。

## 9. AI参赛指南

第一版使用静态规则内容，不接实时 AI。

内容包含：

- 适合什么水平
- 如何准备
- 装备建议
- 注意事项
- 完赛建议

内容基于真实字段派生：赛事类型、距离、爬升、关门时间。缺少足够字段时隐藏。

## 10. 出行攻略

目标包含：

- 住宿
- 交通
- 领物
- 停车
- 周边餐饮
- 后续联盟广告位置

当前缺少结构化出行事实和商业服务数据，MVP 隐藏该模块。

## 11. FAQ

使用静态 FAQ。

支持 FAQ Schema。

## 12. 精选评价

第一版不做评论系统。

仅支持人工整理内容。

当前缺少人工整理内容，MVP 隐藏该模块。

## 13. 下一场推荐

使用简单规则推荐。

规则：

- 同类型或同省份优先。
- 未过期赛事优先。
- 日期接近优先。
- 置信度作为次级排序。

不开发推荐算法。

## 14. 了解赛事

放在页面最后。

包含：

- 赛事介绍
- 历史
- 主办方
- 官方链接

当前仅有来源链接时展示官方链接；介绍、历史和主办方缺失时隐藏。

## 15. SEO

支持：

- title
- meta description
- canonical
- Open Graph
- 微信分享所需 OG 基础信息
- SportsEvent Schema
- FAQ Schema
- Breadcrumb Schema
- 图片 alt
- H1 / H2 / H3

不做关键词堆砌。

## 16. Known Implementation Differences

- `RACE_DECISION_PAGE_SPEC.md` 原文件在开发前不存在，本文件按最新开发指令补建。
- 当前数据模型中没有报名截止、报名开始、最高海拔、官方路线图、GPX、海拔图、补给点、住宿交通、领物、停车、餐饮、人工评价等结构化字段，因此对应模块或字段隐藏。
- 当前“提醒我”按钮仅展示为不可用状态，没有实现用户提醒服务；这是 MVP 未接入用户沉淀能力前的占位。
- 当前数据无法确认报名链接一定是赛事官网，因此页面按钮使用“报名入口”，避免把 Zuicool 等聚合/报名平台链接误标为官方链接。
