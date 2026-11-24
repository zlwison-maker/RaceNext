# RaceNext 2027 Outopia 与黄山接入交接

## 审阅基线

2026-11-23 核对的 main 为 `68f190fb767258c3f18e6cd66b6653c0b48141de`。当时生产赛事列表返回 21 场。开发分支 Canonical 共 23 场，本地公开 API 共 22 场。Outopia 新增对外显示三个组别，黄山仍为发布 HOLD。

- Outopia Event `outopia-mogan-cloud-flower-trail`，Edition `outopia-mogan-cloud-flower-trail-2027`。与莫干山 by UTMB 为独立赛事。
- 黄山 Event `huangshan-huizhou-ancient-city-trail`，Edition `huangshan-huizhou-ancient-city-trail-2027`。本轮使用 2027 春赛身份，历史环新安江秋赛、2026 春赛冠名和路线只保留于研究资料。
- 原 21 场 Canonical、Registry 来源、图片与内容条目均保留。逐条对照 21 场原赛事的本地 HTTP 详情，除全局 `dataUpdatedAt` 外相同。PR #46 在核对时为 Open，Head `c243b49d3a290415adf349de34d087fd5d0a6fb7`。Auto Apply 继续 OFF。

## 事实与发布 Gate

发枪使用北京时间，距离使用官方标称值，关门使用总时长。多枪次完整保存在 `startTimes`，对应 `startAt` 为空。以下表中 ID 为相应 Edition ID 加所列后缀。

### 2027 Outopia 莫干山云间花径越野跑

