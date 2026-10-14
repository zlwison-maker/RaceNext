# RaceNext Data Foundation V1

## 1. Status

- Architecture: **FROZEN**
- Real AI Fact Extraction: **IMPLEMENTED; MANUAL PRODUCTION FLOW VERIFIED**
- 12-Race Monitoring + Pending Review: **IMPLEMENTED**
- Manual GitHub Workflow: **ACTIVE**
- Daily Cron: **ACTIVE — 08:23 ASIA/SHANGHAI / 00:23 UTC**
- Phase 4B-2 First Natural Scheduled Run: **COMPLETED — 2026-10-09**
- Data Automation Phase 1A / 1B: **IMPLEMENTED, MERGED, PRODUCTION ACCEPTED — 2026-10-12**
- Open Data PR Continuous Monitoring: **PROVEN — RUN #9 + RUN #10; PR #15 MERGED**
- Data Automation Phase 2: **BEIJING READ-ONLY DISCOVERY PILOT COMPLETED; FULL PRODUCTION PHASE NOT COMPLETE**
- Gate 5 Real Production Change Closed Loop: **PROVEN**
- Remote Read: **IMPLEMENTED; 12 PUBLIC EDITIONS**
- Ninghai B2 Fact-to-Terminal Closed Loop: **PRODUCTION VERIFIED — 2026-10-14**
- Critical Fact Maintenance Effectiveness: **NINGHAI SINGLE-RACE CLOSED / 12-RACE VERIFICATION COVERAGE AND CHANGE DETECTION NOT YET PROVEN**

