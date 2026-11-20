# 2027 香港马拉松与莫干山 by UTMB 接入 Handoff

## 最终事实裁定与六组别公开，2026-11-20

本节为当前有效状态，取代下方2026-11-19 QA中的三个组别HOLD和报名unknown结论；下方原始取证、差异和历史判断全部保留。本轮仅完成PR #55数据及自动验收，不表示合并、部署或微信真机通过。

事实修复 Commit：`4e45364b9b81ea075de21b742c69d25131e2018d`；本节为随后文档提交的归档记录，PR最新Head见PR #55。

### 来源优先级与实际复核

Human于2026-11-20明确裁定：同一2027届次的主办方正式竞赛规程及国内报名系统优先，UTMB组别展示页面其次，第三方仅交叉印证。该裁定仅用于本次Edition，不改冻结距离语义、Schema或自动提取Pipeline。

重新访问[官网报名页](https://mogan.utmb.world/registrations)及[国内官方入口](https://lungkingos.lungking.com/s/evps2696)，实际getRaceInfo仍为APPLYING，赛事名、raceId和2027-04-16至18日期匹配；getCategoryList的前六个普通参赛组别为DMG100K/CMG65K/MMG50K/NMG35K/EMG20K/FMG10K，精英直通通道没有被重复建模为额外组别。

getIntroduction引用的三张正式规程原图本轮重新下载，逐组查看原始分辨率分段；三张SHA-256与11月19日完全相同。图1核对六组时间、起终点、实际距离及爬升，图2核对报名/抽签/补录和资格语义，图3核对组委会落款2026年11月及规程身份。未只凭Human表格写入，也没有推算CP、分段/绝对关门钟点。

[本轮实时取证、逐组Before/After、完整查询响应及Human裁定](inputs/two-races-20261119/mogan-final-fact-evidence-20261120.json)

### 六组别最终事实

全部为2027年、UTC+08:00，顺序与Stable ID保持不变。组别标称distanceKm继续使用100/65/50/35/20/10，实际距离仅在内部Evidence/Raw Data，不新增Public DTO字段或展示模块。

| Stable ID后缀 | 显示名称 | distanceKm | 规程实际km（内部） | 累计爬升m | 总时限h | 发枪时间 | 中文起点→终点 | Governance / Public |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| dmg | DMG 100K | 100 | 96.5 | 5110 | 28 | 04-16 20:00 | 郡安里→郡安里 | Verified / PASS |
| cmg | CMG 65K | 65 | 67.6 | 3350 | 19 | 04-17 07:00 | 裸心谷生态度假区→郡安里 | Verified / PASS |
| mmg | MMG 50K | 50 | 52.5 | 3030 | 15 | 04-16 22:00 | 郡安里→郡安里 | Verified / PASS |
| nmg | NMG 35K | 35 | 35.6 | 2180 | 11 | 04-17 09:00 | 郡安里→郡安里 | Verified / PASS |
| emg | EMG 20K | 20 | 23 | 1260 | 7 | 04-18 09:00 | 郡安里→郡安里 | Verified / PASS |
| 10k | FMG 10K | 10 | 11.3 | 340 | 3.5 | 04-18 10:00 | 郡安里→郡安里 | Verified / PASS |

完整Category ID为`ultra-trail-mogan-by-utmb-2027-<后缀>`，没有删除、重建或重复Category。官网10K与主办方FMG10K属于同一届唯一标称10公里组，发枪4月18日10:00、总时限3.5h及起终点对应，显示名采用正式规程FMG 10K，原`-10k` ID不变。CMG完整中文地点仍由当届中文官网支持，不精确到某栋建筑/入口。

### 此前三个公开组别爬升变更，供Human复核

| Category | 原官网值 | 正式规程值 | 变化 |
| --- | ---: | ---: | ---: |
| DMG 100K | 5000m | 5110m | +110m |
| CMG 65K | 3400m | 3350m | -50m |
| MMG 50K | 2900m | 3030m | +130m |

NMG 1900→2180m、EMG 1200→1260m、10K 300→340m同时统一到正式规程口径。所有原官网距离/爬升、英文地名和11月19日待审记录保持原样；新增本轮复核观察及Human decisionDate=2026-11-20。fieldSources指向当前正式规程观察，CMG起点继续保留中文官网直接来源。verifiedAt使用实际执行时间，不回填审批日期。

三个原HOLD组别现在有完整的正式当届直证及本次Human裁定，标记verified/verificationStatus=verified，通过现有Category发布规则。负例测试将三组复制为未完成审核状态后，现有Gate仍只返回原三个组别；未修改或绕过isCategoryPublishable。

### 国内报名状态

本轮执行日期2026-11-20位于正式规程2026-11-12至12-20 23:59报名窗口内，国内系统实际返回APPLYING，因此Edition.registrationStatus=registration_open，现有ViewModel映射为「报名中」。当前事实作用域明确为中国大陆官方报名通道的报名及抽签资格申请，缴费/提交不代表已中签或已获得参赛名额；规程计划12月30日10:00公布抽签结果。

国际官网卡片旧的已截止提示作为不同来源观察保留，不覆盖本次国内通道事实。不自行宣称卡片差异根因已查明。registrationOpenDate/CloseDate/Url保持原值null，没有推造报名开启的绝对时刻或把阶段窗口扩成所有渠道全局日期。unknown→「报名信息待确认」通用兜底保持原样，其他赛事展示不变。

### Source Registry与安全边界

仅为既有莫干山规程图/国内入口Registry notes补充本次事实裁定；URL、Source ID、tier和status均未改变，eligible source集合不变。本轮批准的是已实际读取证据的事实选择，不扩展自动图像/SPA处理：原pending_review仍表示自动接入/激活有待独立审核。新增的当前复核记录和原始历史记录共同保留，不因优先来源裁定而清理不同意见。

自动监测以后仍可能从旧官网参数提出建议，本轮未修改Pipeline来源选择逻辑。这类建议应参考本次已记录的Human裁定审核；Auto Apply继续OFF，不会据此自动回退Canonical。PR #46保持Open且未操作，Pending/State字节不变。

### 测试与当前状态

- `npm test`：499/499 PASS，无跳过。
- `node --test --experimental-strip-types tests/contentBatch20261119.test.ts tests/prePublishFactGate.test.ts`：19/19 PASS。覆盖六组直证/来源裁定、报名中映射、unknown兜底、六组切换及撤销审核后仍Fail Closed的负例。
- `npm run typecheck` / `npm run typecheck:miniprogram` / `npm run lint`：PASS。
- 标准 `npm run build`：PASS，默认Turbopack生成118个静态页面，只有既存metadataBase提醒。
- `git diff --check`、Source Registry结构和eligible source集合保护：PASS。
- [实际本地API与ViewModel证据](inputs/two-races-20261119/mogan-final-local-api-20261120.json)：22个HTTP请求200，公开21场；莫干山六组全部返回，距离/爬升/时限/发枪/中文地点逐项相符，六组均可切换，报名中正常显示，5家酒店不变、无Strategy/CP section、无内部字段泄漏。
- 原19场及香港20个详情排除全局dataUpdatedAt后完整相等；列表仅莫干山registrationStatus发生预期变化。
- 保护检查：原20场Canonical/Registry相等，原始SourceRecord作为前缀逐项相等；Guide、酒店动作、资产、ViewModel、Gate、Schema和Pending/State字节不变。
- 本地服务验收后已停止。微信开发者工具/真机新一轮人工QA：NOT VERIFIED；Merge / Deploy / 生产监测触发：NOT RUN。

本轮变更：莫干山Canonical、对应Registry notes、直接相关测试、本Handoff、两份隔离证据JSON。香港和其他19场Canonical/Registry保持相等；指南、酒店/携程动作、图片/分享、ViewModel实现、API DTO、Schema、Gate、Analytics、Workflow、调度均未改动。原有20场实际API详情排除全局dataUpdatedAt后逐字段相等。

本轮事实目标无剩余阻断。初始接入的香港图片裁切、图片许可、实际携程归因及微信真机仍属未验事项，本轮没有宣称其通过。Draft保持；不Merge、不Deploy、不触发生产监测。

---


## PR #55 莫干山详情页 QA 补证，2026-11-19

本节为 de4f0c6 后的最新状态；其后的首次接入记录保留为历史取证，不代表本轮仍使用英文地点或缺失中文起终点。

### 三个问题的结果

1. **中文地点修正完成**：DMG 100K「郡安里→郡安里」、CMG 65K「裸心谷生态度假区→郡安里」、MMG 50K「郡安里→郡安里」。依据当届[DMG中文页](https://mogan.utmb.world/zh-Hans/races/DMG)、[CMG中文页](https://mogan.utmb.world/zh-Hans/races/CMG)、[MMG中文页](https://mogan.utmb.world/zh-Hans/races/MMG)的明确路线描述，更新Canonical用户展示字段和对应fieldSources，所有原英文SourceRecord及Raw Data保留。未精确到建筑或运动员入口，原距离、爬升和时间不变。
2. **三个未公开组别已完成调查，继续HOLD**：主办方官方规程补足了中文起终点，但与UTMB官网数值有实质冲突。只写入有直接表格证据的「郡安里→郡安里」，不选择冲突的数字；整体verificationStatus仍为pending、verified=false、verifiedAt=null，现有Gate继续将它们排除。未删除历史SourceRecord，未放宽isCategoryPublishable。
3. **报名维持unknown，并显示「报名信息待确认」**：主办方2027入口实际返回APPLYING；规程写明报名、抽签和补录阶段，但UTMB中文首页同时显示已截止或不一致的组别卡片。无法证明差异的确切原因，所以不自行选择全届报名状态，registrationOpenDate/CloseDate/Url均保持原值null。采用现有ViewModel的通用unknown文案映射，仅增加一行；没有莫干山ID特例，没有硬编码报名中。

unknown文案是共享状态的真实兜底，因此原有深圳马、福州马、横琴马中同为unknown的状态也会显示「报名信息待确认」。这三场的Canonical、API字段、指南、住宿及动作均不变；其他报名状态文案和香港「报名已结束」不变。本轮没有新增页面结构。

### 主办方身份与直接证据

取证链：[2027官网报名页](https://mogan.utmb.world/registrations)→中国居民入口[隆景体育](https://lungkingos.lungking.com/s/evps2696)→公开getRaceInfo/getCategoryList/getIntroduction查询。入口重定向明确绑定raceId=2c908c04a1ce915301a1cf4a7b7a4862，返回赛事名2027莫干山越野赛by UTMB®及六个组别。只读查询使用官网前端原有的POST接口，无登录、无报名/支付提交、无个人资料。categoryStatus=NOT_STARTED表示比赛尚未开赛，不能据此推断报名尚未开始；mileage=0为平台空值，未当作距离。

getIntroduction的三张官方规程长图已实际下载、查看原始分辨率分段，记录SHA-256和像素定位。本轮手工读图转录，不建立OCR/提取系统。路线和报名数字由以下官方规程证据提供，最酷仅作为第三方交叉印证，tier=trusted_secondary、sourceType=media_report，未冒充官方。

[完整QA证据、原始URL/Hash/查询参数及字段对照](inputs/two-races-20261119/mogan-qa-evidence.json)

### 未公开组别逐项对照

时间均为2027年、Asia/Shanghai（UTC+8）；赛事窗口4月16日至18日。标称距离沿用Human在2026-11-19已批准的35/20/10，不因路线实测差异修改。

| 字段 | NMG 35K | EMG 20K | 10K / 规程称FMG10K |
| --- | --- | --- | --- |
| 当届身份 | 官网与官方平台均有NMG35K | 官网与平台均有EMG20K | 官网10K，平台及规程FMG10K；Stable ID未改 |
| 标称distanceKm | 35，批准不变 | 20，批准不变 | 10，批准不变 |
| 实际距离：官网/官方规程 | 36 / 35.6 km，冲突 | 23 / 23 km，一致 | 10 / 11.3 km，冲突 |
| 爬升：官网/官方规程 | 1900 / 2180 m，冲突 | 1200 / 1260 m，冲突 | 300 / 340 m，冲突 |
| 发枪：两方一致 | 04-17 09:00 | 04-18 09:00 | 04-18 10:00 |
| 关门总时限：两方一致 | 11h | 7h | 3.5h |
| 官网起点卡片 | J.LALLI VALLEY | J.LALLI VALLEY | J.LALLI VALLEY |
| 官方规程中文起点/终点 | 郡安里 / 郡安里 | 郡安里 / 郡安里 | 郡安里 / 郡安里 |
| 当届中文页问题 | HTTP500，英文页另有异地模板污染 | 标题/key figures为10K、正文为20K，身份混杂 | HTTP500 |
| Canonical本轮动作 | 仅补中文起终点和冲突证据；原数字保留待审 | 同左 | 同左 |
| 公共输出 | HOLD，不公开 | HOLD，不公开 | HOLD，不公开 |

官网分别为[NMG](https://mogan.utmb.world/races/NMG)、[EMG](https://mogan.utmb.world/races/EMG)、[10K](https://mogan.utmb.world/races/10K)。官方规程为QA证据JSON中officialRulebookImages[0]，其「赛事信息」表明确写中文起终点，地图同时列有中英文起终点名称；未由J.LALLI VALLEY猜测翻译。各组名下的数值由本组专属栏目读取，没有用Edition.venue推导。

没有统一绝对关门钟点直证，未由总时长自动推算。没有接入任何CP或DMG Strategy。

### 报名阶段与冲突

官方规程表列：2026-11-12至12-20 23:59报名及缴费；报名人数超过限定名额时抽签；12-21至12-29抽签；12-30 10:00公布结果；12-30 10:00至2027-03-15 23:59补录。填报/缴费只取得等待抽签的资格，不保证获得参赛名额。当前11月19日落在规程所述报名窗口，官方平台同时为APPLYING。

但UTMB中文首页DMG/CMG/MMG/10K等卡片显示已截止，NMG即将推出，另有20K/10K卡片混用。不同国内/国际报名渠道或内容更新不同步是合理推断，未取得官方解释，不标成已确认根因。不把官网卡片与主办方入口任何一方单独提升为全届最终状态，也不将未来抽签日期误映射成报名开始日。

### 仍需Human决定

- 裁定三个HOLD组别应采用的当届权威数字；尤其NMG实际35.6/36、爬升2180/1900，EMG爬升1260/1200，10K实际11.3/10、爬升340/300。审核通过后才可另行将对应Category标为verified并验证Gate。
- 同一官方规程另列DMG 96.5km/5110m、CMG 67.6km/3350m、MMG 52.5km/3030m，与此前已登记官网96/5000、67/3400、52/2900存在差异。本轮严格只改这三个组别中文地点，未改已批准数字；后续如需改数值，必须独立裁定。
- 如要显示明确报名中/预报名中，仍需裁定国内/国际渠道状态冲突及对全届的适用范围。当前安全展示为报名信息待确认。
- 首次接入的图片/真机/携程待验项仍有效，本轮未修改图片、分享、Analytics、Guide或酒店。

新增7个Registry来源：三个中文组别页active；两张官方规程图、隆景SPA入口、最酷条目pending_review，仅供人工证据核对，不新增JSON/OCR自动处理能力，不为本次调查激活未支持的内容类型。原NMG来源pending_review不变。已有的英文SourceRecord全部原样保留。

### 本轮验证与保护

- 完整 `npm test`：499/499 PASS，无跳过。
- 新批次、详情展示、组别切换与Public Fact Gate专项：60/60 PASS；原10家酒店及Guide逐字回归仍通过。
- `npm run typecheck`、`npm run typecheck:miniprogram`、`npm run lint`、默认 `npm run build`：PASS。默认构建118个静态页面，仅保留既存metadataBase提醒。
- `git diff --check`及完整本轮Scope核对：PASS。
- [实际本地HTTP及ViewModel验收](inputs/two-races-20261119/mogan-local-qa.json)：列表及21个详情共22请求HTTP200；其余20场详情在排除全局dataUpdatedAt后完整相等，列表内容不变。莫干山只公开原3个组别，全部中文地点，unknown明确展示；三组切换成功，5家酒店不变，无Strategy/内部字段泄漏。
- 初轮受限环境的3个连续性测试因本地端口EPERM未能运行；允许隔离回环端口后按原命令全量重跑499/499通过，未修改连续性测试或Guard。
- 原两条“unknown隐藏”展示测试已按本次待确认展示要求更新断言，仍验证位置兜底、无报名中承诺及源状态不变。
- 微信开发者工具/真机的新一轮人工QA：NOT VERIFIED；没有替Human声称通过。

原19场及香港Canonical/Source Registry条目逐项不变，10家酒店及动作、两篇指南、所有图片/分享文件不变；Pending/State字节不变。PR #46保持Open且未操作，Auto Apply OFF，Schema、Fact Gate、Workflow和调度均不变。

---

## 首次接入记录，历史基线 de4f0c6

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
