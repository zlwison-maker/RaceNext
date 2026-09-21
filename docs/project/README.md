# RaceNext Project Context

## 1. Current Phase

- Current Phase: **WECHAT MINI PROGRAM MVP**
- Data Foundation: **ARCHITECTURE FROZEN**
- Distribution: **READY**
- Real AI Fact Extraction Runtime: **VALIDATION DEFERRED**

当前不要继续扩建数据基础设施，优先进入用户产品验证。

## 2. Mandatory Reading

### P0｜产品与数据硬约束

1. [RaceNext 数据系统 V1](RACENEXT_DATA_SYSTEM_V1.md) — **CURRENT / FROZEN**
2. [RaceNext 数据与内容维护成本原则 V1](DATA_CONTENT_MAINTENANCE_PRINCIPLES_V1.md) — **CURRENT**

### P0｜赛事内容硬约束

3. [RaceNext 赛事详情页内容撰写规范 V1](RACE_DETAIL_CONTENT_STANDARD_V1.md) — **CURRENT**
4. [RaceNext 越野赛事详情页内容标准 V1](TRAIL_RACE_DETAIL_STANDARD_V1.md) — **CURRENT**
5. [RaceNext 赛事住宿推荐与内容生产标准 V1.1](ACCOMMODATION_CONTENT_STANDARD_V1_1.md) — **CURRENT / Source of Truth**；当前赛事住宿推荐、AI Research、Human Approved Set、Final Accommodation Package、Production Board、Ctrip Action 与长期维护标准。
6. [RaceNext 赛事住宿推荐与内容生产标准 V1](ACCOMMODATION_CONTENT_STANDARD_V1.md) — **HISTORICAL / Superseded by V1.1**；保留历史版本，不再作为当前执行标准。
7. [RaceNext 图片资产标准 V1](RACENEXT_IMAGE_ASSET_STANDARD_V1.md) — **CURRENT / FROZEN**
8. [First5 图片资产交付报告](FIRST5_IMAGE_ASSET_DELIVERY_REPORT.md) — **CURRENT**
9. [Trail Course Point Schema V0.1](TRAIL_COURSE_POINT_SCHEMA_V0_1.md) — **CURRENT / MINIMAL**
10. [Trail CP Data Audit V1](TRAIL_CP_DATA_AUDIT_V1.md) — **ARCHIVED AUDIT**

### P1｜战略背景

11. RaceNext Investor BP 202608 (`reference/RaceNext_Investor_BP_202608.pdf`) — **REFERENCE / 2026.08 / Not Found**

Investor BP 用于理解战略与商业背景，不是代码实现约束，也不能自动生成开发需求。

## 3. Conflict Priority

不同文档或实现出现冲突时，优先级为：

1. 当前冻结的产品、数据与内容硬约束
2. [`docs/data/`](../data/) 当前 Frozen 技术文档
3. 当前实际代码
4. Investor BP 与历史战略资料

如果代码和 Frozen 文档明显冲突，不要擅自认为代码一定正确，应先报告差异。

## 4. Current Product Direction

RaceNext 当前不是继续建设数据平台，产品优先级是微信小程序 MVP。

已经达成共识：

- 首页
- 赛事列表
- 赛事卡片
- 赛事详情页框架
- Hero / Race Facts
- Accommodation 内容生产与酒店推荐标准已冻结

尚未完全共识：

- RaceNext Content 的小程序呈现
- My Races

已达到 80 分的部分先开发；未达成共识的部分不要擅自设计。

## 5. Key Product Principles

- 用户价值优先
- 完成比完美重要
- 小程序体验优先
- 数据资产多端统一
- 商业化从第一天考虑
- 不制造高维护、低价值能力
- 真实事实、Runner Feedback、RaceNext Judgment 分离
- 不因为未来可能需要就提前堆功能

## 6. Technical Entry

需要理解 Race Graph、Data Pipeline 或 Public Remote Read Layer 时，从 [RaceNext Data Foundation V1](../data/RACENEXT_DATA_FOUNDATION_V1.md) 进入。
