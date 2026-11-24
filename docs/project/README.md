# RaceNext Project Context

截至 2026-11-24，RaceNext 生产 Public API 已公开 **23 场赛事**。PR #58 合并并部署 `70d57b14ba3d58191b1ea108921c966a7343633b`，包含 Outopia 莫干山和黄山徽州古城。发布前 Human Final Device QA PASS，Human 于 2026-11-24 确认线上正式版真机 Smoke QA PASS，PR #58 发布验收已结项。[PR #58 Production Release Closeout](PR58_PRODUCTION_RELEASE_CLOSEOUT_20261124.md) · [生产赛事列表](https://racenext.run/api/races)

历史基线（2026-11-20）为生产 Public API 公开 **21 场赛事**。[PR #56 安全修复](https://github.com/zlwison-maker/RaceNext/pull/56)和 [PR #55 两场赛事接入](https://github.com/zlwison-maker/RaceNext/pull/55)均已合并并完成生产发布，微信正式版真机验收 PASS。详见 [PR #55 Production Release Closeout](TWO_RACE_INTEGRATION_20261119.md#production-release-closeout2026-11-20)。

历史基线（2026-11-17）：1.9 七场内容与事实修复已分别通过 PR #44 / #45 合入 `main`，当时 Canonical 为 19 个 Edition。[初次七场 Handoff](SEVEN_RACE_CONTENT_INTEGRATION_20261020.md)、[福州/熊猫补证](PR44_FUZHOU_PANDA_FACT_SUPPLEMENT_20261020.md)及[P0 修复 Handoff](SEVEN_RACE_P0_FACT_CONTENT_QA_20261020.md)继续保留各自时点结论。宁海 2026 CNH-60、UTNH-100、YNH-25 三组 CoursePoint 已正式发布并完成微信真机 QA。

## 1. Current Phase

- Current Phase: **WECHAT MINI PROGRAM LIVE / REAL USER, ACQUISITION & COMMERCIAL VALIDATION**
- Mini Program 1.0.1: **RELEASED — 2026-10-14 HUMAN CONFIRMED (EXACT PUBLISH TIME NOT PROVIDED)**
- Data Foundation: **ARCHITECTURE FROZEN**
- Data Pipeline: **PRODUCTION IMPLEMENTED / 14 CONSECUTIVE SCHEDULED RUNS SUCCESSFUL — 2026-11-03 TO 2026-11-16**
- Data Automation Phase 1: **PRODUCTION ACCEPTED**
- Data Automation Phase 2: **BEIJING READ-ONLY DISCOVERY PILOT COMPLETED / FULL PHASE NOT COMPLETE**
- Ninghai B2: **PRODUCTION CLOSED — 2026-10-14 (OFFICIAL FACT → API → DEVICE)**
- Ninghai CoursePoint Supply: **CNH-60 / UTNH-100 / YNH-25 RELEASED / DEVICE QA PASS**
- Critical Fact Maintenance: **ENGINEERING P0 ACCEPTED / QUALITY, CHANGE DETECTION & COST VALIDATION CONTINUE**
- Content Production Workflow: **GPT + CODEX / CHATGPT WORK BATCH RESEARCH EXPERIMENT PAUSED**

微信小程序已上线；1.0.1 已由 Human 于 2026-10-14 确认审核通过并正式发布（精确发布时刻尚未提供）。宁海 B2 事实更新闭环及三组 CoursePoint 发布 / 真机 QA 已完成。创业主线已进入真实用户、获客与商业验证；赛事供给和数据维护服务于用户价值与增长验证，不继续为了自动化而开发自动化。不要把产品发布、Workflow PASS 或单场数据闭环等同于创业验证或全站事实准确性 PASS。

## 2. Mandatory Reading

### P0｜产品与数据硬约束

1. [RaceNext 数据系统 V1](RACENEXT_DATA_SYSTEM_V1.md) — **CURRENT / FROZEN**
2. [RaceNext 赛事数据自动维护目标与验收标准 V1](RACE_DATA_AUTOMATION_STANDARD_V1.md) — **P0 / CURRENT / FROZEN TARGET & GATES**
3. [RaceNext 数据自动维护下一阶段验证计划](RACE_DATA_AUTOMATION_NEXT_VALIDATION_20261013.md) — **HISTORICAL PLAN / NINGHAI B2 CLOSED**
4. [RaceNext 数据与内容维护成本原则 V1](DATA_CONTENT_MAINTENANCE_PRINCIPLES_V1.md) — **CURRENT**

### P0｜赛事内容硬约束

5. [RaceNext 小程序详情页与分享标准 V1](MINIPROGRAM_DETAIL_SHARE_STANDARD_V1.md) — **CURRENT / FROZEN**
6. [RaceNext 赛事详情页内容撰写规范 V1](RACE_DETAIL_CONTENT_STANDARD_V1.md) — **CURRENT**
7. [RaceNext 越野赛事详情页内容标准 V1](TRAIL_RACE_DETAIL_STANDARD_V1.md) — **CURRENT**
8. **RaceNext 赛事住宿推荐与内容生产标准 V1.2** — 当前执行版本。仓库保留 [V1.1](ACCOMMODATION_CONTENT_STANDARD_V1_1.md) 和 [V1](ACCOMMODATION_CONTENT_STANDARD_V1.md) 历史正文。V1.2 正文由 Human 在项目资料维护，现有仓库可查阅[本轮适用记录](PR58_PRODUCTION_RELEASE_CLOSEOUT_20261124.md#图片权限及住宿-hold)。
9. **RaceNext 新增赛事研究交付标准 V1** — 当前新增赛事研究交付索引。正文由 Human 在项目资料维护，现有仓库可查阅[交付包执行依据](inputs/two-races-20261119/RACENEXT_2027_TWO_RACES_CODEX_DEVELOPMENT_INSTRUCTIONS_20261119.md)。
10. [RaceNext 图片资产标准 V1](RACENEXT_IMAGE_ASSET_STANDARD_V1.md) — **CURRENT / FROZEN**
11. [First5 图片资产交付报告](FIRST5_IMAGE_ASSET_DELIVERY_REPORT.md) — **CURRENT**
12. [Trail Course Point Schema V0.1](TRAIL_COURSE_POINT_SCHEMA_V0_1.md) — **CURRENT / MINIMAL**
13. [Trail CP Data Audit V1](TRAIL_CP_DATA_AUDIT_V1.md) — **ARCHIVED AUDIT**

### Release Handoff

14. [微信小程序 1.0.1 Release Handoff](MINIPROGRAM_RELEASE_1_0_1_HANDOFF.md) — **RELEASED / HUMAN CONFIRMED 2026-10-14**
15. [PR #55 Production Release Closeout（含 PR #56 安全发布）](TWO_RACE_INTEGRATION_20261119.md#production-release-closeout2026-11-20) — **`RELEASE_PASS` / `SECURITY_PRODUCTION_PASS` / HUMAN DEVICE QA PASS，2026-11-20**
16. [PR #58 Production Release Closeout](PR58_PRODUCTION_RELEASE_CLOSEOUT_20261124.md) — **RELEASE CLOSED / PRODUCTION API PASS / HUMAN ONLINE DEVICE SMOKE PASS，2026-11-24**

### P1｜战略背景

17. RaceNext Investor BP 202608 (`reference/RaceNext_Investor_BP_202608.pdf`) — **REFERENCE / 2026.08 / Not Found**

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

微信小程序已正式上线，1.0.1 已经审核通过并发布（Human 2026-10-14 确认）。当前优先验证真实用户需求、获客路径与商业转化，而不以新增功能或自动化数量代替创业进展。赛事内容供给恢复 GPT + Codex 协作；普通可靠来源事实更新继续走 Human Curated Source Update；每日数据自动维护保持安全监测和 Human Review。三条流程不得互相强制替代。

当前最大缺口仍是关键事实核验覆盖、事实变化发现效果和低人工维护成本尚未得到生产证明。北京官方来源 Discovery 已完成只读试点，但 Phase 2 整体闭环尚未完成；Phase 3 尚未完成。`Auto Apply = OFF`。

## 5. Current Collaboration Workflows

### A. 新赛事内容生产

正式流程：Human 提供赛事名称 → GPT 按现有冻结标准完成完整赛事 Research Package → Human Review → Human 确定住宿 Approved Set 与 Ctrip Action → Codex 完成正式数据 / 内容接入 → 测试、Draft PR、发布验收。

ChatGPT Work 云端批量研究实验自 2026-11-17 起暂停。保留实验历史，不把失败结果改写为内容标准问题，也不降低 Race Facts、Race Guide、Runner / Media Evidence、Trail Strategy、当前住宿标准 V1.2 或风险交付标准。

### B. 普通赛事事实更新

Human 提供可靠来源 URL 后，Codex 按 [Human Curated Source Update Workflow V1](HUMAN_CURATED_SOURCE_UPDATE_WORKFLOW_V1.md) 自主读取、提取、校验、形成受控 Diff 并提交 Draft PR。单场事实或 CoursePoint 更新不强制先制作 GPT 赛事研究包。

### C. 数据自动维护

每日 Workflow 负责持续监测、Evidence / Identity / Semantic Validation、Pending / Alert 与单一 Data PR 延续。所有事实候选继续 Human Review，`Auto Apply = OFF`；工程运行成功不代表数据质量、变化发现率或维护成本已达标。

## 6. Key Product Principles

- 用户价值优先
- 完成比完美重要
- 小程序体验优先
- 数据资产多端统一
- 商业化从第一天考虑
- 不制造高维护、低价值能力
- 真实事实、Runner Feedback、RaceNext Judgment 分离
- 不因为未来可能需要就提前堆功能

## 7. Technical Entry

文档职责：

- [RaceNext 数据系统 V1](RACENEXT_DATA_SYSTEM_V1.md)：架构与 Event / Edition / Category 模型。
- [赛事数据自动维护标准 V1](RACE_DATA_AUTOMATION_STANDARD_V1.md)：目标、质量标准、自动化边界及 Phase 1–3 验收。
- [数据与内容维护成本原则 V1](DATA_CONTENT_MAINTENANCE_PRINCIPLES_V1.md)：运营维护与成本原则。
- [RaceNext Data Foundation V1](../data/RACENEXT_DATA_FOUNDATION_V1.md)：当前代码能力、真实运行证据和待实现缺口。

## 8. 当前数据维护 P0

[数据维护 Handoff 的 2026-11-17 历史快照](RACE_DATA_PENDING_COLLISION_FIX_20261029.md#2026-11-17-状态同步)：PR #52 已合并；2026-11-03 至 11-16 的 Race Data Update Run #37–#50 连续 14 次 Scheduled Run 均成功。该快照中 PR #46 为 Open，Head `5e81744eb521cb8159b8021aebbed354f04937bf`，47 条累计记录为 35 rejected / 8 applied / 4 pending，State 82；其中 21 条 Reject 已于 11-16 正式写入监测账本。当时 PR #53 尚为 Draft，随后于 11-17 合并并完成两条起点的生产发布。11-20 发布验收时 PR #46 仍为 Open，Pending / State 未因发布而改变，`Auto Apply = OFF`。**工程连续性已验收；来源覆盖、事实准确性、变化发现能力和维护成本仍未验收。**

[数据自动维护 P0 生产 Closeout（2026-10-15）](RACE_DATA_MAINTENANCE_P0_20261014.md#2026-10-15-生产验收-closeout)：工程 P0 阶段性交付完成；Run #38691682744 已提供生产 Workflow、动态监测、生命周期过滤、公告处理及部分字段继承的真实证据，数据质量与规模化效率继续观察。完整指标集中见 Closeout，不以 Pipeline Success 代替事实准确性 PASS。

2026-10-15 最新 Human Decision：**Human Review by Exception**。已登记、有效的赛事专属官网身份可用于同源公告；实际正文通过 Event / Edition / 字段作用域及确定性 Evidence 校验后，无需逐页重复来源审批或登记，直接进入既有 Fact Pipeline。跨域、共享平台、身份/适用性不明和证据不足仍复核。内容未变仅在真实字段证据仍匹配时单独记 `VERIFIED_INHERITED`；不以成功 Hash 冒充字段核验。该规则覆盖历史“每篇公告都必须单独 Source Approval”的冲突表述，**不改变 Auto Apply OFF、事实 Pending / Human Review、Public Fact Gate 或发布权限**。实现与真实限制见上述 P0 文档的 2026-10-15 补充。

历史时点（2026-10-15）：PR #38–#41 均已合并；PR #41 仅持久化 Pending / State。该轮 `FIELD_EVIDENCE_BASELINE=not_available`，但 2026-11-02 四轮生产验收已证明字段 Artifact 跨运行恢复，旧“尚未验证”结论不再代表当前状态。自动部署仍未获生产验收。最新生命周期决策以[自动维护标准](RACE_DATA_AUTOMATION_STANDARD_V1.md#edition-生命周期与日常维护优先级2026-10-15-human-decision)为准；`Auto Apply = OFF`。
