# RaceNext 赛事数据自动维护目标与验收标准 V1

## 1. Purpose & Mission

准确、及时、可追溯的赛事核心事实是跑者信任 RaceNext 的基础。自动维护的长期目标，是在严格的数据可信度约束下，持续降低单位赛事的维护成本：让常规发现、获取、核验和安全更新尽可能自动完成，让人工主要处理证据不足、冲突和高影响异常。赛事从 12 场扩展至 50–100 场时，人工维护量不应与赛事数量同比增长。

**DATA ACCURACY 与 MAINTENANCE AUTOMATION 必须同时成立。**任务执行成功不等于事实准确；网页未变化不等于 Canonical 仍正确；抓取成功不等于字段已核验；AI 产生 Candidate 不等于可入库。

本文冻结长期目标与验收标准，不宣布规划中的能力已经上线。当前实现与真实运行状态以 [RaceNext Data Foundation V1](../data/RACENEXT_DATA_FOUNDATION_V1.md) 为准；模型与架构以 [RaceNext 数据系统 V1](RACENEXT_DATA_SYSTEM_V1.md) 为准；维护成本约束参见 [RaceNext 数据与内容维护成本原则 V1](DATA_CONTENT_MAINTENANCE_PRINCIPLES_V1.md)。

## 2. Scope

适用于现有 Canonical Event → Edition → Category 所支持的核心事实及其结构变化：

- Edition：`raceDate`、`endDate`、`registrationStatus`、`registrationOpenDate`、`registrationCloseDate`、`registrationUrl`。
- Category：`startAt`、`startTimes`、`startLocation`、`finishLocation`、`distanceKm`、`elevationGain`、`elevationLoss`、`cutoffTimeHours`。
- Event / Edition / Category 身份，以及组别新增、取消或调整等结构变化。

本标准不新增字段或 Schema，也不把内容、住宿、图片、CP、Strategy 的维护纳入本轮自动更新范围。

## 3. Core Principles

1. **Accuracy First**：宁可保留 `unknown` / `null` 并发出复核信号，也不伪造事实。
2. **Evidence First**：每项拟更新事实都要有可追溯来源、直接证据和字段级验证。
3. **Edition Identity First**：Event、Edition、Category 及证据作用域必须一致；不沿用往届事实推断当届。
4. **No Unsupported Inference**：不得用时间经过、相近数值、网页摘要或模型自由推理填补缺失值。
5. **Automation with Risk Control**：自动化边界由事实影响、证据充分性、来源可信度和实测误判表现共同决定。
6. **Human Review by Exception**：人工优先处理系统不能可靠确认的异常，而不是逐场重复常规录入；当前生产仍要求所有事实候选人工审核。
7. **Maintenance Cost Efficiency**：持续衡量每场赛事的有效维护成本，不以新增监测量代替质量成果。

## 4. System Capability Model

`CURRENT` 表示代码及生产链路已具备；`PARTIAL` 表示已有局部能力但不能支撑完整目标；`PLANNED` 表示尚未交付。运行成功与能力有效性仍需分别验证。

| 能力 | 当前状态 | 边界与目标 |
| --- | --- | --- |
| A. Source Discovery | **PARTIAL** | 已登记 Source Registry 的监测已实现；官方域名内寻找与来源审批是治理路径，尚不能当作每日自动发现新公告的已验证能力。全网 Web Search 尚未实现。 |
| B. Source Fetch & Identity | **PARTIAL** | 已有官方 HTML / 文本 PDF 抓取及身份校验；来源失败、跨域报名链接和届次不确定性仍会导致覆盖缺口。 |
| C. Fact Extraction & Verification | **PARTIAL** | AI 提取、Evidence / Identity Validation 已实现；成功抽取 Hash 不代表字段级近期核验，部分事实仍可能漏检。 |
| D. Change / Freshness Detection | **PARTIAL** | 已有 Diff、Hash、Pending 与 Phase 1B Verification Alert；可提示生命周期及关键字段核验缺口，但直接官方字段核验覆盖和变化发现效果尚未达标。 |
| E. Risk Decision & Update | **CURRENT（人工闭环）** | 风险分类、Pending、Data-only PR、Human Review / Merge 已运行；生产 `Auto Apply = OFF`，自动事实写入不在当前能力内。 |
| F. Monitoring / Exception Handling | **PARTIAL；Phase 1A / 1B 已验收** | 每日 schedule、单一开放 Data PR 的连续监测、Pending / State 安全延续和 Verification Alert 已通过生产验收；来源有效处理率、字段直接核验覆盖及定时启动延迟仍是限制。 |

