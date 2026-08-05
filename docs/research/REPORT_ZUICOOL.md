# Zuicool 数据源调查报告

调查日期：2026-06-30  
项目：RaceNext / 下一场  
阶段：数据源 POC 调查  
调查对象：最酷 Zuicool  
入口 URL：`https://zuicool.com/`

---

## 1. 数据源简介

Zuicool 是面向跑者的赛事信息与报名服务网站，覆盖马拉松、路跑、越野跑、铁人三项、骑行、徒步、线上赛和海外赛事等类型。

本轮调查目标不是开发正式爬虫，也不是抓取 Top100，而是判断 Zuicool 是否可以补足 RunChina 的缺口，尤其是：

- 报名状态
- 报名入口
- 报名截止时间
- 报名费用
- 赛事介绍
- 图片
- 多组别信息
- 越野赛事覆盖

本轮未进行：

- 全量抓取
- 登录
- 验证码处理
- App 逆向
- Normalize
- Merge
- 入库
- 前端修改

---

## 2. 入口与相关域名

### 2.1 主要入口

| 类型 | URL | 结论 |
|---|---|---|
| 首页 | `https://zuicool.com/` | 可访问，HTTP 200，SSR HTML |
| 赛事大全 | `https://zuicool.com/events` | 可访问，HTTP 200，SSR HTML，第一页含 100 条赛事 |
| 新开报名 | `https://zuicool.com/events/newreg` | 可访问入口，适合筛选报名相关赛事 |
| 报名中 | `https://zuicool.com/events/reg` | 可访问入口，适合筛选报名中赛事 |
| 即将截止 | `https://zuicool.com/events/comingend` | 可访问入口，适合筛选报名截止临近赛事 |
| 即将开始/预告 | `https://zuicool.com/events/booking` | 可访问入口 |
| 报名站首页 | `https://reg.zuicool.com/` | 可访问，HTTP 200，SSR HTML |

### 2.2 URL 规律

| 页面 | URL 规律 | 示例 |
|---|---|---|
| 赛事列表 | `/events?page=1&per-page=100` | `https://zuicool.com/events?page=1&per-page=100` |
| 分类筛选 | `/events?type={type}` | `https://zuicool.com/events?type=trail-run` |
| 地区筛选 | `/events?where={where}` | `https://zuicool.com/events?where=jiangzhe` |
| 月份筛选 | `/events?when={month}` | `https://zuicool.com/events?when=10` |
| 标签筛选 | `/events?t={tag}` | `https://zuicool.com/events?t=中国田径协会` |
| 赛事详情 | `/event/{eventId}` | `https://zuicool.com/event/86332` |
| 场次组别 | `/event/{eventId}/categories` | `https://zuicool.com/event/86332/categories` |
| 报名页 | `https://reg.zuicool.com/{regRaceId}` | `https://reg.zuicool.com/33836` |
| 组别报名 | `https://reg.zuicool.com/{regRaceId}/{categoryId}` | `https://reg.zuicool.com/33836/206309` |
| 成绩查询 | `/event/results?event_slug={eventId}` | `https://zuicool.com/event/results?event_slug=86332` |
| 资讯标签 | `/news/archives/tag/event{eventId}` | `https://zuicool.com/news/archives/tag/event86332` |

### 2.3 相关域名

| 域名 | 用途判断 | 本轮结论 |
|---|---|---|
| `zuicool.com` | 主站、赛事列表、赛事详情、资讯 | 核心数据源 |
| `www.zuicool.com` | 会跳转到 `zuicool.com` | 非主入口 |
| `reg.zuicool.com` | 报名站、报名列表、组别、费用、报名链接 | 核心补充源 |
| `s.pro.zuicool.com` | 赛事 logo / 标签图 | 可获取图片 URL |
| `zc3-op.bkt.zuicool.com` | 静态资源、banner、favicon、部分图片 | 图片/静态资源 |
| `zc3wp-uploads.bkt.zuicool.com` | 详情页正文图片 | 赛事介绍图片来源 |
| `data.reg.cdn.zuicool.com` | 报名站 CSS / JS 静态资源 | 非核心数据 |
| `stats.zuicool.com` | 统计脚本 | 非数据采集目标 |
| `hm.baidu.com` | 百度统计 | 非数据采集目标 |
| `res2.wx.qq.com` | 微信 JS SDK | 分享相关 |
| `cloud.umami.is` | 统计脚本 | 非数据采集目标 |
| `chinamarathon.com` / `chinatriathlon.com` / `chinagranfondo.com` / `gobichina.com` | 页脚关联站点 | 非本轮采集目标 |
| `mp.weixin.qq.com` | 公众号文章跳转 | 不建议采集 |
| `j.youzan.com` | 外部商业链接 | 不建议采集 |

