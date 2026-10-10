# RaceNext Project Context

## 1. Current Phase

- Current Phase: **WECHAT MINI PROGRAM LIVE / REAL USER, ACQUISITION & COMMERCIAL VALIDATION**
- Data Foundation: **ARCHITECTURE FROZEN**
- Data Pipeline: **PRODUCTION IMPLEMENTED / FIRST NATURAL SCHEDULED RUN COMPLETED**
- Critical Fact Maintenance: **P0 IMPROVEMENT REQUIRED**
- Parallel Reliability Work: **RACE DATA AUTOMATION P0**

微信小程序已上线。创业主线是实际用户、获客与商业验证；赛事数据自动维护的有效性修复是并行的 P0 可信度工作。不要把功能完成或 Workflow PASS 等同于用户验证或事实准确性 PASS。

## 2. Mandatory Reading

### P0｜产品与数据硬约束

1. [RaceNext 数据系统 V1](RACENEXT_DATA_SYSTEM_V1.md) — **CURRENT / FROZEN**
2. [RaceNext 赛事数据自动维护目标与验收标准 V1](RACE_DATA_AUTOMATION_STANDARD_V1.md) — **P0 / CURRENT / FROZEN TARGET & GATES**
3. [RaceNext 数据与内容维护成本原则 V1](DATA_CONTENT_MAINTENANCE_PRINCIPLES_V1.md) — **CURRENT**

### P0｜赛事内容硬约束

4. [RaceNext 赛事详情页内容撰写规范 V1](RACE_DETAIL_CONTENT_STANDARD_V1.md) — **CURRENT**
5. [RaceNext 越野赛事详情页内容标准 V1](TRAIL_RACE_DETAIL_STANDARD_V1.md) — **CURRENT**
6. [RaceNext 赛事住宿推荐与内容生产标准 V1.1](ACCOMMODATION_CONTENT_STANDARD_V1_1.md) — **CURRENT / Source of Truth**；当前赛事住宿推荐、AI Research、Human Approved Set、Final Accommodation Package、Production Board、Ctrip Action 与长期维护标准。
7. [RaceNext 赛事住宿推荐与内容生产标准 V1](ACCOMMODATION_CONTENT_STANDARD_V1.md) — **HISTORICAL / Superseded by V1.1**；保留历史版本，不再作为当前执行标准。
8. [RaceNext 图片资产标准 V1](RACENEXT_IMAGE_ASSET_STANDARD_V1.md) — **CURRENT / FROZEN**
9. [First5 图片资产交付报告](FIRST5_IMAGE_ASSET_DELIVERY_REPORT.md) — **CURRENT**
10. [Trail Course Point Schema V0.1](TRAIL_COURSE_POINT_SCHEMA_V0_1.md) — **CURRENT / MINIMAL**
11. [Trail CP Data Audit V1](TRAIL_CP_DATA_AUDIT_V1.md) — **ARCHIVED AUDIT**

### P1｜战略背景

12. RaceNext Investor BP 202608 (`reference/RaceNext_Investor_BP_202608.pdf`) — **REFERENCE / 2026.08 / Not Found**

Investor BP 用于理解战略与商业背景，不是代码实现约束，也不能自动生成开发需求。

## 3. Conflict Priority

不同文档或实现出现冲突时，优先级为：

1. 最新明确的 Human Decision 与当前生产事实
2. 当前冻结的产品、数据与内容硬约束
3. 当前实际代码及可核验的生产运行证据
4. [`docs/data/`](../data/) 技术现状与历史阶段记录
5. Investor BP 与历史战略资料

冻结目标不等于已实现能力；历史阶段记录也不能覆盖当前真实代码与生产事实。如果代码、生产证据与 Frozen 规范明显冲突，先报告差异，不擅自认定任一方正确。

## 4. Current Product Direction

微信小程序已正式上线。当前优先验证真实用户需求、获客路径与商业转化，而不以新增功能数量代替创业进展。并行开展 Race Data Automation P0 可靠性修复；不重新设计已冻结的数据架构，不把尚未实现的规划写成生产能力。

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

文档职责：

- [RaceNext 数据系统 V1](RACENEXT_DATA_SYSTEM_V1.md)：架构与 Event / Edition / Category 模型。
- [赛事数据自动维护标准 V1](RACE_DATA_AUTOMATION_STANDARD_V1.md)：目标、质量标准、自动化边界及 Phase 1–3 验收。
- [数据与内容维护成本原则 V1](DATA_CONTENT_MAINTENANCE_PRINCIPLES_V1.md)：运营维护与成本原则。
- [RaceNext Data Foundation V1](../data/RACENEXT_DATA_FOUNDATION_V1.md)：当前代码能力、真实运行证据和待实现缺口。
