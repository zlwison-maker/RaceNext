# 2027 香港马拉松与莫干山 by UTMB 接入 Handoff

本轮交付为独立分支集成，等待 Human Review。正式生产当前为 19 场，本地 Fact Gate 与 Public API 接受 21 场。图片发布、真机体验与携程真实转化仍有待验项。

- 分支为 `codex/add-hk-marathon-mogan-utmb-2027`。
- main 基线为 `f8489411b3c89c9c87d728f5f0ccabc1c610ea96`。
- 开发范围来自[随包开发指令](inputs/two-races-20261119/RACENEXT_2027_TWO_RACES_CODEX_DEVELOPMENT_INSTRUCTIONS_20261119.md)。两份原文交付包也存于同目录，作为 Guide、酒店和动作字符串的核对基准；归档副本仅清除行尾 Markdown 空格以通过 diff 检查，正文及动作字符串不变。
- 仓库可见住宿标准为 V1.1，V1.2 正文及独立《新增赛事研究交付标准 V1》未找到。本轮优先执行 Human 提供的交付包，逐字接入已选酒店与文案。

## 接入状态

| 验收项 | 香港马拉松 2027 | 莫干山 by UTMB 2027 |
| --- | --- | --- |
| Event ID | `standard-chartered-hong-kong-marathon` | `ultra-trail-mogan-by-utmb` |
| Edition ID | `standard-chartered-hong-kong-marathon-2027` | `ultra-trail-mogan-by-utmb-2027` |
| 官方展示名 | 渣打香港馬拉松2027 | 2027 莫干山越野赛 by UTMB® |
| Official Fact Gate | PASS | PASS，距离口径已获 Human 2026-11-19 批准 |
| 已接入 Category | marathon、half-marathon、10k、10k-wheelchair | dmg、cmg、mmg、nmg、emg、10k |
| Public Category | 马拉松，保留完整三枪 | DMG 100K、CMG 65K、MMG 50K |
| 暂不公开 Category | 半马、10K、轮椅10K | NMG、EMG、10K |
| Race Guide | 原文完整接入 | 原文完整接入 |
| Hotels / Ctrip | 5/5 原文及动作字符串核对通过 | 5/5 原文及动作字符串核对通过 |
| 本地实际 API | HTTP 200 | HTTP 200 |
| Cover / Hero | 共用轻量 URL，IMAGE_QA_HOLD | 共用轻量 URL，等待真机及图片权利确认 |
| Share | 5:4 派生图、标题、路径检查通过，香港构图 HOLD | 5:4 派生图、标题、路径检查通过 |
| Strategy / CP | 无 Strategy，无 CP 推断 | Strategy HOLD，CoursePoint 未核实且状态为 unknown |

Category ID 完整形式为 `<Edition ID>-<上述后缀>`。新增品牌与 HK100、凯乐石莫干山等既有赛事逐项核对后建立独立身份。

## 事实、证据与待验项

