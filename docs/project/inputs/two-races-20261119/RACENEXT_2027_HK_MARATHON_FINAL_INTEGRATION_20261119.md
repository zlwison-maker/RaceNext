# RaceNext｜渣打香港馬拉松2027 · Codex 正式接入交付包（2026-11-19）
> **用途：**Codex 集成输入（工程授权范围内），不是“已部署”或“直接上线”的事实。
> **用户当次明确决定：**本赛事纳入开发；以下五家酒店与顺序、携程 Action 均由 Human 提供；Cover / Hero 共用指定原图。沿用 V2 Race Guide 与 V1.2 住宿理由，禁止自行重新研究或改写。
> **阶段：**`Selected for Integration / Development Allowed`；事实 Publish Gate、图片商用授权与真机验证仍需独立验收。
> **最高优先级：**最新 Human Decision → 当前冻结标准 → 有证据的 2027 当届事实 → 当前仓库实际 Schema 与 Gate。历史 V2 的“0 条 Action／未选图”状态已被本次决定更新。

## 0｜身份、工程范围及文件资产

- 官方赛事展示名候选：**渣打香港馬拉松2027**；英文 **Standard Chartered Hong Kong Marathon 2027**。正式 Edition 展示名请直接对照官网当前当届写法；中文年序/繁简体按现有规范处理，**不得随意删冠名或把研究简称当正式名字**。
- 建议 Event ID：`standard-chartered-hong-kong-marathon`；建议 Edition ID：`standard-chartered-hong-kong-marathon-2027`。**只是研究候选 ID**：Codex 必须先检查实际 Canonical / 是否已有历史 Edition，禁止因为候选 ID 就新建重复 Event。
- 本轮只有两场，另一场见同批交付；不做东京、其它比赛或重构。
- 已选用户原始图片：`assets/hk-marathon-2027-original.png`。已预制的无裁切轻量候选：`assets/hk-marathon-2027-display-v1.jpg`。两者源自本次用户附件；Cover / Hero 复用同一显示图的 URL。Codex 可以复用既有图片处理流水线重新生成，但必须保持画面不变、输出可追踪 Hash 与实际加载体积。
- AppID：`wx0e6ed4f51db9d078`。全部酒店 Path **Opaque String**，不做 URL 重编码、不生成日期、不改变参数顺序。
- 可信来源与研究 Evidence 在本文件后部；与 Public DTO / UI 文案分离。

## 1｜当届官方事实候选（带 Pending，不直接执行数据写入）

# 01｜赛事基础信息（当届事实审核稿）

## 1.1 Event / Edition

| 字段 | 核验结果 | 证据 / 边界 |
| --- | --- | --- |
| 正式赛事名称 | **渣打香港馬拉松2027**；英文 Standard Chartered Hong Kong Marathon 2027 | 当届官方官网与报名系统 |
| Event 候选 ID | `standard-chartered-hong-kong-marathon` | 研究层建议，待 Codex 检查现有 Event 命名体系，非正式 ID |
| Edition 候选 ID | `standard-chartered-hong-kong-marathon-2027` | 待工程身份复核 |
| 类型 | 公路跑 / 城市马拉松 | 官方 |
| 赛事日期 | **2027-01-17，星期日** | 官方当届赛事详情 [HK-O1] |
| 地点 / 时区 | 中国香港特别行政区；Asia/Hong_Kong（UTC+08:00） | 官方；发令时刻均为香港当地时间 |
| 主办相关机构 | 中国香港田径总会（HKAAA） | 官方 |
| 主赛事规模 | 2027 增额至约 78,000 人（含各组别） | 官方主席致辞 [HK-O4]；不是全马人数 |
| 全马人数 | 18,000 | 官方赛事详情 [HK-O1] |
| 报名现状（2026-11-18） | **普通公众抽签已结束**；不以“报名开放”展示 | 官方日期表 [HK-O2]；特定慈善、伤健人士等通道需分别核验，不推断仍可报名 |
| 官方网站 | https://www.hkmarathon.com/zh-hant/ | 主办方官方 |
| 官方报名入口 | https://hkmarathon.fringebackerevents.com/events/standard-chartered-hong-kong-marathon-2027/register/select-type/ | 官网链接出的当届报名系统，第三方系统身份仍需校验 [HK-O3] |

