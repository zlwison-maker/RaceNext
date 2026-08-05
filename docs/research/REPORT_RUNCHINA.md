# RunChina 数据源调查报告

调查日期：2026-06-30  
项目：RaceNext / 下一场  
阶段：数据源 POC 调查  
结论等级：A-，适合作为中国路跑赛事 MVP 主数据源，但需要把接入边界限定在公开 API、低频同步和字段补全机制内。

---

## 1. 本轮调查目标

本轮只验证 RunChina / 中国马拉松信息平台是否适合进入 RaceNext 后续 Top100 / Top200 赛事库的数据源候选。

调查范围：

- 官网首页与 SPA 入口是否可访问。
- 赛事列表页是否存在公开结构化数据。
- 赛事详情页是否存在公开结构化数据。
- 是否需要登录、验证码或 App 逆向。
- 字段是否能够映射到 Race Schema v1.0 与 Event Model v1.0。
- 后续做小规模、合规、低频同步的技术风险。

本轮未进行：

- 全量抓取。
- 高频请求。
- 登录态抓取。
- 验证码绕过。
- App 逆向。
- 数据库建模或入库。
- Top100 / Top200 正式生产数据构建。

---

## 2. 访问入口与域名记录

### 2.1 目标入口

- 官网：`https://www.runchina.org.cn/`
- 用户提供赛事列表页：`https://www.runchina.org.cn/#/race/v/list`
- SPA shell：`https://www.runchina.org.cn/index.html`

### 2.2 本轮发现的相关域名

| 域名 | 用途判断 | 本轮结论 |
|---|---|---|
| `www.runchina.org.cn` | 官网与 SPA 静态资源 | 首页根路径在 Node fetch 下返回 EdgeOne 限制页；`index.html` 与静态 JS 可访问 |
| `api-changzheng.chinaath.com` | 内容中心 API | 赛事列表与赛事详情可公开低频访问 |
| `score-api-changzheng.chinaath.com` | 成绩相关 API | 与本轮赛事列表 POC 无关，不建议接入 |
| `runchina-api.chinaath.com` | MLS 相关 API 配置 | 静态包中存在，但本轮未发现必须调用 |
| `workflow.runchina.org.cn` | 工作流系统 | 非赛事公开列表主链路 |
| `api-workflow.shuzixindong.com` | 工作流 API | 非赛事公开列表主链路 |
| `caa-workflow-file.runchina.org.cn` | 私有文件资源 | 不建议抓取 |
| `caa-workflow-file-public.runchina.org.cn` | 公共文件资源 | 可作为未来附件/图片候选，但非本轮重点 |
| `img.shuzixindong.com` | 图片资源 | 静态资源域 |
| `file.shuzixindong.com` | 文件资源 | 静态资源域 |
| `g.alicdn.com` / `o.alicdn.com` | 阿里验证码/无痕验证脚本 | 说明前端存在安全校验能力 |
| `lf3-data.volccdn.com` | 埋点 SDK | 与数据采集无关 |
| `turing.captcha.qcloud.com` | 腾讯验证码脚本，代码中有注释引用 | 暂未在本轮 API 访问中触发 |
| `fpjs.dev` / `m1.openfpcdn.io` | FingerprintJS 相关 | 前端指纹/风控相关 |
| `www.athletics.org.cn` | 中国田协官网 | 可访问，作为备用权威入口 |

DNS 观察：

- `www.runchina.org.cn` 可解析到多个 A 记录。
- 裸域 `runchina.org.cn` 未稳定解析。
- `www.athletics.org.cn` 可访问，但本轮重点仍是 RunChina。

---

## 3. 页面结构与可访问性

### 3.1 首页与 SPA

`https://www.runchina.org.cn/` 在直接 HTTP 请求中返回 `567`，服务侧显示 `TencentEdgeOne`，更像边缘访问控制或防护页，而不是正常业务页面。

`https://www.runchina.org.cn/index.html` 可返回正常 HTML。该页面是 Vite / Vue SPA shell，主要加载静态 JS bundle，并根据 hash 路由进入赛事页面。

赛事列表路由在静态路由表中确认为：

- `/race/v/list`
- 路由 meta：`contentCode: ["SS"]`

赛事详情路由确认为：

- `/race/v/detail/:id`
- 路由 meta：`contentCode: ["SS"]`

### 3.2 浏览器访问表现

在本地 in-app browser 环境中直接打开 `https://www.runchina.org.cn/#/race/v/list` 多次超时，未稳定进入页面。结合 HTTP 层根路径返回 EdgeOne 限制，说明直接页面级采集存在不稳定性。

