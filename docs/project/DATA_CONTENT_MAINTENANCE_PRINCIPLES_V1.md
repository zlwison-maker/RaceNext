RaceNext 数据与内容维护成本原则 V1

一、原则目标
RaceNext 长期目标不是成为赛事信息最多的平台，而是通过：
真实赛事信息 + 真实跑者反馈 + RaceNext 判断
帮助跑者更快看懂一场比赛，并做出更好的参赛决策。
随着 RaceNext 从几十场赛事逐步扩展至数百、数千场赛事，真正限制产品规模化的不会只是开发成本，而是：
赛事数据采集、内容生产、信息更新、真实性校验与多端维护成本。
因此，从产品早期开始，所有数据、内容与功能设计，都必须同时考虑：
用户价值 × 数据价值 × 更新成本 × 复用价值 × 自动化能力

不能只考虑「这个功能有没有用」，还必须考虑：
如果未来有 1500 场赛事，这套东西还能不能维护？

二、核心原则：Single Source of Truth
RaceNext 所有核心赛事数据和内容原则上只维护一份。
即：
一份赛事数据、一份核心内容、一套服务数据，多端复用。

不为 Web、小程序分别生产和维护两套赛事数据与内容。
长期架构：
                    RaceNext 数据资产

        ┌──────────────┼──────────────┐
        │              │              │
    Race Facts     Race Content    Race Services
    赛事事实         决策内容          参赛服务
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                RaceNext Data Layer
                 / CMS / Race Graph
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       小程序          Web          AI
不同终端可以：
- 信息层级不同
- UI 不同
- 交互方式不同
- 展示长度不同
- 部分模块默认展开 / 折叠不同
但原则上不重新生产一套内容。
三、当前阶段：小程序优先原则
RaceNext 当前进入小程序 MVP 阶段。
因此多端设计遵循：
底层统一，小程序优先，多端适配。

具体意味着：
1. 数据层不区分终端
赛事日期就是赛事日期。
累计爬升就是累计爬升。
RaceNext Judgment 就是一份 Judgment。
不建立：
web_race_date
mini_program_race_date
这样的终端专属数据。
2. 产品呈现发生冲突时，小程序优先
如果某个信息架构：
Web 展示效果很好，
但放到小程序里信息过重、操作复杂，
当前阶段优先满足：
小程序用户体验。

Web 再根据同一份数据做桌面端适配。
3. 新功能优先验证小程序价值
当前新增产品能力首先问：
这个能力在小程序里是否成立？

而不是为了保持 Web 现有架构而限制小程序。
因为当前 RaceNext 的战略变化之一，就是从单纯依赖搜索流量，逐渐进入：
微信传播 → 赛事决策 → 我的赛事 → 交易 → 长期用户关系。
这与 BP 中从 Race Intent → Race Plan → Runner Ability → Decision Record 的演进方向一致。

4. 小程序优先 ≠ 小程序专用
这是一个重要边界。
不能因为当前小程序优先，就大量产生：
「只有小程序才能使用的数据和内容」。

任何新增数据字段和内容模块，仍然应该优先考虑：
小程序 + Web + AI + 我的赛事 + 未来 Race Graph
能否共同复用。
因此：
产品体验小程序优先，数据资产多端优先。

四、数据维护成本四问
任何新增字段、内容或赛事能力，在进入产品之前，必须回答四个问题。
01 用户价值｜值得维护吗？
首先判断：
这个信息真的影响跑者决策吗？

优先维护：
- 比赛日期
- 地点
- 组别
- 距离
- 累计爬升
- 关门时间
- 报名状态
- 报名资格
- 起终点
- RaceNext Judgment
- 核心赛事体验
- 住宿区域
谨慎维护：
- 赛事历史
- 泛赛事介绍
- 低价值 FAQ
- 无法影响决策的大量赛事数字
- 装饰性标签
- 没有明确用途的评分
判断标准：
如果删除这个字段，用户做参赛决策会不会明显变差？

如果不会，默认不增加。

五、02 更新成本｜它多久会变化？
所有数据都需要考虑生命周期。
优先积累：
相对稳定的数据
例如：
- 举办城市
- 赛事类型
- 赛事品牌
- 赛事人格
- 长期赛道特点
维护成本较低。
届次变化数据
例如：
- 比赛日期
- 报名时间
- 组别
- 起终点
- 距离
- 爬升
- 关门时间
- CP
- 强制装备
必须按照：
Event → Edition → Category

