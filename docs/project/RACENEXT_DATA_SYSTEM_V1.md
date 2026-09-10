RaceNext 数据系统 V1

一、数据系统的目标
RaceNext 不是一个赛事信息聚合网站。
长期目标是建立：
Race Graph × Runner Graph

让 RaceNext 能够回答：
什么比赛值得跑？
哪场比赛适合我？
如果决定参赛，我应该如何准备？

Race Graph 是这一能力的基础。
RaceNext 数据系统的核心目标不是拥有最多赛事数据，而是：
以尽可能低的长期维护成本，持续拥有真实、结构化、最新、可复用的赛事事实。

核心原则：
真实 > 完整
可持续维护 > 一次性丰富
结构化资产 > 页面文案
多端复用 > 分端维护
二、Race Graph 核心模型
RaceNext 正式赛事模型统一为：
Event
长期赛事品牌。
例如：
上海马拉松
HK100
宁海越野挑战赛
Edition
某一届具体赛事。
例如：
2026 上海马拉松
2026 HK100
Edition 承载：
- 届次日期
- 地点
- 报名状态
- 官方来源
- Hero 图片
- 当届内容与服务关系
Category
某一届赛事下的具体组别。
例如：
Marathon
100K
60K
25K
Category 承载：
- 距离
- 爬升
- 关门
- 出发时间
- 起终点
- 报名入口
- 组别资格
核心关系：
Event 1:N Edition

Edition 1:N Category

这一模型已经冻结。
除非真实业务出现无法表达的问题，不再重新设计。
三、Stable Identity
RaceNext 必须区分：
- sourceRecordId
- eventId
- editionId
- categoryId
- page slug
不能再把来源 ID、页面 URL、赛事品牌和具体届次混为同一个 ID。
Category ID 不依赖：
- 数组 index
- displayOrder
组别重新排序、新增其他组别，都不会改变已有 Category ID。
稳定 ID 是未来以下能力的基础：
- 我的赛事
- Race Strategy
- 分享
- 收藏
- Runner Graph
- 历史比赛
- 多端同步
- AI 决策
四、数据来源体系
RaceNext 不依赖单一赛事聚合平台。
正式采用 Source Registry。
每一届核心 Edition 可以绑定多个来源。
来源分四层：
Tier 1｜Official
官方赛事网站、官方报名页、赛事公告、赛事规程、赛事手册等。
Tier 2｜Trusted
RunChina、Zuicool、协会、可信赛事平台等。
Tier 3｜Media
可信媒体与行业媒体。
Tier 4｜UGC
跑者帖子、论坛、小红书、个人博客等。
Official Facts 与 Runner Feedback 必须严格分离。
赛事日期、距离、起点、关门等事实优先以 Tier 1 / Tier 2 确认。
Tier 3 / Tier 4 主要用于：
- 交叉验证
- 真实体验
- Runner Feedback
- RaceNext 内容判断
五、数据获取方式
RaceNext 当前支持两类数据获取。
1. Structured Sources
例如：
RunChina
Zuicool
通过 Connector：
Fetch → Normalize → Merge
直接进入结构化赛事数据流程。
2. Unstructured Official Sources
例如：
赛事官网
赛事公告
竞赛规程
官方 PDF
通过：
Fetch → Document Extraction → Fact Extraction
转换成结构化 Fact Candidate。
两类来源最终汇合到同一套 Race Graph Pipeline。
RaceNext 不为每个赛事单独开发一个 Parser。
否则赛事规模扩大后维护成本会线性甚至指数增长。
六、Source Discovery
当现有来源无法找到目标赛事时，RaceNext 可以主动寻找新的数据源。
当前顺序：
已注册官方来源
↓
可信结构化来源
↓
Official Domain Discovery
↓
未来 Web Search Discovery
Search 的职责只是：
找到可能可靠的数据源。

Search Result 不能直接修改 Race Graph。
发现的新页面先成为：
Source Candidate

通过赛事身份、届次年份、官方域名等校验后，再由人工确认进入 Source Registry。
七、AI 在数据系统中的角色
AI 的主要价值是：
将非结构化官方信息转换成结构化 Fact Candidate。

例如：
官方网页：
“100 公里组累计爬升约 4986 米，关门时间 24 小时。”
AI 可以转换为：
- distanceKm
- elevationGain
- cutoffTimeHours
但每个 Fact 必须同时拥有：
- Source
- Evidence
- Confidence
AI 不负责决定：
哪个值是真相。

最终仍通过确定性的：
Validation → Diff → Risk Policy
判断是否进入 Race Graph。
核心原则：
Precision > Recall。

宁可不知道，也不要编造。
八、自动更新机制
RaceNext 核心赛事数据每日自动检查一次。
数据生命周期：
Source
↓
Fetch
↓
Normalize / Extraction
↓
Identity Check
↓
Validation
↓
Diff
↓
Risk Classification
↓
Auto Apply / Pending
↓
Canonical Race Graph
Low Risk
如报名状态、报名日期、报名链接。
可信来源 + 验证通过 + 无冲突，可以自动更新。
High Impact
如：
- 比赛日期
- 比赛地点
- 距离
- 爬升
- 起跑时间
- 起终点
- 关门时间
自动发现变化，但默认 Pending Review。
Structural
如：
- 新赛事
- 新届次
- 新组别
- 组别删除
- 身份冲突
Needs Review。
九、Canonical Race Graph
RaceNext 当前正式事实源：
race-graph-v1.json