但静态资源和内容中心 API 可公开访问，因此 POC 建议优先使用公开 API，而不是依赖页面 DOM 解析。

---

## 4. 公开 API 调查结果

### 4.1 赛事列表 API

端点：

```text
POST https://api-changzheng.chinaath.com/changzheng-content-center-api/api/homePage/official/searchCompetitionMls
```

测试请求：

```json
{
  "pageNo": 1,
  "pageSize": 20
}
```

测试结果：

- HTTP 状态：`200`
- 业务状态：`success: true`, `code: 0`
- 返回分页：`totalCount: 2820`, `pageNo: 1`
- 本轮只读取 20 条样本，不做全量抓取。

列表字段样例：

```json
{
  "raceId": 1000419209,
  "raceName": "2026天津团泊湖半程马拉松",
  "raceGrade": "A",
  "raceTime": "2026-09-27",
  "raceAddress": "天津市/天津市/静海区",
  "raceItem": "[\"半程\"]",
  "raceScale": null
}
```

列表字段覆盖：

| 字段 | 是否提供 | 说明 |
|---|---:|---|
| 赛事 ID | 是 | `raceId` |
| 赛事名称 | 是 | `raceName` |
| 比赛日期 | 是 | `raceTime`，格式为 `YYYY-MM-DD` |
| 地区 | 是 | `raceAddress`，省/市/区以 `/` 分隔 |
| 赛事项目 | 是 | `raceItem`，字符串化 JSON 数组 |
| 赛事等级 | 是 | `raceGrade`，如 A、B、C（属地办赛） |
| 赛事规模 | 部分 | `raceScale` 常见为 null |
| 报名状态 | 否 | 列表未提供 |
| 报名入口 | 否 | 列表未提供 |
| 官方网站 | 否 | 列表未提供 |
| 费用 | 否 | 未提供 |
| 路线/爬升 | 否 | 不适用于多数路跑列表字段 |

### 4.2 近期赛事 API

端点：

```text
POST https://api-changzheng.chinaath.com/changzheng-content-center-api/api/homePage/official/recentMatch
```

测试结果：

- `GET` 返回 `405 Method Not Allowed`。
- `POST {}` 返回 `success: true`，包含近期赛事数组。

字段包括：

- `id`
- `name`
- `date`
- `raceGrade`
- `raceItem`

该端点适合首页展示验证，不适合作为主分页同步入口。

### 4.3 赛事详情 API

端点：

```text
POST https://api-changzheng.chinaath.com/changzheng-content-center-api/api/homePage/official/searchById
```

测试请求：

```json
{
  "id": 1000419209,
  "type": "SS",
  "pageTitleLevelTwo": ""
}
```

测试结果：

- HTTP 状态：`200`
- 业务状态：`success: true`, `code: 0`
- 无需登录态即可返回该赛事详情样本。

详情字段样例：

```json
{
  "type": "SS",
  "ssdetails": {
    "name": "2026天津团泊湖半程马拉松",
    "certifieFlag": "a",
    "certifieType": "",
    "charaFlag": 0,
    "raceGrade": "A",
    "province": "天津市",
    "city": "天津市",
    "area": "静海区",
    "gameDate": "2026.09.27",
    "type": 1,
    "project": "半程",
    "scale": "",
    "compNameOrganizer": "天津市静海区人民政府",
    "showStatus": 1
  }
}
```

详情页静态代码中还预置了更多字段名：

- `startTime`
- `endTime`
- `regTime`
- `regTimeEnd`
- `registerFlag`
- `joinUrl`
- `webUrl`
- `routeMap`
- `bestResult`
- `compNameUndertaker`
- `compNamePromotionUnit`
- `compNameCoOrganizer`
- `worldAthleticsGradeLogoUrl`

注意：上述预置字段不是每个详情响应都一定返回。本轮样本详情没有返回报名时间、报名入口、官网和路线图。

---

## 5. 分页、筛选与搜索判断

### 5.1 分页

`searchCompetitionMls` 支持基本分页参数：

- `pageNo`
- `pageSize`

返回结构包含：

- `data.results`
- `data.totalCount`
- `data.pageNo`

本轮验证 `pageSize: 20` 成功。

### 5.2 搜索与筛选

静态包中存在通用搜索端点：

- `searchContent`
- `searchList`
- `searchById`

未携带页面类型或搜索类型时会返回业务错误：

- `所属页面不能为空`
- `搜索类型不能为空`

本轮没有继续扩大参数枚举，因为这会接近接口逆向和非必要探索。建议后续仅基于前端静态路由明确暴露的 `contentCode: ["SS"]` 与列表接口做低频同步。