### 2.4 robots.txt

`https://zuicool.com/robots.txt` 返回：

```text
User-agent: *
Disallow: /news/wp-content/
```

本轮访问范围未触及被禁止路径。

---

## 3. 网站结构

### 3.1 首页

首页是 SSR HTML，包含：

- 顶部搜索框
- 赛事大全入口
- 一键报名入口
- 推荐赛事
- 新开报名
- 分类入口
- 赛事详情链接
- 报名站跳转

首页已经直接出现赛事详情链接，例如：

- `https://zuicool.com/event/86332`
- `https://zuicool.com/event/79237`
- `https://zuicool.com/event/15113`

### 3.2 赛事列表页

`https://zuicool.com/events` 是主列表页。

页面结构：

- 过滤条件区域
- 赛事卡片列表
- 分页

筛选维度：

- 报名状态：不限、报名中、即将截止、新开报名等
- 类型：马拉松·路跑、越野跑、铁人三项、骑行、其它
- 地区：北京、上海、广东、京津冀、江浙沪、云贵川渝、东北三省、港澳台、海外等
- 月份：1-12 月
- 标签：中国田径协会、世界马拉松大满贯、国际金标等

分页示例：

```text
/events?page=1&per-page=100
/events?page=2&per-page=100
```

本轮只解析第一页前 20 条作为 POC，不做全量抓取。

### 3.3 赛事详情页

赛事详情页示例：

```text
https://zuicool.com/event/86332
https://zuicool.com/event/79237
https://zuicool.com/event/15113
```

详情页包含：

- 标题
- meta description
- og:image
- keywords
- 赛事地点
- 赛事日期
- 报名入口
- 资讯入口
- 成绩入口
- 场次组别
- 组别价格
- 组别报名链接
- 赛事介绍正文
- 正文图片

### 3.4 报名页

报名页示例：

```text
https://reg.zuicool.com/33836
https://reg.zuicool.com/31881
```

报名页包含：

- 报名页标题
- 赛事 banner
- 二维码
- 组别表格
- 费用
- 组别报名按钮
- 报名须知/赛事规程正文
- 正文图片
- 返回主站详情页链接

组别报名页示例：

```text
https://reg.zuicool.com/33836/206309
https://reg.zuicool.com/31881/202417
```

点击正式报名通常进入填写报名信息流程。该流程可能需要用户账号，不属于本轮采集范围。

### 3.5 搜索页

未发现独立 `/search` 页面，直接访问 `https://zuicool.com/search` 返回 404。

搜索通过表单提交到：

```text
POST /events
```

字段：

- `q`
- `_csrf-frontend`

本轮未使用 POST 搜索接口抓取数据，因为列表页和筛选页已经公开可访问。

---

## 4. 数据获取方式

### 4.1 总体判断

Zuicool 核心赛事数据主要通过 SSR HTML 输出。

本轮未发现可直接返回赛事列表/详情核心数据的公开 JSON API。

页面中存在 Vue、jQuery、Yii、微信 SDK、统计脚本，但核心赛事卡片、详情正文、组别价格和报名链接都已经在 HTML 中。

### 4.2 列表页可提取字段

列表卡片 HTML 中可提取：