进行结构化管理。
不能简单把上一届数据复制成下一届事实。
现有内容规范已经明确：未经确认不能根据往届赛事推断当届规则。RaceNext 赛事详情页内容撰写规范 V1.mdMD
高频变化数据
例如：
- 天气
- 酒店实时价格
- 酒店库存
- 临时交通信息
如果需要大量人工维护，RaceNext 原则上不自行维护。
优先：
通过第三方实时能力 / API / 跳转平台解决。

六、03 结构化能力｜未来能自动化吗？
RaceNext 长期不应该依赖人工逐场维护赛事资料。
新增数据时优先考虑：
能否结构化？

例如：
race
edition
category
date
location
distance
elevation_gain
cutoff_time
registration_status
start_location
finish_location
source
last_verified_at
结构化之后，未来才能：
官方数据源
↓
抓取
↓
AI 抽取
↓
多源校验
↓
人工审核
↓
Race Graph
↓
小程序 / Web / AI
这也是 BP 中 AI 数据管线的核心价值：让人工逐渐从「生产者」变成「审核者」，避免赛事规模增长导致人工成本线性增长。RaceNext_Investor_BP_202608.pdfPDF
七、04 复用价值｜维护一次能服务多少场景？
优先建设：
一次维护，多处使用。

例如「赛事日期」可以服务：
- 首页赛事卡片
- 赛事详情
- 我的赛事
- 比赛倒计时
- 搜索
- 分享卡片
- AI 推荐
- 赛事提醒
这种字段具有极高的数据资产价值。
反过来，如果一个字段：
只能在 Web 某个页面的某个模块里展示一次

却需要每年人工更新，
默认不做。
八、维护成本判断矩阵
以后新增任何数据/内容，可以用这个简单模型判断：
    维护成本低    维护成本高
用户价值高    优先建设    寻找自动化 / 第三方方案
用户价值低    谨慎建设    不做


再叠加一个维度：
多端、多场景可复用 → 优先级提高。
所以 RaceNext 最喜欢的数据应该是：
高用户价值 + 低/可自动化维护成本 + 高复用价值

最应该避免的是：
低用户价值 + 高频变化 + 人工维护 + 单场景使用

九、内容维护原则
RaceNext 的内容资产同样遵循 Single Source of Truth。
一场赛事原则上只维护一套：
Race Guide
- Opening
- RaceNext Judgment
- Core Experiences × 3
- Runner Fit
- Closing
Web 与小程序共同使用。RaceNext 赛事详情页内容撰写规范 V1.mdMD
Trail Race Strategy
越野赛事在统一 Race Guide 之外增加：
- Scope
- 关键阶段 / 问题 × 3
- RaceNext Strategy Judgment
- Closing
默认只针对一个核心 / 旗舰组别，不为所有组别机械生产一套 Strategy，从源头控制内容生产与长期维护成本。RaceNext 越野赛事详情页内容标准 V1.mdMD
十、事实、经验、判断必须分层维护
RaceNext 所有赛事内容继续严格区分：
Official / Event Facts
可验证事实。
Real Media / Runner Feedback
真实媒体和跑者经验。
RaceNext Judgment
RaceNext 基于前两者形成的判断。
三者不能混在一起。
这样做除了真实性，还有一个重要的维护价值：
当赛事官方数据变化时：
更新 Facts

不一定需要重写整个 Race Guide。
当新增跑者反馈时：
更新 Evidence

不一定改变赛事结构化信息。
当证据积累到一定程度：
更新 Judgment。

也就是说，内容分层本身就是降低维护成本的一种架构设计。
十一、避免「年份 × 组别 × CP」导致内容爆炸
尤其越野赛事必须避免：
一场赛事 × 4 个组别 × 10 个 CP × 每年一届

这样的内容结构。
否则 100 场赛事就可能产生数千甚至上万个人工维护节点。
因此：
官方 CP 数据 → 结构化 Race Graph
Race Strategy → 默认核心组别 + 3 个关键阶段
不机械逐 CP 撰写攻略。
这已经是当前《越野赛事详情页内容标准 V1》明确确立的原则。RaceNext 越野赛事详情页内容标准 V1.mdMD
十二、来源与更新时间必须成为底层能力
凡是可能变化的重要赛事事实，长期必须具备：
Source
信息来源。
Last Verified At
最后确认时间。
必要时进一步具备：
Status
已确认 / 待官方公布 / 历史数据 / 已失效。
因为 RaceNext 未来真正的核心竞争力不是：
「数据库里有一条数据」。

而是：
我们知道这条数据来自哪里、属于哪一届、什么时候确认过、现在是否仍然可信。