---

## 6. 反爬与合规边界

观察到的风控/访问控制信号：

- 根路径直接请求返回 `567`，响应侧出现 `TencentEdgeOne`。
- SPA HTML 引入阿里无痕验证/验证码相关脚本。
- 静态包中存在 FingerprintJS / 设备指纹逻辑。
- API 请求拦截器会附加：
  - `osId: 1006`
  - `terminalType: 3`
  - `machineCode`
- 静态代码中存在 token 失效提示，但本轮赛事列表和详情样本未要求登录 token。

本轮采取的边界：

- 仅请求公开网页与公开 API。
- 未登录。
- 未处理验证码。
- 未绕过边缘防护。
- 未做 App 逆向。
- 请求间隔控制在 1.5 秒以上。
- User-Agent 明确标记为 RaceNextDataPOC。

建议后续边界：

- 每次同步只取 Top100 / Top200 所需范围，避免全量分页扫库。
- 设置长间隔、重试上限和失败熔断。
- 若 API 开始要求验证码、登录态或签名校验，应停止自动抓取，改为人工补充或寻求授权合作。

---

## 7. Race Schema 字段覆盖评估

### 7.1 Layer 1: Identity

覆盖度：高。

可用字段：

- `raceId`
- `raceName`
- 详情页 `name`

可支撑：

- source id
- canonical name 初步生成
- edition 识别
- 同源更新
- 多源去重候选

缺口：

- 别名、英文名、历史名称需要 RaceNext 维护。

### 7.2 Layer 2: Time & Location

覆盖度：高。

可用字段：

- `raceTime`
- `gameDate`
- `raceAddress`
- `province`
- `city`
- `area`

可支撑：

- 年份、月份、日期标准化。
- 国内省市区映射。
- 城市筛选。
- 区域映射。

注意：

- 列表日期格式是 `YYYY-MM-DD`。
- 详情日期格式是 `YYYY.MM.DD`。

### 7.3 Layer 3: Race Profile

覆盖度：中。

可用字段：

- `raceItem`
- `project`
- `raceGrade`
- `certifieFlag`
- `certifieType`
- `scale` / `raceScale`，但样本多为空。

可支撑：

- 马拉松/半马/路跑类型判断。
- 距离类别推断。
- 认证等级展示。

缺口：

- 精确距离需要从项目名推断。
- 路线、补给、赛道特征、海拔、爬升基本缺失。
- 不适合覆盖越野赛难度字段。

### 7.4 Layer 4: Registration

覆盖度：低到中。

静态详情组件预留字段：

- `regTime`
- `regTimeEnd`
- `registerFlag`
- `joinUrl`
- `webUrl`

但本轮详情样本未返回这些字段。

判断：

- RunChina 可以作为赛事是否存在与认证信息的权威源。
- 是否可报名、报名入口、抽签信息仍需要补充源或人工校验。

### 7.5 Layer 5-8: RaceNext 增值层

覆盖度：低。

RunChina 不提供：

- RaceNext 推荐理由。
- 用户适配。
- 体验评分。
- 旅行便利度。
- 商业服务字段。
- 社区内容。

这些字段应由 RaceNext 自建、人工标注、多源补充或用户反馈产生。

---

## 8. Event Model 映射建议

RunChina 返回的数据更接近 Edition 级别，而不是完整 Event / Category 三层。

建议映射：

| RunChina 字段 | Event Model 目标 | 说明 |
|---|---|---|
| `raceName` / `name` | Event.canonicalName + Edition.name | 需去掉年份生成 Event 名称 |
| `raceId` | Edition.sourceRefs.runchina.rawId | 作为同源稳定 ID |
| `raceTime` / `gameDate` | Edition.date | 比赛日期 |
| `raceAddress` / `province/city/area` | Edition.location | 省市区 |
| `raceItem` / `project` | Category.name / distance | 需要解析 JSON 字符串和项目名 |
| `raceGrade` | Edition.certificationLevel 或 source-specific metadata | 田协等级，保留原值 |
| `scale` / `raceScale` | Edition.scale 或 Category.capacity | 样本多为空 |
| `compNameOrganizer` | Event.organizer 或 Edition.organizer | 需根据赛事长期主办方判断 |

名称标准化规则：

- `2026天津团泊湖半程马拉松` -> Event: `天津团泊湖半程马拉松`，Edition: `2026天津团泊湖半程马拉松`
- `2026楚雄马拉松` -> Event: `楚雄马拉松`

---

## 9. 多源去重难度

RunChina 适合作为中国路跑赛事的权威基准源，去重难度中等。