**报名节点：**公众抽签 2026-09-11 14:00 至 09-20 19:00；第一轮结果 09-25，首轮缴费截止 10-02 23:59；第二轮结果 10-07，第二轮缴费截止 10-10 23:59。领物邮件预计 2026 年 12 月下旬，赛事博览会与跑手包领取安排为 **2027-01-13 至 01-16**。[HK-O2]

## 1.2 Category Facts（主赛事）

| 官方项目 / 组别 | 官方标称距离 | 爬升 | 关门总时限 | 已确认起跑时间（UTC+08） | 起点 | 终点 | 数据状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 马拉松 · 挑战组 | 42.195 km | 不适用 / 未提供 | 6 小时（全程项目） | **01-17 06:00** | 九龙尖沙咀弥敦道 | 香港维多利亚公园 | 官方当届直接证据 [HK-O1] |
| 马拉松 · 一组 | 42.195 km | 不适用 / 未提供 | 6 小时（全程项目） | **01-17 06:25** | 同上 | 同上 | 官方当届直接证据 [HK-O1] |
| 马拉松 · 二组 | 42.195 km | 不适用 / 未提供 | 6 小时（全程项目） | **01-17 06:50** | 同上 | 同上 | 官方当届直接证据 [HK-O1] |
| 半程马拉松（含不同出发组） | 21.0975 km（报名系统） | 不适用 / 未提供 | **Pending 当届项目对应时限** | **各批次 Pending** | 尖沙咀弥敦道（政府赛事资料支持；待组别官方规程复核） | 香港维多利亚公园（待组别官方规程复核） | 项目存在 [HK-O3][HK-O5]；完整分枪、关门与路线尚未取得组别原文 |
| 10 公里（多批次） | 10 km | 不适用 / 未提供 | **各组别 Pending** | **各批次 Pending** | 东区走廊（政府赛事介绍，待官方组别详情复核） | 维多利亚公园（待官方组别详情复核） | 项目存在，暂不将一般路跑页面推断为完整当届组别数据 [HK-O3][HK-O5] |
| 10 公里轮椅赛 | 10 km | 不适用 / 未提供 | Pending | Pending | Pending（需查当届轮椅专属起点） | Pending | 项目存在 [HK-O3]，不拿普通10K起点自动继承 |

**赛事日程不混届/混项目：**2027-01-16 另有 5 公里海滨跑与青年跑；**不属于** 01-17 全马 / 半马 / 10K 的同日组别 [HK-O2][HK-O4]。多枪分批不可只存一个 `startAt`。总关门时长**不等于**每枪同一个截止时刻，必要时由当届官方关门表核验。

## 1.3 参赛执行事实

- **全马资格：**2027 年年满 20 岁（以出生年份计算）；2025-01-01 至 2026-08-31 期间曾完成至少一场 10 公里或以上正式赛事，并在报名时如实填报成绩。[HK-O1]
- **分枪差异：**挑战组、一组、二组起跑时间不同；如需标识各年龄子组，依官方当届规则，不能把年龄子组当成新增赛道距离。[HK-O1]
- **起终点异地：**全马从尖沙咀出发，铜锣湾维园完赛；清晨交通与赛后回酒店应分开规划。[HK-O1]
- **路线执行：**2027 年主办方称赛事赛道沿用既有框架 [HK-O4]，但每一座桥、隧道的具体当届转折与交通通告仍以最终官方路线图 / 赛前跑手手册为准；2026 赛道经验只作历史研究。
- **赛前集合、行李寄存、分区入口、赛事当日港铁首班车 / 特别班次：Pending**，不可用 2026 年时刻表替代。

## 2｜Race Guide：来自 V2 审核稿，产品侧原文，禁止编辑性改写

## A｜跑渣打香港马拉松，是一种什么体验？

香港马拉松最难忘的地方之一，是整座城市会在清晨变成赛道。跑者从尖沙咀弥敦道出发，离开密集的街区，奔上平时属于汽车的城市道路，再一路跑向维多利亚港另一侧的维多利亚公园。沿途的高架路、桥梁与隧道，让这 42 公里拥有很强的香港辨识度。

但渣马并不是一条可以轻松巡航的城市道路。往届跑者反复提到起伏路段带来的节奏变化，尤其是进入西区海底隧道前后，疲劳与坡度会同时出现。跑到维园终点时的热闹与成就感，往往正是经历这些挑战之后才更鲜明。

## B｜RaceNext 怎么看渣打香港马拉松？

