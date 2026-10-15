# RaceNext 数据自动维护 P0｜2026-10-14

## 2026-10-15｜Human Review by Exception 最小修复

本次开发基线 `2b3d079709982772365f67c0958caf1168951549`。PR #36、#37 均已合并；下文 2026-10-14 能力表保留开发时记录，不替代本节的新决策。新修复尚未合并或进入正式每日生产运行。

- **官网公告**：复用 active `primary_official`、赛事专属官网的 event_home / notice / regulations / registration_notice 身份；同源 HTTPS 公告实际正文及当届身份匹配后，临时加入本轮来源集合，继续现有字段提取、确定性 Evidence / Scope Validation、Diff / Risk / Pending。不逐页写 Registry。域名/父来源撤销、跨域、政府/跨赛事共享站、登录/API、历史年份、正文不明均阻断。类别及受限宁海 JSON 来源不能借此扩大授权。
- **来源可追溯**：派生 Source ID 绑定父来源与完整 URL；Pending 仍记录实际公告 URL、直接摘录、locator、Hash。后续人工 Apply 继续校验当前父来源权限、URL 身份、Evidence、旧值及 Public Fact Gate，不能绕过审批。网页导航中的“马拉松”不能充当 Marathon Category 证据。
- **异常分流**：Discovery Ledger 保留列表发现原始证据；其 legacy `official_site_unapproved` / `needs_review` 只表示列表阶段尚未完成正文校验，不等于每页需要人工 Source Approval。日常最终摘要使用正文处理决定：processed / needs_review / historical / ended / deferred，正常公告与真正来源/证据异常分开；每 Edition 每轮最多读取 10 篇，超限显式 deferred。无事实不生成 Pending；高影响、冲突、语义差异继续事实复核。所有真实变更仍等待 Human Review，Auto Apply OFF。
- **字段证据继承**：复用现有 `race-real-extraction-artifact-v1`，不增加数据库或新的持久化 Schema。trusted-main 的既有 Artifact 恢复入口同时恢复此前完整提取报告；新报告在持久化前校验并脱敏，仍严格 Pending 写入 → Reload / Verify → State 写入，再保存 Artifact。旧报告缺失时，仅可由已 applied 的 Pending 直接证据安全启动，不能用 pending/approved 状态冒充现有 Canonical 验证。
- **继承条件**：本轮重新抓到相同内容、当前 Event / Edition / Category 身份和字段值一致、当前 Source / 规则仍有效；直接摘录在当前正文中存在，字段值、单位、作用域通过原有校验；保留最初 `evidenceVerifiedAt`，不每日刷新成新核验时间。来源/Canonical 变化、处理规则变化、失败恢复或报名/抽签/临赛/比赛结束等关键边界会要求新提取。失效记录不继承。
- **相反证据与标题**：即使旧证据仍匹配，出现已接受的相反官方字段时也不能继续把当前 Canonical 标记 Verified；保留新事实的 Pending / 高影响审核。实际 article 内标题或正文前最近标题优先于站点横幅，网站当年标识不能覆盖历史公告身份。
- **统计**：`VERIFIED_THIS_RUN` 与 `VERIFIED_INHERITED` 单独列出；未变且没有字段级证据仍为 NOT_VERIFIED_THIS_RUN。历史报告只有成功 Hash / 汇总计数，不能反推遗漏字段。Artifact 保留 30 天且恢复最多检查 10 个已完成 Run；缺失/损坏不会冒充 Verified，需要直接证据重新建立。单一 Data PR、Data-only Allowlist、生产工作流信任来源及高影响 Gate 不变。
- **失败去重**：同 Hash、同 Provider / Model / Prompt / Processing Version 的确定性全拒绝结果，可复用既有 Artifact 保留 validation_error 和取证异常，不重复调用模型；绝不推进成功提取 Hash。内容/协议身份变化或生命周期边界触发重试；网络/Provider 暂时失败不当作可信字段证据缓存。部分接受时也保留尚未解决的拒绝记录，而不重复把它们计为本轮新模型输出。

### 已核验的生产基线与当前真实限制

