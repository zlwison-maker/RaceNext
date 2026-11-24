# RaceNext｜2027 眉山仁寿半马与大连100接入 Handoff

2026-11-24（北京时间）

| 项目 | 核对结果 |
| --- | --- |
| 基线 | GitHub `main` `94ae2760b5341d736ed5dfeefe5a91a1ad9e9cda`，PR #59 已合并。通过 GitHub 的签名对象与两棵对象树核对基线 |
| 独立分支 | `codex/add-renshou-dalian100-2027`。本地 Checkout 为 `/tmp/racenext-integration-20261124.YBd0Oi/worktree`。交付 Head 和 CI 见 Draft PR |
| 最近已验收生产 | 23 场，部署 `70d57b14ba3d58191b1ea108921c966a7343633b`。公网端点本轮未能实时回读，引用 PR #58 已归档生产证据 |
| 本地构建 | 25 场，25 个详情返回 200。原 23 场列表项及详情通过完整回归。详情比对只排除全局 `dataUpdatedAt` |
| 监测账本 | PR #46 仍 Open，Head `c243b49d3a290415adf349de34d087fd5d0a6fb7`。Auto Apply OFF。Pending、State、Workflow 与基线字节一致 |
| 交付包 | 17 个文件，3,514,500 B，SHA-256 `9179022db1a917b063387681784ec7fff96dc0e9aadbe9820d40d261b1cef048`。两份 Final §02 与各自 V2 完全一致，两级 Manifest 与 Final 十家原文和 Action 一致 |