如果你希望跑一场具有国际大赛氛围，又能真正感受香港城市空间的马拉松，渣马值得放进候选清单。它不是把景点依次串起来的观光跑，而是让跑者在一个早晨穿过高速道路、隧道和繁忙城区，以另一种方式认识香港。

不过，RaceNext 不建议把它当成稳定平坦的 PB 赛道。历史赛道中持续的起伏、隧道环境和后程上坡，会让配速管理比想象中重要。2027 年全马分为三枪，异地参赛还必须解决比赛前很早起床、到达起点以及完赛后跨区返程的问题。

**RaceNext 更愿意把渣马理解为一场“香港城市体验很浓、比赛难度也不应被低估”的全马。**

## C｜为什么很多人会记住渣打香港马拉松？

### 01 / 把城市交通干道变成自己的赛道

尖沙咀的晨间起跑、高架道路上的开阔视野、最终进入维园，是香港马拉松与普通城市路跑不同的体验。往届现场照片和跑者赛记中，既能看到层层高楼，也能看见长长的跑者队伍穿过高架与桥梁。对外地跑者来说，平日无法以跑步方式通过的城市空间，本身就是这场比赛的吸引力。

### 02 / 到了后程，隧道和起伏会考验节奏

2026 年的第一人称全马复盘中，跑者明确提到约 33 公里后的西区海底隧道与随后上坡是整场最难处理的阶段之一；香港跑步媒体也专门讨论过西隧先下后上的体力消耗和隧道内较闷的体感。两份证据反映的是往届体验，不能直接代表 2027 精确公里点。

RaceNext 的判断是：如果以跑成绩为目标，前半程更应保留余力，后程需要根据起伏与个人状态调整配速，而不是坚持每公里完全相同的数字。

### 03 / 从很早的出发，到维园的完赛氛围

全马挑战组 06:00 起跑，其他组别也安排在清晨。2026 年的参赛者与赛事报道记录了清晨出发、沿线跑者队伍和完赛时的现场氛围。一场比赛从晨暗出发，到城市逐渐醒来，再进入维园完赛，构成了渣马很鲜明的时间记忆。

对 RaceNext 来说，这种氛围有真实体验价值，但不应让人忽视提早集合、交通和比赛后程的安排。

## D｜渣打香港马拉松适合你吗？

### 你希望跑一场具有强烈城市辨识度的全马

你期待的不只是 42.195 公里的成绩，还希望赛道本身值得记住。高架路、隧道、城市天际线与维园终点，是这场比赛很具体的吸引力。

### 你愿意为了更复杂的赛道认真准备

你能接受不完全平坦的城市路跑，也愿意根据后程起伏与身体状态调整节奏，而不是只寻找最容易刷新个人纪录的赛道。

### 你可以妥善安排跨城参赛与清晨出发

你愿意把早起、赛前交通、比赛日行李和赛后返程纳入计划。对异地跑者，这些安排和比赛训练一样值得认真对待。

如果已经决定去香港跑渣马，接下来值得先安排的是住在尖沙咀起点附近，还是更方便完赛后从维园返回的港岛区域。

## 3｜住宿 Final Integration Input（用户指定的五家及携程 Action）

### 01｜香港美丽华酒店（The Mira Hong Kong）

**hotelName：** 香港美丽华酒店（The Mira Hong Kong）

**recommendationTitle：** 尖沙咀起点片区优先

**recommendationReason：** 位于尖沙咀弥敦道，处于全马起点所在的街区，适合希望赛前住在九龙、减少清晨跨区出行的跑者。

**provider：** `ctrip`
**hotelId：** `419352`
**appId：** `wx0e6ed4f51db9d078`
**path（用户原始值，逐字符保留）：**

```text
/pages/hotel/detail/index?id=419352&inday=2026-11-21&outday=2026-11-22&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1795075003597&sct=open_platform
```

### 02｜香港恒丰酒店（Prudential Hotel）

**hotelName：** 香港恒丰酒店（Prudential Hotel）

**recommendationTitle：** 佐敦站与九龙赛前住宿

**recommendationReason：** 位于佐敦地铁站上盖、弥敦道沿线，适合希望兼顾九龙住宿和日常港铁出行的全马跑者。与尖沙咀核心街区的酒店相比，这里提供另一种九龙住宿位置选择。

**provider：** `ctrip`
**hotelId：** `437133`
**appId：** `wx0e6ed4f51db9d078`
**path（用户原始值，逐字符保留）：**

