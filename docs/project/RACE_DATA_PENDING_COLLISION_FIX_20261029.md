# Pending changeId Collision P0 修复交接 · 2026-10-29

状态：代码修复待 Human Review；**生产 P0 尚未关闭**。

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