这也是 Race Graph 长期可信度的基础。
十三、第三方数据不重复建设
对于已经存在成熟供给的平台能力：
酒店库存 → OTA
酒店实时价格 → OTA
地图 → 地图服务
天气 → 天气服务
支付 → 微信 / 交易平台
RaceNext 不重复维护。
RaceNext 应该重点建设的是：
这些第三方平台不知道，但跑者需要知道的东西。

例如：
不是：
这家酒店今天多少钱？

而是：
为了参加这场比赛，我应该住在哪个区域？为什么？

前者属于 OTA 的能力。
后者才属于 RaceNext 的决策价值。
十四、功能增加必须同时计算「长期维护债务」
RaceNext 不把：
「开发完成」

视为功能成本结束。
一个功能的真实成本是：
开发成本 + 数据成本 + 内容成本 + 更新成本 + 校验成本 + 客服解释成本 + 长期维护成本

因此产品评审不能只问：
做这个功能要几天？

还要问：
未来三年维护它需要多少成本？

如果一个功能开发只需要两天，但以后每周都需要人工维护，它可能比开发两个月但可以自动运行的功能更昂贵。
十五、RaceNext 数据资产优先级
长期最值得积累的不是「更多字段」。
而是 BP 已经定义的：
赛事 × 跑者 × 决策 × 结果。 RaceNext_Investor_BP_202608.pdfPDF

因此数据建设优先级应该始终围绕：
Race Graph
这是什么比赛？
↓
Race Intent / My Races
用户考虑什么比赛？
↓
Runner Graph
这个跑者是谁、能力如何？
↓
Decision
为什么选择这场比赛？
↓
Result
最终有没有参加、结果如何？
这些数据最终才能产生真正的复利。

十六、最终产品评审清单
以后 RaceNext 每新增一个字段、模块、内容或功能，都问：
1. 它解决什么真实用户问题？
2. 它是否影响赛事决策或参赛体验？
3. 这个信息多久变化一次？
4. 数据来源是否可靠？
5. 能否结构化？
6. 未来能否自动获取 / AI 抽取 / 人工审核？
7. 维护一次能否被小程序、Web、AI 等多端复用？
8. 如果未来有 1500 场赛事，这套方案还能不能成立？
9. 有没有成熟第三方已经更好地解决这个问题？
10. 删除它，用户体验真的会明显下降吗？
如果第 10 个问题答案是：
不会。

默认：
不做。

最终原则
RaceNext 不追求：
信息最多、字段最多、功能最多。

而追求：
最少但最有决策价值的信息，最低可持续的维护成本，最高的数据复用效率。

当前多端策略：
底层数据统一，小程序体验优先，多端共享复用。

长期数据策略：
一次采集 → 一次审核 → 一处维护 → 多端使用 → AI 可理解 → 持续积累为 Race Graph。

产品设计的最终判断标准不是：
「现在能不能做出来？」

而是：
「如果 RaceNext 有 1500 场赛事、几十万用户，我们今天设计的这套东西还能不能高质量地运转？」

17. Race Graph 是赛事事实的 Single Source of Truth
RaceNext 正式赛事数据统一采用：
Event → Edition → Category
- Event：长期赛事品牌
- Edition：某一届具体赛事
- Category：某一届赛事下的具体组别
Web、小程序、未来 AI 能力不得分别维护赛事事实。
统一原则：
一份 Race Graph，多端消费；不同端只允许有不同 ViewModel 和展示方式，不允许形成多套赛事事实。

Seed / First5 / Roadmap / Product Planning 只表达 RaceNext 希望覆盖哪些赛事品牌或目标赛事，不定义具体 Edition 事实。

例如，`Target Race Brand: HK100` 不等于 `Canonical Edition: HK100 2026`。正确流程必须是：

Target Race Brand → Source Discovery → Latest Relevant Official Edition → Edition Identity Validation → Canonical Edition

如果产品规划中的届次与官方最新有效届次冲突，官方事实优先。历史 Edition 可以保留，但当前产品准备展示的 future / active Edition 必须标记 Conflict、进入 Needs Review，不能为了保持规划文本不变继续发布错误届次。

页面需要什么，不等于底层只存什么。
同时：
数据层存什么，也不等于页面必须全部展示。

18. 每个核心 Edition 应尽量拥有明确的 Source Registry
RaceNext 不应该只依赖某个聚合赛事平台“恰好有没有这场比赛”。
每个正式进入产品的核心 Edition，应逐渐建立自己的 Source Registry，记录：
- 官方赛事网站
- 官方报名页面
- 官方赛事公告
- 官方赛事规程 / 手册
- RunChina、Zuicool 等可信结构化来源
- 其他经过确认的可靠来源
长期目标不是：
有一个万能数据源。

而是：
RaceNext 知道每一届赛事应该去哪里持续获取可靠信息。