```text
/pages/hotel/detail/index?id=437133&inday=2026-11-21&outday=2026-11-22&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1795075039499&sct=open_platform
```

### 03｜富豪九龙酒店（Regal Kowloon Hotel）

**hotelName：** 富豪九龙酒店（Regal Kowloon Hotel）

**recommendationTitle：** 赛事合作酒店与尖东住宿

**recommendationReason：** 位于尖沙咀东，2027 年赛事曾与酒店合作推出专属住宿套餐。适合希望住在九龙、将赛前准备与尖沙咀一带活动放在同一区域的跑者。

**provider：** `ctrip`
**hotelId：** `370811`
**appId：** `wx0e6ed4f51db9d078`
**path（用户原始值，逐字符保留）：**

```text
/pages/hotel/detail/index?id=370811&inday=2026-11-21&outday=2026-11-22&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1795075067761&sct=open_platform
```

### 04｜香港柏宁酒店（The Park Lane Hong Kong）

**hotelName：** 香港柏宁酒店（The Park Lane Hong Kong）

**recommendationTitle：** 维园终点旁的赛后住宿

**recommendationReason：** 位于铜锣湾维多利亚公园旁，适合更重视全马完赛后尽快回酒店休息的跑者。选择港岛住宿的全马选手，需要把清晨前往尖沙咀起点一并纳入行程。

**provider：** `ctrip`
**hotelId：** `346244`
**appId：** `wx0e6ed4f51db9d078`
**path（用户原始值，逐字符保留）：**

```text
/pages/hotel/detail/index?id=346244&inday=2026-11-21&outday=2026-11-22&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1795075105059&sct=open_platform
```

### 05｜铜锣湾如心酒店（Nina Hotel Causeway Bay）

**hotelName：** 铜锣湾如心酒店（Nina Hotel Causeway Bay）

**recommendationTitle：** 天后站与维园周边住宿

**recommendationReason：** 位于天后站一带，靠近维多利亚公园，适合希望赛后留在港岛休息、兼顾平时地铁出行的跑者。对于清晨从尖沙咀起跑的组别，住宿选择还要考虑赛前跨海出发。

**provider：** `ctrip`
**hotelId：** `427031`
**appId：** `wx0e6ed4f51db9d078`
**path（用户原始值，逐字符保留）：**

```text
/pages/hotel/detail/index?id=427031&inday=2026-11-21&outday=2026-11-22&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1795075137139&sct=open_platform
```

## 4｜已选 Cover / Hero 及性能准入

| 属性 | 原始资产 | 轻量显示候选 |
| --- | --- | --- |
| 文件 | `assets/hk-marathon-2027-original.png` | `assets/hk-marathon-2027-display-v1.jpg` |
| 尺寸 | 2048×657 px | 1600×513 px |
| 文件大小 | 2,270,230 bytes (2.17 MiB) | 224,394 bytes (219.1 KiB) |
| SHA-256 | `916d35704bbcd81ae1a6c2ba06ceeff78779ffd5b40cc4e8eb04d48a9a06798e` | `0d7e9b306a8de05d8c5862b6b5761722178ed0e3664e6da6050c5f9e0a57b162` |
| 用途 | 只存 Original，非线上大图 | 同一张用于 Cover / Hero |

**画面 QA：****高风险：**原图 2048×657，长宽比约 3.12:1。现有列表 16:9 / Hero 约 2:1 的 `aspectFill` 居中裁切，会切除左右两个主办方标识，并可能裁掉底部 slogan / 日期的左右部分；本项目同时在卡片/详情叠加赛事标题，必须检查文字相互遮挡。禁止为了凑 16:9 擅自覆盖原图、移动/抹去商标、补画素材或静默改变已选图片。可先沿用现有图片展示方式进行预览，若不可接受，**图片发布 Hold，Human 选择处理**。

**图片来源与使用权：**Human 本次选定并上传；视觉中含主办方/赛事品牌元素。尚无单独的可证明商业二次使用授权、摄影作者或原始下载 URL。Asset Registry 可登记 `sourceType=user_provided`、`sourceDescription=Human-selected event campaign visual`、`imageYear=2027 KV（图片视觉对应2027；拍摄年份未证明）`、`copyright/usage=HUMAN_SELECTED_RIGHTS_UNVERIFIED`（实际字段以现有结构为准）。**不得伪造已授权标记**。允许隔离分支集成与预览；正式对公众发布图片前需 Human 按现有标准确认权利状态。