比赛日为 **2027-03-28**，3 月 26–27 日报到与活动保留于内部证据。三组均为郡安里出发并回到郡安里。主办方现行规程原始嵌图的三组发枪时刻已逐项人工读图，并与合作报名页核对。首选域名 TLS 校验未通过，核验使用同一活动编号和主办方店铺的赛会通页面。 [主办方规程](https://cdsxhw.saihuitong.com/event?id=910563&mid=86546) · [规程原始日程图](https://img.saihuitong.com/7112/richtext/17694080/sht/1a1fca3341a24c9.jpg) · [合作报名页](https://reg.zuicool.com/54221)

| 组别 / ID 后缀 | 标称距离 | 累计爬升 | 总关门 | 发枪 | 本地公开 |
| --- | ---: | ---: | ---: | --- | --- |
| 云间追风 YJZF 41K / `yjzf-41k` | 41 km | 2,814 m | 12 h | 06:00、06:30 | 是 |
| 逐梦山海 ZMSH 31K / `zmsh-31k` | 31 km | 2,010 m | 9.5 h | 07:00、07:30、08:00 | 是 |
| 飞越竹海 FYZH 16K / `fyzh-16k` | 16 km | 1,099 m | 5.5 h | **09:00、09:30** | 是 |

规程图和合作页均未列出旧研究中的 10:00。合作页总体为「报名中」，41K 与 31K 的报名链接只读访问可达登录页，16K 在该渠道明确报满。Edition 按合作渠道记 `registration_open`，16K 组保存报满证据，组别没有报名链接。主办方页静态「即将报名」、合作页渠道截止和旧第三枪均保留在交付或内部证据中。登录后提交、资格确认与席位状态待人工核验。 [合作报名页](https://reg.zuicool.com/54221) · [来源响应与报名入口记录](inputs/two-races-20261123/source-verification.json)

Registry 登记主办方规程为 `primary_official / active`，最酷为 `trusted_structured / active`。原始日程图保留人工读图的指纹和原链接，Registry 标记 `pending_review`，不会触发图像自动提取。

### 2027 黄山徽州古城百公里越野赛

比赛日期采用 Human 指定的当届规程日期 **2027-03-27 至 03-28**。合作报名页正文和逐组发枪日期支持该窗口，页头的 03-28 至 03-29 作为冲突记录。交付研究中的 E01–E03 是规程截图转录，本 ZIP 未含原规程截图，公众号链接实测返回验证页。主会场为徽州古城府前广场，转录记录其为出发主会场。五组终点继续缺失。 [合作报名页](https://reg.zuicool.com/38938) · [规程链接](https://mp.weixin.qq.com/s/nsx_mLjU7QlX0LYczljLLg) · [完整研究证据](inputs/two-races-20261123/evidence/)

| 组别 / ID 后缀 | 标称距离 | 累计爬升 | 总关门 | 发枪 | 本地公开 |
| --- | ---: | ---: | ---: | --- | --- |
| 高山流水 100K / `100k` | 100 km | 约 4,900 m | 26 h | 03-27 05:30 | HOLD |
| 渔樵问答 75K / `75k` | 75 km | 约 3,100 m | 19 h | 03-27 06:30 | HOLD |
| 夕阳箫鼓 50K / `50k` | 50 km | 约 2,100 m | 14 h | 03-27 07:30、08:00 | HOLD |
| 阳春白雪 35K / `35k` | 35 km | 约 1,100 m | 9 h | 03-28 08:00、08:30 | HOLD |
| 春江花月 20K / `20k` | 20 km | **约 500 m** | 6 h | 03-28 09:00、09:30 | HOLD |

合作页直接列出 20K 约 500 m，五组发枪和时限均有证据。页面的 20K 亲子报名项归于同一组别。合作报名入口可达登录页，Edition 内部状态基于页面显示记录为 `registration_open`。Registry 将最酷登记为 `trusted_structured / active`，公众号正式规程登记为 `primary_official / pending_review`。现有 Pre-Publish Fact Gate 的身份与日期检查通过，五组终点为空且组别为 Pending，Edition 保持 `do_not_publish`。本地详情 HTTP 404。

两场均无新增 CP、补给、换装点、推算的绝对关门时刻或 Trail Strategy。

## 指南及十家酒店

两份 A–E Guide 逐段比对通过，原文字句、顺序和标题均保留。Markdown 行内粗体按现有指南字段呈现为正文，现有 UI 保持原样。

| 赛事 | 顺序 | 酒店原名 | 携程 Hotel ID | 自动验收 |
| --- | ---: | --- | --- | --- |
| Outopia | 1 | 莫干山郡安里度假酒店 | 1748643 | PASS |
| Outopia | 2 | 莫干山铂尔曼酒店 | 135454224 | PASS |
| Outopia | 3 | 莫干山依尔山居民宿（莫干庾村店） | 4682318 | PASS |
| Outopia | 4 | 莫干山街角美宿（庾村广场店） | 8340871 | PASS |
| Outopia | 5 | 莫干山季梵山居民宿（庾村店） | 134014969 | PASS |
| 黄山 | 1 | 歙县吴怡本堂民宿 | 68030616 | PASS |
| 黄山 | 2 | 徽映十笏民宿（黄山歙县徽州古城店） | 133572961 | PASS |
| 黄山 | 3 | 花筑·歙县微城民宿（徽州古城店） | 131987433 | PASS |
| 黄山 | 4 | 歙县井陌民宿 | 61002071 | PASS |
| 黄山 | 5 | 歙县新安宾馆·Designer酒店（徽州古城店） | 23865199 | PASS |

十家携程公开酒店页均返回 HTTP 200，名称与物业匹配。新安宾馆的携程页面标题附加「徽派美学空间」，赛事内容继续用 Human 原名。十条 AppID、原始 Path、Hotel ID、联盟参数、参数顺序、2026 日期、推荐标题和推荐正文均通过逐字符比对。模拟微信跳转收到同一组 `appId`、`path` 和 `envVersion: release`。Outopia 的五条还通过了实际详情 HTTP 和小程序 ViewModel 验证。黄山五条已做数据及模拟跳转检查，随黄山详情保持非公开。Outopia 的两家重复物业使用独立的内部 ID 来保留本轮 Action，旧莫干山 UTMB 的 Action 与本轮携程 Hotel ID 均保留。 [原始 Manifest](inputs/two-races-20261123/manifest.json) · [携程酒店页核验记录](inputs/two-races-20261123/hotel-identity-evidence.json)

微信真机仍需核对实际跳转、酒店落地页与分享卡片，联盟归因未验证。原链接日期需要用户在携程确认或调整。

## 图片和分享

| 赛事 | 原图 | Display | Share | 裁切结果 |
| --- | --- | --- | --- | --- |
| Outopia | PNG 702×468，292,874 B | JPEG 702×468，61,696 B | JPEG 585×468，62,439 B | 16:9、2:1、5:4 中心裁切保留主标题、年份和品牌字样。分辨率低于建议值 |
| 黄山 | JPEG 750×289，57,331 B | JPEG 750×289，57,331 B，复用原始 JPEG 字节 | 仅 360×288 本地裁切预览 | 三种裁切均截断标题，5:4 也截断部分 Logo。**IMAGE_QA_HOLD** |

原图尺寸和 SHA-256 均与 Manifest 一致，两场 Cover 与 Hero 共用对应 Display。派生图保持原图像素上限，图片内容未重画。两张 Display 和 Outopia Share 本地冷请求均为 HTTP 200 / JPEG，条件请求均为 304，无响应体。黄山 Display 可用静态地址检查，公开赛事 API 未引用它，黄山 Share 资源请求为 404。两图授权凭证均为 Unverified。 [资源检查及 Hash](inputs/two-races-20261123/asset-verification.json) · [裁切预览](previews/two-races-20261123/) · [Outopia 实际 5:4 Share](../../public/races/outopia-mogan-cloud-flower-trail/2027/share-cover-5x4.jpg)

## 验收与改动范围

| 检查 | 实际结果 |
| --- | --- |
| `npm ci` | 安装通过 |
| `npm audit --omit=dev` | 0 High、0 Critical，与 main 同一条 Moderate，命令退出码 1 |
| 完整 `npm test` | 504/504 PASS |
| Web、Mini Program TypeScript；Lint | 都通过 |
| 默认生产构建 | PASS |
| 现有 Pre-Publish Fact Gate | 23/23 Edition 身份与日期检查通过，公开 API 的发布 HOLD 按原规则生效 |
| `npm run images:share -- --check` | 22 张公开分享图通过 |
| 本地 HTTP | 列表及 22 个公开详情均为 200。原有 21 场详情业务字段相同。黄山返回 404，公开 JSON 未发现 Evidence 或 Governance 字段 |
| `git diff --check` | PASS |

生产依赖已知 Moderate 为 `baseline-browser-mapping`，本轮未改锁文件。默认构建出现既有的 Next.js `metadataBase` 提示。 [依赖公告](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) · [本地 HTTP 验收明细](inputs/two-races-20261123/local-api-evidence.json)

变更集中于 [Canonical](../../data/canonical/race-graph-v1.json)、[Source Registry](../../data/sources/race-source-registry.json)、[图片 Registry](../../data/assets/race-image-assets-v1.json)、两场 [Guide](../../data/race-guides/batch-20261123.ts) 和 [住宿数据](../../data/accommodations/batch-20261123.ts)、对应索引、两场图片、证据与测试。回归测试按明确的公开和 Canonical 清单核对新增项，并继续验证生产监测对可信次级来源的 `PARTIAL` 处理。Workflow、Pending、State、Fact Gate、Schema、UI、Analytics 和商业规则零修改。

## 发布前人工事项

- 确认 Outopia 素材授权及低分辨率原图能否用于发布，使用真机查看裁切和分享效果。
- 黄山需要逐组终点直接证据及合适构图的当届授权图片。拿到后重新核对事实、裁切与各组发布 Gate。
- 按表逐家确认微信跳转及实际酒店落地。联盟归因和当前房价、空房仍需独立验证。

本次交付停在 Draft PR。生产、微信提审和真机 QA 待 Human Review。
