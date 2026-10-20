# RaceNext 1.9｜新增七场数据与内容 P0 修复 Handoff｜2026-10-20

本轮仅修复已上线七场；这是待 Human Review 的受控内容/数据 PR。**本地19场 API PASS；未 Merge、未部署，不代表修复已上线。**

## 基线、范围与结论

- 最新 main / 生产基线：`5a825c12b7bb5bdf8f50a8d12f2ee248336079ae`，PR #44已合并。独立分支：`codex/seven-race-p0-facts-content-20261020`。原仓库8张未跟踪预览图、1.0.1 Release Worktree未操作。
- 生产只读 API实测19场（2026-10-20本轮执行前）；GitHub公开PR列表23:17北京时间为0 Open，PR #43已不在Open集合。最近Race Data Update #23 / [39372668104](https://github.com/zlwison-maker/RaceNext/actions/runs/39372668104)成功，列表无queued/in_progress；提交前再次fetch核对main。GitHub连接器传输失败、匿名REST限流时使用公开网页只读交叉核查，未触发生产任务。
- 共检查**164**个字段：7 Edition ×4报名字段 +18 Category ×8核心字段 −8个路跑组别不适用爬升。原缺失50（null/unknown/空数组），补齐28，仍待22；已填值均纳入作用域核查，未改已有距离、发枪、爬升和其他已填事实。
- 修正4个报名状态、6个报名日期、4个明确官方报名入口、10个广州组别起终点、2个南京/深圳关门时长、2个福州标称距离。**福州距离为trusted_secondary验证，不是Official Verified；等待本PR的Human事实审核。**
- 七场28个主标题中文化；全部已批准正文、Runner Fit条目、栏目小标RACE GUIDE、35家酒店及AppID/Path保持不变。
- Registry 73→82，仅新增9个具体文档/平台来源；不更改原73条来源属性或给予整域名事实权限。Auto Apply OFF，Pending仍36条及审核历史字节不变，Ingestion State字节不变。

## 报名状态（核验基准：2026-10-20，北京时间）

不是按执行日期任意推导状态。本次实际只读取证也在2026-10-20；没有取得基准日之后才生效的新公告。日期字段指常规预报名窗口，不冒充支付/候补窗口。