| 字段 | 示例 | 说明 |
|---|---|---|
| eventId | `86332` | 来自 `/event/{id}` |
| name | `2026凯乐石贡嘎100冰川极限挑战赛` | 卡片标题 |
| date | `2026.09.26` | 卡片信息 |
| location | `四川 甘孜藏族自治州 泸定县 海螺沟游客中心` | 卡片信息 |
| shortDescription | `朝圣蜀山之王！极难，慎报！` | 卡片一句话 |
| logo | `https://s.pro.zuicool.com/events/86332/...jpg` | 图片 URL |
| registrationDeadline | `07-20 10:00` | 卡片 meta |
| registrationStatus | `点此报名` 或空 | 需要从按钮/状态文本归一化 |
| detailUrl | `https://zuicool.com/event/86332` | 详情链接 |

### 4.3 详情页可提取字段

详情页可提取：

| 字段 | 示例 | 说明 |
|---|---|---|
| title | `2026凯乐石贡嘎100冰川极限挑战赛` | `<title>` / meta |
| description | 长文本 | meta description 与正文 |
| coverImage | `og:image` | 封面图 |
| keywords | 包含赛事名、报名、成绩、城市等 | 可辅助分类 |
| registrationUrl | `https://reg.zuicool.com/33836` | 点此报名 |
| categoryName | `冰川极境100km组` | 组别 |
| categoryDescription | 含距离、爬升、出发、关门 | 文本 |
| price | `2300.00` | 组别价格 |
| categoryRegistrationUrl | `https://reg.zuicool.com/33836/206309` | 组别报名链接 |
| relatedNewsUrl | `/news/archives/tag/event86332` | 资讯 |
| resultUrl | `/event/results?event_slug=86332` | 成绩查询 |

### 4.4 报名页可提取字段

报名页可提取：

| 字段 | 示例 | 说明 |
|---|---|---|
| regRaceId | `31881` | 报名站 ID |
| categoryId | `202417` | 组别报名 ID |
| categoryName | `半程马拉松（21.0975公里）` | 组别 |
| fee | `150.00` | 费用 |
| registrationButton | `一键报名` | 状态/入口 |
| raceInfo | 比赛日期、起跑时间、地点、规模、路线 | 正文 |
| registrationPeriod | `2026年6月30日11时至7月31日18时` | 正文 |
| lotteryInfo | 抽签、退赛、二次补录 | 正文 |
| bodyImages | `zc3wp-uploads...` | 详情图 |

---

## 5. Network 分析

### 5.1 JSON / XHR / API

结论：未发现核心赛事列表/详情/报名状态 JSON API。

本轮发现的非核心接口：

```text
GET https://{host}/api/wechat-official-account/{alias}/continuity-qrcode
```

用途判断：微信公众号二维码/关注相关，不是赛事数据接口。

报名页存在一个查询报名记录的表单：

```text
POST https://reg.zuicool.com/angReg/lookupEntry/race_id/31881
```

用途判断：用户报名记录查询，需要证件号码，不属于公开赛事采集字段。

页面中还出现取消报名相关 URL：

```text
http://reg.zuicool.com/ang/reg/ajaxcancel
```

用途判断：用户订单操作，不应采集或调用。

### 5.2 SSR / CSR 判断

| 页面 | 数据加载方式 | 说明 |
|---|---|---|
| 首页 | SSR HTML | 推荐赛事和报名入口已在 HTML 中 |
| 赛事列表 | SSR HTML | 100 条赛事卡片直接在 HTML 中 |
| 赛事详情 | SSR HTML | meta、正文、组别、价格、报名入口均在 HTML 中 |
| 报名页 | SSR HTML | 组别表、费用、报名须知正文均在 HTML 中 |
| 用户报名流程 | 可能需要登录/表单交互 | 不属于本轮范围 |

### 5.3 Header / Cookie

公开页面在无登录 Cookie 情况下可访问。

观察到页面包含 CSRF token：

- `csrf-param`
- `csrf-token`
- `_csrf-frontend`

GET 页面不需要提交 CSRF。POST 搜索和用户操作会使用 CSRF，本轮不依赖这些 POST。

---

## 6. 反爬与合规边界

本轮事实：