[PR #58 生产证据](PR58_PRODUCTION_RELEASE_CLOSEOUT_20261124.md) · [PR #59](https://github.com/zlwison-maker/RaceNext/pull/59) · [PR #46](https://github.com/zlwison-maker/RaceNext/pull/46) · [原始 Manifest](inputs/two-races-20261124/manifest.json) · [本地 API 证据](inputs/two-races-20261124/local-api-evidence.json)

## 赛事事实

| 赛事 | 直接核验和数据口径 | 本地结论 |
| --- | --- | --- |
| 眉山仁寿半程马拉松 | 2027-02-28 08:30，四川眉山仁寿体育场。一个半马组，21.0975 km，3h 按各分区发令。大会公布 08:30，后续分区时刻待公告。终点为 null。预报名 2026-11-18 14:00 至 12-20 22:00，大众需两次规定成绩，抽签后缴费。默认入口取已复核的最酷当届报名页 | **PASS**。起跑地点由当届合作报名正文直接支持。博捷原规程图未取得可读正文，3h 使用我要赛当届规程可检索表格并与马114全文同条比对，可能同源。原图仍列复核项 |
| 大连100 | 官方活动 2027-05-21 至 23 日。5 月 21 日含活动和领物，沿用 PR #58 比赛日期口径，Edition 取 5 月 22 至 23 日。三个组均由傅家庄公园起终点。只保存标称距离，实际长度及绝对终点关门留于来源证据 | **PASS**。CP 与 Race Strategy 保持 HOLD，下降和领物柜台留空。官网主域部分访问超时，雷越野官方赛会通当届规程和报名须知正文可读，合作报名页和逐组入口补证 |

[博捷当届赛事页](https://www.sichuanbojiesports.com/races/2027-mei-mountain-ren-shou-half-marathon) · [博捷竞赛规程入口](https://www.sichuanbojiesports.com/articles/331) · [最酷仁寿报名](https://reg.zuicool.com/17623) · [我要赛当届规程](https://m.51sai.com/19068/des) · [马114规程转录](https://ma114.net/event.asp?id=3969) · [大连官方规程](https://dl100k.saihuitong.com/text?mid=81897) · [大连官方报名须知](https://dl100k.saihuitong.com/text?mid=81901) · [最酷大连报名](https://reg.zuicool.com/44398)

| 大连组别 | 标称 / 实际长度 | 爬升 / 限时 | 发枪 → 终点关门（UTC+08:00） | 逐组入口本次显示 |
| --- | --- | --- | --- | --- |
| 100KM 实力跑 | 100 / 100.7 km | 5536 m / 30h | 05-22 06:00 → 05-23 12:00 | [可报名](https://dl100k.saihuitong.com/event?id=910774&mid=81873) |
| 50KM 进阶跑 | 50 / 50.3 km | 2889 m / 15h | 05-22 08:00 → 05-22 23:00 | [已满](https://dl100k.saihuitong.com/event?id=911064&mid=81873) |
| 30KM 潇洒跑 | 30 / 30.5 km | 1478 m / 8h | 05-23 06:00 → 05-23 14:00 | [已满](https://dl100k.saihuitong.com/event?id=911066&mid=81873) |

大连赛事级报名开放以 100K 组当届官方直达入口主按钮为依据。部分同站推荐列表按钮与组别详情自身不一致，最酷本次显示 100K、50K 可报和 30K 截止。50K 在 Final 的官方快照为可报，本次逐组直达页显示已满，作为渠道与时效差异保留。赛事级默认链接取仍显示可报的 100K 官方直达入口。公开 DTO 沿用现有赛事级状态，组别状态证据留在内部。报名状态须在发布前重新读取。

| ID | Event | Edition | Category |
| --- | --- | --- | --- |
| 仁寿 | `meishan-renshou-half-marathon` | `meishan-renshou-half-marathon-2027` | `meishan-renshou-half-marathon-2027-half` |
| 大连 | `dalian-100` | `dalian-100-2027` | `dalian-100-2027-100k`、`dalian-100-2027-50k`、`dalian-100-2027-30k` |

候选 ID 与实际 ID 一致，基线无重名实体。两场使用 Asia/Shanghai。证据 URL、届次、组别作用域、访问时点、事实匹配和字段绑定留在 Canonical Governance 与 Registry。最新核验选取的来源优先于 Final 中的旧链接快照，批准文案保留原样。

## 指南、酒店与分享

- 两场 A–E 的标题、段落、强调标题及最后过渡句与 Final 原样逐段对比。E 沿用无标题正文。仁寿单组无 Tab，正常展示距离和执行信息，终点不显示。大连三组可切换，自身起终点、发枪和组别事实匹配，无空 CP 或 Strategy 模块。
- 两场各五家酒店公开。身份由携程或 Trip.com 对应物业 ID 确认。仁寿以当届体育场开赛地点为锚，大连以当届傅家庄公园共用起终点为锚。未发现需要单项 HOLD 的新增卡片。公开推荐文案表达的是区域选择，具体检录入口、夜间通行、封路和接驳仍待赛事公告。证据不足以保证任何比赛日步行时长。
- 维也纳的历史参赛反馈来自携程可检索评论，评论日期未独立验证。仁寿其余酒店的商业平台身份及位置证据与 Final 逐项对齐。大连五家品牌和地点均由对应携程详情复核，来源描述的是日常地址及位置关系。
- 十条酒店 ID、AppID、Path、参数顺序和临时日期逐字符相同。公开 API 和模拟 `wx.navigateToMiniProgram` 的 10 次传参全部通过，仍使用 `release`。实际微信打开携程、酒店落地、交易和归因均待真实环境。
- 赛事的好友和朋友圈分享使用各自 5:4 图，路径、Query 和 `race_share` 保持现有语义。现有分享生成器检查 25/25 已生成且无过期产物。

[仁寿 Final](inputs/two-races-20261124/renshou/RACENEXT_2027_RENSHOU_FINAL_INTEGRATION_20261124.md) · [大连 Final](inputs/two-races-20261124/dalian/RACENEXT_2027_DALIAN100_FINAL_INTEGRATION_20261124.md) · [住宿与 Action 测试](../../tests/contentBatch20261124.test.ts)

## 图片与裁切

| 赛事 | 原件 PNG | Cover 16:9 | Hero 2:1 | Share 5:4 |
| --- | --- | --- | --- | --- |
| 仁寿 | 1080×487，531,799 B | 1088×612，90,091 B | 1080×540，137,313 B | 750×600，82,352 B |
| 大连 | 2048×709，2,223,051 B | 1088×612，79,287 B | 1440×720，176,005 B | 750×600，71,527 B |

两张原件与交付包逐字节匹配，原图 SHA-256 详见资产记录。使用等比完整图和纯色留边，Cover 把完整 KV 放进现有分享派生可保留的安全区，Hero 按现有 2:1 容器独立适配。文字、日期和标识保留，大连右侧 15 周年及赛事名称可见。封面和分享的小尺寸字级、留边比例以及仁寿源分辨率留给 Human 看图验收。没有改小程序布局、全局裁切机制或原件。Next 构建 HTTP 处理器内实测八个原件及三种派生资源均 200、MIME 正确、传输字节与文件相同，按 ETag 条件请求均 304。

图片年份按画面记录为 2027，来源为 Human 提供，独立来源及作者未知，使用权为 `unverified`。两场发布均 **HOLD** 待图权和微信真机确认。这里的图是使用现有容器比例核对的实际资产输出，微信内完整页面截图和真实分享卡片仍待真机。

[六图预览](previews/renshou-dalian100-20261124.jpg) · [图片尺寸、字节、原图和派生 Hash](inputs/two-races-20261124/asset-verification.json) · [HTTP 和缓存证据](inputs/two-races-20261124/local-api-evidence.json)

## QA 与变更边界

| 检查 | 结果 |
| --- | --- |
| 定向测试 | 43/43 PASS |
| 本地全量 `npm test` | 521/524 PASS，剩余三项为原基线同名的模拟监听测试，均由沙箱 TCP listen EPERM 阻断。精确基线为 516/519 PASS |
| Web / 小程序 TypeScript、Lint | PASS |
| 默认 Build | 本地 Turbopack 需要绑定端口，环境 EPERM。相同源码使用 Webpack 构建 PASS |
| Pre-Publish Fact Gate | 25/25 PASS，沿用既有规则 |
| Public API Smoke | 构建后的 Next HTTP 处理器用内存请求/响应验证，列表及 25 个详情响应 200，无私有治理字段，原 23 场逐条完全匹配 |
| 分享和资产 | 25/25 派生检查 PASS。新两场八个文件 HTTP 200、MIME、字节和 ETag 304 均 PASS |
| Git Diff、旧条目与保护对象 | 原 23 条 Canonical、23 个 Registry Edition、46 条资产映射不变。Pending、State、Workflow 字节一致，现有 UI、公共 Fact Gate、Analytics 和分享契约不在改动范围 |
| GitHub CI | 在 Draft PR 上按同一 Head 核查既有 `Race Maintenance P0 Validation`，与本地测试分开记录 |

变更包含两个 Event、两个 Edition、四个 Category、两个来源注册条目、两场编辑内容及酒店索引、原件和派生图、定向测试、交付副本与证据。项目未创建 Schema 或功能，无生产切换、Merge 或微信提审。

## Human Review

1. 核对仁寿当届规程原图、分区枪次和终点来源。大连复验报名状态与当前 100K 官方直达默认入口。
2. 核对两场 Cover、Hero 和 5:4 微信分享在实机小尺寸的识别度，并确认图片使用权。
3. 微信开发者工具导入独立工作区根目录，沿用本地 QA 的私有项目配置。可用 `npm run start -- --hostname 0.0.0.0 --port 4196` 在有监听权限的本机跑构建产物，通过局域网 API 做真机测试，临时 URL 和 AppID 设置仅留在 QA 副本。检查 1/3 组别、两场实际微信分享和 10 家携程落地。
4. 业务审核及 CI 满足后，等待你另行授权 Merge 和发布。

## 真机反馈后的 Cover / Hero V2

Human 确认其余内容真机验收通过，要求调整两场 Cover 和 Hero。现有卡片版式、标题与渐变叠层沿用原实现。Cover 改为满幅构图，仁寿保留蓝底、原件金色年份和彩带，并把彩带抬到文字区上方。大连突出跨海桥、晚霞和海面。两个 Cover 的场景背景基于所选原图做适配。

仁寿 Hero 保留原版标识、标题及日期，微裁两侧并延续上缘。大连 Hero 保留左侧组三项、跨海桥、右侧十五周年和赛事字标，继续原画面的天空和海面，填满原有 2:1 容器。两张原件及已验收的分享图保留原字节，分享生成器对这两场沿用既有分享图源。新 Cover 和 Hero 使用版本化 URL，方便真机加载新版。

[新版四图及首页叠字预览](previews/renshou-dalian100-cover-hero-v2-20261124.jpg) · [当前资产规格与哈希](inputs/two-races-20261124/asset-verification.json)

## 首页封面统一使用已验收的 Hero

Human 已确认两张 Hero。当前 Cover 直接从对应 Hero 等比缩放到 1088 px 宽，再沿底缘适配至 1088×612。仁寿沿用官方抬头、日期与彩带，大连沿用跨海桥、组别和十五周年标识。首页标题叠层保持既有布局。两张 Cover 使用 V3 版本化 URL，Hero 与分享资源的字节已和上一版本核对一致。

[Cover 与 Hero 对照及首页叠字预览](previews/renshou-dalian100-cover-from-hero-20261124.jpg)
