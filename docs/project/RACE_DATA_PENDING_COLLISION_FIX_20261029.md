# Pending changeId Collision P0 修复交接 · 2026-10-29

状态：**2026-11-02 生产连续性修复 P0 验收 PASS**。仅结项工程运行、changeId collision 故障及历史数据连续性；来源覆盖、事实准确性和规模化维护成本尚未验收。

原交接在 2026-10-29 的状态为“代码修复待 Human Review；生产 P0 尚未关闭”。下列故障、隔离重放、工程验证和原验收计划保留原貌；最新生产证据与质量诊断见本文末尾。

## 基线与范围

- main：`b4624c666166e3951e01ba95de609a64b5ebc22e`。
- 修复分支：`codex/pending-changeid-collision-20261029`，独立临时 Worktree。
- [现有 Data PR #46](https://github.com/zlwison-maker/RaceNext/pull/46) 只读基线：`2b46abd99eca1836c47090ed94c72ba377106371`。
- main Pending 36 条；PR #46 Pending 43 条（21 pending / 14 rejected / 8 applied），State 82 个来源记录。
- 本 PR 仅修改 Durable Pending 身份比较、相关测试及本交接；不包含任何 `data/`、Workflow、UI 或配置修改。
- Auto Apply OFF；不派发 Workflow、不 Merge、不部署、不审批事实、不改写 PR #46。

## 真实故障与根因

已读取 GitHub job logs，以下五次运行都在 `mergeDurablePendingChanges()` 抛出相同错误：

| 日期 | Run | 结果 |
| --- | --- | --- |
| 10-23 | [39903671132](https://github.com/zlwison-maker/RaceNext/actions/runs/39903671132) | 相同 changeId collision |
| 10-24 | [40063798624](https://github.com/zlwison-maker/RaceNext/actions/runs/40063798624) | 相同 changeId collision |
| 10-25 | [40163741564](https://github.com/zlwison-maker/RaceNext/actions/runs/40163741564) | 相同 changeId collision |
| 10-27 | [40454462833](https://github.com/zlwison-maker/RaceNext/actions/runs/40454462833) | 相同 changeId collision |
| 10-28 | [40640847907](https://github.com/zlwison-maker/RaceNext/actions/runs/40640847907) | 相同 changeId collision |

冲突记录：`chg-9834639d42eb109c8315f709`。

- Event / Edition：`hengqin-marathon` / `hengqin-marathon-2026`。
- Category：null；实体：Edition；字段：`registrationOpenDate`。
- Current：`2026-08-18T10:00:00+08:00`。
- Options：`2026-08-18T10:00:00+08:00`、`2026-09-21T10:00:00+08:00`。
- 来源分别为 `hengqin-marathon-official-2026::announcement:7549c4f386ca39f947307b61` 与 `hengqin-marathon-result-2026`。
- [报名公告](https://www.hengqinmarathon.com/news_detail-280.html) 的原证据为“从8月18日10:00报名启动”；[抽签/缴费公告](https://www.hengqinmarathon.com/news_detail-285.html) 的原证据为“今日（9月21日）10:00起 抽签结果查询与缴费通道同步开放”。
- 原记录 `pending / conflict=true / applyBlocked=true`；这项候选语义冲突仍需人工判断，本次没有选定任一事实、改变来源权威性或放宽 Validation。

### 身份比较不一致

[realExtraction.ts](../../scripts/race-update/realExtraction.ts) 中：

1. `createConflictChangeId()` 仅用 Event / Edition / Category / Entity / Field 和 option 的 value / sourceIds 生成 ID，不包含抓取元数据。
2. 旧 `durableIdentity()` 却比较整个 `candidateOptions`，包括每条 Evidence 的 fetchedAt、contentHash、locator、confidence，同时比较主来源 contentHash。
3. 相同 option/source scope 再次提取仍生成原 ID，只要抓取元数据变化，就触发误报；`findEquivalentPendingChange()` 原来排除所有 conflict，无法处理这条合法重复路径。

已用 PR #46 原记录复现：**只改变 `candidateOptions[0].evidence[0].fetchedAt`，旧代码就抛出上述原始错误**。修复后这项变动、Hash/locator/confidence 变动与完整提取重放均可幂等处理。

证据限制：10-28 失败 Artifact 只有 Discovery report/ledger，没有当次 Incoming Pending 或完整模型响应。因此不能声称恢复了该失败请求的逐字 payload。这里的精确差异来自可重现的单变量回归与原记录；真实日志确认的是同一记录、同一故障路径。10-22 成功 Artifact 提供原始冲突候选的来源与提取证据。

### 为什么 10-26 成功不代表故障已消失

[Run 40271959530](https://github.com/zlwison-maker/RaceNext/actions/runs/40271959530) 的正式 Artifact 显示：上述两个来源都 fetch success，但 `extractionStatus=extraction_error`、`providerErrorCode=network_error`、`rawCandidateCount=0`。未重建这组冲突，因而没有触发合并缺陷。

两来源的 observed Hash 已分别变为 `4b2ce1acd3dc6ce2b3fffbc4dbc9d25699438682f4ec99a777e2ca79afd9571e`（报名公告）及 `03f5ed5bd6afa13f309f4915489c9f9348254282d231e7caa6bbfacfb652b7c6`（抽签公告），区别于 10-22 的 `c3f36ea2…` / `f83e8761…`。这属于真实抓取状态变化，不是新的事实审批。本轮不改变抓取或模型重试策略。

10-26 总体 checked=67、failed=50、model calls=19、new Pending=0；Workflow success 不能代替事实准确性或连续有效处理验收。10-27、28 已恢复 PR #46 最新 head 后仍复发。

## 最小修复与保护

- 保持两种 changeId 生成算法原样，不迁移或重建旧 ID。
- Conflict 身份仅比较实质 option value / source scope，排除抓取元数据；保留主来源身份，并补充 Event、Entity、currentValue、conflict 类型比较，阻止同 ID 的目标、旧值或候选集合错配。
- 普通非 conflict 候选继续绑定原 contentHash/value；不同实质值不做等价合并。
- Pending 状态下，仅按原有“sourceId + 规范化证据文字”规则追加新实质 Evidence，保留全部旧证据；同时将新证据附着到对应 option。相同文字的重复抓取沿用原有去重规则，不用新抓取覆盖旧证据。
- 修复同批新增记录的 byId 引用：Map 指向 Store 内克隆，避免后续证据合并修改调用者对象或丢失追加证据。
- 已审核记录原样保留。相同 ID 携带新实质证据时，明确报 `reviewed_evidence_changed` 并停止，由人工处理；不静默忽略，也不改写审核状态或新增自动审批。
- 真正目标/旧值/候选值/来源作用域不一致仍抛错；`PendingChangeCollisionError` 的 message 包含 JSON 诊断（code、reason、changeId、双方 Edition/Category/Field/source scope 与身份摘要），可从失败日志追踪，不输出 URL、凭据、原始证据或候选值。
- 合并仍发生于文件持久化之前。保留 `Pending Write → Pending Reload/Verify → State Write`，不承诺跨文件事务原子性。

## 回归证据

[测试](../../tests/raceUpdateContinuity.test.ts) 与 [最小真实记录 Fixture](../../tests/fixtures/hengqinPendingCollision.ts) 覆盖：完全重复、抓取元数据变化、新证据、不同候选事实、九类实质身份错配、所有已审核状态、同批多次重试、普通候选 hash/value 保护，以及实际 prepare/finish CLI 的本地单一开放 Data PR 两轮延续。

旧连续性测试主要合并普通候选和原样重复对象，没有“真实 conflict 再提取、嵌套 Evidence 元数据改变”的场景，因此未触发本次缺陷。

### PR #46 完整快照隔离重放

实际输入固定为 PR #46 上述 head 的完整 Pending/State（不是用 main 的 36 条替代）：

- Pending SHA-256：`88f9726b4a5847dba057e0125ddc5ac59e7648402938ff532c2f793601e11b36`。
- State SHA-256：`87312d3a1275be521a22bbdcd0447d3adda6608fc669add9acd29c64eb0cb562`。
- 使用当前 main Canonical/Registry，只在内存复用官方身份补入运行时派生公告来源。
- 页面文字由上述 Durable Evidence 重建；Provider 为确定性测试输出，无网络、付费模型或生产写入。此项验证合并/持久化路径，不代替网页事实准确性验收。
- 重放时钟显式设为两天，仅为测试输入，不冒充真实审核或生产运行时间。

| 隔离重放 | Pending 前→后 | 新增 / 重复 ID | 提取 | State |
| --- | --- | --- | --- | --- |
| Round 1（测试时钟 10-29） | 43 → 43 | 0 / 0 | 2 个匹配来源，各 1 个 accepted candidate；2 次 mock 调用 | Pending 回读成功后，两目标来源 success |
| Round 2（测试时钟 10-30） | 43 → 43 | 0 / 0 | 强制再提取，结果仍幂等；2 次 mock 调用 | 继承前轮 State，Pending 回读后成功保存 |
| 随后普通重跑 | 43 → 43 | 0 / 0 | 两来源 unchanged；0 次模型调用 | 未重复提取 |

两轮所有 43 条记录逐项 deepEqual，包括 14 rejected / 8 applied 的审核历史、21 pending 的状态、全部旧 Evidence。除两个目标来源外，State 其余记录逐项不变。每轮另注入 Pending 写入失败，证明 State 文件字节不变；真正 collision 的提取失败也证明临时 Pending/State 零写入。Canonical / Registry 均不变，auto_apply change 为 0。

本机隔离证据目录：`/private/tmp/racenext-pending-collision-evidence-20261029/`，包含只读日志、原 Artifact、固定快照、`replay.mts`、`isolated-replay/summary.json` 与两份重放 Artifact。该目录不提交，临时文件并非长期生产证据存储。

## 工程验证

| 命令 | 结果 |
| --- | --- |
| `node --test --experimental-strip-types tests/raceUpdateContinuity.test.ts tests/raceUpdatePhase3.test.ts tests/realExtractionArtifact.test.ts` | PASS，60 / 60 |
| `npm test` | PASS，453 / 453；无跳过 |
| `npm run typecheck` | PASS |
| `npm run typecheck:miniprogram` | PASS |
| `npm run lint` | PASS |
| `npm run build` | 环境阻断：Turbopack CSS worker 绑定临时端口被拒绝，`Operation not permitted`；授权外部执行后仍复现 |
| `npm run build -- --webpack` | PASS，同一项目现有 Next.js 构建器，无配置变更 |
| `git diff --check` | PASS |

既有 Data-only、Secret Scan、Public Fact/API、安全持久化和 PR 连续性回归由完整测试覆盖。本 PR 是 Code PR，不能将其代码差异冒称为通过生产 Data-only Allowlist。初次受限环境下模拟服务也曾遇到本机端口 EPERM；允许本机隔离服务后，正式记录的定向与全量测试均通过。

## 合并后生产验收计划（本轮不执行）

1. Human Review 通过代码 PR 后再 Merge；确认最新 main、PR #46 head、历史审核状态及无竞争性 queued/in_progress Run。若其他人更新数据，以最新基线重新核对，禁止覆盖。
2. 优先等现有每日 Workflow；如确需手动执行，先独立请求 Human 授权，评估仅写 Pending/State、模型费用、单一 Data PR 延续与 Auto Apply OFF，不在本轮 dispatch/retry。
3. 确认 prepare 从同一安全 Data PR 恢复完整 Pending/State，不关闭、重建或强推 #46；两个真实生产周期均须有效完成，而非因相关来源全失败绕开路径。
4. 逐来源检查上述横琴公告的 fetch、identity、extraction、Hash、候选与 Pending ID。相同 conflict 可复用原 ID；新实质证据须保留；不同 option/source scope 不得混并。真实语义冲突继续人工处理。
5. 每轮核对历史 Change ID、reviewedAt/appliedAt/status/Evidence；新增记录只来自实际候选，无重复。Pending 持久回读后才提交成功 State，不得只看 Workflow 绿色。
6. 两轮均确认 Canonical/Registry 不变、Auto Apply OFF、Data-only/Secret Scan/完整测试 PASS、单一 Data PR 连续延续，异常日志可追踪且无敏感信息。
7. 对新的安全 collision 或模型/来源失败停止并保留证据，不自动反复重跑、不关闭 Guard。记录默认构建器在 CI 的真实结果；本机构建环境限制不得冒充默认构建 PASS。
8. 只有两轮真实有效运行及 Pending/State 安全验收完成后，才记录 Production Closeout；本地 Replay PASS 和 Draft PR 均不足以关闭本 P0。

## 2026-11-02 生产连续性 P0 结项与质量诊断

### 验收结论与范围

Human 已确认生产 Review PASS。本轮独立读取四轮 GitHub Run 元数据、完整 job log、每轮 `race-update-report-<Run ID>` Artifact 内的五份报告，以及 PR #46 的逐轮 Git 提交，结论一致：**原定两轮有效自然监测与历史数据保护条件已由四轮满足，生产连续性修复 P0 正式验收 PASS**。不是来源质量、事实准确性或 Phase 2–3 成本门槛 PASS。

本次文档基线 main：`7f554f574a23e5c88eefd71dcbdf7f2015b36c01`；PR #47 修复 Merge：`43ebb8b29fd32693f1852636c0d9675c1e186bb8`，是四轮运行代码的祖先。以下日期为北京时间，四轮均 `event=schedule`、首个 attempt、completed/success；没有将手动重跑或本地 Fixture 计入生产轮数。

| 自然运行 | 官方有效处理 / 其中本轮新提取成功 | Pending 前→后 | PR #46 本轮结束 Head | 完整测试 |
| --- | ---: | ---: | --- | ---: |
| 10-29 [40826744392](https://github.com/zlwison-maker/RaceNext/actions/runs/40826744392) | 24 / 9 | 43 → 44 | `b274f683913f66d9956f8576e4c0d113c04263fb` | 453 / 453 |
| 10-30 [41011738585](https://github.com/zlwison-maker/RaceNext/actions/runs/41011738585) | 23 / 10 | 44 → 44 | `8340a81051bb9ee44c7545f1d8a026a1710824f5` | 459 / 459 |
| 10-31 [41174621572](https://github.com/zlwison-maker/RaceNext/actions/runs/41174621572) | 23 / 4 | 44 → 45 | `7e9287566acbd5db596828e118b08f266588dc70` | 459 / 459 |
| 11-01 [41280854109](https://github.com/zlwison-maker/RaceNext/actions/runs/41280854109) | 23 / 8 | 45 → 45 | `251a9c2ba3178d2b2c83a71c99ebfe64de260ef8` | 459 / 459 |

“有效处理”包含成功提取及安全 unchanged，不等于全部新调用。四轮都有本轮新提取成功的官方来源，非空跑。横琴 `news_detail-280.html` / `news_detail-285.html` 在 10-29、10-30 均为 fetch success、identity matched、extraction success，复用了旧冲突 ID，未再触发中断。后两轮 280 公告因 `ARTICLE_EDITION_APPLICABILITY_UNCLEAR` 留在异常复核，未进入提取；285 继续成功。不能宣称两篇公告四轮都成功，也不能把语义争议消失当作 collision 修复的效果。

- PR #46 保持单一 Open Data PR；截至核对时 Head 为 `251a9c2ba3178d2b2c83a71c99ebfe64de260ef8`，相对 main 仅含 Pending / State。手工合并 PR #48/#50 后的普通 merge 迁移与定时运行提交分开辨认，没有计作生产运行或自动 Canonical 更新。
- 逐轮检查所有旧 Change ID、status、reviewedAt、appliedAt、Evidence 和 candidateOptions：旧记录全部 deepEqual，无重复 ID。以 10-29 结束的 44 条为基线，最终 45 条中的原 44 条完全未变；最新为 23 pending / 14 rejected / 8 applied。
- State 82 个 `(editionId, sourceId)` 身份逐轮完整保留，检查/成功提取元数据正常推进；不把“记录保留”误写为整个 State 文件字节不变。
- 每轮 `canonicalWrites=0`、`lowRiskCanonicalUpdates=[]`、所有 source `canonicalWritten=false`、`autoApplyLowRisk=false`；bot 提交逐一只改 Pending / State，Canonical / Registry 与各自本轮基线字节一致。跨日 Canonical 的人工 CP 发布不能误算为自动写入。
- 四轮 Data-only、Secret Scan、165 项定向测试、完整测试、48 项 Public Fact Gate、TypeScript 和 `CONTINUITY_RESULT=DATA_PR_UPDATED` 均 PASS。沿用 Pending 写入→回读校验→State 写入安全边界，不宣称跨文件事务原子性。
- `phase3-real-extraction.json` 内 `dryRun:true` 是提取阶段不直接写 Canonical 的合同；外层生产持久化由 `localPersistenceCompleted=true`、finish 日志与真实 bot 提交共同证明，不能据此误判空跑。
- 10-30→10-31→11-01 日志均明确恢复上一成功 Run 的 Discovery、Operations、Evidence Artifact；安全继承字段分别为 14 / 24 / 19。本轮还逐项核对继承来源的同 Hash、URL、身份、skipped 请求及直接字段证据。字段 Artifact 跨运行恢复现已获得真实生产证据，不再沿用 10-15 的“尚未验证”结论。
- 最终 Pending SHA-256：`b34fcb00b436decd91d15e6c83b98d851256b28b421233a5b7aae9c2c656ad3c`；State SHA-256：`a93c3843463500b5ee298899c250735470838e7c2d965b923883aaa621ace2f5`。

四轮 Workflow 没有 Build Step，本次不宣称 CI 默认构建或自动部署已通过。手工 CP 发布及真机 QA 是独立验收，不替代自动部署验收。Artifact retention 仍为 30 天；本机诊断下载在 `/private/tmp/racenext-p0-closeout-20261102/`，不是永久生产证据库。

### 数据质量实测

| Run 日期 | Healthy / 监测 | 来源 checked / failed | 新核验 / 安全继承 / 总检查项 | Alerts（HIGH / REVIEW） | 模型调用 | 新增 / 去重 Pending |
| --- | --- | --- | --- | --- | ---: | --- |
| 10-29 | 4 / 15 | 66 / 40 | 9 / 17 / 294 | 15（5 / 10） | 18 | 1 / 5 |
| 10-30 | 3 / 15 | 65 / 39 | 12 / 14 / 294 | 17（6 / 11） | 16 | 0 / 5 |
| 10-31 | 4 / 15 | 66 / 41 | 11 / 24 / 294 | 15（5 / 10） | 13 | 1 / 2 |
| 11-01 | 3 / 15 | 66 / 40 | 8 / 19 / 294 | 16（6 / 10） | 15 | 0 / 5 |

**已有直接证据：**

1. 19 场公开历史 Edition 中，北京、西安、成都、贡嘎因已结束退出日常事实监测，15 场分母正确；保留历史页面与数据。Discovery 的 19 场 Ledger 扫描口径不能混为事实监测分母。
2. [dailyCheck.ts](../../scripts/race-update/dailyCheck.ts) 的 HEALTHY 要求有有效官方来源且所有本轮来源均成功/unchanged；有一个失败就可能 PARTIAL。11-01 为 3 HEALTHY / 9 PARTIAL / 3 FAILED；宁海 3 个官方 JSON 有效但其他来源失败，仍为 PARTIAL。广州马、重庆马、广州100来源数量较少且大多处理成功，常为 HEALTHY；绍兴在 11-01 两来源均抓取失败而转 FAILED。HEALTHY 不是字段准确率，也不能靠删除失败来源抬高指标。
3. 每轮 294 个关键字段检查中，46 个 Canonical 值缺失/unknown，213–222 个本轮未验证；新核验+安全继承仅 26–35 项，占 8.8%–11.9%。11-01 为 27/294。CoursePoint 不在该检查合同中；“本轮未验证”不等于已获 Human Review 的 Canonical/CP 错误。
4. 四轮 263 次来源处理有 160 次失败/无效；原因分解见下表。每日约 40 不能全部称为抓取失败。

| 环节 / 四轮累计次数 | 实际原因 | 可修复性与边界 |
| --- | --- | --- |
| fetch / 82 | HK100 十个来源每轮 HTTP 403，累计 40；HTTP 567 为 4、受限响应正文为 4；通用 fetch failed 为 17、明确超时为 1；404 为 4；JPEG 为 8；超体积为 4 | 403/567/受限页是当前访问限制，不绕过防护；JPEG/体积是当前文本链路能力边界，优先可读官方文字替代。本轮不做 OCR 或扩限。AIMS 404 可核对 URL；通用 fetch failed 尚不能区分 DNS/TLS/网络/站方问题，不能保证可修复。 |
| identity / 41 | 28 次 year missing 导致 uncertain；13 次别名/届次不匹配；包括缺年官网/图库和共享报名平台 | 优先核对当届文章/规程与确切 URL。域名可信不能代替当届、组别身份；真正缺失或冲突仍 HOLD，不放宽 Identity Gate。 |
| validation / 36 | 每轮 8–10 个来源全部候选未过确定性校验：组别作用域、原文引用、标称/实际距离、报名阶段、日期精度等 | 是字段提取/内容适用性问题，部分是模型错误，部分是正文不支持目标字段；保留严格拒绝，不将其一概称为网页不可访问。每轮已有 4 个同 Hash 的确定性失败请求被安全跳过，不能假称此前没有缓存。 |
| provider / 1 | 10-30 广州100 `network_error` | 单次 Provider 网络错误；需小样本复测，不能据此归因全部来源失败或扩大重试。 |

5. 四轮模型共 62 次报告调用、230,792 Tokens；428 个本轮候选接受 81、拒绝 347（约 81.1%）。接受不等于新增正确事实。账单、实际重试计费、Human 分钟数和漏报真值集缺失，不能计算货币节省或规模化效率。
6. 累计 63 次 Alert 呈现中 57 次为重复；6 次新增/重现涉及 5 个唯一 ID，横琴生命周期 Alert 有消失后重现。Operations 去重已工作，不能把 15–17 个存量 Alert 都算每天新增人工任务。11-01 仍有 39 个来源/证据异常；它们不是 39 条 Fact Pending，也不全是重新申请 Source Approval。

### 新 Pending 的价值与 Human 优先级

- 10-29 绍兴半马终点 `chg-41fb6f93698d6bcc41f7c00e`：官方报名须知支持终点定位，但旧值“奥体中心东南侧（解放大道与洋江西路交叉口）”与候选“奥体中心东南侧(终点，设在解放大道与洋江西路交叉口)”指向相同位置。**合理判断为措辞差异，尚未证明真实地点发生变化**，不因 high_impact 标签就算高价值变化。
- 10-31 横琴 `chg-32e3e80855ca07581756ad66`：将报名开始从 8-18 改为 9-21，唯一直接 Evidence 是“今日（9月21日）10:00起 抽签结果查询与缴费通道同步开放”。**证据不支持 registrationOpenDate，属于阶段语义误映射，应优先交 Human 拒绝/处理**。当前 `risk=low / conflict=false / applyBlocked=false`，但 Auto Apply OFF 阻止其自动落地；旧冲突 `chg-9834639d42eb109c8315f709` 仍原样 pending/blocked，不能因没有 collision 就视为争议已解决。本轮不更改任何审核状态。
- 因而四轮有两条新记录，但尚不能举证一个高价值的真实赛事事实变化；“44→45”也不能用作数据质量提高的证明。发现有用的来源退化/证据风险，与发现正确的新赛事事实，应分开验收。
- Human 应优先核对临近比赛的绍兴、柴古、宁海的日期/发枪与起终点证据，以及厦门报名状态越过截止边界、官方来源全部无效等高影响风险。11-01 的六个 HIGH 是福州、HK100、绍兴、深圳马、厦门的官方有效来源缺失及厦门生命周期复核；不能仅按 HIGH 数量判断事实已错。
- 23 条待审中另有厦门同组起点相同候选值的三个不同 ID；这是同义待审负担，不是重复 Change ID。贡嘎两条历史报名链接可按既有生命周期规则由 Human 低优先级关闭/拒绝；宁海标称距离、CNH-60 多波次起跑及 ITRA 爬升精度争议继续独立审核，不从实际路线距离推翻 100/60/25。均不在本轮处理。

### 前三瓶颈与下一步最小验证建议（本轮不实施）

1. **来源可访问性与当届作用域覆盖**：fetch+identity 占失败 123/160；仅 HK100 403 就占 40/160。建议先选临近比赛或高权重来源做一组有界只读复测，核对失效 URL、官方文字替代、当届文章；遇访问防护或无直接证据明确保留限制。预期提高有效覆盖，成本低至中（估计，需先验证）；建议样本 5–8 个来源、连续三轮有效处理率目标 ≥80%，同时错误届次接入为 0，不能通过移除失败项改分母。
2. **字段语义及同义 Diff**：347 个拒绝仍挡不住横琴阶段误映射，绍兴措辞变化又产生高影响待审。建议用这两个真实反例和现有冻结距离/波次反例，做小规模离线人工标注回放；不需新系统。预期减少误报与无价值 Pending，成本低；验收目标为已标注错误报名阶段接受数=0、同义地点新 Pending=0，真实高影响差异仍保留 Human Review，旧 ID/审核历史零改写。这里是下一轮验证目标，不是已实现能力。
3. **可复用证据覆盖与重复处理成本**：跨运行恢复已通过，但有效核验仅约一成。横琴结果公告四轮 Hash 均不同，而关键报名误映射的引用相同，持续购买提取；**正文是否真的未变、是否模板/动态内容造成 Hash 波动，目前无法确定**，Artifact 未保留足够完整逐字正文来归因。建议只读对照正文/快照 Hash 与证据，再用既有合同验证稳定正文复用。成本低至中；目标为稳定、已验证样本重复模型调用=0，字段/身份/规则/生命周期变化时错误继承=0，并记录每次有效变化的调用、Tokens、Human 分钟数，才评估收益。不得只调高 Verified 数或拿成功 Hash 替代直接证据。

以上是诊断和待 Human 决策的验证建议。没有实现、派发生产运行、修改 Workflow/数据/Registry、合并/关闭 PR #46、开启 Auto Apply 或执行部署。本次 Docs-only 提交仅做链接、数字、范围和 whitespace 检查，不声称重新运行业务测试。