- 首页、赛事列表、详情页、报名页均可通过普通浏览器 User-Agent 低频访问。
- 未触发验证码。
- 未发现 Cloudflare 页面。
- 未发现登录后才能查看赛事详情、组别、费用或报名入口。
- `robots.txt` 仅禁止 `/news/wp-content/`。
- 页面存在 CSRF token，但主要用于表单和用户操作。
- 报名记录、选手信息、正式提交报名等涉及个人信息，需登录或填写证件信息，不应采集。

风险：

- HTML 解析依赖 DOM 结构，维护成本高于 JSON API。
- 报名页可能因赛事方配置不同而结构差异较大。
- 正文信息大量为富文本，字段抽取需要规则和人工复核。
- 不应调用用户订单、报名提交、取消报名等接口。
- 不应抓取微信公众号、小程序、外部报名流程或需要登录的数据。

建议边界：

- 只采集公开 GET 页面。
- 只采集候选赛事，不全量翻页。
- 每次请求间隔至少 1-2 秒。
- 记录 User-Agent。
- 对正文抽取字段标记置信度。
- 遇到登录、验证码、订单或个人信息页面立即停止。

---

## 7. 字段完整度

### 7.1 Race Schema Layer 覆盖度

| Layer | 覆盖度 | 说明 |
|---|---:|---|
| Layer 1 Identity | ★★★★☆ | 有 Zuicool eventId、报名站 regRaceId、赛事名、详情 URL；但不是权威认证 ID |
| Layer 2 Time & Location | ★★★★☆ | 列表和正文有日期、地点；部分赛事是“待定”或富文本，需要解析 |
| Layer 3 Race Profile | ★★★★☆ | 组别、距离、越野爬升、关门时间可从详情/报名页提取，尤其适合越野 |
| Layer 4 Registration | ★★★★★ | 报名状态、截止时间、报名入口、费用、抽签规则、报名须知覆盖强 |
| Layer 5 Recommendation | ★★☆☆☆ | 一句话简介和营销文案可辅助推荐，但非 RaceNext 自有推荐逻辑 |
| Layer 6 Experience | ★★★☆☆ | 有赛事介绍、路线、图片、体验描述，但主观营销成分较高 |
| Layer 7 Race Service | ★★☆☆☆ | 可见报名服务、二维码、成绩查询、资讯；住宿/交通等不稳定 |
| Layer 8 Governance | ★★☆☆☆ | 来源 URL、更新时间可由系统记录；页面自身无稳定版本/审计机制 |

### 7.2 样本字段观察

#### 样本 1：2026凯乐石贡嘎100冰川极限挑战赛

- 详情 URL：`https://zuicool.com/event/86332`
- 报名 URL：`https://reg.zuicool.com/33836`
- 组别：
  - 冰川极境100km组
  - 雪域逐峰60km组
  - 野径觉醒40km组
- 费用：
  - 2300.00
  - 1200.00
  - 700.00
- 可提取：
  - 实际距离
  - 累计爬升
  - 出发时间
  - 关门时间
  - 起终点
  - 报名时间
  - 抽签时间
  - ITRA 相关文本

#### 样本 2：澳康达·2026天津武清半程马拉松

- 详情 URL：`https://zuicool.com/event/79237`
- 报名 URL：`https://reg.zuicool.com/31881`
- 组别：
  - 半程马拉松（21.0975公里）
- 费用：
  - 150.00
- 可提取：
  - 比赛日期
  - 起跑时间
  - 比赛地点
  - 赛事规模
  - 报名时间
  - 抽签规则
  - 退赛服务
  - 路线正文
  - 官方/合作报名渠道文本

### 7.3 RunChina vs Zuicool 字段对比

| 字段 | RunChina | Zuicool | 互补价值 |
|---|---|---|---|
| 赛事名称 | 强，较权威 | 强，含商业冠名/营销名 | 中，需标准化去重 |
| 比赛日期 | 强，结构化 | 较强，HTML/正文中可提取 | 中，Zuicool 可补待定/调整提示 |
| 城市 | 强，结构化省市区 | 较强，列表地点和正文 | 中，RunChina 更适合权威归一 |
| 赛事项目 | 中，项目较简 | 强，组别细、距离细 | 高 |
| 报名状态 | 弱 | 强，列表/报名页可见 | 很高 |
| 报名时间 | 弱 | 强，正文中常有开始/截止/抽签时间 | 很高 |
| 报名链接 | 弱 | 强，reg.zuicool.com 入口清晰 | 很高 |
| 报名费用 | 无或弱 | 强，组别表有价格 | 很高 |
| 赛事介绍 | 弱 | 强，富文本详情 | 很高 |
| 图片 | 弱 | 强，logo、banner、正文图 | 很高 |
| 越野覆盖 | 弱 | 强，越野列表、距离、爬升、ITRA/UTMB 文本 | 很高 |