19. 数据源采用分层可信体系
RaceNext 数据源按可信程度划分：
Tier 1｜Official
赛事官网、主办方、官方报名页、官方公告、官方赛事规程、官方赛事手册等。
Tier 2｜Trusted
RunChina、Zuicool、协会、可信赛事平台、官方认证报名平台等。
Tier 3｜Media
可信媒体、行业媒体等，可用于辅助验证和赛事评价素材。
Tier 4｜UGC
小红书、论坛、跑者博客、社区帖子等。
重要规则：
Official Facts 与 Runner Feedback 不混用。

Tier 4 可以成为真实跑者反馈来源，但不能直接确认比赛日期、起点、关门时间等官方赛事事实。
20. Search 负责寻找证据，不负责决定事实
当已知数据源无法覆盖某届赛事时，可以使用：
- 官方域名内 Discovery
- 未来全网 Search
寻找新的数据来源。
但：
Search Result 永远不是 Canonical Fact。

正确链路是：
Search / Discovery → Candidate Source → Identity Check → Approval → Source Registry → Fact Extraction → Validation → Diff → Race Graph
搜索的任务是：
找到可能正确的证据。

RaceNext 数据 Pipeline 的任务是：
判断这些证据是否足以成为正式赛事事实。

21. AI 负责提取候选事实，不负责定义真相
对于赛事官网、赛事规程、公告、PDF 等非结构化官方来源，RaceNext 可以使用 AI 将内容转换成结构化 Fact Candidate。
例如：
官方文档
→ AI Extraction
→ distanceKm / elevationGain / cutoffTimeHours / startAt
但 AI 输出不能直接写入 Race Graph。
必须继续经过：
Evidence → Validation → Diff → Risk Classification → Auto Apply / Pending Review
每个 AI 提取事实必须具备：
- source
- evidence
- confidence
- edition identity
- category identity
原则：
AI 是数据生产效率工具，不是事实裁判。

没有明确证据的字段保持 unknown / null，不进行补全或推测。

日期核验不能在“官网首页没有直接展示日期”时停止。必须依次检查 Tier 1 Official、Tier 2 Trusted，并在需要时交叉核对；多个可信来源一致才可写入。来源冲突时进入 Pending Review，不自动选择。完成可信来源检查后仍无可靠证据，才允许保留 null；不得写入 guessed value。

每个准备进入 Public API 的核心 Edition 必须通过最小 Pre-Publish Fact Gate，至少核对：Event identity、Requested Edition、Latest Relevant Official Edition、Canonical Edition、raceDate、city/location、primaryCategory、primary source、需要时的 secondary source、conflict status 与最终 publishable status。Requested Edition 与 Latest Relevant Official Edition 不一致时，Gate 必须拒绝发布并标记 Needs Review。
22. 自动更新的目标是减少人工生产，而不是取消人工判断
RaceNext 赛事信息会持续变化：
- 报名状态
- 报名时间
- 比赛日期
- 出发时间
- 起终点
- 距离
- 爬升
- 关门时间
- 组别信息
因此赛事数据不能“一次录入永久有效”。
当前更新机制：
低风险变化
如：
- registrationStatus
- registrationOpenDate
- registrationCloseDate
- registrationUrl
在可信来源、验证通过、无冲突的前提下，可以自动更新。
高影响变化
如：
- 比赛日期
- 起跑时间
- 起终点
- 距离
- 爬升
- 关门时间
自动发现后进入 Pending Review，不直接覆盖 Canonical。
长期方向：
人从数据生产者逐渐变成关键事实审核者。

23. checked、updated、verified 必须严格区分
RaceNext 数据治理必须区分：
fetchedAt / crawledAt
系统什么时候检查过来源。
lastUpdatedAt
正式赛事事实最后什么时候发生变化。
verifiedAt
RaceNext / 人工最后什么时候确认过该事实。
三者不能混用。
特别是：
“今天检查过，页面没变化”

不代表：
“赛事事实今天发生了变化”

更不代表：
“今天人工重新验证过”。

24. Canonical 与客户端之间必须存在 Public Distribution Layer
小程序和 Web 不直接读取：
- Raw Source
- Pending
- Source Registry
- Evidence
- confidence
- mergeTrace
- Pipeline 状态
客户端只消费：
Published Canonical Race Graph

通过稳定的 Public DTO / Remote Read Layer 提供。
当前原则：
底层数据统一，小程序体验优先，多端共享 Race Graph。
这样未来底层从 JSON 迁移到数据库时，只要保持 Public API Contract 稳定，Web、小程序和 AI 客户端无需重新设计数据体系。
