# Codex 开发指令｜RaceNext 2027 香港马拉松 + 莫干山 by UTMB（2026-11-19）

## 0｜任务背景与最新决策

RaceNext 微信小程序 1.0.1 已发布；根据项目 `README.md` 截至 2026-11-17 的记录，Canonical 约有 19 个 Edition（**在动手时重新核实 main 和生产现状**）。这次只增加 **2027「渣打香港馬拉松2027」**与 **2027「莫干山越野赛 by UTMB®」**两个 Edition，目标是让真实赛事内容、住宿 10 家和用户指定图片进入现有小程序数据链路。**不是需求讨论、产品重设计或发布授权。**

本次 Human 已明确指定：每场 5 家酒店及其顺序和原始携程 Path、每场一张 Cover/Hero 共用图片。两份交付包沿用 2026-11-19 V2 Research Package 已审核方向与当前住宿 V1.2；沿用包内 Race Guide 原文，不要求 Codex 重新写作。

**输入（必须齐全）：**
1. `RACENEXT_2027_HK_MARATHON_FINAL_INTEGRATION_20261119.md`
2. `RACENEXT_2027_MOGAN_UTMB_FINAL_INTEGRATION_20261119.md`
3. `assets/hk-marathon-2027-original.png`、`assets/mogan-utmb-2027-original.png`（Human 指定原图）
4. `assets/hk-marathon-2027-display-v1.jpg`、`assets/mogan-utmb-2027-display-v1.jpg`（本包离线生成的未裁切轻量建议图；线上是否使用按项目既有生成规则审查）
5. `assets/crop_QA_center_simulation_NOT_FOR_PRODUCT.png`（只做初步裁切对照，不是真机测试，不可发布）

**交付包内第 2 节是产品 Race Guide 原文；第 3 节是酒店卡片文本与原始携程动作。** 第 1/5 节是事实与治理，不得混入公开 DTO。

## 1｜先只读定位仓库事实（不要重新设计）

- 读取最新 main、现有 README、Event→Edition→Category Schema、Canonical、Source Registry、Accommodations、图片资产 Registry、小程序实际 ViewModel/WXML 与 Public Fact Gate、分享和埋点语义；核对当下公开赛事数，不机械采用 19 作为已经上线的即时数字。
- 检查现有 Event/Edition 是否同义存在、英文别名和历史年份，不因给定候选 ID 直接生成重复记录。香港马拉松与 HK100 不同赛事；莫干山 by UTMB 与凯乐石莫干山跑山赛不是同一品牌。
- 只读检查 Open PR / 自动 Data PR / Working Tree；使用独立 Worktree 和分支 `codex/add-hk-marathon-mogan-utmb-2027`（如冲突则采用近似唯一分支）。不得覆盖他人未提交工作，不要关闭/强推监测 PR。
- 读取适用冻结规范：《RaceNext 数据系统 V1》《赛事详情页内容撰写规范 V1》《越野赛事详情页内容标准 V1》《住宿推荐与内容生产标准 V1.2》《赛事图片资产标准 V1》《小程序详情页与分享标准 V1》《新增赛事研究交付标准 V1》。项目旧 README 若仍引用 Accommodation V1.1，以本次 Human 决定和 V1.2 为准，不开展无关文档迁移。

## 2｜允许做的工作（仅两个 Edition）

### A. 官方事实与数据接入

