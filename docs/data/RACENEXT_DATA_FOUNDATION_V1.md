# RaceNext Data Foundation V1

## 1. Status

- Architecture: **FROZEN**
- Real AI Fact Extraction: **DEFERRED — Provider configuration pending**
- Remote Read: **READY**

数据基础设施 V1 到此收口。真实 AI Provider 的运行验收是已记录的 Deferred 项，不阻塞产品开发；下一产品阶段是微信小程序 MVP，而不是继续扩建数据平台。

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

`data/canonical/race-graph-v1.json` 是当前 Canonical Source of Truth，保存已经接受的 Event、Edition 与 Category。当前 Public First5 范围是上海马拉松 2026、北京马拉松 2026、厦门马拉松 2027、香港 HK100 2027 和凯乐石贡嘎100 2026。

测试 fixture、Pending Change、Discovery Candidate 和 Source Registry 都不是 Canonical。当前 Web 仍使用原有数据链路；它尚未迁移到 Race Graph。

## 6. Update Strategy

现有 GitHub Actions 每日执行一次 Race Data Update Pipeline。更新策略固定为：

- 通过验证且可信、无冲突的 Low Risk 字段可自动写入 Canonical。
- 日期、地点、距离、爬升、关门时间等 High Impact 字段进入 Pending Review。
- 新 Event、Edition、Category 或删除等 Structural 变化必须人工 Review。
- 来源失败、字段缺失或时间戳刷新不能被解释为事实删除或变化。
- Seed / First5 / Roadmap 只定义覆盖意图，不定义 Edition 事实。future / active Edition 在发布前必须比较 Requested Edition、Latest Relevant Official Edition 与 Canonical Edition；冲突时标记 Needs Review 并拒绝发布。
- raceDate 必须保留支持该值的 Evidence 绑定；官网首页未展示日期时继续检查 Tier 2 与交叉来源，只有完成可信来源检查仍无可靠证据时才可保留 null。

## 7. Official Source Ingestion

已审批的 Tier 1 Official 来源可经过 HTML、纯文本或带文本层 PDF 提取，再交给 `FactExtractionProvider` 生成带证据的候选事实。

当前状态：

- OpenAI Responses API Provider Adapter：**READY**
- Provider 配置与真实运行验收：**DEFERRED**
- 未配置时：安全返回 `fact_extraction_provider_unconfigured`，不生成事实、不修改 Canonical

## 8. Distribution

Public Read Layer 从 Canonical Snapshot 派生独立 DTO，并提供：

- `GET /api/races`：返回可发布 Edition 列表。
- `GET /api/races/:editionId`：返回一个可发布 Edition 及其组别详情。

响应使用 `race-graph-public-v1`，保留标准日期字段，并额外派生 `dateDisplay`、`locationDisplay` 与 `isPrimaryCategory`。接口公开、只读、无需 Cookie 或登录；没有写入方法，也不能触发任何 Pipeline 命令。

公开层不会返回 governance、source、evidence、confidence、mergeTrace、conflicts、Pending、ingestion state 或 AI usage。短期 CDN 缓存为 5 分钟，并允许 1 小时 stale-while-revalidate。

Canonical 通过代码提交更新，因此公开 API 获得新数据仍依赖包含该提交的一次应用部署。仓库现有数据工作流只负责提交允许的数据文件；仓库内没有可证明 main 分支提交必然自动部署的配置。这是当前发布链路的外部配置核验项，不在本轮新增部署系统。

生产 Web 当前已可通过 `https://racenext.run` 访问。部署本轮代码后，微信小程序应把 `https://racenext.run` 配置为 request 合法域名，再调用同域 HTTPS API；本轮不修改微信公众平台后台。

## 9. Multi-client Principle

底层 Event → Edition → Category 数据统一，Public DTO 供微信小程序与未来 Web 共用。产品优先级是小程序体验，但客户端展示选择不反向制造第二份赛事事实。数据层存什么，不代表每个页面必须展示什么。

## 10. Maintenance Principle

- 不在多个客户端重复维护赛事事实。
- 不为每场赛事手写专用 Parser。
- 不用往届事实推断本届事实。
- 数据层字段与页面展示保持解耦。
- 数据可信度优先于赛事数量。
- 先维护核心赛事，再基于相同 Contract 规模化。

## 11. Deferred

- Real AI Provider validation
- Web Search Provider
- Database
- CMS / approval UI
- OCR
- 105 / 1500 场规模化
- Future100 与完整存量迁移
- Web full migration to Race Graph

唯一待完成的真实 Fact Extraction Runtime 验收是：获得 API Key 后配置 `FACT_EXTRACTION_PROVIDER`、`FACT_EXTRACTION_API_KEY`、`FACT_EXTRACTION_MODEL`；分别执行 Shanghai 与 Gongga dry-run；人工检查 Fact、Evidence、Category、Date、Cutoff 与 Location；通过后把 Runtime 状态改为 `VERIFIED`。该待办不阻塞产品开发。

## 12. Next Product Phase

**WECHAT MINI PROGRAM MVP**

数据架构继续冻结，不再为尚未验证的规模化需求预建 Database、CMS、GraphQL、Queue、Worker 或第二套客户端 Schema。