---

## 8. Event Model 映射

Zuicool 数据是混合结构：

- 列表页更接近 Edition 索引。
- 详情页同时包含 Event、Edition、Category 信息。
- 报名页更接近 Edition + Category + Registration。
- 富文本正文包含 Experience、Service 和部分规则信息。

### 8.1 字段映射建议

| Zuicool 字段 | Event Model 目标字段 | 说明 |
|---|---|---|
| `/event/{eventId}` | sourceRefs.zuicool.eventId | 主站赛事 ID |
| `/reg/{regRaceId}` | sourceRefs.zuicool.regRaceId | 报名站赛事 ID |
| 赛事名 | Event.canonicalName + Edition.name | 需去年份、冠名、后缀做 Event 标准化 |
| 列表日期 | Edition.date | `YYYY.MM.DD` 需标准化 |
| 列表地点 | Edition.location | 省/市/区/具体地点需拆分 |
| 短描述 | Edition.summary 或 marketingSummary | 不应作为事实字段 |
| logo / og:image | Edition.media.coverImage | 适合展示图 |
| 正文图片 | Edition.media.gallery | 需保留来源 URL |
| 报名截止 | Edition.registration.closesAt | 列表常为月日时间，需要结合年份 |
| 报名状态按钮 | Edition.registration.status | “点此报名”、空、已关闭等需映射 |
| 报名 URL | Edition.registration.url | 通常指向 `reg.zuicool.com/{regRaceId}` |
| 组别名 | Category.name | 如 100km、半马、亲子组 |
| 组别说明 | Category.description | 可进一步提取距离、爬升、关门时间 |
| 价格 | Category.registrationFee | 组别价格 |
| 组别报名 URL | Category.registrationUrl | 指向具体报名组别 |
| 距离 | Category.distanceKm | 正则提取 `100km`、`21.0975公里` 等 |
| 爬升 | Category.elevationGain | 越野详情常见“累计爬升xxxx米” |
| 关门时间 | Category.cutoffTime | 越野详情常见 |
| 抽签文本 | Edition.registration.lottery | 抽签规则/时间 |
| 赛事规程正文 | Edition.rules / rawData | 结构化难度高，建议保留原始 HTML/文本 |

### 8.2 映射注意

- Zuicool 的赛事名常包含商业冠名，不能直接覆盖 RunChina 的 canonicalName。
- 同一赛事在 Zuicool 主站 ID 和报名站 ID 不一致，需要同时保存。
- 组别费用属于 Category，不应放在 Event。
- 报名状态属于 Edition 或 Category，取决于是否每个组别独立开放。
- 图片和富文本介绍适合放入 Edition Experience / Media，不应污染客观身份字段。

---

## 9. RunChina vs Zuicool Coverage Comparison

### 9.1 是否补足 RunChina 的报名字段

是，补足价值高。

Zuicool 在报名相关字段明显强于 RunChina：

- 有报名站入口。
- 有组别报名链接。
- 有报名截止时间。
- 有报名费用。
- 有报名须知。
- 有抽签规则。
- 有部分退赛/补录规则。

限制：

- 报名开始时间通常在正文中，需要文本解析。
- 正式提交报名可能进入登录/表单流程，不应采集。
- 不是所有赛事都在 Zuicool 开放报名，部分只展示信息。

### 9.2 是否补足图片 / 赛事介绍

是，补足价值很高。

Zuicool 提供：

- logo
- og:image
- banner
- 详情正文图
- 赛事介绍富文本
- 赛事路线说明
- 赛事规程

限制：