| Edition | Old → New | 当届依据与阶段 |
| --- | --- | --- |
| guangzhou-100-2027 | unknown → registration_open | [官方规程](https://moganshan.saihuitong.com/article?id=71446&mid=57201)明确2026-10-13–11-13预报名/先付款审核后抽签，11-20出签；不是已中签。 |
| nanjing-marathon-2026 | unknown → registration_closed | [官方报名须知](https://www.nj-marathon.cn/page/L51XZa20wrP7jAM6vG98.html)：7-28 10:00–8-28 17:00；9-15缴费截止、9-30后候补未成退款。状态仅指大众常规报名/候补；急救、配速招募和已获资格跑团不冒充重开大众名额。 |
| shaoxing-marathon-2026 | unknown → registration_closed | [官方报名须知](http://www.sxym.org.cn/html/bmxz.html)：8-26 10:00–9-06 17:00，9-18出签、9-24支付、9-28候补结果及未中签退款；11月跑团赛仅面向已获名额者。 |
| shenzhen-marathon-2026 | unknown → unknown | [官方10-16公告](https://shenzhenmarathon.org.cn/content.html?detailId=9071527999859602&topicId=6990423356675002)已完成抽签，10-16 10:00–10-22 17:00中签缴费；可能二抽，日期待定。现有枚举无“中签缴费”，lottery在客户端显示“抽签中”，不把已完成抽签错误标成进行中，也不重开预报名。保留精确阶段证据供Human决定枚举映射。 |
| fuzhou-marathon-2026 | unknown → unknown | [当届报名须知可靠转载](https://fz.bendibao.com/news/2026910/81057.shtm)确认预报名9-10 20:00–9-19 17:00、首轮缴费至10-12；[官方10-03问答](https://mp.weixin.qq.com/s/tRgo2hrix5uYW1d3QMe_GQ)二抽取决于实际缴费并另发公告，未取得足以定当前二抽状态的新证据。不能仅因首轮截止宣布所有渠道关闭。 |
| hengqin-marathon-2026 | unknown → unknown | [官方9-21中签公告](https://www.hengqinmarathon.com/news_detail-285.html)10-08 22:00后按已缴费候补序号递补、未明确结束；[报名须知](https://www.hengqinmarathon.com/race-256.html)又写10月上旬补录及后续退款，当前结束边界冲突。保留unknown供Human核查。 |
| panda-shudao-shan-2027 | unknown → registration_open | [官方列表](https://tsaigu.saihuitong.com/events?mid=58097)仅2027卡片明确“我要报名”，当届规程预付费预报名/11-11抽签；相邻2026结束卡片排除。规程原文10月3日10:00–11月5日10:00省略年份，原文已保存，日期字段继续null，不从CDN上传路径猜年份。 |

南京、绍兴、深圳、横琴补齐官方明确指向的报名/跑者服务URL；只验证公开落地页，不等于已测试登录、报名、缴费。广州当前取得的入口落在百里少年单组，未确认通用组别作用域；福州官方指向小程序，未取得可核验HTTP直达URL，这两场registrationUrl保留null。深圳homeIndex遗留applyStartTime=2024已识别为旧配置，不用于2026日期。

## 28个事实字段 Before / After

| Edition | Category / Field | Old | New | 当届证据 / 级别 |
| --- | --- | --- | --- | --- |
| 广州100 | Edition.registrationStatus | unknown | registration_open | [当届出处](https://moganshan.saihuitong.com/article?id=71446&mid=57201)；Verified / official |
| 广州100 | 100k.startLocation | null | 广州体育馆 | [当届出处](https://img.saihuitong.com/4717/richtext/13044845/sht/1a12f0df024bd26.png-w702)；Verified / official |
| 广州100 | 100k.finishLocation | null | 广州体育馆 | [当届出处](https://img.saihuitong.com/4717/richtext/13044845/sht/1a12f0df024bd26.png-w702)；Verified / official |
| 广州100 | 55k.startLocation | null | 广州体育馆 | [当届出处](https://img.saihuitong.com/4717/richtext/13044845/sht/1a12f0e33431bb3.png-w702)；Verified / official |
| 广州100 | 55k.finishLocation | null | 广州体育馆 | [当届出处](https://img.saihuitong.com/4717/richtext/13044845/sht/1a12f0e33431bb3.png-w702)；Verified / official |
| 广州100 | 30k.startLocation | null | 广州体育馆 | [当届出处](https://img.saihuitong.com/4717/richtext/13044845/sht/1a133013f6ff0bb.png-w702)；Verified / official |
| 广州100 | 30k.finishLocation | null | 广州体育馆 | [当届出处](https://img.saihuitong.com/4717/richtext/13044845/sht/1a133013f6ff0bb.png-w702)；Verified / official |
| 广州100 | 10k-youth.startLocation | null | 广州体育馆 | [当届出处](https://img.saihuitong.com/4717/richtext/13044845/sht/1a13301646cf548.png-w702)；Verified / official |
| 广州100 | 10k-youth.finishLocation | null | 广州体育馆 | [当届出处](https://img.saihuitong.com/4717/richtext/13044845/sht/1a13301646cf548.png-w702)；Verified / official |
| 广州100 | 10k-night.startLocation | null | 广州体育馆 | [当届出处](https://img.saihuitong.com/4717/richtext/13044845/sht/1a12f0fcd58bd0c.png-w702)；Verified / official |
| 广州100 | 10k-night.finishLocation | null | 广州体育馆 | [当届出处](https://img.saihuitong.com/4717/richtext/13044845/sht/1a12f0fcd58bd0c.png-w702)；Verified / official |
| 南京 | Edition.registrationStatus | unknown | registration_closed | [当届出处](https://www.nj-marathon.cn/page/L51XZa20wrP7jAM6vG98.html)；Verified / official |
| 南京 | Edition.registrationOpenDate | null | 2026-07-28T10:00:00+08:00 | [当届出处](https://www.nj-marathon.cn/page/L51XZa20wrP7jAM6vG98.html)；Verified / official |
| 南京 | Edition.registrationCloseDate | null | 2026-08-28T17:00:00+08:00 | [当届出处](https://www.nj-marathon.cn/page/L51XZa20wrP7jAM6vG98.html)；Verified / official |
| 南京 | marathon.cutoffTimeHours | null | 6 | [当届出处](https://stor.ihuipao.com/image/7273463631557a6d76797071c39962fa.png)；Verified / official |
| 绍兴 | Edition.registrationStatus | unknown | registration_closed | [当届出处](http://www.sxym.org.cn/html/bmxz.html)；Verified / official |
| 绍兴 | Edition.registrationOpenDate | null | 2026-08-26T10:00:00+08:00 | [当届出处](http://www.sxym.org.cn/html/bmxz.html)；Verified / official |
| 绍兴 | Edition.registrationCloseDate | null | 2026-09-06T17:00:00+08:00 | [当届出处](http://www.sxym.org.cn/html/bmxz.html)；Verified / official |
| 深圳 | marathon.cutoffTimeHours | null | 6 | [当届出处](https://shenzhenmarathon.org.cn/content.html?detailId=9030978593023542&topicId=6990423356675002)；Verified / official |
| 福州 | Edition.registrationOpenDate | null | 2026-09-10T20:00:00+08:00 | [当届出处](https://fz.bendibao.com/news/2026910/81057.shtm)；Verified / trusted_secondary；非Official Verified |
| 福州 | Edition.registrationCloseDate | null | 2026-09-19T17:00:00+08:00 | [当届出处](https://fz.bendibao.com/news/2026910/81057.shtm)；Verified / trusted_secondary；非Official Verified |
| 福州 | marathon.distanceKm | null | 42.195 | [当届出处](https://fz.bendibao.com/news/2026910/81057.shtm)；Verified / trusted_secondary；非Official Verified |
| 福州 | half-marathon.distanceKm | null | 21.0975 | [当届出处](https://fz.bendibao.com/news/2026910/81057.shtm)；Verified / trusted_secondary；非Official Verified |
| 熊猫蜀道山 | Edition.registrationStatus | unknown | registration_open | [当届出处](https://tsaigu.saihuitong.com/events?mid=58097)；Verified / official |
| 南京 | Edition.registrationUrl | null | https://www.nj-marathon.cn/page/EA63XdLj8P5wjJqwoMrx.html | [当届出处](https://www.nj-marathon.cn/page/L51XZa20wrP7jAM6vG98.html)；Verified / official |
| 绍兴 | Edition.registrationUrl | null | http://www.sxym.org.cn/b/jiYrMv/entry.html | [当届出处](http://www.sxym.org.cn/html/bmxz.html)；Verified / official |
| 深圳 | Edition.registrationUrl | null | https://shenzhen-registration.mararun.com/personal.html?lang=cn | [当届出处](https://shenzhen-registration.mararun.com/personal.html?lang=cn)；Verified / official指定平台 |
| 横琴 | Edition.registrationUrl | null | https://hq-registration.mararun.com | [当届出处](https://hq-registration.mararun.com)；Verified / official指定平台 |

广州十条起终点均有各组自己的S/F地图与Hash，非venue推断；地图中的Actual Distance 96.39/54.11/32.93/9.77不导入distanceKm。南京6小时由07:30/07:45/08:00与官方图13:30/13:45/14:00逐枪对应，未将起点关闭时刻当成发枪时刻。深圳6小时来自最新2026规则JSON的42.195公里行。

### 福州距离的来源边界

优先检查了官网现行海报、路线图、动态/脚本、官方公众号及当届报名原文线索，未取得官方原始规程中可直接读取的项目距离声明。官网路线图中的21.0975中间计时标记不用于推断组别距离。

[福州本地宝2026报名须知转载](https://fz.bendibao.com/news/2026910/81057.shtm)明确分列马拉松42.195、半程21.0975，[独立当届聚合页](https://chinamarathon.com/events/76249)交叉一致。chinamarathon.com是商业聚合，不是中国田协。Registry登记trusted_secondary/media_report，fieldSources.distanceKm=media，rawData.directOfficialVerification=false；现有Source Eligibility继续排除媒体自动Fact Pipeline。此为受控手工内容修正提案，等待本PR Human Review，没有伪装官方直证或修改Gate。总体07:30及缺少直证的关门时间仍null。

## 全18组核心事实QA快照

下表值均纳入本轮核对，数值未变的事实沿用已有当届证据并检查当前响应Hash/作用域。越野爬升保留原证据“约”的口径；表中“—”为未知，不代表从未公布。路跑爬升不适用，不计入164。

| Edition / Category | 标称距离 km | 爬升 m | 当届起跑（北京时间；含各枪） | 起点 → 终点 | 关门 h | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 广州100 / 100公里组 | 100 | 5456 | 01-15 19:30 / 01-15 20:00 / 01-15 20:30 | 广州体育馆 → 广州体育馆 | 26.5 | 已填字段Verified |
| 广州100 / 55公里组 | 55 | 2531 | 01-16 07:00 / 01-16 07:30 / 01-16 08:00 / 01-16 08:30 | 广州体育馆 → 广州体育馆 | null | 55K关门冲突，Category仍pending/隐藏 |
| 广州100 / 30公里组 | 30 | 1366 | 01-17 06:00 / 01-17 06:30 / 01-17 07:00 / 01-17 07:30 / 01-17 08:00 / 01-17 08:30 | 广州体育馆 → 广州体育馆 | 9 | 已填字段Verified |
| 广州100 / 10公里百里少年组 | 10 | 362 | 01-16 10:00 | 广州体育馆 → 广州体育馆 | 3 | 已填字段Verified |
| 广州100 / 10公里夜间体验组 | 10 | 362 | 01-16 20:00 | 广州体育馆 → 广州体育馆 | 3 | 已填字段Verified |
| 南京 / 马拉松 | 42.195 | — | 11-22 07:30 / 11-22 07:45 / 11-22 08:00 | 南京奥林匹克体育中心东门 → 燕子矶滨江公园 | 6 | 已填字段Verified |
| 绍兴 / 马拉松 | 42.195 | — | — | 奥体中心东南侧（解放大道与洋江西路交叉口） → 奥体中心东南侧（解放大道与洋江西路交叉口） | 6 | 已填字段Verified |
| 绍兴 / 半程马拉松 | 21.0975 | — | — | 奥体中心东南侧（解放大道与洋江西路交叉口） → 奥体中心东南侧（解放大道与洋江西路交叉口） | 3 | 已填字段Verified |
| 深圳 / 马拉松 | 42.195 | — | 12-06 07:00 | 深圳市民中心 → 宝安区海滨广场 | 6 | 已填字段Verified |
| 福州 / 马拉松 | 42.195 | — | — | 五一广场 → 海峡国际会展中心 | null | 已填字段Verified（福州距离仅secondary） |
| 福州 / 半程马拉松 | 21.0975 | — | — | 五一广场 → 海峡国际会展中心 | null | 已填字段Verified（福州距离仅secondary） |
| 横琴 / 马拉松 | 42.195 | — | — | 横琴金融岛中央公园 → 横琴金融岛中央公园 | 6 | 已填字段Verified |
| 横琴 / 半程马拉松 | 21.0975 | — | — | 横琴金融岛中央公园 → 横琴金融岛中央公园 | 3 | 已填字段Verified |
| 熊猫蜀道山 / 160K | 160 | 约9300 | 03-26 15:30 | 白鹿音乐广场 → 白鹿音乐广场 | 46 | 已填字段Verified |
| 熊猫蜀道山 / 105K | 105 | 约5550 | 03-27 06:00 | 白鹿音乐广场 → 白鹿音乐广场 | 29 | 已填字段Verified |
| 熊猫蜀道山 / 85K³（团队赛） | 85 | 约4600 | 03-27 10:00 | 海窝子古镇 → 白鹿音乐广场 | 24 | 已填字段Verified |
| 熊猫蜀道山 / 60K | 60 | 约2600 | 03-27 08:00 / 03-27 08:30 / 03-27 09:00 | 龙门山镇宝山广场 → 白鹿音乐广场 | 12.5 | 已填字段Verified |
| 熊猫蜀道山 / 25K | 25 | 约1100 | 03-28 09:00 / 03-28 09:30 / 03-28 10:00 | 白鹿音乐广场 → 白鹿音乐广场 | 6.5 | 已填字段Verified |

深圳现有07:00仅为已确认的首次发令；规程说明仍分枪，后续具体安排待通知，既有单元素startTimes不代表不存在后续枪次。本轮未擅自补第二枪。绍兴、横琴规程有“分枪/具体办法另行通知”条款；未取得各组别补充安排，不把赛事总体07:30复制给全部组别。

熊猫五组事实沿用当前官方2027规程，重新取得原图Hash与此前相同；85K³仍团队赛，160K Strategy未接入、无CP数据不展示CP。广州55K原18小时/正文时刻/图16小时冲突未解决，继续pending及隐藏，不借本次补起终点开放该组。

## 缺口根因与仍待核验

统计单位为字段，不是公告或赛事；startAt与startTimes分别计数。所有50个原缺失字段均归类，非缺失114字段也检查但不冒充新补齐。

| 根因 | 字段数 | 说明 |
| --- | ---: | --- |
| A 来源已在、首次遗漏 | 1 | 广州报名状态，已补。 |
| B 研究不充分 | 13 | 南京/绍兴报名阶段和日期、福州距离和日期、三个官方报名入口；已补。福州4项仅secondary层级。 |
| C 非现文本提取格式 | 14 | 广州10个地图起终点、南京关门图、深圳JSON关门/入口、熊猫列表和规程对应状态；已补。没有新增OCR/Extractor。 |
| D 确认官方从未公布 | 0 | 未把“未找到”升级成“尚未公布”。即使规程写待通知，也不能穷尽公众号后续公告。 |
| E 冲突 | 2 | 广州55K关门、横琴当前候补结束边界；继续Human Review。 |
| F 其他 | 20 | 8个绍兴/横琴分枪字段未取得补充；福州4个分枪和2个关门缺直接作用域证据；2个小程序/单组报名URL未确认；深圳/福州2个当前状态缺可安全映射的证据；熊猫2个省略年份的报名日期。 |

合计：**164检查 / 50原缺失 / 28补齐 / 22仍待**。28补齐中4项为trusted_secondary（福州两个距离、两个报名日期），不得在后续指标中统计成官方直接字段核验。

工具/人工主要成本：七场官网与独立须知/公告逐页检索；手动查看5张广州路线图和南京关门表；复核熊猫规程原图Hash及报名章节；沿深圳官网公开JS找到当届JSON与最新公告列表；核对福州官方公众号gh_48faf407f407及可靠转载。没有真实模型调用、付费模型或报名交易。临时原始响应仅作隔离取证，没有把整篇文章、登录态或响应脚本提交到仓库。

## 九个新增Registry来源（全部仅授权本页）

| Source ID | URL | Tier / Type |
| --- | --- | --- |
| nanjing-marathon-registration-notice-2026 | https://www.nj-marathon.cn/page/L51XZa20wrP7jAM6vG98.html | primary_official / registration_notice |
| shaoxing-marathon-registration-notice-2026 | http://www.sxym.org.cn/html/bmxz.html | primary_official / registration_notice |
| shenzhen-marathon-current-rules-2026 | https://shenzhenmarathon.org.cn/content.html?detailId=9030978593023542&topicId=6990423356675002 | primary_official / regulations |
| shenzhen-marathon-result-2026 | https://shenzhenmarathon.org.cn/content.html?detailId=9071527999859602&topicId=6990423356675002 | primary_official / notice |
| shenzhen-marathon-registration-platform-2026 | https://shenzhen-registration.mararun.com/personal.html?lang=cn | primary_official / registration_platform |
| fuzhou-marathon-registration-reprint-2026 | https://fz.bendibao.com/news/2026910/81057.shtm | trusted_secondary / media_report |
| fuzhou-marathon-payment-faq-2026 | https://mp.weixin.qq.com/s/tRgo2hrix5uYW1d3QMe_GQ | primary_official / notice |
| hengqin-marathon-result-2026 | https://www.hengqinmarathon.com/news_detail-285.html | primary_official / notice |
| hengqin-marathon-registration-platform-2026 | https://hq-registration.mararun.com | primary_official / registration_platform |

全部active、isPrimary=false，原73来源属性不变。官网身份可复用仍须每字段证据；深圳对象存储URL及公众号URL仅绑定该具体官方引用链，不扩大到同平台其他账号/赛事。Source激活不是Fact Approval，也不改变Auto Apply。

## 可追溯响应Hash

字段RawData保存URL、Hash、fetchedAt、Edition/Category作用域；动态JSON另有contentUrl、官方publishedAt/updatetime及page→script→JSON链。下表fetchedAt为实际抓取时间，不是公告发布时间。

| 证据 | SHA-256 | fetchedAt（UTC） |
| --- | --- | --- |
| [gz-rule](https://moganshan.saihuitong.com/article?id=71446&mid=57201) | `516bc331a0ab4446d9c50f06a761f19e5cf15394758e56a2e9aaac6d10287e8f` | 2026-10-20T15:02:58.882290+00:00 |
| [gz-map-0](https://img.saihuitong.com/4717/richtext/13044845/sht/1a12f0df024bd26.png-w702) | `1afb38c94ede4ccdafd832cc4923cb62d9a7d83a707c62cc3c0f375e7c3e5071` | 2026-10-20T15:23:36.722864+00:00 |
| [gz-map-1](https://img.saihuitong.com/4717/richtext/13044845/sht/1a12f0e33431bb3.png-w702) | `44f046a4f2b544611a1c052707265c8fb0fadd76dfdb3b48854ea80c253a4787` | 2026-10-20T15:23:39.184338+00:00 |
| [gz-map-2](https://img.saihuitong.com/4717/richtext/13044845/sht/1a133013f6ff0bb.png-w702) | `914e5bf98c4d1b8e28ec9823eecd18c1b68b77fead6728bcd0837d6ef52abd2d` | 2026-10-20T15:23:36.706520+00:00 |
| [gz-map-3](https://img.saihuitong.com/4717/richtext/13044845/sht/1a12f0fcd58bd0c.png-w702) | `b43c2d87a591a23de2c44e4610037bbacc4c995e2770c3530561ed387776a635` | 2026-10-20T15:23:39.002988+00:00 |
| [gz-map-4](https://img.saihuitong.com/4717/richtext/13044845/sht/1a13301646cf548.png-w702) | `b89db761d4507df373c69e37b82ddaccd5903bdfac7215d7e4a1a55e000302b5` | 2026-10-20T15:23:36.691101+00:00 |
| [nj-registration](https://www.nj-marathon.cn/page/L51XZa20wrP7jAM6vG98.html) | `4dd8080b4627dcd54c949ac6eb04397054a085714bedae37b23219f08d67be5d` | 2026-10-20T15:06:50.360134+00:00 |
| [nj-cutoff](https://stor.ihuipao.com/image/7273463631557a6d76797071c39962fa.png) | `0c7324f8809247567432cd8812f47e85bda9f80b6f4716bb5c10e5122c7d455c` | 2026-10-20T15:21:00.114000+00:00 |
| [nj-entry](https://www.nj-marathon.cn/page/EA63XdLj8P5wjJqwoMrx.html) | `b58fc76f8195be7a652cba56a6fc6ea59fbce96728beb18716dd09ffb52941da` | 2026-10-20T15:33:15.630856+00:00 |
| [sx-registration](http://www.sxym.org.cn/html/bmxz.html) | `a8459db30820f99befc233c907ebee77bcadcd8506e24027cb47c375e4ef9262` | 2026-10-20T15:09:34.120862+00:00 |
| [sx-entry](http://www.sxym.org.cn/b/jiYrMv/entry.html) | `d7311697965d4344e26f9df2b43a9143426008676ac1c6fed6115da8992d2488` | 2026-10-20T15:33:15.545337+00:00 |
| [sz-current-rule](https://mara-public-res-online.oss-cn-beijing.aliyuncs.com/beta/cms/internal/shenzhenMarathon/detailArticle/9030978593023542.json) | `4c5b4c24510c18bdf756d02f72062fb408fd0ba2403fcbc6d664c951db12e10b` | 2026-10-20T15:15:02.267425+00:00 |
| [sz-result](https://mara-public-res-online.oss-cn-beijing.aliyuncs.com/beta/cms/internal/shenzhenMarathon/detailArticle/9071527999859602.json) | `4b4fbc257ff293aa37612e78e74ddbbc5e3b37019a0ffcaf57604faa687b05d4` | 2026-10-20T15:15:02.114193+00:00 |
| [sz-index](https://mara-public-res-online.oss-cn-beijing.aliyuncs.com/beta/cms/internal/shenzhenMarathon/homeIndex.json) | `27b89317394bf8d639403b7bcd9b7283285bee7945009cf998b9e2c87c60087f` | 2026-10-20T15:10:46.539455+00:00 |
| [sz-entry](https://shenzhen-registration.mararun.com/personal.html?lang=cn) | `3f36faf12b7bad7b801eef73b92034721bae8482351155f9c5f1e3bed2a3746c` | 2026-10-20T15:36:36.586250+00:00 |
| [fz-reg-bendi](https://fz.bendibao.com/news/2026910/81057.shtm) | `cff0c480fd6a74c02ffc963fd240fb748961d5697e5e94589dfb6fbd810a1f3e` | 2026-10-20T15:17:45.433686+00:00 |
| [fz-distance-crosscheck](https://chinamarathon.com/events/76249) | `b48ac0911b22e5103d7d42181653b23343503ce6f8a3c751f435a50779add3b8` | 2026-10-20T15:21:40.903719+00:00 |
| [fz-official-wx](https://mp.weixin.qq.com/s/tRgo2hrix5uYW1d3QMe_GQ) | `3efc0cc7c1c995bcc76d5907cf19cd6e08688d1ba697b79326f0750054998839` | 2026-10-20T15:10:46.539356+00:00 |
| [hq-result](https://www.hengqinmarathon.com/news_detail-285.html) | `eba9f51826586ce4fc26c0bc2d115420cde2f3cfce282d690fe5e9baba0bde1d` | 2026-10-20T15:06:50.536682+00:00 |
| [hq-registration](https://www.hengqinmarathon.com/race-256.html) | `c0239bce3f20ecb638db7ce72ec4d48b45cd3246b4bf5d6086e7d8d0741242b5` | 2026-10-20T15:06:50.201816+00:00 |
| [hq-entry](https://hq-registration.mararun.com) | `0a169f1a994490d6f1de8a1a44e873e286feccbeea382172b9d17f284f3de199` | 2026-10-20T15:33:15.723711+00:00 |
| [panda-list](https://tsaigu.saihuitong.com/events?mid=58097) | `eeff0d725da11955b525ef758e960e70a1baaa4604d1357648f565441d8432de` | 2026-10-20T15:10:46.588722+00:00 |
| [panda-rules](https://cdn.rockysports.cn/7664/image/20261013/lm13rkxWtL_hh6MsdygJDLzb0afq.jpg) | `b5b07e1c2853d24f746ad214c2d70df185a54440419368128631c0d6d1587a75` | 2026-10-20T15:06:51.273156+00:00 |

## 验收与交接

| 项目 | 结果 |
| --- | --- |
| 七场内容/事实/API/住宿/分享定向 | 59/59 PASS |
| npm test | **447/447 PASS，0失败/跳过**，含监测连续性、Pending去重和来源/身份安全回归 |
| typecheck / typecheck:miniprogram / lint | PASS |
| 生产Build | `npm run build -- --webpack` PASS；未改配置或部署机制 |
| Canonical Schema / Registry Schema / Public Fact Gate | PASS，19/19 Edition；广州55K原单组隔离保留 |
| 构建后 localhost:3221 HTTP | list200/19场；7个Detail均200，均5酒店/中文Guide；福州两组42.195/21.0975，广州4个公开组，熊猫5组 |
| images:share --check | 19/19 PASS；所有原图/派生图字节零修改 |
| git diff --check / Handoff本地链接 | PASS |

- 对照5a825c12：原12场Canonical和Registry完整对象不变；七场Event/Edition/Category身份、组别结构不变；现有18组distance/startAt/startTimes/elevation等已填值未修改（福州只补null距离）。
- 七篇正文/条目/推荐判断掩去四个主标题后SHA完全一致；新增回归锁定该Hash。原12篇Guide、35酒店原文件、35条AppID/Path及排序文案字节不变。
- Pending36条、历史审核记录、Ingestion State、图片资产/规则、Public DTO、客户端、工作流、Schema、Gate、Pipeline均未修改。Data-only自动PR规则/连续性原实现保持。此为Code/Content PR，不运行或放宽自动Data-only Allowlist。
- Auto Apply OFF；没有Merge、部署、生产监测、Pending审批、Canonical Production Apply。

Human Review重点：福州两组距离采用二级证据是否接受本次发布；深圳中签缴费阶段的现有枚举映射；福州二抽及横琴候补实际结束状态；熊猫报名窗口年份、未确认组别分枪/关门及广州55K冲突。不得因本地测试通过就认为这些缺口已解决。

长期标准本轮不改。建议后续仅在Human决定深圳缴费阶段映射后补充现有RegistrationStatus使用说明；当前事实/距离/正文冻结规则没有发现需放宽的冲突。本轮审计可作为Phase2/3非文本取证成本样本，不能据此直接扩展自动维护功能。

后续交回1.4：Human Review和Merge后，按实际合并Commit部署并做微信真机回归；本次没有代替设备验证。
