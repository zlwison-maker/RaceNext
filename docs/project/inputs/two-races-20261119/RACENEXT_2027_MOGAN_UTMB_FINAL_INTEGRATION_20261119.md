# RaceNext｜2027 莫干山越野赛 by UTMB® · Codex 正式接入交付包（2026-11-19）
> **用途：**Codex 集成输入（工程授权范围内），不是“已部署”或“直接上线”的事实。
> **用户当次明确决定：**本赛事纳入开发；以下五家酒店与顺序、携程 Action 均由 Human 提供；Cover / Hero 共用指定原图。沿用 V2 Race Guide 与 V1.2 住宿理由，禁止自行重新研究或改写。
> **阶段：**`Selected for Integration / Development Allowed`；事实 Publish Gate、图片商用授权与真机验证仍需独立验收。
> **最高优先级：**最新 Human Decision → 当前冻结标准 → 有证据的 2027 当届事实 → 当前仓库实际 Schema 与 Gate。历史 V2 的“0 条 Action／未选图”状态已被本次决定更新。

## 0｜身份、工程范围及文件资产

- 官方赛事展示名候选：**2027 莫干山越野赛 by UTMB®**；英文 **Ultra-Trail Mogan by UTMB® 2027**。正式 Edition 展示名请直接对照官网当前当届写法；中文年序/繁简体按现有规范处理，**不得随意删冠名或把研究简称当正式名字**。
- 建议 Event ID：`ultra-trail-mogan-by-utmb`；建议 Edition ID：`ultra-trail-mogan-by-utmb-2027`。**只是研究候选 ID**：Codex 必须先检查实际 Canonical / 是否已有历史 Edition，禁止因为候选 ID 就新建重复 Event。
- 本轮只有两场，另一场见同批交付；不做东京、其它比赛或重构。
- 已选用户原始图片：`assets/mogan-utmb-2027-original.png`。已预制的无裁切轻量候选：`assets/mogan-utmb-2027-display-v1.jpg`。两者源自本次用户附件；Cover / Hero 复用同一显示图的 URL。Codex 可以复用既有图片处理流水线重新生成，但必须保持画面不变、输出可追踪 Hash 与实际加载体积。
- AppID：`wx0e6ed4f51db9d078`。全部酒店 Path **Opaque String**，不做 URL 重编码、不生成日期、不改变参数顺序。
- 可信来源与研究 Evidence 在本文件后部；与 Public DTO / UI 文案分离。

## 1｜当届官方事实候选（带 Pending，不直接执行数据写入）

# 01｜赛事基础信息（当届事实审核稿）

## 1.1 Event / Edition

| 字段 | 2027 核验结果 | 证据与范围 |
| --- | --- | --- |
| 当届赛事名称 | **2027 莫干山越野赛 by UTMB®**（官网中文品牌为「莫干山越野赛 by UTMB®」，年份作为 Edition 区分） | [MG-O1][MG-O2]；不额外加入未经核实冠名 |
| 英文名称 | **Ultra-Trail Mogan by UTMB® 2027** | [MG-O2] |
| Event 候选 ID | `ultra-trail-mogan-by-utmb` | 待 Codex 核查既有 identity；非正式录入 ID |
| Edition 候选 ID | `ultra-trail-mogan-by-utmb-2027` | 待工程身份审定 |
| 类型 | 山地越野 / UTMB World Series | 主办方官网 [MG-O1] |
| 日期 | **2027-04-16 至 04-18** | 2027 报名页 [MG-O2] |
| 地点 | 中国浙江省湖州市德清县莫干山国际旅游度假区 | 官方 [MG-O2] |
| 时区 | Asia/Shanghai（UTC+08:00） | 当届中国大陆赛事当地时间 |
| 报名入口 | 中国境内：https://lungkingos.lungking.com/s/evps2696 ；境外：https://in.register-utmb.world/2027-ultra-trail-mogan-by-utmb1790650885114 | 仅作为官网指向的当届入口，具体是否开放应实时以各渠道为准 [MG-O2] |
| 报名状态 | **不统一认定“全部开放”**；官网部分项目显示「已截止」或「即将推出」，各组别/渠道状态需按 2026-11-18 单独核验 | [MG-O1][MG-O2]，不可凭官网按钮统一回写全部组别 |

