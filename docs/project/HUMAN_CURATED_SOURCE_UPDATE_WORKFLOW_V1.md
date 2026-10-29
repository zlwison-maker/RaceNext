# Human Curated Source Update Workflow V1

状态：2026-10-29 Human Decision；本文件待文档提交审核。适用于已有 Race Graph 能表达的人工可信来源数据更新。

## 分工与边界

Human 提供赛事/Edition、目标 Category、可信来源 URL 和更新类型，即完成本次来源筛选。Codex 默认接受该来源，不重新申请相同 Source Approval，也不机械寻找第二来源论证可信度。普通更新不必先由 GPT 提取再转交 Codex。

来源可信不代表内容适用于当届、目标组别或目标字段。Codex 仍须核对身份、届次、字段作用域、原文语义与 Canonical Diff；页面与历史数据冲突时，明确列出双方证据，不静默覆盖。本规则优先于旧文档中要求对每个 Human 已筛选来源重复审批、或机械要求第二来源的冲突表述。

本流程是受控的数据与内容提交，不表示现有每日 Pipeline 已支持 CP 自动抽取。Auto Apply 保持 OFF；来源批准、事实 Human Review、Git Merge 与生产发布仍分别验收。

## 标准步骤

1. **基线**：读取最新 main、适用规范与目标数据，检查相关开放 PR；使用独立分支/Worktree，保留其他工作区、未提交资源与自动监测 Data PR。
2. **自主读取**：先尝试现有网页读取；动态正文无法获取时，使用现有真实浏览器。不能把 HTML 空壳当作“官网无数据”。只在需要确认届次/字段作用域时读取官网关联上下文，不为重复来源审批增加调查。
3. **留证与提取**：记录 URL、读取时间/方法、正文或表格定位、必要截图/内容 Hash、原始字段及读取失败环节。只有读取到的内容能作为事实依据；旧 GPT 提取结果和页面上传日期不能代替当届直接证据。
4. **结构化**：复用既有 Schema；官方未提供的字段留 null/规定的缺失状态，不推断补齐。CoursePoint 的 services:null 与 services:[] 语义不同；按冻结规则判断 partial/available，详细服务缺失本身不决定完整性。
5. **Diff 与治理**：仅修改获准实体/字段和直接相关治理信息。稳定语义 ID、同名不同路线位置、累计距离、带时区完整日期及跨日时间都需验证。来源/Evidence/审核说明留在治理层，不进入 Public DTO。
6. **验证**：执行必要回归、完整测试、类型检查、lint、构建和 diff check；验证实际本地 API 与小程序既有数据绑定。逐项报告 PASS/FAIL/未执行，不用替代构建掩盖默认构建失败，不把本地结果宣称为部署或真机验收。
7. **交付**：精确暂存、Commit/Push，创建 Draft PR；列出事实 Before/After、缺失值、冲突、数据保护、测试证据与剩余 Human Decision。等待 Human Review，不自动 Merge、部署或扩展到其他组别。

若现有自动 Data-only Allowlist 不接受文档，规范采用独立文档提交，不放宽安全校验；人工接入 PR 的必要回归测试应如实披露，不能将含代码的完整 PR 冒称为自动 Data-only Gate 已通过。

## 升级机制

- 读取失败：先用既有浏览器；仍阻塞则说明访问状态、保留已有证据，提供最小替代方案。不得绕过访问控制或伪称已读。
- Schema 不支持、新产品能力或重大事实冲突：停止对应变更，提供最小缺口与方案，交 GPT + Human 决策。
- 普通缺失字段：保持缺失，继续交付其他可靠数据，不因非必填项缺失阻断整组。
- 不为单次读取失败建设爬虫平台、后台、数据库或长期 Agent。只有重复实测证明有必要时，另行评估通用能力。

## 首次验证：宁海 2026 CNH-60

- Human 来源：[CNH-60 官方页面](https://ninghai100.com/page/CNH-60)。网页读取工具失败后，真实浏览器读取时间表；关联官方 2026 规程只用于届次归属核对。
- 6 个 CP + Finish；CP3 白沙林场 cutoffAt:null，全部 services:null，因此 coursePointDataStatus:partial。
- Category.distanceKm 保留 60；Finish CoursePoint 累计距离采用官方实际赛道距离 58.8。未接入 UTNH-100 或 YNH-25。
- 本地完整测试、Public API 与现有小程序 ViewModel/WXML 绑定验证和生产/真机验收分开记录；本例不宣称已发布。
- GPX 下载等待失败，但 CP 表已独立完整取得；不使用未取得的 GPX 内容补齐事实。
- 本轮任务发起后无额外 Human 补录或事实提取干预。主要低效环节是浏览器下载等待；下一次优先读取可见表格，不让非必需下载阻断已有证据。

字段语义以 [Trail Course Point Schema V0.1](TRAIL_COURSE_POINT_SCHEMA_V0_1.md)、[数据系统 V1](RACENEXT_DATA_SYSTEM_V1.md) 和 [数据内容维护原则](DATA_CONTENT_MAINTENANCE_PRINCIPLES_V1.md) 为准；本文件不新增 Schema 或发布规则。
