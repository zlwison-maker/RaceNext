# RaceNext Data Foundation V1

## 1. Status

- Architecture: **FROZEN**
- Real AI Fact Extraction: **IMPLEMENTED; MANUAL PRODUCTION FLOW VERIFIED**
- 12-Race Monitoring + Pending Review: **IMPLEMENTED**
- Manual GitHub Workflow: **ACTIVE**
- Daily Cron: **ACTIVE — 08:23 ASIA/SHANGHAI / 00:23 UTC**
- Phase 4B-2 First Natural Scheduled Run: **COMPLETED — 2026-10-09**
- Gate 5 Real Production Change Closed Loop: **PROVEN**
- Remote Read: **IMPLEMENTED; 12 PUBLIC EDITIONS**
- Critical Fact Maintenance Effectiveness: **NOT VERIFIED — P0 IMPROVEMENT REQUIRED**

数据基础设施 V1 的核心、12 场监控、Qwen 抽取、Pending Review 与人工生产闭环已实现。Phase 4B-2 的首次自然 `schedule` 已在 2026-10-09 执行成功，但该轮没有主动识别北京马、广州马、HK100 三项已知报名状态错误。**执行成功不等于关键事实准确性得到维护。**三项错误已通过独立 Hotfix 修复上线；本轮不再修改事实。Auto Apply 继续关闭，Human Review、Human Merge 与必要的生产部署仍是正式事实更新的边界。

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

Scheduled Run 会先查询 base 为 `main`、head 以 `automation/race-data-update-` 开头的开放 PR。若存在，本次定时 Pipeline 成功跳过并在 Actions Summary 输出 PR number、URL 与 head branch，以避免竞争性 PR、重复模型调用和状态冲突；人工 `workflow_dispatch` 仍可用于 Diagnosis、Verification 与 Release Gate。**安全跳过不等于当日有效监测**，开放 Data PR 可阻断后续整轮自然检查，是待修复的 P0 连续性缺口。无 meaningful durable change 时不创建 PR；真实失败保持 GitHub Actions 红灯。

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
- Daily Schedule：**ACTIVE — FIRST NATURAL RUN COMPLETED; EFFECTIVENESS NOT VERIFIED**
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
| **Implemented** | Event → Edition → Category、Source Registry、已登记来源 Fetch、Identity / Evidence Validation、Diff / Risk、Pending-before-State durability、Data-only PR、Open PR Guard、Public Remote Read、每日 Workflow。 |
| **Production Verified** | 人工 Workflow 的 Git 审核闭环；首次自然 schedule 执行成功；PR #6 Pending 审核与 Ingestion State 合并。 |
| **Not Yet Verified** | 12 场关键字段的近期核验覆盖、已知重要变化的发现率、官方来源失败时的复核有效性、人工维护成本下降；不能据来源 Hash 或 Workflow PASS 推定这些结果。 |
| **Planned — P0 Phase 1** | Monitoring Continuity、Verification Alerts、Pending / State Safe Handling 的持续有效监测；尚无 Verification Alert 正式存储模型，不得写成已交付。 |

当前主要缺口：新公告自动发现不足、报名状态生命周期复核不足、关键字段核验健康度不足、官方抓取失败时预警不足、Open Data PR Guard 阻断整轮日常检查，以及执行状态与事实质量在报告中易被混淆。修复必须保留 Evidence 标准、重复运行幂等和安全写入边界。具体目标与验收见 [自动维护标准 V1](../project/RACE_DATA_AUTOMATION_STANDARD_V1.md)。

## 13. Deferred

- Web Search Provider
- Database
- CMS / approval UI
- OCR
- 105 / 1500 场规模化
- Future100 与完整存量迁移
- Web full migration to Race Graph

生产链路已完成“抓取 → 抽取 → Pending / data-only PR → Human Review → Human Merge”的真实闭环。每日 cron 与 Manual Workflow 共用同一安全路径，不负责部署，也不能自动修改 Canonical。首次自然 `schedule` 已发生；下一步不是重复证明任务可执行，而是验证监测连续性、关键事实核验与已知变化的发现能力。未有充分生产证据和独立 Human Review 前，不得开启 Canonical auto apply。

## 14. Next Phase

**FIRST NATURAL RUN COMPLETED / CRITICAL FACT MAINTENANCE NEEDS P0 IMPROVEMENT**

数据架构继续冻结。微信小程序已上线，创业主线是用户、获客与商业验证；自动数据维护有效性修复是独立 P0 可信度工作。Phase 1 仅处理监测连续性、Verification Alerts 与 Pending / State 安全闭环，不为尚未验证的规模化需求预建 Database、CMS、GraphQL、Queue、Worker 或第二套客户端 Schema。