## 1.2 Category Facts（必须同时保留「组别称呼」与官方当前页面距离）

2027 主办方报名概览将六组标记为 **100K / 65K / 50K / 35K / 20K / 10K**，但是组别详情的 `Distance` 分别显示 96 / 67 / 52 / 36 / 23 / 10 KM。下表**原样并列**，前一列是官方组别标签，后一列是具体官方页面宣称的赛道距离。当前 `Category.distanceKm` 的冻结定义是“官方组别标称距离”：官网报名页的“DMG 100K / CMG 65K / MMG 50K”等是组别标称身份，而详情页的“Distance 96/67/52”等是另一个数值口径，**可能是实际路线长度，但官网当前页面未明确给出两者语义对应解释**。正式接入时必须分别留存原文、按现有语义 Gate 审核；可提出按报名概览官方组别名称使用标称值的建议，但未经 Human 核准不得擅自把详情 Distance 写成 `distanceKm`，也不得声称“官方组别名称就是实际距离”。此差异为 **MG-P1 Publish Gate**。

| 2027 Category（官方标签） | 页面 Distance（可能为当届实际赛道距离） | 累计爬升 | 关门总时限 | 当届起跑时间（UTC+8） | 当届起点 | 终点 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DMG 100K | **96 km** | **5,000 m+** | **28h** | **04-16 20:00** | 郡安里 Jun'anli | 郡安里（路线介绍为环线） | [MG-O3] |
| CMG 65K | **67 km** | **3,400 m+** | **19h** | **04-17 07:00** | 裸心谷 naked Stables | 郡安里（路线介绍） | [MG-O4] |
| MMG 50K | **52 km** | **2,900 m+** | **15h** | **04-16 22:00** | 郡安里 Jun'anli | 郡安里（路线介绍为环线） | [MG-O5] |
| NMG 35K | **36 km** | **1,900 m+** | **11h** | **04-17 09:00** | 官网写作 `J.LALLI VALLEY`（酒店品牌英文名与郡安里相同，具体集合入口待核） | 具体终点 **Pending** | [MG-O6]，见数据污染提示 |
| EMG 20K | **23 km** | **1,200 m+** | **7h** | **04-18 09:00** | 官网写作 `J.LALLI VALLEY`（酒店品牌英文名与郡安里相同，具体集合入口待核） | 详情描述为郡安里环线，但正式出入口 **Pending** | [MG-O7] |
| 10K | **10 km** | **300 m+** | **3h30m** | **04-18 10:00** | 官网写作 `J.LALLI VALLEY`（酒店品牌英文名与郡安里相同，具体集合入口待核） | 详情描述为环线；精确终点 **Pending** | [MG-O8] |

**质量 Gate：**

1. 官方详情的 96/67/52/36/23 不应被说成“上届公里数”；这些是 2027 详情页面真实字段，但语义和标称关系尚待官方确认。
2. 官方 NMG 页面出现不属于莫干山的「Jiameng Ancient Battlefield / Dazhao Post Station / Liujiayan Cliff」等异地文化段落，疑似模板错误；**绝对不能进入本场路线、Race Guide 或住宿逻辑**，相关路线描述需二次官方核验。[MG-O6]
3. 2026 莫干山 by UTMB 旧页面曾使用其他赛程与爬升数值，本包不拿它们补 2027 组别。
4. `J.LALLI VALLEY` 与「莫干山郡安里度假酒店」的英文名有明确对应线索 [MG-H3]，但赛事写法是否对应同一运动员入口尚未直接核实；保留官网原字段、待当届线路图确定坐标，不从酒店名称推导精确起点。
5. 具体 CP、补给、接驳和分站关门时间均未取得当届完整直接依据，继续 Pending。

## 1.3 参赛执行事实（仅确认能落地的部分）