- 以两份包中的当届官网原文及 Evidence Index 为本次来源基础；Codex 自行对当届正文、届次、具体组别、字段作用域、必要的当前状态进行最小核验并记录可追踪来源。真实官方 URL 加入/复用既有 Source Registry，区分官方事实、其他可信官方辅证、媒体/Runner Evidence，不修改 Registry 治理结构。
- 展示正式赛事名以当届官方为准：`渣打香港馬拉松2027`（繁体官方形式）和 `2027 莫干山越野赛 by UTMB®`（官网中文品牌为「莫干山越野赛 by UTMB®」）。不能机械改为用户聊天中的简称。Stable Event 品牌和每届 Edition 的显示标题按现有模型分工。
- **香港马：** 全马日期 2027-01-17 (HKT UTC+8)，挑战组/一组/二组分别 06:00/06:25/06:50；尖沙咀弥敦道 → 维园，项目总关门 6h。半马、10K、10K轮椅属于当届项目但部分组别信息 Pending；取得当届官方正文才接入对应 Category 的完整事实；不可借去年时间或把三枪压成单枪。1/16 的 5K 海滨跑不是 1/17 同日主赛组别。
- **莫干山：** 2027-04-16 至 04-18 (CST UTC+8)，DMG/CMG/MMG/NMG/EMG/10K；官方组别名 100K/65K/50K/35K/20K/10K，对应当届官网 Distance 为 96/67/52/36/23/10km。`Category.distanceKm` 采用现有“官方标称距离”语义，**二者差异必须单独留证 + Human Fact Gate，不能自行选其中一个写死**。NMG 官网页面疑似异地模板污染，不使用其中的异地历史景点描述；J.LALLI VALLEY 中文落点与 NMG 等终点 Pending，不补造。DMG 2027 CP/补给/换装/分段关门 Pending。
- 按现有 Publish Eligibility 对事实不足的单个组别或 Edition **Fail Closed**；仅接入可证明的内容，列事实缺口，不为凑上线数量放宽 Gate 或假装全部通过。若需要 Human 裁定一个关键数值，先保留待审值并继续非阻断工作，不让 Codex 自行定义新的事实标准。

### B. 产品 Race Guide、住宿与携程 Action

- 按包内第 2 节完整接入两篇 Race Guide，不重写 Opening/Judgment/Core Experiences/Runner Fit/Closing；只做现有 Schema 必需的结构映射，不改实质文字。
- 每场五家、共 **10 家酒店**。酒店顺序、用户选定名称、`recommendationTitle`、`recommendationReason`、AppID、原始 `path` 逐字接入；保留 `biz` 排序、check-in/out、`AllianceID=9729651`、`sid=327120872`、每条不同的 `guid`，不要重新编码或用比赛日期改写原始 `inday/outday`。Hotel ID 与正式携程详情页身份逐一检查，冲突以 Evidence 报告，不擅自替换链接。特别注意「香港柏宁酒店」携程可展示「傲途格精选」，以及「莫干山丰赡楼客栈」官网名与携程「民宿」名差异。
- 香港「富豪九龙酒店」是当届赛事酒店套餐合作对象，但携程普通订房 **不继承**套餐赛事名额、晚餐或延迟退房。CMG 裸心谷 → 郡安里异地终点的返程条件必须保留。
- **禁止**接入莫干山 DMG 100K Race Strategy：`HOLD / NOT FOR PRODUCT`。官方 CP Facts 仍 Pending；不把 Race Guide 的泛化建议伪装成三段 Strategy。香港马不做 Trail Strategy。

### C. 图片处理（最高优先级）

- 两张原图由用户提供；为每场只用一个经过优化的 Display Image 同时作为 Cover / Hero，复用当前 Edition Asset Registry 和数据/显示路径，不创建新图片系统。保留 Original 原图和 Hash；不要把原始 2MB 左右 PNG 用于线上请求。
- `assets/*-display-v1.jpg` 为离线已生成的候选轻量版，未裁切、1600px 以内、各 <600KiB；Codex 可沿用当前发布脚本重新生成，但必须汇报原图/衍生图尺寸、格式、bytes、实际网络下载量，并确认线上 URL 去重。
- **香港原图极宽（2048×657），与 Cover 16:9 / Hero 2:1 不匹配。** 若按 `aspectFill` 中心裁切会切 Logo/底部文字，必须实机检查，必要时用项目既有对象定位/裁切参数做最小调整并给出截图；不许静默改成别的图、擦除 Logo 或大改页面样式。裁切无法接受则 `IMAGE_QA_HOLD`，等待 Human 选择。
- **莫干山图有大面积中央 Logo**，与现有赛事标题叠加可能冲突；检查移动端 Hero 文案层级。不得擦除图中赛事 Logo。
- 记录来源：`user_provided`、当届赛事 KV/视觉、来源 URL/作者未提供、`usage_rights=unverified`（按实际既有字段映射）；不要因为用户选定就伪称版权已审核通过。集成/本地预览可进行，但正式对公众发布图片需 Human 许可确认。
- 校验冷缓存首页列表（新增两图滚动加载）、首次详情 Hero 和返回重开、热缓存对比、图片 HTTP Content-Length/Content-Type、分享图。性能目标单张 300–500KiB；≤600KiB 为原则上限，异常需报告，不静默放大。