数据基础设施 V1 的核心、12 场监控、Qwen 抽取、Pending Review 与人工生产闭环已实现。Phase 4B-2 的首次自然 `schedule` 已在 2026-10-09 执行成功，但该轮没有主动识别北京马、广州马、HK100 三项已知报名状态错误；三项错误已通过独立 Hotfix 修复上线。随后 Phase 1A 监测连续性与安全延续、Phase 1B Verification Alert 已合并并通过真实生产验收。Phase 2 已完成北京官方来源 Discovery 的只读试点，但尚未证明跨赛事的完整生产闭环。**执行成功仍不等于关键事实准确性得到维护。**Auto Apply 继续关闭，Human Review、Human Merge 与必要的生产部署仍是正式事实更新的边界。Phase 1 证据与未解决限制见[收尾及 Handoff](#15-phase-1-closeout--handoff)。

本文件记录当前技术与生产状态；长期质量目标及 Phase 1–3 验收标准见 [RaceNext 赛事数据自动维护目标与验收标准 V1](../project/RACE_DATA_AUTOMATION_STANDARD_V1.md)。

## 2. Core Model

```text
Event → Edition → Category
```

- **Event**：跨年份的赛事品牌与稳定身份。
- **Edition**：Event 在某一年的具体一届，承载日期、地点、报名状态等届次事实。
- **Category**：Edition 下的具体组别，承载距离、爬升、关门时间、起终点和组别开跑时间等事实。

Road 与 Trail 共用这套模型。赛事类型只来自 `Event.eventType`，不为两类赛事维护两套 Schema。

## 3. Data Lifecycle

```text
Source
  → Discovery
  → Fetch
  → Normalize / Extraction
  → Validation
  → Diff
  → Risk
  → Canonical
  → Distribution
```

每一层职责独立。客户端只读取 Distribution 输出的 Published Race Graph，不直接读取 Raw、Pending、Source Registry 或 Pipeline 状态。

## 4. Source Strategy

- **Tier 1 Official**：赛事、主办方、官方规程、官方报名等第一方来源。
- **Tier 2 Trusted**：可信结构化赛事或报名平台。
- **Tier 3 Media**：可信媒体，仅用于发现或交叉核对。
- **Tier 4 UGC**：社区与个人内容，不作为 Official Fact 来源。

Official Fact 与 Runner Feedback 必须分离：前者进入事实验证链路，后者未来可用于体验与建议，但不得覆盖官方日期、距离、路线或报名事实。

## 5. Canonical Source of Truth

`data/canonical/race-graph-v1.json` 是当前 Canonical Source of Truth，保存已经接受的 Event、Edition 与 Category。First5 是历史首批交付范围；当前正式公开范围为 12 场赛事，不应继续把 First5 写成全部 Public 范围。

测试 fixture、Pending Change、Discovery Candidate 和 Source Registry 都不是 Canonical。当前 Web 仍使用原有数据链路；它尚未迁移到 Race Graph。

## 6. Update Strategy

仓库使用同一个 GitHub Actions Production Workflow 支持 `workflow_dispatch` 与每日 `schedule`。Cron 为 `23 0 * * *`，计划时间是 Asia/Shanghai 08:23。2026-10-09 首次自然运行实际于 14:21:26 开始；**该次延迟的具体原因 UNVERIFIED**，不能归因于未经核实的平台行为。正式 Workflow 固定使用 `auto_apply_low_risk=false`，不暴露开启入口。

早期 Scheduled Run 在已有 Data PR 开放时会安全跳过整轮监测；这是 2026-10-09 首次自然运行后的历史缺口，**不是当前行为**。Phase 1A 现在校验开放 PR 与分支状态，在安全条件下继续监测并更新同一个 Data PR；出现多个 PR、分支冲突或无法安全持久化时仍须 fail closed，不创建竞争性 PR。Pending-before-State、去重与 PR 更新的可追溯摘要继续生效；无 meaningful durable change 时不创建 PR，真实失败保持 GitHub Actions 红灯。2026-10-12 的定时 Run #9 和手动 Run #10 已验证同一开放 PR 的两轮延续。

- 当前 Source Registry 只有 source-level authority，尚无 field-level authority；因此 Low Risk 变化也只进入 Pending / Report，Canonical 自动写入固定为 0。不能把现有风险标签解释为自动 Apply 授权。
- 日期、地点、距离、爬升、关门时间等 High Impact 字段进入 Pending Review。
- 新 Event、Edition、Category 或删除等 Structural 变化必须人工 Review。
- 来源失败、字段缺失或时间戳刷新不能被解释为事实删除或变化。
- Seed / First5 / Roadmap 只定义覆盖意图，不定义 Edition 事实。future / active Edition 在发布前必须比较 Requested Edition、Latest Relevant Official Edition 与 Canonical Edition；冲突时标记 Needs Review 并拒绝发布。
- raceDate 必须保留支持该值的 Evidence 绑定；官网首页未展示日期时继续检查 Tier 2 与交叉来源，只有完成可信来源检查仍无可靠证据时才可保留 null。

## 7. Official Source Ingestion

已审批的 Tier 1 Official 来源可经过 HTML、纯文本或带文本层 PDF 提取，再交给 `FactExtractionProvider` 生成带证据的候选事实。

当前状态：

- Qwen OpenAI-compatible Provider Adapter：**READY**
- 本地真实 Provider 运行验收：**VERIFIED**
- GitHub Repository Secrets 与 Manual Production Workflow：**ACTIVE AND VERIFIED**
- Daily Schedule：**ACTIVE — PHASE 1 CONTINUITY ACCEPTED; CRITICAL FACT EFFECTIVENESS NOT VERIFIED**
- Verification Alert：**ACTIVE IN RUN REPORTS; NOT A FACT CANDIDATE OR CANONICAL WRITE**
- 未配置时：安全返回 `fact_extraction_provider_unconfigured`，不生成事实、不修改 Canonical

## 8. Distribution

Public Read Layer 从 Canonical Snapshot 派生独立 DTO，并提供：

- `GET /api/races`：返回可发布 Edition 列表。
- `GET /api/races/:editionId`：返回一个可发布 Edition 及其组别详情。

响应使用 `race-graph-public-v1`，保留标准日期字段，并额外派生 `dateDisplay`、`locationDisplay` 与 `isPrimaryCategory`。接口公开、只读、无需 Cookie 或登录；没有写入方法，也不能触发任何 Pipeline 命令。

公开层不会返回 governance、source、evidence、confidence、mergeTrace、conflicts、Pending、ingestion state 或 AI usage。短期 CDN 缓存为 5 分钟，并允许 1 小时 stale-while-revalidate。

Canonical 通过代码提交更新，因此公开 API 获得新数据仍依赖包含该提交的一次应用部署。仓库现有数据工作流只负责提交允许的数据文件；仓库内没有可证明 main 分支提交必然自动部署的配置。这是当前发布链路的外部配置核验项，不在本轮新增部署系统。

生产 Web 与微信小程序均已上线并消费各自现有链路；微信小程序通过同域 HTTPS Public API 读取公开赛事数据。当前 Web 赛事页面仍有原有数据链路，不得据“共享 Public DTO”的目标声称 Web 已全部迁移。报名状态 Hotfix 与图片优化已上线并 CLOSED；本轮文档更新不触发部署。

## 9. Multi-client Principle

底层 Event → Edition → Category 数据统一，Public DTO 供微信小程序与未来 Web 共用。产品优先级是小程序体验，但客户端展示选择不反向制造第二份赛事事实。数据层存什么，不代表每个页面必须展示什么。

## 10. Maintenance Principle

- 不在多个客户端重复维护赛事事实。
- 不为每场赛事手写专用 Parser。
- 不用往届事实推断本届事实。
- 数据层字段与页面展示保持解耦。
- 数据可信度优先于赛事数量。
- 先维护核心赛事，再基于相同 Contract 规模化。

## 11. First Natural Run and PR #6

2026-10-09 首次自然定时运行：[GitHub Actions Run 37893100277](https://github.com/zlwison-maker/RaceNext/actions/runs/37893100277)。Run `schedule` 已完成、结论为 success；计划 Cron 为 08:23，实际开始 14:21:26 Asia/Shanghai，延迟原因 **UNVERIFIED**。

| 检查层 | 实际结果 | 解读 |
| --- | --- | --- |
| 赛事范围 | 12 场纳入监测 | 不等于 12 场所有关键事实已核验。 |
| 来源 | 43 个合格来源参与；29 个抓取成功 | 抓取成功仍需身份、抽取与证据验证。 |
| 有效处理 | 19 个来源 | 仅该层完成有效处理；不等于所有字段近期核验。 |
| 未有效处理 | 24 个来源：Fetch 14、Identity 6、Validation 4 | 不得把 24 个全部称为网络抓取失败。 |
| 模型与变更 | 10 次模型调用；4 个新 Pending；0 个 Canonical 自动更新 | 有候选/状态变化，不代表漏检问题已解决。 |

该轮未主动识别北京马 2026、广州马 2026、HK100 2027 三项已知报名状态错误，证明 **Pipeline Execution Success = PASS** 与 **Critical Fact Verification Coverage / Fact Change Detection Effectiveness = NOT VERIFIED** 必须分开。三项报名事实已由独立 Hotfix 修复并上线，不在此重新更新。

[PR #6](https://github.com/zlwison-maker/RaceNext/pull/6) 已于 2026-10-10 Human Reviewed 并合入 `main`（merge commit `7c635986d68261347717a934bd929cde397fcfe0`）：厦门马 `startLocation` 保持 Pending，柴古 `registrationUrl`、宁海 `registrationOpenDate` 和 `registrationCloseDate` 共三条 Rejected。PR 仅持久化 Pending 与 Ingestion State，**0 Canonical Writes**。`lastSuccessfulExtractionHash` 证明来源处理状态，不证明关键事实已最新核验。

## 12. Capability Status and P0 Gap

| 分类 | 当前证据与边界 |
| --- | --- |
| **Implemented** | Event → Edition → Category、Source Registry、已登记来源 Fetch、Identity / Evidence Validation、Diff / Risk、Pending-before-State durability、单一开放 Data PR 的安全连续监测、Pending 去重、Verification Alert、Public Remote Read、每日 Workflow。 |
| **Production Verified — Phase 1** | 人工 Workflow 的 Git 审核闭环；PR #11 / #13 / #14 的 Phase 1A / 1B 修复已合并；Run #9 / #10 在同一开放 Data PR 下连续完成，PR #15 保留 Ingestion State 并合并。 |
| **Not Yet Verified** | 12 场关键字段的近期直接官方核验覆盖、已知重要变化的发现率、来源失败时的事实准确性、人工维护成本下降；不能据来源 Hash、Alert 或 Workflow PASS 推定这些结果。 |
| **Partial — Phase 2 Pilot** | 北京官方新公告与报名来源发现已完成只读 Discovery 试点及异常响应修复；尚未证明跨赛事持续发现、来源审批、事实候选、Canonical 更新、部署和终端验证的完整闭环。Phase 1–3 的冻结目标和验收 Gate 仍见[自动维护标准 V1](../project/RACE_DATA_AUTOMATION_STANDARD_V1.md#10-roadmap--acceptance-gates)。 |

Phase 1 已解决 Open Data PR 阻断整轮日常检查、重复 Pending 和关键异常不可见的问题；新公告自动发现、来源有效处理率、关键字段直接官方核验覆盖以及执行状态与事实质量的差异仍需如实报告。继续保留 Evidence 标准、重复运行幂等和安全写入边界。具体目标与验收见 [自动维护标准 V1](../project/RACE_DATA_AUTOMATION_STANDARD_V1.md)。

## 13. Deferred

- 跨赛事、持续运行的 Source Discovery / Web Search Provider
- Database
- CMS / approval UI
- OCR
- 105 / 1500 场规模化
- Future100 与完整存量迁移
- Web full migration to Race Graph

生产链路已完成“抓取 → 抽取 → Pending / data-only PR → Human Review → Human Merge”的真实闭环。每日 cron 与 Manual Workflow 共用同一安全路径，不负责部署，也不能自动修改 Canonical。Phase 1 连续性已验收；下一步不是重复证明任务可执行，而是按冻结 Gate 审视 Phase 2 的来源发现，并持续衡量关键事实核验与变化发现能力。未有充分生产证据和独立 Human Review 前，不得开启 Canonical auto apply。

## 14. Next Phase

**PHASE 1 ACCEPTED / PHASE 2 READ-ONLY PILOT COMPLETED, FULL PHASE NOT COMPLETE / PHASE 3 NOT COMPLETE / CRITICAL FACT ACCURACY NOT ESTABLISHED**

数据架构继续冻结。微信小程序已上线，创业主线是用户、获客与商业验证。Phase 1 仅处理监测连续性、Verification Alerts 与 Pending / State 安全闭环，现已收尾；Phase 2 的北京只读 Discovery 试点已经完成，但完整阶段仍未完成。宁海 B2 已于 2026-10-14 经生产端到端验收关闭（见第 18 节）。下一步按 [2026-10-13 验证计划](../project/RACE_DATA_AUTOMATION_NEXT_VALIDATION_20261013.md)评估现有 12 场的来源、核验覆盖和维护成本；先只读复盘，不为尚未验证的规模化需求预建 Database、CMS、GraphQL、Queue、Worker 或第二套客户端 Schema。

## 15. Phase 1 Closeout & Handoff

### 已合并与已验收

- [PR #11](https://github.com/zlwison-maker/RaceNext/pull/11)：Phase 1A 单一开放 Data PR 的监测连续性与状态持久化，已合并；[PR #13](https://github.com/zlwison-maker/RaceNext/pull/13)：重复 Pending 与人工审核保护修复，已合并。
- [PR #14](https://github.com/zlwison-maker/RaceNext/pull/14)：Phase 1B Verification Alert 与字段级本轮核验报告，已合并。Alert 仅用于复核，不是 Fact Candidate；本轮值匹配与关键节点后的状态确认严格区分。
- [Run #9 — 38211318233](https://github.com/zlwison-maker/RaceNext/actions/runs/38211318233) 是 2026-10-12 的定时运行；[Run #10 — 38214700524](https://github.com/zlwison-maker/RaceNext/actions/runs/38214700524) 是同日手动运行。两轮均成功，在同一开放 [Data PR #15](https://github.com/zlwison-maker/RaceNext/pull/15) 上延续；[Run #9 摘要](https://github.com/zlwison-maker/RaceNext/pull/15#issuecomment-6118813918)与 [Run #10 摘要](https://github.com/zlwison-maker/RaceNext/pull/15#issuecomment-6119298361)分别记录 Head `bc33b33` → `16e2c11`、新 Pending `0`、去重 Pending `0`、对应脱敏报告 Artifact，以及 Auto Apply OFF / Canonical 自动写入 ZERO。
- PR #15 仅将监测产生的 Ingestion State 持久化到 `main`，于 2026-10-12 合并（merge commit `71947c61975c8c380e072695022a2a3ab49e6356`）；没有 Canonical 变更。状态持久化不等于关键字段已得到核验。

### 仍需如实报告的限制

- 最近一轮生产验收口径：**43 条监测来源中 27 条未有效处理**；**81 个关键字段检查项中，本轮直接官方核验为 0**。来源层处理、字段层直接证据和事实准确性是不同指标。Run #10 的脱敏报告 Artifact 标识为 `race-update-report-38214700524`；这些数字不应被 Workflow Success 或 PR 合并覆盖。
- Cron 计划时间为 Asia/Shanghai 08:23；Run #9 实际于 2026-10-12 14:11:17 启动，较计划时间明显延迟。2026-10-09 首次自然运行也在 14:21:26 才启动。**延迟根因 UNVERIFIED**；Run #10 是手动触发，不用于评价 Cron 准点率。
- Phase 1 验收证明监测连续性、异常可见性与安全持久化机制有效，**不证明 Critical Fact Verification Coverage 或 Fact Change Detection Effectiveness 达标**。所有事实候选继续进入 Human Review；`Auto Apply = OFF`，无自动事实更新。

### 下一阶段 Handoff

Phase 2 已完成北京官方来源的只读 Discovery 试点，但阶段整体尚未完成。后续仍以[自动维护标准 V1 中冻结的 Phase 2 目标与验收 Gate](../project/RACE_DATA_AUTOMATION_STANDARD_V1.md)为边界：官方新公告与报名来源发现、身份/届次判定、来源审批和发现质量衡量；不得从搜索摘要直接生成事实，也不得自动批准 Registry。试点完成不能表述为生产闭环完成。

## 16. 2026-10-13 Production Run #11

[GitHub Actions Run #11 — 38359395852](https://github.com/zlwison-maker/RaceNext/actions/runs/38359395852) 在 `main` 的 `2c83dd19c1c7980c7b03085a0ac4c6b45d161497` 上执行成功。运行日志与脱敏报告 Artifact `race-update-report-38359395852` 确认：

| 指标 | 实际结果 | 边界 |
| --- | --- | --- |
| 赛事范围 | 12 场；4 HEALTHY / 7 PARTIAL / 1 FAILED；1 个 Source Gap | Health 状态不等于 Canonical 正误，也不证明事实已充分核验。 |
| 来源 | 43 个检查来源；28 个 fetched；25 个未有效处理；12 个官方来源有效处理 | 未有效处理包含 Fetch、Identity 和 Validation 等阶段，不应全部解释为网络抓取失败。 |
| 关键事实核验 | 81 项：本轮直接官方核验 2；未核验 66；Unknown 13 | 字段级直接官方核验覆盖为 `2/81`，不能由来源处理数替代。 |
| Verification Alerts | 12：HIGH 4 / REVIEW 8 | Alert 不是 Fact Candidate，也不修改 Canonical。 |
| 模型调用 | 7 | 调用成功不等于事实准确。 |
| Pending | 新 Pending 0；去重 Pending 4 | 去重状态不等于产生新的事实更新。 |
| Canonical 自动更新 | 0 | `Auto Apply = OFF`。 |
| 自动化验证 | `343/343 PASS`，TypeScript Gates 与 data-only diff 通过 | 测试通过不替代生产数据质量验收。 |

[Data PR #23](https://github.com/zlwison-maker/RaceNext/pull/23) 截至 2026-10-13 为 **Open / 未 Merge**。Diff 仅涉及一个 Ingestion State 文件（69 additions / 69 deletions），不包含 Canonical 事实更新，不得表述为已更新赛事事实或已部署。

上述关键事实核验数字直接读取自脱敏 Artifact 的 `verification` 区块。单轮 `2/81` 是 Run #11 的字段级结果，不代表长期覆盖率，也不能推断未核验字段错误。

## 17. Historical Next Validation（2026-10-13）

2026-10-13 的 [宁海越野专项验证计划](../project/RACE_DATA_AUTOMATION_NEXT_VALIDATION_20261013.md) 要求在现有 Schema 内检验距离语义、爬升、起终点的缺失发现、提取、身份核验、Human Review、Canonical 更新及终端呈现。宁海 B2 已于 2026-10-14 完成，见第 18 节。12 场关键事实覆盖、变化发现效果、时延、人工时间和成本仍需独立评估。本计划始终不授权自行修改生产事实或开启 Auto Apply。

## 18. Ninghai B2 Production Closeout（2026-10-14）

**Status: NINGHAI_B2_PRODUCTION_CLOSED / PASS**。宁海是经过真实官方来源、人工批准、生产部署和微信小程序终端验证的单赛事闭环。之前第 11–17 节的 Run、PR 与计划基线保留为各自日期的历史证据，不能覆盖此最新状态。

| Gate | 正式证据 / 结论 |
| --- | --- |
| Source / Extraction | [PR #30](https://github.com/zlwison-maker/RaceNext/pull/30) 登记三个正式宁海 JSON Category 来源；[Run #38537480192](https://github.com/zlwison-maker/RaceNext/actions/runs/38537480192) Workflow SUCCESS、全量 387/387 PASS、正式六条 Pending |
| Persistence / Approval | [PR #32](https://github.com/zlwison-maker/RaceNext/pull/32) 持久化 Pending / Ingestion State；Human 于 2026-10-14 批准六条 High Impact；[PR #34](https://github.com/zlwison-maker/RaceNext/pull/34) 应用并经审查合入 |
| Canonical | Merge Commit `8b07c7bc7df7d9c889421690ea285a1eac01b92c`；UTNH-100、CNH-60、YNH-25 起点 / 终点六项均为「西门城楼」；六条 Pending `applied` |
| Production Deploy | 1.4 线程 Handoff：腾讯云 Lighthouse 部署目标 SHA，Production Build PASS、PM2 online（该部分为发布验收记录，不来自 GitHub Workflow） |
| Public API / Security | 1.4 Handoff：宁海 Detail API HTTP 200、六个起终点 6/6 PASS；12 场 Detail 12/12、Public API Security PASS |
| Device QA | 1.4 Handoff：已上线微信小程序 UTNH-100 / CNH-60 / YNH-25 三组真机展示 PASS，无须重新提交小程序 |

- 数据保护：`distanceKm` 100 / 60 / 25，`elevationGain` 4986 / 2400 / 618，发枪时间、其他 11 场不变；保留 28 条历史 Pending；`Auto Apply = OFF`。无需再次修复已验证的发布链路。
- 指标边界：本轮生产 Run 检查 46 个来源，其中 26 个未有效处理；报告有 12 个 Verification Alerts（3 HIGH / 9 REVIEW），不能将 Workflow 成功视为 12 场事实健康。总人工分钟数、每场维护时间、模型及运行费用和跨赛事误报 / 漏报基线仍未完整记录。
- 下一阶段：只读分析既有 12 场监测报告和关键事实覆盖，先确定真实数据可信度缺口与维护成本，再决定具体下一项工程投入。Phase 2 跨赛事持续 Source Discovery 及 Phase 3 规模化成本 Gate 未完成。

**创业阶段区分：** 本轮是明确的 Product / Data Reliability Progress，不构成新增用户、获客或商业转化的 Startup Progress 证据。