- **百公里深夜赛事：** DMG 2027-04-16 20:00 起跑、28h 总时限，至少涉及夜间运动；**赛道哪段最难、夜间爬升如何分布，仍需当届 GPX / CP / 海拔图**。[MG-O3]
- **不同起点：** 2027 CMG 从裸心谷出发，而 DMG / MMG 从郡安里出发，不可全体复制一个 `startLocation`。[MG-O3][MG-O4][MG-O5]
- **赛事规则：**官网中文竞赛规程要求全程携带强制装备，遵守半自主/自给自足原则；补给站之间需携带可支持至下一站的食物与水。无一次性餐具，参赛者需自行准备适用容器；如使用手杖，需要遵守赛事要求（如须全程携带）。这是官网通用规则，**对应 2027 具体装备清单仍需核对**。[MG-O9]
- **Running Stones：**官网详情显示 DMG 3、CMG 3、MMG 2、NMG 2、EMG 1；10K 未取得对应 Stone，留 Pending；最终名额与 UTMB 资格条件以当届赛事公告为准。[MG-O3–O8]
- **报名、强装、赛前领物、夜间摆渡、医疗点和 CP 精确时刻：**尚不能作为已确认的当届 Category Facts。

## 2｜Race Guide：来自 V2 审核稿，产品侧原文，禁止编辑性改写

## A｜跑莫干山越野赛 by UTMB，是一种什么体验？

莫干山越野赛最有辨识度的地方，是跑者很快就会从度假小镇走进真正的江南山林。竹海、茶田、山间古道和起伏的山脊交替出现，路面也会从容易奔跑的道路切换成需要留意脚下的山径与石阶。这里并不是遥远荒野，却有相当真实的山地挑战。

往届跑者记住莫干山的，不只有竹林景色。2026 年的参赛复盘里，有人提到降雨后的泥泞和湿滑，也有人谈起长时间运动中的温差、体力消耗与赛道体验。2027 年的组别从短距离延伸到百公里，比赛当天的天气和所选组别，会让这场山野之行呈现非常不同的样子。

## B｜RaceNext 怎么看莫干山越野赛 by UTMB？

如果你希望参加一场既有江南山地景观、又能认真检验越野能力的比赛，莫干山 by UTMB 值得考虑。它的独特之处在于，跑者可以把一场越野赛与莫干山的竹林、村落和度假体验连在一起，而不同距离也提供了不同强度的挑战。

但 RaceNext 不建议因为它靠近长三角城市、交通相对方便，就把这里当成没有技术难度的休闲跑。2027 年百公里组在夜间出发，官网公开的累计爬升达到 5,000 米；即使是较短组别，也有明确的爬升和比赛时限。往届雨后泥泞与湿滑的真实反馈，更提醒跑者不要只用公里数判断难度。

**RaceNext 更愿意把莫干山 by UTMB 理解为一场“江南山野有吸引力，但组别与天气都需要认真对待”的越野赛。**

## C｜为什么很多人会记住莫干山越野赛 by UTMB？

### 01 / 从竹林到古道，赛道有鲜明的江南气质

赛事官网将竹海、茶田、古道和山间村落作为核心环境。2027 年长距离路线介绍也涵盖竹林山脊与水库周边；山景不会只停留在远处，而是成为跑者持续穿行的地形。

对愿意为赛道环境专程来一趟的跑者而言，这是莫干山很具体的吸引力。不过，不同组别并不经过相同地点，不能把百公里描述的全部景观承诺给 20K 或 10K。

### 02 / 雨后的泥路，可能改变整场比赛的感觉

2026 年的越野跑者访谈里，参与 50K、短距离和超长距离的几位跑者从不同视角谈到了雨天、泥泞和温差。德清当地的赛事医疗保障记录，也确认当届降雨导致赛道湿滑、能见度下降。

这些是 2026 年的经验，不意味着 2027 年一定下雨。RaceNext 的判断是：脚下稳定性、湿滑下坡能力和可应对天气变化的装备准备，应该在赛前训练中得到验证，而不是在正式比赛里第一次尝试。

### 03 / 从短距离体验到百公里夜跑，组别差异很大

2027 年 DMG 100K 在晚上 20:00 起跑；CMG 65K 从裸心谷出发，与郡安里起跑的组别并不相同。组别的出发时间、起终点和累计爬升都存在显著差异，意味着相同的赛事品牌下，选手面对的是不同参赛任务。

RaceNext 建议先看自己是否具备相应的山地爬升和夜间经验，再看路线长度。对准备从公路跑转向越野的人来说，选择更短的组别也不意味着可以忽略山地训练。

## D｜莫干山越野赛 by UTMB 适合你吗？

### 你喜欢有明确山野环境的越野赛事

你期待竹林、山径、村落和古道交织的赛道，也愿意接受真实的山地起伏，不只是去一个风景好的地方跑步。