- 正文图片和富文本多为营销/公告内容，结构化难度高。
- 图片版权和展示授权需谨慎评估。

### 9.3 是否补足越野赛事覆盖

是，补足价值很高。

列表筛选存在：

```text
/events?type=trail-run
https://reg.zuicool.com?race_type_id=10
```

样本中出现大量越野赛事，并能提取：

- 距离
- 累计爬升
- 起跑时间
- 关门时间
- ITRA / UTMB 文本
- 多组别价格

这部分是 RunChina 的明显弱项。

### 9.4 是否存在大量重复

存在一定重复，尤其是路跑和田协认证赛事。

例如天津武清半程马拉松类赛事可能同时出现在 RunChina 和 Zuicool。

但 Zuicool 还覆盖：

- 越野
- 线上赛
- 亲子/小勇士
- 徒步
- 海外马拉松
- 训练赛
- 非田协认证长尾赛事

因此重复不是主要问题，关键是字段冲突处理。

### 9.5 字段冲突优先级建议

本轮只做分析，不修改 `FIELD_PRIORITY_MATRIX.md`。

建议：

| 字段 | 优先信任 |
|---|---|
| 中国路跑赛事身份 | RunChina |
| 认证等级 | RunChina |
| 比赛日期/地点 | RunChina 优先，Zuicool 用于补充变更提示 |
| 报名入口 | Zuicool |
| 报名费用 | Zuicool |
| 报名截止 | Zuicool |
| 赛事介绍 | Zuicool |
| 图片 | Zuicool |
| 越野距离/爬升/关门 | Zuicool 或 ITRA，需交叉验证 |
| 推荐理由 | RaceNext 自建 |

---

## 10. 技术接入方案

### 10.1 方案 A：公开 JSON / API

可行性：低。

本轮未发现公开稳定的核心赛事 JSON API。

优点：

- 如果未来发现官方 JSON，可显著降低解析成本。

风险：

- 当前没有可用证据。
- 盲目枚举接口会越过 POC 边界。

结论：暂不推荐。

### 10.2 方案 B：HTML Crawl

可行性：中到高。

优点：

- 核心字段已在 SSR HTML 中。
- 不需要登录。
- 不需要执行 JS。
- 列表、详情、报名页都可通过 GET 获取。
- 适合小规模候选赛事补充。

风险：

- DOM 结构变更会破坏 Parser。
- 富文本抽取难度高。
- 不同赛事报名页模板可能不同。
- 需要严格限频和缓存。

结论：推荐作为 POC/MVP 获取方式。

### 10.3 方案 C：Playwright

可行性：中。

优点：

- 可模拟浏览器，便于处理页面细节。
- 可做截图/视觉验证。

风险：

- 成本高、慢、维护复杂。
- 当前页面核心数据不需要 JS 执行。
- 更容易触及反爬或误入报名流程。

结论：不作为默认方案，仅用于人工调试或结构变更排查。

### 10.4 方案 D：人工半自动录入

可行性：高。

优点：

- 适合 Top100 / Top200 人工校验。
- 可避免富文本误抽取。
- 对报名费用、截止时间等高价值字段更可靠。

风险：

- 人力成本高。
- 更新频率低。

结论：建议与 HTML Crawl 结合：机器提候选字段，人工复核关键字段。

### 10.5 技术推荐

推荐路径：

1. 使用 HTML Crawl 获取候选赛事列表和详情。
2. 只针对候选赛事访问报名页。
3. 保留原始 HTML/正文文本到 RawRace.rawData。
4. 结构化抽取名称、日期、地点、报名链接、组别、费用、图片。
5. 对报名时间、抽签规则、爬升、关门时间等字段标记置信度。
6. Top100 / Top200 阶段加入人工复核。

---

## 11. 工作量评估

如果正式接入 Zuicool，预估工作量如下：