## 5. Fact Candidate vs Verification Alert

| | Fact Candidate | Verification Alert |
| --- | --- | --- |
| 含义 | 可信来源提供具体、直接的事实证据，可提出明确字段新值。 | 现有事实可能过时、冲突或长期无法有效核验，但尚无足够证据提出可靠新值。 |
| 必要条件 | 来源、Event / Edition / Category 身份、字段作用域、Evidence、Validation、Diff 与 Risk Policy 均成立。 | 有明确复核触发条件及受影响字段、来源或 Edition；不要求也不允许猜测替代值。 |
| 输出 | 按当前生产策略进入 Pending / Human Review；不直接写 Canonical。 | 仅触发可见复核和后续取证；不生成推测 Candidate，不修改 Canonical。 |

报名截止或抽签公布时间已过、比赛临近而证据陈旧、官方页面连续失败、全部关键官方来源失败、新公告身份待确认或官方来源互相冲突，都可能触发 Verification Alert。时间阈值不能自动推断新报名状态。**Phase 1B 已在运行报告中输出 Verification Alert，未建立独立 Alert Store；Alert 不是 Fact Candidate，也不会自动写入 Canonical。**仅本轮值匹配不能证明关键节点后的状态已经得到确认，`fetchedAt` 不能代替公告发布时间或事实适用时间。

## 6. Source Governance

官方来源优先，可信平台辅助交叉核对。新增官方公告、官方报名平台或跨域链接首先是 **Source Candidate**；只有来源身份、目标 Edition、作用域及权威性经验证和批准后，才进入 Source Registry。搜索结果与摘要只帮助发现来源，不是 Official Fact。

官方页面链接第三方报名平台，不自动使该平台全部内容或通用报名入口具有当届官方事实权威性。原始 URL、Evidence、来源层级和审核决定必须可追溯；冲突未解决时不能自动择一。

## 7. Data Freshness

必须分别理解 `fetchedAt`（文档抓取）、`lastCheckedAt`（来源检查）、`lastSuccessfulExtractionAt`（来源成功抽取）、`lastUpdatedAt`（正式事实更新）与 `verifiedAt`（相应事实经有效核验）。这些时间不能互相代替。现有来源级 Ingestion State 不构成完整的字段级 `verifiedAt` 记录。

来源层 Hash 未变化，也可能因报名生命周期、抽签节点或比赛临近而需要复核 Canonical。监测报告应区分“已抓取”“已有效处理”“关键字段近期核验”；无法确认字段时标明缺口，不把 checked 写成 verified。

## 8. Monitoring Continuity

**Phase 1A 已实现并通过生产验收。**已有 Pending PR 不再使后续整轮监测直接跳过；运行在受控条件下延续同一个 Data PR。安全边界仍须同时保证：每日检查持续、Pending 持久、Ingestion State 可恢复、重复运行幂等、无竞争性 Data PR、写入冲突安全停止。无法安全持久化时，至少保留可见报告与异常，不能假称该轮事实已核验。