### 你愿意根据爬升与经验选择组别

你不会只看 20K、50K 或 100K 的数字，而会结合爬升、比赛时间、出发方式和自身经验做选择；准备参加长距离时，也愿意验证夜间行进能力。

### 你愿意把比赛和莫干山的旅行结合起来

你希望参赛行程不只剩下起跑和完赛，也愿意花时间了解山村、竹林与当地生活，同时能够为比赛前后的交通和休息留出足够时间。

如果已经决定去莫干山参赛，接下来要先确认自己的组别从哪里出发、在哪里完赛，再决定是住郡安里、裸心谷附近，还是庾村一带。

## 3｜住宿 Final Integration Input（用户指定的五家及携程 Action）

### 01｜莫干山郡安里度假酒店

**hotelName：** 莫干山郡安里度假酒店

**recommendationTitle：** DMG / MMG 郡安里起点片区

**recommendationReason：** 位于郡安里度假区，也是 2027 年 DMG 和 MMG 官网标注的起跑区域。适合参加这两个夜间出发组别、希望将住宿与赛事起点安排在同一片区的跑者。

**provider：** `ctrip`
**hotelId：** `1748643`
**appId：** `wx0e6ed4f51db9d078`
**path（用户原始值，逐字符保留）：**

```text
/pages/hotel/detail/index?biz=1&id=1748643&inday=2026-11-19&outday=2026-11-20&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1795075209091&sct=open_platform
```

### 02｜莫干山裸心谷度假村

**hotelName：** 莫干山裸心谷度假村

**recommendationTitle：** CMG 65K 裸心谷区域住宿

**recommendationReason：** 位于裸心谷度假区域，与 2027 年 CMG 的官方起跑片区相对应，适合希望减少比赛早晨跨区域奔波的跑者。该组别在郡安里完赛，适合已安排好赛后返程的参赛者。

**provider：** `ctrip`
**hotelId：** `901389`
**appId：** `wx0e6ed4f51db9d078`
**path（用户原始值，逐字符保留）：**

```text
/pages/hotel/detail/index?id=901389&inday=2026-11-21&outday=2026-11-22&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1795075239792&sct=open_platform
```

### 03｜莫干山街角美宿（庾村广场店）

**hotelName：** 莫干山街角美宿（庾村广场店）

**recommendationTitle：** 往届 UTMB 参赛住宿参考

**recommendationReason：** 位于莫干山镇庾村片区，2026 年有真实住客明确记录为了参加莫干山 by UTMB 入住，并认可赛事期间的住宿与出行便利。适合偏好当地民宿、希望参考实际参赛住宿经验的跑者。

**provider：** `ctrip`
**hotelId：** `8340871`
**appId：** `wx0e6ed4f51db9d078`
**path（用户原始值，逐字符保留）：**

```text
/pages/hotel/detail/index?id=8340871&inday=2026-11-21&outday=2026-11-22&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1795075272987&sct=open_platform
```

### 04｜莫干山丰赡楼民宿（庾村广场店）

**hotelName：** 莫干山丰赡楼民宿（庾村广场店）

**recommendationTitle：** 庾村镇区官方住宿候选

**recommendationReason：** 位于莫干山镇庾信北街，赛事官网以“莫干山丰赡楼客栈”名称将其列入住宿推荐。适合希望住在庾村镇区、兼顾赛事活动与日常用餐的跑者。

**provider：** `ctrip`
**hotelId：** `60933147`
**appId：** `wx0e6ed4f51db9d078`
**path（用户原始值，逐字符保留）：**

```text
/pages/hotel/detail/index?id=60933147&inday=2026-11-21&outday=2026-11-22&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1795075299977&sct=open_platform
```

### 05｜莫干山加怡颐珀金陵酒店

**hotelName：** 莫干山加怡颐珀金陵酒店

**recommendationTitle：** 赛前休息与赛后莫干山旅行

**recommendationReason：** 位于莫干山国际旅游度假区后洪片区，同样被赛事官网列入住宿推荐。适合已安排好参赛往返交通、希望在比赛前后多留些时间体验莫干山的跑者。

**provider：** `ctrip`
**hotelId：** `120729595`
**appId：** `wx0e6ed4f51db9d078`
**path（用户原始值，逐字符保留）：**