**图片性能门槛：**线上引用轻量显示图；单图原则上 ≤600KiB（优选 300–500KiB，但不以降低可读性凑字节数）；不得直接请求 PNG 原图。使用实际小程序冷缓存/热缓存和线上 Content-Length、Content-Type 验证；不能以文件名或本机 size 代替网络加载数据。

## 5｜事实与内容治理（内部，不向用户展示）

### 2027 全马明确可用字段
- 2027-01-17（Asia/Hong_Kong / UTC+08:00），42.195 km，尖沙咀弥敦道起跑、维多利亚公园完赛，项目关门总时限 6 小时。
- **官方三枪**：挑战组 06:00、一组 06:25、二组 06:50；不要压成单个发枪时刻，更不能将三枪 + 6h 简化为统一精确关门时刻。
- 半马、10K、轮椅赛确为当届赛项，但组别独立发枪、部分起终点、关门仍 Pending；逐组别执行现有 Published Eligibility，不用 2026 方案替代。
- 1 月 16 日的 5K 海滨跑 / 青少年跑不是 1 月 17 日主赛的同日普通组别，不因同一官网混入此 Edition 的主赛 Categories。
- 官方 2027「跑·住·食」富豪九龙套餐权益不属于本次携程普通订房 Action。


**酒店名称与风险备注：**携程当前将酒店 04 展示为「香港柏宁酒店．傲途格精选 / The Park Lane Hong Kong, Autograph Collection」，本交付沿用用户所给名称，Hotel ID 346244 确认身份，Codex 不可误指其他柏宁酒店。

**图片、住宿、内容均来自 Human 本次明确选择和 V2 审稿。** 但未能核实的关键事实不得由 Codex 从浏览器搜索结果臆测，也不得为了让 Public API 返回 200 而放宽 Fact Gate；未满足条件的组别保留 Pending，按当前现有发布规则决定是否允许部分组别上线。

## 4.1 Pending / Conflict / Publish Risk

| 编号 | 影响范围 | Pending / 风险 | 当前证据 | 解锁条件 / 影响 |
| --- | --- | --- | --- | --- |
| HK-P1 | 半马 / 10K / 轮椅赛 | 分组正式发枪、关门时限与准确起终点细节缺乏同等级当届直接证据 | 当届报名项目及香港政府简介 | 读取官网对应 tab、当届组别规程或赛前通知；**阻止这些组别不完整事实的正式发布** |
| HK-P2 | 全马 | 三枪已确认，但精确到当地钟点的最终清场/关门表未核实 | 官方全马 6h 与 3枪 [HK-O1] | 官网当届关门表；不从第一枪加6h给所有组别 |
| HK-P3 | 住宿 | 起点检录入口、路障、清晨地铁和运动员行李方案 | [HK-O1] 与历史交通报道 | 2027 官方交通通知；正式推荐仅使用谨慎措辞 |
| HK-P4 | 住宿 | 官方特别酒店套餐权益 vs 普通携程订单 | [HK-O6] | 普通酒店不得继承套餐权益；既有文案已作隔离 |
| HK-P5 | 媒体与图片 | 图片授权、真实原图分辨率、用图范围均未验证 | 官方图库和媒体图片候选 | Human 选图 + 许可核验；**发布图片 Hold** |
| HK-P6 | 数据治理 | Event/Edition/Category 稳定 ID、原有赛事是否曾收录 | 仅研究建议 | Codex 在现有 Canonical 核查，禁止擅自覆盖历史届次 |



## 4.2 Evidence Index（核验日 2026-11-18）

