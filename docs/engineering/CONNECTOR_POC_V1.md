# Connector POC v1

日期：2026-06-30  
阶段：Step 6 Connector Engineering v1  
范围：有限范围 POC，不做全量抓取、不接数据库、不改前端 UI。

---

## 1. 本轮目标

本轮开始实现第一版数据连接器工程，目标是验证：

- RunChina Connector 是否能稳定获取公开 API 样本。
- Zuicool Connector 是否能稳定获取公开 HTML 样本。
- 两源是否能输出统一 `SourceRecord`。
- 基础 Normalizer 是否能生成 `NormalizedConnectorRecord`。
- 基础 Merge POC 是否能验证同名 / 同城 / 同年合并规则。
- 本地 JSON 输出是否满足后续 Connector POC 迭代。

本轮未做：

- 全量抓取
- Top100 / Top200 正式库
- 登录
- 验证码处理
- App 逆向
- 图片下载或转存
- Supabase / PostgreSQL
- 定时任务
- 前端 UI 修改

---

## 2. RunChina Connector 实现情况

文件：

- `scripts/connectors/runchinaConnector.ts`

使用接口：

- 列表：`POST https://api-changzheng.chinaath.com/changzheng-content-center-api/api/homePage/official/searchCompetitionMls`
- 详情：`POST https://api-changzheng.chinaath.com/changzheng-content-center-api/api/homePage/official/searchById`

限制：

- 列表只取第一页。
- `pageSize` 最大 20。
- 详情最多前 5 条。
- 请求间隔至少 1500ms。
- 最多重试 2 次。
- 遇到 403 / 567 / WAF / EdgeOne 等强限制信号会停止。

本轮运行结果：

- 列表记录：20
- 详情记录：5
- stoppedReason：无
- warnings：无

输出：

- `data/raw/runchina_sample.json`

字段覆盖：

- `rawId`
- `name`
- `raceDate`
- `province`
- `city`
- `district`
- `raceGrade`
- `categories`
- `organizer`
- `registrationStatus`，样本中仍不稳定
- `registrationUrl`，样本中缺失

---

## 3. Zuicool Connector 实现情况

文件：

- `scripts/connectors/zuicoolConnector.ts`

使用入口：

- 列表：`GET https://zuicool.com/events?page=1&per-page=100`
- 详情：`GET https://zuicool.com/event/{eventId}`
- 报名页：`GET https://reg.zuicool.com/{regRaceId}`

限制：

- 只请求列表第一页。
- 只解析前 20 条卡片。
- 详情最多前 3 条。
- 报名页最多前 2 条。
- 不提交表单。
- 不进入正式报名填写流程。
- 不调用订单、取消报名、报名记录查询接口。
- 不下载图片，只保存图片 URL。
- 请求间隔至少 1500ms。

本轮运行结果：

- 列表记录：20
- 详情页：3
- 报名页：2
- stoppedReason：无
- warnings：无

输出：

- `data/raw/zuicool_sample.json`

字段覆盖：

- `eventId`
- `name`
- `dateLocation`
- `shortDescription`
- `statusText`
- `registrationDeadline`
- `detailUrl`
- `registrationUrl`
- `coverImage`
- `categories`
- `categoryName`
- `categoryFee`
- `categoryRegistrationUrl`
- `rawHtml`
- `rawText`

说明：

Zuicool 页面中存在登录弹窗和验证码输入框 HTML，但公开赛事列表、详情页、报名页主体无需登录即可读取。本轮未提交任何登录或报名表单。

---

## 4. 输出文件

| 文件 | 说明 |
|---|---|
| `data/raw/runchina_sample.json` | RunChina Connector raw output |
| `data/raw/zuicool_sample.json` | Zuicool Connector raw output |
| `data/normalized/normalized_sample.json` | 两源基础 normalized output |
| `data/merged/merged_sample.json` | Merge POC output |

---

## 5. 字段覆盖

当前 `SourceRecord` 至少包含：

- `sourceId`
- `sourceName`
- `sourceType`
- `sourceUrl`
- `rawId`
- `fetchedAt`
- `rawData`
- `extractedFields`
- `dataQuality`
- `warnings`

Source ID 已统一使用：

- `runchina`
- `zuicool`

Normalizer v1 输出：

- Identity：`originalName`, `canonicalNameCandidate`, `sourceIds`
- Edition：`editionYear`, `raceDate`, `province`, `city`, `district`, `venue`, `registrationStatus`, `registrationUrl`
- Category：`categoryName`, `distanceKm`, `elevationGain`, `cutoffTime`, `registrationFee`
- Governance：`sourceUrl`, `rawId`, `sourceId`, `fieldSources`, `missingFields`, `confidence`

缺失字段不会被编造，会进入 `missingFields`。

---

## 6. Merge POC 结果

文件：

- `scripts/merge/mergeConnectorSamples.ts`

规则：

- 同源使用 `rawId` 识别。
- 跨源使用 `normalizedName + city + editionYear` 初步匹配。
- 日期冲突不覆盖，写入 `conflicts`。
- RunChina 优先中国路跑身份、日期、省市区。
- Zuicool 优先报名入口、报名费用、图片、组别细节。
- 推荐字段不由外部源生成。

本轮运行结果：

- normalized records：40
- merged records：40
- merged groups：0
- conflict count：0

解释：

本轮两个源的前 20 条样本未出现同名、同城、同年的自动匹配组，因此未发生跨源合并，也未发现字段冲突。Merge POC 代码已保留 `mergeTrace` 与 `conflicts`，等待后续候选集样本覆盖相同赛事时验证。

---

## 7. 失败与风险

### 已知风险

- RunChina 根站存在 EdgeOne / 风控信号，但公开内容 API 本轮可用。
- RunChina 报名入口、报名时间、费用仍缺失。
- Zuicool 核心数据来自 SSR HTML，没有核心 JSON API。
- Zuicool HTML Parser 依赖 DOM 结构，维护成本高于 RunChina API。
- Zuicool 正文包含大量富文本，当前仅做有限结构化，完整规则需后续迭代。
- Node 运行 `.ts` 文件时出现 `MODULE_TYPELESS_PACKAGE_JSON` warning，不影响执行结果。

### 未发生的问题

- 未触发 403。
- 未触发 567。
- 未触发 WAF / EdgeOne 拦截页。
- 未需要登录。
- 未提交验证码。
- 未调用个人报名记录或订单接口。

---

## 8. 合规边界

本轮遵守：

- 只访问公开页面/API。
- 不登录。
- 不绕过验证码。
- 不进入报名填写流程。
- 不采集用户信息。
- 不下载图片。
- 不做全量抓取。
- 不高频请求。
- 不接数据库。

Zuicool 详情页中出现登录弹窗 HTML 和验证码字段，但这不是访问限制；Connector 只读取公开赛事主体内容，不触碰登录/报名表单。

---

## 9. 后续建议

1. 下一轮用人工候选列表构造同赛事样本，专门验证 RunChina + Zuicool 跨源 merge。
2. 为 Zuicool Parser 增加 HTML fixture 测试，降低 DOM 变更风险。
3. 为 RunChina Connector 增加 API schema guard，记录字段缺失率。
4. 将 `MODULE_TYPELESS_PACKAGE_JSON` warning 作为工程整理项处理，不影响本轮验收。
5. Connector POC 可以进入有限范围开发，但仍不建议进入全量抓取。
6. Top100 / Top200 阶段必须增加 Official 校验和人工复核。