Open PR 安全检查的价值仍是避免状态丢失、重复 Pending 与 PR 冲突；Phase 1A 在保留这些边界的条件下解决了整轮跳过问题。既有 Pending-before-State durability 仍是不可退让的约束。连续两轮运行的验收记录见 [Data Foundation V1](../data/RACENEXT_DATA_FOUNDATION_V1.md#15-phase-1-closeout--handoff)。

## 9. Metrics

三项主指标必须分开报告：

1. **Pipeline Execution Success**：任务是否按预期完成或安全失败。现有 Actions 状态和运行报告可衡量执行层，不代表数据质量。
2. **Critical Fact Verification Coverage**：关键 Edition / Category 字段在规定时间窗口内，是否有匹配身份、有效来源和足够证据的近期核验。Phase 1B 已输出字段级本轮核验状态；单轮结果仍不足以证明长期覆盖或事实准确性。
3. **Fact Change Detection Effectiveness**：已知重要变化是否被发现为可信 Candidate，或在无新值时触发明确 Verification Alert。Phase 1B 已有历史案例回归；真实生产变化发现率仍需人工对照建立基线，不能凭运行成功率推算。

长期还应测量关键变化发现率、自动确认准确率、字段新鲜度、误报与漏报、人工介入率、人工审核分钟数、来源维护成本、模型调用与运行成本。现有执行日志和部分调用次数可提供成本/覆盖输入；字段级准确率与人工时间尚无可信生产基线，不得编造。指标必须同时记录分子、分母、时间窗和证据口径。

## 10. Roadmap & Acceptance Gates

以下目标与 Gate 保持冻结；Phase 1 已验收，Phase 2 / 3 尚未启动。不改变当前 Schema、字段风险规则或 `Auto Apply = OFF`。

### Phase 1｜监测连续性与关键异常可见（P0）

- **Goal**：开放 Data PR 期间仍能有效检查关键事实，异常可见且 Pending / State 安全闭环。
- **Scope**：Monitoring Continuity、Verification Alert 行为、Pending / State 安全持久化与报告口径。
- **Out of Scope**：推测事实、放宽 Evidence、直接取消 Guard、开启 Auto Apply 或建设新数据库/队列。
- **Acceptance Gate**：Open PR 期间连续两轮有效监测；Pending / State 不丢失、不重复产生事实候选；北京马 2026、广州马 2026、HK100 2027 三个历史报名状态漏检案例均触发明确复核信号；官方来源全部失败时不能显示相关关键字段已充分验证；无充分证据时 Canonical 不变；至少一个比赛日期或发枪时间的高影响变化回归测试通过。

### Phase 2｜官方新公告与报名来源发现（P1）

- **Goal**：降低仅监测已登记页面带来的新公告与新入口漏检。
- **Scope**：Source Candidate 发现、官方身份/届次判定、来源审批与发现质量衡量。
- **Out of Scope**：搜索摘要直接生成事实、第三方平台整体升格或自动批准 Registry。
- **Acceptance Gate**：用已知新公告/报名入口案例证明可发现、正确标记身份与作用域；误收录受控，未批准来源不得进入事实更新链路。

### Phase 3｜准确性、自动化与成本的真实运行验证（P1）

- **Goal**：用多轮真实运行证明关键事实质量提高，同时单位赛事人工维护成本下降。
- **Scope**：字段级核验覆盖、变化发现率、误报/漏报、人工分钟数及调用成本的共同评估。
- **Out of Scope**：未达到可信度门槛前扩大 Auto Apply、为规模预建复杂基础设施。
- **Acceptance Gate**：建立可复核的分母与案例集，比较 12 → 50 → 100 场的质量、人工时间和成本趋势；只有来源权威、身份正确、直接证据充分、无冲突、幂等可恢复且实测低误判的安全场景，才可单独评审是否扩大自动更新。

## 11. Scale Principle

赛事规模扩大时，至少按“每场每月人工分钟数”“每次有效变化的人工分钟数”“每场有效核验覆盖”“每场来源维护量”“每场模型/运行成本”和误报、漏报记录观察边际成本。若赛事数增长但核验覆盖下降或人工负担同比增长，不得以运行次数、Source 数或 Candidate 数宣称自动化成功。先复用现有架构并验证瓶颈，再考虑基础设施投入。

## 12. Status

**FROZEN TARGET & GATES / PHASE 1 ACCEPTED / PHASE 2 NOT STARTED**。本文冻结业务目标、事实可信度边界及 Phase 1–3 验收门槛；未启动阶段不是交付声明。Phase 1A / 1B 的实现及生产验收证据见 [Data Foundation V1](../data/RACENEXT_DATA_FOUNDATION_V1.md#15-phase-1-closeout--handoff)。当前生产仍为 **Auto Apply OFF / All Fact Candidates Require Human Review**。Workflow 成功不能替代关键事实准确性或字段级核验覆盖验收。