| ID | 来源类型 / 届次 | 原始网址 | 支持范围与限制 |
| --- | --- | --- | --- |
| HK-O1 | Tier1 官方 / 2027 | https://www.hkmarathon.com/zh-hant/race-information | 全马日期、3枪、资格、起终点、人数、总时限；本次可读页面主体显示全马信息 |
| HK-O2 | Tier1 官方 / 2027 | https://www.hkmarathon.com/zh-hant/important-dates | 2026报名与抽签节点、2027领物/比赛日 |
| HK-O3 | Tier1 官网链接的报名系统 / 2027 | https://hkmarathon.fringebackerevents.com/events/standard-chartered-hong-kong-marathon-2027/register/select-type/ | 2027 项目身份，报名入口自身不是全部当届事实的无限权威 |
| HK-O4 | Tier1 官方 / 2027 | https://www.hkmarathon.com/message-from-the-chairman | 比赛总人数78,000、半马名额29,000、赛道框架、2027日期 |
| HK-O5 | 政府赛事介绍 / 2027 | https://www.brandhk.gov.hk/en/mega-event/what%27s-on-in-hong-kong?cat=Standard+Chartered+Hong+Kong+Marathon+2027 | 主要项目与起终点地理位置；仍需具体组别官方时间表 |
| HK-O6 | Tier1 官方住宿 / 2027 | https://www.hkmarathon.com/zh-hant/run-stay-food-room-package | 富豪九龙官方套餐含独立权益，不能附带到 OTA 普通房型 |
| HK-R1 | 第一人称个人赛记 / 2026 | https://rickiekwong.blogspot.com/2026/05/hong-kong-marathon-2026-seoul-marathon_01122165724.html | 2026 全马约33公里西隧及后续起伏的实际感受；非2027路线事实 |
| HK-R2 | 第一人称个人赛记 / 2026 | https://running.biji.co/index.php?act=detail&id=58083&q=review&subtitle=2026+%E6%B8%A3%E6%89%93%E9%A6%99%E6%B8%AF%E9%A6%AC%E6%8B%89%E6%9D%BE%E9%AD%94%E9%AC%BC%E8%B3%BD%E9%81%93 | 外地跑者抽签、早起参赛及桥隧体验；不得写成普遍体验 |
| HK-M1 | 跑步专业媒体 / 2026 | https://www.hk01.com/%E8%B7%91%E6%AD%A5/60305690/ | 2026 西隧上下坡策略，非2027官方线路 |
| HK-M2 | 赛事现场媒体 / 2026 | https://www.wenweipo.com/a/202601/19/AP696d743fe4b04d7d56cf37a8.html | 2026 现场氛围和大量选手道路画面 |
| HK-H1 | 商业住宿资料 / 2026 核对 | https://www.themirahotel.com/hong-kong/ | 酒店身份地址 118–130 Nathan Road，港铁/赛事入口待确认 |
| HK-H2 | 酒店资料 / 2026 核对 | https://www.prudentialhotel.com/ | 佐敦站上盖、地址222 Nathan Road，普通住客非赛事体验 |
| HK-H3 | 酒店及赛事官方 / 2027 | https://www.regalhotel.com/regal-kowloon-hotel/en/home.html | 71 Mody Road，赛事合作详情见 HK-O6 |
| HK-H4 | 酒店官方 / 2026 核对 | https://www.parklane.com.hk/ | 铜锣湾维园侧身份；当前价格/可订性未维护 |
| HK-H5 | 酒店官方 / 2026 核对 | https://www.ninahotelgroup.com/en/nina-hotel-causeway-bay | 18 King's Road，天后附近；具体比赛管制待核 |
| HK-IMG | 当届主办方图库索引（实拍为历史年份） | https://www.hkmarathon.com/zh-hant/event-photos | 2026/2025 官方照片入口，版权可用性不等于开放商用 |



## 6｜本场交付与 QA Gate

1. 核对官方名称、当届来源、赛事日期、每个 Category 的距离语义/起终点/时区和多枪，不跨届补值；适用字段按现有 Source Registry 治理记录 URL、Source Type、对应 Edition、用途及 Evidence。
2. 产品内容只接 **第 2 节 Race Guide** 和 **第 3 节五家酒店的 Title / Reason / Action**。第 1/5 节是事实与治理；`Trail Strategy HOLD`、内部 Pending、Evidence ID、研究状态均不得出现在小程序 UI。
3. 校验五家 Hotel ID 和顺序，逐字验证五条 AppID/Path（含原始 inday/outday、guid 和参数顺序），逐家真机跳转/回退/手动调整入住日期；未执行就标 `Not Verified`。
4. 复用现有图片/分享生成器，在首页 Cover、详情 Hero、分享图上检查尺寸、裁切、标题冲突、实际加载，不改产品 IA。两张原图不作为线上显示 URL。
5. 不影响原有 19 场及现有监测 Data PR，`Auto Apply=OFF`，不覆盖人工 Pending 审核与 Source Registry 既有数据；所有改动独立分支 + Draft PR，未取得后续发布批准不 Merge/Deploy。
6. 输出本场 `Canonical/Source/Guide/5 Hotel/5 Action/Image/Share/QA/Publish Eligible` 状态矩阵、缺口及分支 Handoff。不得把 `Integrated` 冒充 `Live`。