```text
/pages/hotel/detail/index?id=120729595&inday=2026-11-21&outday=2026-11-22&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1795075325341&sct=open_platform
```

## 4｜已选 Cover / Hero 及性能准入

| 属性 | 原始资产 | 轻量显示候选 |
| --- | --- | --- |
| 文件 | `assets/mogan-utmb-2027-original.png` | `assets/mogan-utmb-2027-display-v1.jpg` |
| 尺寸 | 1792×914 px | 1600×816 px |
| 文件大小 | 2,023,824 bytes (1.93 MiB) | 191,202 bytes (186.7 KiB) |
| SHA-256 | `65e82569718df9b1439a4705b344c3e7c8a49baa11cb18c33f89afce9dd5053d` | `db8866592baa066b190cc531400d769ca1a695789971c1d0d098e27df279e92c` |
| 用途 | 只存 Original，非线上大图 | 同一张用于 Cover / Hero |

**画面 QA：**原图 1792×914，约 1.96:1，作为 Hero（约 2:1）视觉上接近；Cover 16:9 会轻微裁去上下。画面有醒目的中央赛事 Logo，必须检查既有 UI 叠加的标题是否与大字重叠，特别是小屏。保留品牌图原有 Logo，不擅自清除、重排或生成其它视觉。

**图片来源与使用权：**Human 本次选定并上传；视觉中含主办方/赛事品牌元素。尚无单独的可证明商业二次使用授权、摄影作者或原始下载 URL。Asset Registry 可登记 `sourceType=user_provided`、`sourceDescription=Human-selected event campaign visual`、`imageYear=2027 KV（图片视觉对应2027；拍摄年份未证明）`、`copyright/usage=HUMAN_SELECTED_RIGHTS_UNVERIFIED`（实际字段以现有结构为准）。**不得伪造已授权标记**。允许隔离分支集成与预览；正式对公众发布图片前需 Human 按现有标准确认权利状态。

**图片性能门槛：**线上引用轻量显示图；单图原则上 ≤600KiB（优选 300–500KiB，但不以降低可读性凑字节数）；不得直接请求 PNG 原图。使用实际小程序冷缓存/热缓存和线上 Content-Length、Content-Type 验证；不能以文件名或本机 size 代替网络加载数据。

## 5｜事实与内容治理（内部，不向用户展示）

### 2027 当届组别：官方「名称」与「Distance 字段」必须分列
| 当届组别标签 | 详情页 Distance | 累计爬升 | 发令（北京时间） | 总关门 | 起点原文 / 已有线索 |
| --- | ---: | ---: | --- | --- | --- |
| DMG 100K | 96 km | 5,000m+ | 04-16 20:00 | 28h | Jun'anli（郡安里片区） |
| CMG 65K | 67 km | 3,400m+ | 04-17 07:00 | 19h | naked Stables（裸心谷区域） |
| MMG 50K | 52 km | 2,900m+ | 04-16 22:00 | 15h | Jun'anli（郡安里片区） |
| NMG 35K | 36 km | 1,900m+ | 04-17 09:00 | 11h | J.LALLI VALLEY，准确入口 Pending |
| EMG 20K | 23 km | 1,200m+ | 04-18 09:00 | 7h | J.LALLI VALLEY，准确入口 Pending |
| 10K | 10 km | 300m+ | 04-18 10:00 | 3h30m | J.LALLI VALLEY，准确入口 Pending |

**`Category.distanceKm` 属于官方标称距离语义**。项目标签 100/65/50/35/20/10K 和详情 Distance 96/67/52/36/23/10KM 不是同一概念的当然替代；必须保留来源并走 Fact Review Gate。没有明确语义审批时禁止把 96/67 等直接填入 `distanceKm`，也禁止随意写 100/65 冲抵详情页数值。

**页面污染：**NMG 详情页夹杂 `Jiameng Ancient Battlefield / Dazhao Post Station / Liujiayan Cliff` 等与莫干山不符的模板内容，这些不可入路线、内容及 Registry 中的当届地理事实。

**DMG 100K Race Strategy = HOLD / NOT FOR PRODUCT；2027 CP / 具体补给 / 换装、分段关门 = Pending**。不得复制 2026 数据，也不因缺策略补写泛化补给段落。