Canonical 只保存：
RaceNext 当前已经接受的正式赛事事实。

Raw Source、Pending、Discovery Candidate、Evidence 等运营数据不等于 Canonical。
未来即使迁移到：
- Database
- CMS
- Data Service
Canonical Race Graph 的业务模型和 Public Contract 应继续保持稳定。
十、Public Distribution
Canonical 不直接暴露给客户端。
数据经过：
Publish Eligibility
↓
Public DTO
↓
Remote Read Layer
再提供给：
- 微信小程序
- Web
- 未来其他客户端
当前公开接口：
GET /api/races
GET /api/races/:editionId
只暴露产品需要的赛事事实。
不暴露：
- source
- evidence
- confidence
- mergeTrace
- pending
- source health
- AI usage
- Pipeline 内部信息
原则：
内部数据治理能力和用户产品数据接口分离。

十一、多端原则
RaceNext 当前执行：
底层统一，小程序体验优先，多端适配。

Web 与微信小程序：
共享：
- Event
- Edition
- Category
- Race Guide
- Accommodation
- Strategy 等核心内容资产
可以不同：
- 页面结构
- 交互
- 信息密度
- 折叠方式
- CTA
不能不同：
同一个赛事事实。

长期坚持：
产品体验小程序优先，数据资产多端优先。
十二、内容与 Race Graph 的关系
赛事事实与编辑内容分离。
Race Guide
默认作用域：
Edition
Trail Race Strategy
默认作用域：
Edition + Primary Category
Accommodation
MVP 默认作用域：
Edition
RaceNext 内容继续坚持三层：
1. Official Facts
2. Real Runner / Media Feedback
3. RaceNext Judgment
不能将 Runner Feedback 写成官方事实，也不能把 RaceNext 判断伪装成用户评价。
十三、数据规模化原则
RaceNext 不以：
“有多少场赛事”

作为第一优先级。
优先确保核心赛事：
- 有稳定 ID
- 有可靠来源
- 有最新事实
- 可以持续自动检查
- 可以多端复用
- 可以形成 Race Intent
先：
5 场
再：
20–50 场核心赛事
再根据用户需求扩展。
而不是：
先做 1500 场低质量赛事库。
长期真正有价值的数据资产顺序是：
Race Graph

↓
Race Intent / My Races

↓
Runner Graph

↓
Decision

↓
Race Result

这是 RaceNext 的数据复利路径。
十四、当前状态
截至 RaceNext Data Foundation V1：
已完成
- Event → Edition → Category
- Stable ID
- Data Governance
- Structured Connector
- Daily Update Pipeline
- Diff Engine
- Risk Classification
- Pending Review
- Canonical Persistence
- Source Registry
- Official Domain Discovery
- Source Approval
- Official HTML / Text PDF Fetch
- Document Extraction
- AI Fact Extraction Adapter
- Public Remote Read Layer
已冻结
RaceNext Data Foundation Architecture
不再继续增加数据基础设施。
Deferred
Real AI Fact Extraction Runtime Validation
原因：
当前暂时没有可用 API Provider Credential。
未来获取 API Key 后：
使用上海马 + 贡嘎100真实官方页面进行 Fact / Evidence 验收。
API Provider Credential 只负责让 AI Fact Extraction Adapter 实际运行，不代表候选事实已经正确。正式写入仍必须经过 Source Tier、Event / Edition Identity、Evidence、Conflict Check，以及高影响事实的 Pending Review / Human Review。

核心赛事的抽取还必须执行最小结构完整性检查：官方页面列出的 Category 数量与身份、Canonical 已有 Category，以及明显缺失的 Category 和目标字段必须被比较。抽取不能在找到第一条匹配后提前停止。该检查只产生候选或 Review 问题，不自动创建 Category，也不改变冻结的 Event → Edition → Category 模型。

HK100 2027 的 The Grand Sam 是连续完成 The Third、The Half 与 HK100 的组合挑战，不是单一物理赛事 Category。现有 Category 语义不应为此被扭曲；当前保留官方 Source / Evidence，但 Detail V1.1 不将其显示为普通 Category，是否扩展组合挑战模型留待真实业务需求评估。
这一事项不阻塞 MVP 产品开发。
十五、暂不建设
当前不建设：
- Database
- CMS
- 审核后台
- Web Search Provider
- OCR
- Queue
- Worker
- Vector Database
- RAG
- GraphQL
- 105 / 1500 场全量数据
- 实时更新系统
任何未来基础设施投入必须回答：
它是否正在解决真实用户增长、真实数据维护或真实商业问题？

否则默认不做。
十六、下一阶段
RaceNext 数据地基已经达到足以支持 MVP 的状态。
下一阶段正式从：
Data Infrastructure

切换到：
User Product

产品优先级：
微信小程序 MVP
第一阶段先实现已经达成共识的：
首页
↓
赛事列表
↓
赛事详情
↓
Hero / Race Facts
尚未充分讨论的：
- RaceNext Content
- Accommodation
- 我的赛事
在开发过程中继续逐步确定。
核心原则不变：
完成比完美重要。

已经达到 80 分的部分先上线验证。