| 模块 | 工作量 | 说明 |
|---|---:|---|
| Source 调用 | 0.5-1 天 | GET 列表/详情/报名页、限频、重试、缓存 |
| 列表 Parser | 1-1.5 天 | 解析 100 条卡片、分页、筛选 URL |
| 详情 Parser | 2-3 天 | meta、正文、报名入口、组别块、图片 |
| 报名页 Parser | 2-3 天 | 组别表、价格、报名说明、正文模板差异 |
| Normalizer | 1-2 天 | 日期、地点、报名状态、费用、距离 |
| Event / Edition / Category 映射 | 1-2 天 | Zuicool 混合结构拆分 |
| 与 RunChina 去重 | 1-2 天 | 同名同城同年、商业冠名、日期冲突 |
| 测试 | 1-2 天 | 固定样本 HTML fixture、字段回归 |
| 维护监控 | 0.5 天初版 | DOM 变更检测、字段缺失报警 |

MVP 接入总量级：约 10-16 人天。

如果只做 Top100 / Top200 半自动补充，初版可压缩到 4-7 人天。

---

## 12. 风险

### 12.1 数据准确性风险

- Zuicool 不是田协权威源。
- 商业冠名和营销标题较多。
- 赛事延期、退款、关闭状态可能出现在短描述中，需要人工确认。
- 富文本字段容易误抽取。

### 12.2 技术风险

- 依赖 HTML 结构。
- 报名页模板不统一。
- 部分报名状态通过按钮文本和空状态判断，不如 API 明确。
- 正文图片较多，下载或转存不应在 POC 阶段做。

### 12.3 合规风险

- 正式报名、报名记录、选手信息涉及个人数据，不应采集。
- 微信公众号、小程序、外部报名渠道不应纳入自动采集。
- 图片展示权利需要产品层另行判断。

### 12.4 产品风险

- Zuicool 文案更偏运营和营销，不能直接作为 RaceNext 的客观推荐理由。
- 报名入口依赖第三方服务状态，可能随时关闭或跳转。

---

## 13. POC 结果

本轮做了最小 POC：

- 请求 `https://zuicool.com/events`
- 解析第一页前 20 条赛事卡片
- 请求 3 个详情页样本
- 请求 2 个报名页样本
- 未全量翻页
- 未登录
- 未调用用户操作接口
- 未抓取正式报名表单
- 未下载图片

POC 解析的前 20 条字段包括：

- eventId
- name
- dateLocation
- registrationDeadline
- status button text
- logo presence
- shortDescription

样本表现：

- 第一页可见 100 条赛事。
- 前 20 条中包含路跑、越野、海外、线上、延期/关闭/报名中等多种状态。
- 列表可以解析但需要状态归一化。
- 详情页可以提取组别、价格和报名链接。
- 报名页可以提取更完整的报名须知、费用和报名时间。

---

## 14. 客观结论

1. 是否发现 JSON / XHR / API：未发现核心赛事列表/详情/报名 JSON API；核心数据主要是 SSR HTML。
2. 是否存在分页接口：存在 HTML 分页，URL 为 `/events?page=N&per-page=100`。
3. 是否需要登录：公开赛事列表、详情、报名页不需要登录；正式报名、报名记录、选手信息涉及登录/个人信息。
4. 是否存在明显反爬：本轮低频公开 GET 未触发验证码、WAF 或登录墙；页面有 CSRF token，主要用于表单。
5. 字段完整度评分：Registration ★★★★★，Race Profile ★★★★☆，Identity ★★★★☆，Time & Location ★★★★☆，Experience ★★★☆☆。
6. 与 RunChina 的互补价值：高，尤其补报名、费用、图片、介绍、越野组别和爬升。
7. 推荐获取方式：HTML Crawl + 小规模候选赛事 + 人工复核；不推荐全量抓取。
8. 是否建议进入正式接入候选：建议进入候选，但定位为补充源，不应替代 RunChina 的权威事实源。
9. 报告路径：`docs/research/REPORT_ZUICOOL.md`。
10. POC 范围：只解析公开页面样本，没有抓取全量数据，没有 Normalize / Merge / 入库。

Zuicool 适合作为 RaceNext 的第二数据源候选，核心价值是补足 RunChina 在报名、费用、介绍、图片和越野赛事方面的缺口。它不适合作为中国路跑权威身份源，也不适合作为无需复核的唯一事实来源。