**酒店名称与风险备注：**官网使用「莫干山丰赡楼客栈」，携程/用户当前名称为「莫干山丰赡楼民宿（庾村广场店）」；同 Hotel ID 60933147 对应。CMG 裸心谷起点 / 郡安里终点不同地，推荐理由中的赛后返程条件必须保留。

**图片、住宿、内容均来自 Human 本次明确选择和 V2 审稿。** 但未能核实的关键事实不得由 Codex 从浏览器搜索结果臆测，也不得为了让 Public API 返回 200 而放宽 Fact Gate；未满足条件的组别保留 Pending，按当前现有发布规则决定是否允许部分组别上线。

## 4.1 Pending / Conflict / Publish Risk

| ID | 涉及模块 | 未解问题、来源或冲突 | 当前处理及解除条件 |
| --- | --- | --- | --- |
| MG-P1 | **Canonical Category.distanceKm / 页面事实** | 官方项目标签 100/65/50/35/20K 与同届页面 `Distance` 96/67/52/36/23 KM 不一致 | **字段语义审核 Gate**；官网报名列表支持 100/65/50/35/20/10K 作为组别名称，详情页原样留存 96/67/52/36/23/10km。Human 确认官方标称口径及 `Category.distanceKm` 取值后再进 Canonical；不得把“页面 Distance”未经审查覆盖标称距离。 |
| MG-P2 | **NMG 官网页面身份** | NMG 35K 页面混入与莫干山无关的异地历史景点文字 | 标记异常，不能用于路线与 Race Guide；后续核验真实当届路线和内容模板 |
| MG-P3 | 多组别起终点 | `J.LALLI VALLEY` 可关联郡安里英文酒店名，但缺准确当届比赛入口及 NMG 等终点事实 | 对照 2027 官方路线图/赛事手册确认，不自行改成郡安里或庾村 |
| MG-P4 | DMG Strategy | 2027 CP / 海拔剖面 / 服务点 / 换装与补给表缺失 | **Race Strategy HOLD，不上线**；待直接官方 CP 与足量旗舰组选手分段赛记后定向补齐 |
| MG-P5 | 住宿 | 官网酒店“距离主会场”未证明针对2027起点；酒店交通、摆渡、退房及跨夜接驳 | 暂用候选谨慎表述；获取当届官方交通计划后再补充，不能自动沿用旧安排 |
| MG-P6 | 图片 | 候选图年份/版权/实际分辨率不足，官方 KV 可能并非现场图 | Human 选图与版权授权单独 Gate；不足时继续 Pending |
| MG-P7 | 数据 / 报名 | 六组各报名渠道状态随时间变化；官网按钮及报名外链未逐组完成结算页核验 | 仅记实时核验状态，不根据今日时间猜“售罄”或“报名开放”；需要再次读取入口 |
| MG-P8 | 身份 | 2027 新版组别与现有 Race Graph ID、2026 历史记录的映射未确认 | Codex 后续核查 Event/Edition/Category 稳定身份；不从旧年机械复制 |



## 4.2 Evidence Index（最后查询 2026-11-18）