## 3｜严格禁止修改范围

- 不新增第 3 场赛事；不扩大到 2027 东京马；不动已有 19 场的 Canonical / Guide / 酒店 / 图片／已审核 Evidence；不做产品重新设计、页面重排、Schema/数据模型重构、CMS、Provider/自动维护 Pipeline 升级或建立新监测系统。
- 保持 `Auto Apply=OFF`。不自动审批 Pending、未核事实或图片版权，不更改已有审核历史，不推动生产 Data PR merge/close。
- 不改埋点事件语义，原有 `race_detail_view`、`accommodation_view`、`hotel_click` 和分享埋点不得回归；跨小程序导航应继续复用现有携程跳转方式。
- 允许最小的必要数据、Registry、图片、测试、相关文档变更；发现 Schema 或 Gate 无法表达真实事实时暂停该字段/组别，给最小差异报告供 Human 决策，不自行调整规则。

## 4｜必须完成的验收与测试

1. **输入一致性**：2 篇 Guide 完整；2×5 家、10 Title、10 Reason、10 原始 Path 与交付包逐字符匹配。脚本检查 Hotel ID、AppID、guid、参数值/顺序、入住日期；尤其莫干山郡安里 `biz=1` 在 `id` 前，不能按其它 9 条重排。
2. **事实**：对照两场 Evidence Index 与当前官网；官方名称、届次、日期、各组 startTimes、起终点、标称距离、海拔等有字段直证；未证为 Pending/Unknown。NMG 污染内容零入库；100K Strategy 无 Public DTO 输出。
3. **构建/回归**：项目现有专项与完整 `npm test`、`npm run typecheck`、`npm run typecheck:miniprogram`、`npm run lint`、标准 `npm run build`、`git diff --check`、Public Fact Gate、图片/分享校验。每条输出 `PASS/FAIL/BLOCKED/NOT RUN` 和真实原因；默认构建失败不能用另一构建冒充 PASS。
4. **本地 API / 小程序**：检查 `/api/races` / 单场详情的当前实际路由、名称、组别切换、Guide、酒店 CTA、分享、埋点，旧 19 场不变；公开数从基线按**真实 Gate 结果**增长，不写死 19→21。
5. **图片**：两张 Original 与 Display 各对应唯一 Edition，线上大小和实际展示/裁切/标题可读性；缺真机就写 `NOT VERIFIED`。
6. **携程**：10 条导航到正确酒店、手动选择 2027 赛事期间入住日期、联盟跟踪；若网络/真机无法测，保留明确待验项目，不能假称转化成功。
7. **Source Registry / 治理**：仅添加真实对应的当届来源，记录来源网址、访问状态/时间、Edition/Category scope、证据强度；不重复登记历史别名、无内部 Evidence 向 Public DTO 泄漏。
8. **Git**：最小范围文件精确暂存、Commit、Push、**Draft PR**，附实际测试和 Handoff。此阶段停止，不自动 Merge、部署、提审或修改生产。

## 5｜Codex 交接报告必须包含

- Branch / base SHA / PR / 变更文件与原仓库保护情况；正式 Event/Edition/Category IDs 和新增/复用 Source Registry 明细。
- 两场分别的 `Official Fact Gate / Race Guide / Hotels 5/5 / Ctrip 5/5 / Cover-Hero / Share / Public API` 状态；莫干山 `Strategy=HOLD`，香港非全马组别不能假装全部证实。
- 图片优化前后尺寸、bytes、Hash、网络冷/热缓存实测与裁切截图；实际图片权利状态。
- 逐项测试命令与 PASS/FAIL；当前**真实**公开赛事数量、未发布的 Edition/Category 及每个 Pending 的解除条件。
- `Integrated / Automated QA / Draft PR / Merge / Deployed / Mini Program Real-device Verified / Hotel Click Tracking Verified` 七个状态明确区分。
- **等待 Human Review**：不得在本次任务自动执行 Merge/Production Deploy。我们 Review Codex 报告后再决定上线及是否需要重新提审微信小程序。

**立即开始：先核验两份交付包、图片与仓库基线，再执行受控集成。不要自行重写指南、酒店排序或产品设计；遇事实冲突按本指令保持 Pending 和 Fail Closed。**