[Run 38677187476](https://github.com/zlwison-maker/RaceNext/actions/runs/38677187476)：12 Editions / 46 Sources，15 个官方来源有效处理，本轮直接字段核验 2，未核验 174，Unknown 35；28 个来源候选、21 个待审；13 个 Verification Alerts 全部去重。该生产报告没有足够完整的已接受字段摘录，不能把 15 个来源或成功 Hash 批量升级为字段已核验。

本次真实只读验证已确认：三个宁海官方 JSON 当前 Hash 与已 applied Pending 证据匹配，**6 个起终点字段可以安全继承，模型调用 0、新 Pending 0、Canonical 写入 0**。这是一场赛事 / 三个来源的局部验证，不能将它与旧 Run 的 2 项新提取相加冒充新的全量生产覆盖结果。

优先核查的西安 2026 十个候选实际正文均为图片；不能以标题、页脚或模型猜测生成事实。当前缺口是图像正文的直接字段取证，**不是重复来源资格审批**。未新增 OCR/视觉提取框架。最终 [只读 CI Run 38684317022](https://github.com/zlwison-maker/RaceNext/actions/runs/38684317022) 验证：重庆 2 个同源规程/报名须知页面通过正文身份 Gate，2 个查询页为不可读取图片，2 个报名表单的当届适用性不明确而拒绝。16 个西安/重庆样本中为 2 个可进入事实提取、14 个真实证据/适用性异常，不是将全量 21 个待审声称降低到 14。该 Run 同时证明宁海 6 字段安全继承、0 模型调用；[脱敏 Artifact](https://github.com/zlwison-maker/RaceNext/actions/runs/38684317022/artifacts/11948949317) 可复核。初步只读检查曾有 4 个页面通过；最终采用实际文章标题优先于站点横幅的更严格结果，两个表单不再被计入。是否产生有效 Candidate 仍由实际提取与字段校验决定，不为满足数量制造 Pending。仅通过身份 Gate 不计入有效 Fact Candidate 或字段 Verified。

开发本地验收：新增专项 12/12；完整测试 423/423、Web/Mini typecheck、lint、build、diff check PASS。正式四份 Store 与 main 字节相同。真实只读样本中的新提取有效 Fact Candidate / 新 Pending 均为 0；6 项为继承字段而非新增候选。完整新版生产指标、真实模型提取及合并状态单独报告，不以样本或 Fixture 外推全站完成。

`exceptionReviewValidationCli.ts` 默认只读抓取和身份检查、不加载 Provider；`--real-provider` 才使用已配置 Provider 做两轮内存回放，输出到忽略的 Artifact 目录，绝不调用正式持久化。实际新模型验证、最终测试数与 PR 以本次验收报告为准；代码完成不等于生产验收完成。

## 决策与当前边界

最新 Human Decision：数据自动维护是本周唯一开发 P0，下周新增赛事；**12 场只读复盘不再是扩容前置条件**。架构与质量 Gate 不变。宁海 B2 已完成生产闭环，不重复开发或 Apply。

开发基线：`3a3aab096230c703c084fadeefacad7afd9ffcdf`。本次不新增赛事内容，不改正式 Canonical、Pending、Source Registry 或 Ingestion State；不改 Public API / 小程序契约。

| 能力 | 本次状态 | 验证边界 |
|---|---|---|
| 动态监测 | IMPLEMENTED / TESTED | 有效 Canonical Edition 自动关联 active Registry Sources；隔离 12 / 20 / 30 场完整通过，不能据此宣布 30 场事实准确 |
| 多赛事 Discovery | IMPLEMENTED / REAL READ-ONLY TESTED | 从批准的官方入口解析静态 HTML 链接、基本 RSS / Atom / Sitemap；未批准链接保持 Source Candidate，不进入正式事实路径 |
| 每日生产接入 | IMPLEMENTED / NOT_PRODUCTION_VERIFIED | 集中 Code PR 合并后，现有 trusted-main Daily Workflow 才会执行新代码；现有生产 Run 不作为新代码证明 |
| 异常分流 | IMPLEMENTED / TESTED | 复用 Validation / Diff / Risk / Pending / Verification Alert；相同 Alert 不重复算新任务；恢复后再次失败和严重性变化重开复核 |
| 获批后自动发布 | IMPLEMENTED_NOT_PRODUCTION_VERIFIED / BLOCKED SETUP | 默认关闭。已实现有效公开事实变化 Gate、Build、严格 SSH Host Key、部署回执和全量 API Smoke；缺已审计的 Lighthouse 部署/回滚 Adapter 及发布权限配置 |

## 动态监测与扩容接入

不再使用固定 12 场作为生产验收条件。监测 targets 来源于 Canonical，排除明确 archived / cancelled Edition；uncertain Edition 仍需监测及审核。按预期 Edition ID 和 Source ID 全集比较实际报告：少检、重复、漏来源、零目标或零来源均 fail closed，不能简单删除数量断言。

缺少 Registry 或官方来源会输出 source gap / Verification Alert；仅可信辅助来源有效时不能报告 HEALTHY。保留原有 single Data PR continuity、Pending-before-State、幂等、Source / Evidence / Identity Gate 和 Auto Apply OFF。

新赛事接入的最少步骤：

1. 经 Human Review 提交满足现有 Schema / Publication Gate 的 Event、Edition、Category。Stable ID 不依赖顺序，不复制上届事实。
2. 对 Edition 注册经 Source Approval 的 active 官方入口及事实页面；sourceType / domain / URL / 身份、直接 Evidence 均有效。
3. Fact Fetch 支持现有 HTML、纯文本、带文本层 PDF，以及已批准的宁海 2026 特定 JSON。不能因监测支持 30 场就声称任意 JSON、SPA、扫描 PDF 或登录接口均支持。
4. 检查首轮报告中的覆盖、身份失败、字段核验和 Pending。缺少来源不能虚报健康；所有事实及结构变化继续 Human Review。

规模 Fixtures 不写生产数据。真实扩容后仍须按新增赛事逐项确认来源和 Fact Gate；不再要求先完成一轮 12 场只读审计才允许接入。

## Discovery 与来源审批

每个有效 Edition 最多检查 2 个已批准官方入口、追踪 2 个同主机列表；每批 3 场并行。请求超时 8 秒、响应最多 2 MB、重定向最多 2 次。DNS 检查与实际 socket 地址绑定，拒绝私网/本地地址、非标准端口、凭据 URL、跨域重定向及 HTTPS 降级；不执行网页脚本，不抓登录接口。

Candidate 记录稳定 ID、URL、标题、首次发现时间、Edition、入口 Source ID、发现方法、列表 Hash / locator / 摘录和身份判断。相同 URL / Edition 重复出现不产生新 Source Review；既有 URL 的标题/身份改变会计入 changedCandidates，仍保持未批准。过滤脚本、注释、工具导航及 Email Protection；共享政府/多赛事域名要求标题明确匹配目标赛事。标题年份冲突、同域但未核准、跨域、赛事/组别不明均不能获得事实权威性。往届记录保留为低优先级来源审核材料，不计入当前待审数量。

2026-10-14 的逐页 Source Approval 限制已被本节顶部 2026-10-15 Human Decision 覆盖：可信专属官网内的公告可在实际正文身份及字段 Gate 通过后复用官网权限；新增域名、跨域或身份不清仍需审核。纯 Discovery 本身不写 Registry、不生成 Fact Pending、无模型调用；后续公告 Fact Pipeline 独立记录实际模型调用。RSS/Sitemap 发现的是文章候选 URL，其格式支持不等于 XML 本身已成为可提取事实的来源。

状态明确区分 CANDIDATES_FOUND / NO_NEW_SOURCES / PARTIAL / FAILED / NOT_COVERED；没有静态公告链接、纯 SPA、格式不支持或证书异常不能当作覆盖成功。只读摘要不等于公告正文或正式发布时间证据。

## 运营审核与持久化

- 无变化：既有 Hash 去重及 Pending 去重继续工作；无 meaningful durable change 不开新 Data PR。
- 可信变化：已批准来源的字段 Evidence、Edition / Category、单位、Diff 与 Risk 验证后进入 Pending，所有事实继续 Human Review。
- 证据不足、冲突、身份不清：保留 Verification Alert / Needs Review，明确取证动作，不猜测新值。
- 高影响和结构变化：继续 Human Review 和正式发布 Gate。
- 已结束 Edition：保留历史事实；现有生命周期 Alert 不再生成未来赛事的每日高优先级任务，Discovery 默认跳过其日常新来源审核。

关键字段报告在现有日期/报名/发枪时间基础上补充起终点、标称距离、爬升和关门时间。只有本轮直接官方 Evidence 与 Canonical 值匹配才算 VERIFIED_THIS_RUN；来源 Hash 未变化不等于事实已重新核验，旧 Run 的 81 项分母保持历史含义，不重写旧指标。

Source Candidate Ledger 和 Operations Review State 作为脱敏 Actions Artifact 保存，不加入 Data-only PR Allowlist。每日只恢复 trusted-main 同一 Workflow 的已完成运行 Artifact；Fact Pipeline 失败时保留可用 Discovery 证据。两个状态独立恢复，Discovery / 恢复失败不会关闭既有事实监测或放宽审批。

当前 Artifact retention 为 30 天；Ledger 最多 5,000 个 Candidate。基线缺失、超限或无效必须显式报告，不可假称跨运行去重已验证。长时间暂停/Artifact 丢失可能需要人工重建来源审核基线；这不是数据库或长期 Source Approval Store。

运营摘要列出：检查/有效监测赛事、官方有效来源、新/变化 Source Candidates、待来源审批数、新 Fact Pending、只需新增/变化 Alert 处理的事项、失败/未覆盖赛事、模型调用/Token 和未发生的动作。完整未解决 Alert 留在报告，不因重复而删掉。货币成本及人工分钟数没有可靠数据时标记不可用；现有 model.calls 口径不能精算 Provider 失败/重试计费，不编造节省比例。

## 发布安全接入｜当前 BLOCKED SETUP

`canonical-data-release.yml` 仅关注 main 的 Canonical 变化。默认关闭；Source/Pending/State-only 提交、公开事实仅时间戳变化不部署。main 必须经 Human Review / Merge，AI 不合并 PR。所有有效 Edition 的现有 Public Fact Gate 与全量测试、Build 通过后，才进入独立 production Environment。

不猜测服务器路径、PM2 App Name 或回滚方式，不修改 Lighthouse / Nginx / PM2 架构。复用由 1.4 提供并确认的**现有部署 Adapter**，参数为精确目标 SHA。Adapter 必须：

- 检查工作区/并发及目标版本，避免覆盖未知服务器状态。
- Build 成功前保留当前运行版本；PM2 健康失败能恢复上一健康 SHA。
- 保留上一健康版本及可操作的 rollback / manual fallback。
- 不输出密钥、Token、密码或完整环境。
- 成功只输出可校验回执：`DEPLOYED_SHA=<40 hex>`、`PM2_HEALTH=online`、`ROLLBACK_SHA=<40 hex>`；失败返回非零。

GitHub 配置的最少接入项：

1. 1.4 确认上述 Adapter 路径、权限、回滚演练和日志安全。本 PR 不提供或执行未审计的服务器写入实现。
2. Human 核验 protected-main 的审批/合并规则及 production Environment 权限。配置 `DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_KNOWN_HOSTS` 四个 Secrets；Host Key 通过可信渠道核实，不运行自动信任的 ssh-keyscan。
3. 配置 `DEPLOY_ADAPTER_PATH`。经独立发布安全 Review 才设置 `DEPLOY_REVIEW_POLICY_VERIFIED=true` 和 `CANONICAL_DEPLOY_ENABLED=true`。
4. 对一次获批的有效 Canonical 变化执行发布验收；Workflow 校验部署 SHA / PM2 回执，并使用 commit query + no-cache 读取公开 List / 全部 Detail，与本地 Public DTO 逐项比较。不放宽 HTTPS，不修改 API Contract，不要求小程序重新提审。

部署/Smoke 失败仍需依据回执保留的上一健康 SHA 回滚；公开 API 一致不等于真机已验证。没有配置、演练和真实部署证据时，此项只能记 IMPLEMENTED_NOT_PRODUCTION_VERIFIED。当前继续保留手工发布兜底。

## 真实证据与验收

开发分支真实只读 Discovery、重复回放和测试数据见本次 PR / 验收报告。PR Validation Workflow 无生产 Secrets、无模型、无正式 Store 写入；它的 Run 证明 GitHub Runner 中的只读能力，不等同于 trusted-main Daily Production Pipeline 已升级。

main 合并后，确认无竞争性 Run / Data PR，再复用既有 Race Data Update 验收新代码。不得把旧宁海 Run、Git Merge、本地 Build 或只读 Run 当成新的生产维护/部署/终端验证。

### 开发分支真实只读观测

- 首轮 UTC：2026-10-14T15:43:07.563Z；12 场，未登记候选 28；当前待来源审核 21，往届候选 7。
- 重复轮 UTC：2026-10-14T15:58:38.428Z；新增 0；模型调用 0；正式四份 Store 字节未变。
- 发现候选的赛事：北京、西安、重庆。示例：[2026度小满西安马拉松赛，报名数据出炉~](https://xi-ma.com/post-L51XZa20wA1zDAM6vG98.html)，由批准的西安官方入口链接发现，正文/正式发布时间未核验，仍需 Source Approval。
- 当前静态策略未覆盖：上海、厦门、成都、宁海。贡嘎已结束，跳过日常 Discovery。HK100 请求超时、柴古证书过期；深圳可读取一个入口，但另一个证书主机名不匹配，标记 PARTIAL。广州 HTTPS 页面可读，但 HTTP 通知列表未经单独许可，不降级抓取。
- 本地验收：410/410、Web/Mini TS、lint、npm run build、diff check PASS；12/20/30 隔离规模 PASS。真实观测只证明发现与安全边界，不证明跨赛事事实准确性或生产 Pipeline 已升级。