香港全马采用[当届赛事详情](https://www.hkmarathon.com/zh-hant/race-information)的 42.195 km、6 小时、九龍尖沙咀彌敦道至香港維多利亞公園。`startTimes` 依次为 2027-01-17 的 06:00、06:25、06:50，全部 UTC+08:00，`startAt=null`。没有从三枪推算统一关门钟点。[当届日程](https://www.hkmarathon.com/zh-hant/important-dates)确认主赛公众抽签及缴费阶段已结束，展示为 registration_closed。第三方报名系统返回 HTTP 403，本轮 registrationUrl 留空。仍在报名的 1 月 16 日附属活动未混入 1 月 17 日主赛。

半马、10K 和轮椅10K 仅登记已证实的当届项目身份，缺完整的组别距离直证、发枪、起终点和关门字段，verificationStatus 保持 pending。没有借用普通10K地点或历史届次信息。

莫干山的[当届报名概览](https://mogan.utmb.world/registrations)直接确认 2027-04-16 至 04-18，以及 DMG 100K、CMG 65K、MMG 50K、NMG35K、EMG 20K、10K 官方名称。Human 于 2026-11-19 明确批准 `Category.distanceKm=100/65/50/35/20/10`。详情页 Distance 作为单独 `rawData.pageDistanceKm` 保留，分别为 96/67/52/36/23/10，未新增正式字段。

| Category | distanceKm | 页面 Distance | 爬升 m | 总时限 h | 当地发枪，UTC+8 | 起点 / 终点 | 状态与来源 |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| DMG 100K | 100 | 96 | 5000 | 28 | 04-16 20:00 | Jun'anli / Jun'anli | Verified，[DMG](https://mogan.utmb.world/races/DMG) |
| CMG 65K | 65 | 67 | 3400 | 19 | 04-17 07:00 | naked Stables / Jun'anli | Verified，[CMG](https://mogan.utmb.world/races/CMG) |
| MMG 50K | 50 | 52 | 2900 | 15 | 04-16 22:00 | Jun'anli / Jun'anli | Verified，[MMG](https://mogan.utmb.world/races/MMG) |
| NMG 35K | 35 | 36 | 1900 | 11 | 04-17 09:00 | J.LALLI VALLEY / null | Pending，[NMG](https://mogan.utmb.world/races/NMG) |
| EMG 20K | 20 | 23 | 1200 | 7 | 04-18 09:00 | J.LALLI VALLEY / null | Pending，[EMG](https://mogan.utmb.world/races/EMG) |
| 10K | 10 | 10 | 300 | 3.5 | 04-18 10:00 | J.LALLI VALLEY / null | Pending，[10K](https://mogan.utmb.world/races/10K) |

起终点保留直接官方英文原文，未从酒店名称推导 J.LALLI VALLEY 的运动员入口。NMG 的异地模板内容没有进入 Canonical 或 Guide，该来源登记为 pending_review，暂不参与自动事实提取。其独立可读的数值和当届时间保存在待审 Category 证据中。官网不同组别的报名按钮状态不同，Edition.registrationStatus 保留 unknown，报名 URL 留空。

上述 Pending 指新 Category 的治理状态及字段缺口，本轮未新增或改写正式 Pending Store。

## Source Registry

新增 11 条来源，原有来源完整保留。所有新增来源均为 primary_official，domain 与 URL hostname 一致。抓取时间、HTTP、原始 HTML SHA-256 和直接引用定位保存在对应治理 SourceRecord 中。

| Source ID 后缀 | Event ID 前缀 | URL | 状态 / 作用域 |
| --- | --- | --- | --- |
| official-home | standard-chartered-hong-kong-marathon | https://www.hkmarathon.com/zh-hant/ | active，赛事身份 |
| official-race-information-2027 | standard-chartered-hong-kong-marathon | https://www.hkmarathon.com/zh-hant/race-information | active，全马直接事实 |
| official-important-dates-2027 | standard-chartered-hong-kong-marathon | https://www.hkmarathon.com/zh-hant/important-dates | active，主赛项目与报名阶段 |
| official-home | ultra-trail-mogan-by-utmb | https://mogan.utmb.world/zh-Hans | active，中文品牌身份 |
| official-registration-2027 | ultra-trail-mogan-by-utmb | https://mogan.utmb.world/registrations | active，当届日期与标称组别 |
| official-dmg-2027 | ultra-trail-mogan-by-utmb | https://mogan.utmb.world/races/DMG | active，当届 DMG |
| official-cmg-2027 | ultra-trail-mogan-by-utmb | https://mogan.utmb.world/races/CMG | active，当届 CMG |
| official-mmg-2027 | ultra-trail-mogan-by-utmb | https://mogan.utmb.world/races/MMG | active，当届 MMG |
| official-nmg-2027 | ultra-trail-mogan-by-utmb | https://mogan.utmb.world/races/NMG | pending_review，模板污染 |
| official-emg-2027 | ultra-trail-mogan-by-utmb | https://mogan.utmb.world/races/EMG | active，当届 EMG 直接数值 |
| official-10k-2027 | ultra-trail-mogan-by-utmb | https://mogan.utmb.world/races/10K | active，当届10K直接数值 |

完整 sourceId 为 `<Event ID>-<后缀>`，各页本次均 HTTP 200。CMG 与 EMG 首次传输超时后分别只读重试，完整响应成功后才记录 Hash。

## 酒店与动作

十家携程 Hotel ID 的实际网页标题已逐项核对，身份与用户指定酒店匹配。柏宁的「傲途格精选」及丰赡楼的「客栈 / 民宿」名称差异原样记录。[酒店身份取证](inputs/two-races-20261119/hotel-identity-evidence.json)

自动测试逐字核对 10 个名字、Title、Reason、AppID、原始 Path 及顺序，并验证既有 `openHotelMiniProgram()` 原样传递动作、使用 release 环境。郡安里 `biz=1` 在 id 之前的顺序和 2026-11-19 至11-20日期保留，其他原始日期也完整保留。真实入住前需要用户在携程调整为2027参赛日期。富豪九龙的普通携程动作未附加官方套餐权益，CMG 赛后异地返程条件仍在原文中。

## 图片与网络

| 资产 | Original | Display | 本地冷请求 bytes | 本地条件热请求 |
| --- | --- | --- | ---: | --- |
| 香港马 | PNG 2048×657，2,270,230 bytes | JPEG 1600×513，224,394 bytes | 224394 | HTTP 304，0 body bytes |
| 莫干山 | PNG 1792×914，2,023,824 bytes | JPEG 1600×816，191,202 bytes | 191202 | HTTP 304，0 body bytes |

两张 Display 共 415,596 bytes，均低于600KiB。每场 Cover/Hero 复用一个 URL，响应 Content-Type=image/jpeg 且 Content-Length 与下载量相等。分享图分别为124,254与85,348 bytes。条件请求仅证明本地 HTTP 缓存机制，微信列表滚动、首次详情、返回重开及真机热缓存均为 NOT VERIFIED。公网仍为原有19场，新图片生产 HTTP 测试为 NOT RUN。[实际本地请求记录](inputs/two-races-20261119/local-api-evidence.json)

- 香港 Original SHA-256 为 `916d35704bbcd81ae1a6c2ba06ceeff78779ffd5b40cc4e8eb04d48a9a06798e`，Display 为 `0d7e9b306a8de05d8c5862b6b5761722178ed0e3664e6da6050c5f9e0a57b162`。
- 莫干山 Original SHA-256 为 `65e82569718df9b1439a4705b344c3e7c8a49baa11cb18c33f89afce9dd5053d`，Display 为 `db8866592baa066b190cc531400d769ca1a695789971c1d0d098e27df279e92c`。

原图保留，未放大、未擦除 Logo，Asset Registry.source.type=user_provided，usageRightsStatus=unverified，作者和来源 URL 未提供。香港图有可见2027，莫干山图未显示可核年份，imageYear=null。

[离线裁切预览](previews/two-races-20261119/offline-crop-review.png)明确标为非真机。香港在现有16:9 Cover、2:1 Hero及5:4分享裁切中丢失侧面标识和部分文字，IMAGE_QA_HOLD，等待 Human 接受构图或另行批准处理。移动端焦点位置调整无法同时保留两侧 Logo，本轮保留原资产和现有展示方式。莫干山中央 Logo 在模拟裁切中保留，详情 WXML 的标题位于 Hero 下方，真实小屏可读性仍待验。

## 自动验收与保护

| 命令 / 检查 | 真实结果 |
| --- | --- |
| `npm test` | PASS，497/497，无跳过 |
| `node --test --experimental-strip-types tests/contentBatch20261119.test.ts` | PASS，7/7，含十家酒店导航绑定 |
| `node --test --experimental-strip-types tests/prePublishFactGate.test.ts` | PASS，10/10 |
| `npm run typecheck` | PASS |
| `npm run typecheck:miniprogram` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS，默认 Turbopack，118个静态页面 |
| `npm run images:share -- --check` | PASS，21张5:4派生图 |
| `git diff --check` | PASS |
| 独立本地服务真实 HTTP Smoke | PASS，22个API请求、原19个详情一致、4张图片冷请求200/条件热请求304 |
| 微信真机、真实携程跳转和联盟跟踪 | NOT VERIFIED |
| 新图生产网络与生产发布 | NOT RUN |

原19场 Canonical 记录、原19份 Source Registry条目、原38个Asset条目保持完整相等。原有Guide、酒店文件、图片内容和携程动作均未改动。正式 Pending / State 字节不变。业务代码、Schema、Public DTO、小程序、Workflow、调度、监测与发布配置均未改动。Auto Apply OFF。

本地 API 验证列表及21个详情共22个请求，全部HTTP 200，与既有Public DTO构造结果完整相等。原19个详情在排除全局dataUpdatedAt变化后逐字段相等，含住宿和Guide。新数据无内部治理字段泄漏。小程序ViewModel、组别切换、Guide、五家酒店及分享绑定通过自动验证，实际导航及联盟跟踪继续待验。

旧Web详情页使用独立的raceDecision数据链路，这两场 `/races/<Event ID>` 本地返回404。当前交付完成 Public API→小程序现有链路，Web独立详情页仍待后续单独评估。默认构建有既存metadataBase提醒，构建成功。

## Human Review 与发布条件

| 状态 | 结果 |
| --- | --- |
| Integrated | PASS，两场各一篇Guide、五家酒店、共用Cover/Hero |
| Automated QA | 见上述真实运行结果 |
| Draft PR | 提交后以本次PR实际状态为准 |
| Merge | NOT RUN |
| Deployed | NOT RUN，生产仍19场 |
| Mini Program Real-device Verified | NOT VERIFIED |
| Hotel Click Tracking Verified | NOT VERIFIED，真实酒店跳转、入住日期调整和联盟跟踪待测 |

Human需处理图片构图与权利许可，随后再决定Merge/部署。缺失组别仅在拿到对应当届直证并完成事实审核后公开。NMG须排除官网模板污染并核实终点。DMG Strategy继续等待当届CP、服务表和符合现有标准的策略证据。

PR #46保持Open。本分支没有更新其Pending或State，合并前应重新检查main和监测Head并按既有连续性规则安排衔接。
