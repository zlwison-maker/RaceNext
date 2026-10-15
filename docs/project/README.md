# RaceNext Project Context

## 1. Current Phase

- Current Phase: **WECHAT MINI PROGRAM LIVE / REAL USER, ACQUISITION & COMMERCIAL VALIDATION**
- Mini Program 1.0.1: **RELEASED — 2026-10-14 HUMAN CONFIRMED (EXACT PUBLISH TIME NOT PROVIDED)**
- Data Foundation: **ARCHITECTURE FROZEN**
- Data Pipeline: **PRODUCTION IMPLEMENTED / FIRST NATURAL SCHEDULED RUN COMPLETED**
- Data Automation Phase 1: **PRODUCTION ACCEPTED**
- Data Automation Phase 2: **BEIJING READ-ONLY DISCOVERY PILOT COMPLETED / FULL PHASE NOT COMPLETE**
- Ninghai B2: **PRODUCTION CLOSED — 2026-10-14 (OFFICIAL FACT → API → DEVICE)**
- Critical Fact Maintenance: **P0 IMPROVEMENT REQUIRED**
- Parallel Reliability Work: **RACE DATA AUTOMATION P0**

微信小程序已上线；1.0.1 已由 Human 于 2026-10-14 确认审核通过并正式发布（精确发布时刻尚未提供）。宁海 B2 事实更新端到端生产验证亦于 2026-10-14 CLOSED。创业主线是实际用户、获客与商业验证；现有赛事的整体核验覆盖、变化发现与维护成本仍需衡量，与 P0 交付同步进行，不阻塞扩容。不要把产品发布、Workflow PASS 或单场数据闭环等同于创业验证或全站事实准确性 PASS。

## 2. Mandatory Reading

### P0｜产品与数据硬约束

1. [RaceNext 数据系统 V1](RACENEXT_DATA_SYSTEM_V1.md) — **CURRENT / FROZEN**
2. [RaceNext 赛事数据自动维护目标与验收标准 V1](RACE_DATA_AUTOMATION_STANDARD_V1.md) — **P0 / CURRENT / FROZEN TARGET & GATES**
3. [RaceNext 数据自动维护下一阶段验证计划](RACE_DATA_AUTOMATION_NEXT_VALIDATION_20261013.md) — **NINGHAI B2 CLOSED / 12-RACE READ-ONLY ASSESSMENT NEXT**
4. [RaceNext 数据与内容维护成本原则 V1](DATA_CONTENT_MAINTENANCE_PRINCIPLES_V1.md) — **CURRENT**

### P0｜赛事内容硬约束

5. [RaceNext 小程序详情页与分享标准 V1](MINIPROGRAM_DETAIL_SHARE_STANDARD_V1.md) — **CURRENT / FROZEN**
6. [RaceNext 赛事详情页内容撰写规范 V1](RACE_DETAIL_CONTENT_STANDARD_V1.md) — **CURRENT**
7. [RaceNext 越野赛事详情页内容标准 V1](TRAIL_RACE_DETAIL_STANDARD_V1.md) — **CURRENT**
8. [RaceNext 赛事住宿推荐与内容生产标准 V1.1](ACCOMMODATION_CONTENT_STANDARD_V1_1.md) — **CURRENT / Source of Truth**；当前赛事住宿推荐、AI Research、Human Approved Set、Final Accommodation Package、Production Board、Ctrip Action 与长期维护标准。
9. [RaceNext 赛事住宿推荐与内容生产标准 V1](ACCOMMODATION_CONTENT_STANDARD_V1.md) — **HISTORICAL / Superseded by V1.1**；保留历史版本，不再作为当前执行标准。
10. [RaceNext 图片资产标准 V1](RACENEXT_IMAGE_ASSET_STANDARD_V1.md) — **CURRENT / FROZEN**
11. [First5 图片资产交付报告](FIRST5_IMAGE_ASSET_DELIVERY_REPORT.md) — **CURRENT**
12. [Trail Course Point Schema V0.1](TRAIL_COURSE_POINT_SCHEMA_V0_1.md) — **CURRENT / MINIMAL**
13. [Trail CP Data Audit V1](TRAIL_CP_DATA_AUDIT_V1.md) — **ARCHIVED AUDIT**

### Release Handoff

14. [微信小程序 1.0.1 Release Handoff](MINIPROGRAM_RELEASE_1_0_1_HANDOFF.md) — **RELEASED / HUMAN CONFIRMED 2026-10-14**

### P1｜战略背景

15. RaceNext Investor BP 202608 (`reference/RaceNext_Investor_BP_202608.pdf`) — **REFERENCE / 2026.08 / Not Found**

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

微信小程序已正式上线，1.0.1 已经审核通过并发布（Human 2026-10-14 确认）。当前优先验证真实用户需求、获客路径与商业转化，而不以新增功能数量代替创业进展。宁海 B2 的官方来源 → Pending → Human Review → Canonical → 生产 API → 微信小程序真机闭环已完成；2026-10-14 最新 Human Decision：数据自动维护是本周唯一开发 P0，下周开始新增赛事；12 场只读复盘不再作为扩容前置条件。执行动态监测、多赛事 Discovery、异常分流及受控发布安全接入，冻结事实 Gate 不变。

当前最大缺口是关键事实核验覆盖、事实变化发现效果和低人工维护成本尚未得到生产证明。北京官方来源 Discovery 已完成只读试点，但 Phase 2 整体闭环尚未完成；Phase 3 尚未完成。`Auto Apply = OFF`。

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

## 7. 当前数据维护 P0

[2026-10-14 数据自动维护 P0 交付与接入](RACE_DATA_MAINTENANCE_P0_20261014.md)：区分 IMPLEMENTED / TESTED / REAL READ-ONLY TESTED / NOT_PRODUCTION_VERIFIED / BLOCKED SETUP。每日生产接入及自动发布不能由开发分支测试替代验收。

2026-10-15 最新 Human Decision：**Human Review by Exception**。已登记、有效的赛事专属官网身份可用于同源公告；实际正文通过 Event / Edition / 字段作用域及确定性 Evidence 校验后，无需逐页重复来源审批或登记，直接进入既有 Fact Pipeline。跨域、共享平台、身份/适用性不明和证据不足仍复核。内容未变仅在真实字段证据仍匹配时单独记 `VERIFIED_INHERITED`；不以成功 Hash 冒充字段核验。该规则覆盖历史“每篇公告都必须单独 Source Approval”的冲突表述，**不改变 Auto Apply OFF、事实 Pending / Human Review、Public Fact Gate 或发布权限**。实现与真实限制见上述 P0 文档的 2026-10-15 补充。