主要优势：

- 日期明确。
- 省市区明确。
- 名称较规范。
- `raceId` 可作为同源稳定 ID。

主要风险：

- 年份嵌入赛事名称，需要标准化。
- 同一赛事可能在其他源中使用简称、商业冠名或不同后缀。
- `raceItem` 是字符串化数组，需结构化解析。
- 同名同城赛事跨年份需要 Edition 层区分。
- 赛事日期调整时，同名同城同年但日期不同，应标记 `possibleDuplicate`，不应直接覆盖。

推荐去重规则：

1. 同源优先用 `raceId` 更新。
2. 跨源先比较标准化 Event 名称。
3. 再比较年份、城市、日期。
4. 同名同城同年但日期相差较小，标记疑似重复。
5. RunChina 与 Zuicool 冲突时，路跑认证字段优先信任 RunChina；报名入口、赛事介绍可参考补充源。

---

## 10. 技术接入方案评估

### 方案 A：公开 API 低频同步

评级：推荐。

优点：

- 结构化 JSON，字段稳定性优于 DOM。
- 列表与详情均可访问。
- 可控制每轮样本数量。
- 能直接支撑 RaceNext 的中国路跑基准库。

风险：

- API 未公开承诺稳定。
- 前端存在风控能力，未来可能要求验证码/签名/登录。
- 报名字段覆盖不稳定。

适用范围：

- MVP Top100 / Top200 中国路跑赛事基准信息。
- 非实时、低频、可人工回退的数据补充。

### 方案 B：页面 DOM 抓取

评级：不推荐。

原因：

- SPA 入口在浏览器环境中不稳定。
- 根路径存在 EdgeOne 限制。
- DOM 依赖前端渲染，维护成本高。

### 方案 C：官方合作 / 授权数据

评级：中长期推荐。

原因：

- RunChina 具备权威性。
- 若 RaceNext 后续商业化或规模化同步，应优先探索授权合作，降低合规和稳定性风险。

---

## 11. 数据质量评估

| 维度 | 评分 | 说明 |
|---|---:|---|
| 可抓取性 | B+ | API 可访问，但首页/SPA 入口存在访问控制 |
| 权威性 | A | 中国马拉松/田协相关公开赛事信息，适合作为路跑基准源 |
| 字段完整度 | B | 身份、日期、地点、项目强；报名、路线、费用弱 |
| 标准化难度 | B | 名称、日期、地区、项目都可标准化 |
| 去重价值 | A | 可作为中国路跑主判定源 |
| 维护成本 | B- | 需监控 API 变更和风控变化 |
| 合规风险 | 中 | 必须限制在公开、低频、非绕过范围 |

综合评级：A-。

---

## 12. 是否建议继续接入

建议继续，但限定为：

- 中国路跑赛事主数据源。
- POC / MVP 阶段只同步少量候选赛事。
- 不做全量库抓取。
- 不做高频更新。
- 不处理验证码或登录态。
- 不依赖页面 DOM。

RunChina 不适合作为：

- 越野赛难度源。
- 报名状态唯一来源。
- 赛事体验/推荐价值来源。
- 实时变更监听源。

---

## 13. 后续实施建议

1. 在现有 `scripts/sources/runchina.ts` 中保留公开 API 方案，增加明确请求上限、间隔和失败熔断。
2. RawRace 中完整保留 `raceId`、`raceGrade`、`raceItem`、`raceAddress` 和详情 `ssdetails`。
3. NormalizedRace / Event Model 标准化时，把 RunChina 定位为 Edition 基准源。
4. 对报名字段标记 `needsManualVerification`，不要因为缺失而造假。
5. 为 RunChina 字段建立 dataQuality：
   - identity: high
   - dateLocation: high
   - category: medium
   - registration: low
6. 后续 Top100 / Top200 阶段只按候选名单查询详情，不分页扫完整 `totalCount`。
7. 如果接口出现验证码、登录、签名或明显封禁，应立即停止自动接入，改为人工录入或授权合作。

---

## 14. 本轮最终结论

RunChina 数据源可以支撑 RaceNext MVP 的中国路跑赛事基准库。它最适合回答“这场中国路跑赛事是否存在、何时何地举办、有哪些项目、是否有田协相关等级/认证信息”。

它不能单独回答“现在是否值得报名、体验如何、适合谁、难度如何、报名入口是否可靠”等 RaceNext 核心决策问题。因此后续应把 RunChina 放在 Source Priority 中的权威事实层，而不是产品推荐层。

接入建议：继续，但只做公开 API、低频、样本/候选集同步，并保持人工复核与多源补全。