| ID | 来源层级 / 年份 | 原始 URL | 可支撑内容 / 限制 |
| --- | --- | --- | --- |
| MG-O1 | Tier1 主办方 / 2027 | https://mogan.utmb.world/zh-Hans | 官方中文赛事名、2027 活动日期与主站背景；部分首页缓存可能出现 2026 旧信息，需核实具体段落 |
| MG-O2 | Tier1 主办方 / 2027 | https://mogan.utmb.world/registrations | 2027-04-16–18、六组标签、中国/国际报名入口；入口状态独立查询 |
| MG-O3 | Tier1 当届组别 / 2027 | https://mogan.utmb.world/races/DMG | DMG 96km、5000m+、04-16 20:00、28h、郡安里起终点的正文路线介绍 |
| MG-O4 | Tier1 当届组别 / 2027 | https://mogan.utmb.world/races/CMG | CMG 67km、3400m+、04-17 07:00、19h、裸心谷起点/郡安里终点 |
| MG-O5 | Tier1 当届组别 / 2027 | https://mogan.utmb.world/races/MMG | MMG 52km、2900m+、04-16 22:00、15h、郡安里环线 |
| MG-O6 | Tier1 当届组别 / 2027 | https://mogan.utmb.world/races/NMG | NMG 36km、1900m+、04-17 09:00、11h；**页面异地文化内容污染，不可采信该段路线介绍** |
| MG-O7 | Tier1 当届组别 / 2027 | https://mogan.utmb.world/races/EMG | EMG 23km、1200m+、04-18 09:00、7h；起点 `J.LALLI VALLEY` 未核中文名 |
| MG-O8 | Tier1 当届组别 / 2027 | https://mogan.utmb.world/races/10K | 10km、300m+、04-18 10:00、3h30m；部分具体出入口待核 |
| MG-O9 | 官方通用规程 / 2027 网站当前可读 | https://mogan.utmb.world/zh-Hans/runners/rules-regulation | 半自给自足、强装、补给与自带容器；不把通用 CP 规则当成 2027 具体服务表 |
| MG-O10 | 官方住宿 / 年份未标明 | https://mogan.utmb.world/zh-Hans/destination/accommodation | 丰赡楼、郡安里、加怡等推荐名称地址；未确认“距主会场”为2027版 |
| MG-R1 | 2026 亲历嘉宾音频与节目概要 | https://www.podparadise.com/episodes/68660016/ | 2026 多组跑者谈泥泞、雨、温差、长距离压力；非 2027 事实，部分转述需保留原对话限制 |
| MG-R2 | 真实住客平台评价 / 比赛年份待单条复核 | https://hotels.ctrip.com/hotels/8340871.html | 住客明确写“参加莫干山byUTMB越野赛定了这家民宿”；赛事专属住宿的一手材料，不证明2027服务 |
| MG-M1 | 德清医疗保障真实工作报道 / 2026 | https://redcross.huzhou.gov.cn/ywgz/yjjy/20260415/i4146702.html | 2026 降雨赛道湿滑、能见度下降、夜间保障，独立交叉证据 |
| MG-H2 | 酒店官网与 OTA / 2026 | https://hotels.ctrip.com/hotels/901389.html | 裸心谷酒店名称及德清县莫干山镇兰树坑村上下庄37号地址；不证明对应房间可以直达起点 |
| MG-H3 | 酒店品牌 / 2026 | https://hotels.ctrip.com/hotels/1748643.html | 郡安里度假酒店中文及 J.LALLI VALLEY 英文名相互对应；不能证明 2027 组别集合口位置 |
| MG-H4 | OTA 酒店名称 / 2026 | https://m.ctrip.com/html5/hotel/hoteldetail/60933147.html | 丰赡楼民宿当前携程正式名称，官网用客栈旧名；同地址 |
| MG-M2 | 地方经济采访 / 2026 | https://dqnews.zjol.com.cn/dqnews/system/2026/10/27/035320494.shtml | 莫干山赛事与跑者友好店铺氛围，不能冒充特定 2027 组委会服务 |



## 6｜本场交付与 QA Gate

1. 核对官方名称、当届来源、赛事日期、每个 Category 的距离语义/起终点/时区和多枪，不跨届补值；适用字段按现有 Source Registry 治理记录 URL、Source Type、对应 Edition、用途及 Evidence。
2. 产品内容只接 **第 2 节 Race Guide** 和 **第 3 节五家酒店的 Title / Reason / Action**。第 1/5 节是事实与治理；`Trail Strategy HOLD`、内部 Pending、Evidence ID、研究状态均不得出现在小程序 UI。
3. 校验五家 Hotel ID 和顺序，逐字验证五条 AppID/Path（含原始 inday/outday、guid 和参数顺序），逐家真机跳转/回退/手动调整入住日期；未执行就标 `Not Verified`。
4. 复用现有图片/分享生成器，在首页 Cover、详情 Hero、分享图上检查尺寸、裁切、标题冲突、实际加载，不改产品 IA。两张原图不作为线上显示 URL。
5. 不影响原有 19 场及现有监测 Data PR，`Auto Apply=OFF`，不覆盖人工 Pending 审核与 Source Registry 既有数据；所有改动独立分支 + Draft PR，未取得后续发布批准不 Merge/Deploy。
6. 输出本场 `Canonical/Source/Guide/5 Hotel/5 Action/Image/Share/QA/Publish Eligible` 状态矩阵、缺口及分支 Handoff。不得把 `Integrated` 冒充 `Live`。
