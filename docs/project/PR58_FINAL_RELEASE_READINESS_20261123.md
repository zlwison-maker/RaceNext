# RaceNext PR #58｜两场赛事最终修复与发布准备

## 基线和状态

- main：**68f190fb767258c3f18e6cd66b6653c0b48141de**。PR #58 变更前 Head 为 **6e19cf5a09d49b26f20255f61f43d370f456ab1e**。本 Handoff 随最终修复提交，后续 Head 和 CI 见 PR。 [Draft PR #58](https://github.com/zlwison-maker/RaceNext/pull/58)
- 复用 PR #58 的独立开发工作区，起始与提交后工作区均干净。原本地图片优化工作区及其 8 张未跟踪预览保留。PR #46 最新核对为 Open，Head c243b49d3a290415adf349de34d087fd5d0a6fb7。
- 同日读取生产赛事列表仍为 21 场。本地构建公开 **23 场**，新增 Outopia 三组和黄山五组。旧 21 场详情及 Outopia 详情与上一轮保存的 HTTP 指纹一致，比较时还原全局 dataUpdatedAt。 [第一轮 Handoff](TWO_RACE_INTEGRATION_20261123.md) · [本轮 HTTP 证据](inputs/two-races-20261123/local-api-evidence-final.json)

## 事实及发布规则

公共映射增加一条适用于明确缺少起终点的组别路径。组别仍须通过身份与原有版次日期检查，名称、标称距离、发枪及总关门时长须有同届同组的官方或合作报名直接证据，已填写的爬升、下降、报名入口和起终点也要与字段来源绑定。组别内部保留 Pending 和缺字段清单。已知近期来源给出了地点、存在未决冲突或核心证据不足时，不能通过把地点改成空值获得这个资格。明确的起终点冲突仍阻断对应组别。既有本地化、CP 与其他可选冲突规则继续生效。 [代码](../../lib/raceGraphPublic.ts) · [定向回归](../../tests/contentBatch20261123.test.ts)

黄山保留 **2027-03-27 至 03-28**、100K／75K／50K／35K／20K 及 20K 约 500 m。合作报名页正文和分组赛程支持两天日期；页头的 03-28 至 03-29 仍保留为冲突证据。府前广场继续作为 Edition 主会场。由于目前可读证据未逐组确认起终点，五组的两个字段均为 null，前端不显示，转录和主会场证据在内部保留。两场 Race Strategy 和未核实 CP 继续 HOLD。 [黄山合作报名页](https://reg.zuicool.com/38938) · [黄山比赛介绍](https://zuicool.com/event/69261)

后续应在冻结的《数据系统》发布和事实展示条款同步本次规则，并在《住宿推荐与内容生产标准》保留独立审核要求。当届直接证据缺失的起终点留空，赛事发布检查依然验证核心事实。住宿若实质依赖未证地点或交通，单项暂缓。本轮只记录待同步事项。

## 黄山住宿单项风险复核

| 顺序 | 酒店 | 结论与理由 |
| --- | --- | --- |
| 1 | 歙县吴怡本堂民宿 | **单项 HOLD**。推荐理由先说明 2025 年参赛住客认为步行前往当年起点方便，再建议本届重视清晨步行到场的人比较。2027 实际检录口、清晨通路和管制尚未明确，核心推荐理由受影响。原卡片和原 Action 保留在数据中，公开详情暂时隐藏该卡 |
| 2 | 徽映十笏民宿（黄山歙县徽州古城店） | PASS。用往届服务体验解释入住选择，无赛后返程或接驳承诺 |
| 3 | 花筑·歙县微城民宿（徽州古城店） | PASS。依据古城徽园位置及已核验主会场，作为减少跨区赶路的备选，未承诺检录入口、步行时长或赛后返程 |
| 4 | 歙县井陌民宿 | PASS。依据古城片区及用餐动线，无比赛日交通承诺 |
| 5 | 歙县新安宾馆·Designer酒店（徽州古城店） | PASS。强调常规酒店服务及提前规划到场路线，无具体起终点、距离、时间或接驳承诺 |

两份指南、十家酒店原名、标题、理由和排序原样保留。十条 AppID、Hotel ID、Path、参数顺序及原 2026 入住日期均逐字符比对，十条通过模拟微信参数传递。公开详情实测 Outopia 五条、黄山四条，黄山保留原展示顺序。无新增酒店研究。仓库可见的归档标准为 V1.1，本轮按 Human 给出的 V1.2 未证事项发布要点复核。 [原始 Manifest](inputs/two-races-20261123/manifest.json) · [既有住宿标准归档](ACCOMMODATION_CONTENT_STANDARD_V1_1.md)

## 图片 QA

| 赛事 | Display | Share | 视觉复核 |
| --- | --- | --- | --- |
| Outopia | 702×468，61,696 B，维持原图 | 585×468，62,439 B | 16:9、2:1 和 5:4 居中裁切保留主标题、年份和品牌字样，画质低于长期建议 |
| 黄山 | 1080×608，201,540 B，原尺寸 JPEG | 750×600，231,277 B | 三种现有裁切均保留两位跑者和油菜花田。新图无内嵌标题或 Logo，拍摄年份未确认 |

黄山新原件 1080×608、231,628 B，用户文件与仓库原件 SHA-256 相同；原横幅和上一版 Display 保留。Cover/Hero 同用新版 Display，约比新原文件轻 13.0%。没有放大图片或修改小程序显示。黄山技术裁切 HOLD 已解除，两图均低于长期建议，使用权仍为 Unverified。本地五个图片资源冷请求为 HTTP 200 / JPEG，ETag 条件请求为 304。 [黄山尺寸与 Hash](inputs/two-races-20261123/asset-verification-final.json) · [黄山封面预览](previews/pr58-final/huangshan-cover-16x9.jpg) · [黄山 Hero 预览](previews/pr58-final/huangshan-hero-2x1.jpg) · [黄山分享图](../../public/races/huangshan-huizhou-ancient-city-trail/2027/share-cover-5x4.jpg) · [Outopia 裁切预览](previews/two-races-20261123/)

## 验收

| 检查 | 结果 |
| --- | --- |
| 全量 npm test | **519/519 PASS** |
| Web TypeScript、小程序 TypeScript、Lint | PASS |
| 默认 Build | PASS，保留既有 Next.js metadataBase 提示 |
| 既有 Pre-Publish Fact Gate | 23/23 Edition 身份和日期检查 PASS |
| 本地 Public API Smoke | 列表与 23 个详情均 HTTP 200，前 21 场及 Outopia 的有效载荷回归通过，公开 DTO 未发现内部治理或证据字段 |
| 图片与分享 | 23 张分享图检查 PASS，两场裁切与图片 HTTP PASS，微信真机待检 |
| 携程 Action | 10/10 原样与模拟跳转 PASS，实际微信跳转待检 |
| Git Diff Check | PASS |
| GitHub CI | 在 PR #58 的 Checks 中核对最终 Head；与本地测试独立 |

| 赛事 | 本地发布 Gate | 图片 QA | 内容与住宿 QA | 发布建议 |
| --- | --- | --- | --- | --- |
| Outopia | PASS，3 组 | 本地 PASS，权利与真机待检 | PASS，5 家 | HOLD 待最终 Human QA |
| 黄山徽州古城 | PASS，5 组 | 本地 PASS，权利与真机待检 | 4 家 PASS，吴怡本堂单项 HOLD | HOLD 待最终 Human QA，住宿单项独立 |

审阅时请确认两张图片使用权，并通过微信真机看两场封面、Hero、分享卡片与可见九家酒店的实际落地。若要恢复吴怡本堂卡片，单独审核 2027 步行到场依据或批准后续文案修正。当前版本可进入 Merge / Release Review，正式生产发布待独立授权。

## 本轮文件范围

- 公共发布检查：[lib/raceGraphPublic.ts](../../lib/raceGraphPublic.ts)。
- 黄山记录与资产：[race-graph-v1.json](../../data/canonical/race-graph-v1.json)、[race-image-assets-v1.json](../../data/assets/race-image-assets-v1.json)、[原图](../../public/races/huangshan-huizhou-ancient-city-trail/2027/original-v2.jpg)、[Display](../../public/races/huangshan-huizhou-ancient-city-trail/2027/display-v2.jpg)、[Share](../../public/races/huangshan-huizhou-ancient-city-trail/2027/share-cover-5x4.jpg)。
- 住宿单项状态：[batch-20261123.ts](../../data/accommodations/batch-20261123.ts)、[index.ts](../../data/accommodations/index.ts)。
- 测试：[两场集成](../../tests/contentBatch20261123.test.ts)、[公开清单](../../tests/fixtures/contentBatch20261020.ts)、[公开映射](../../tests/raceGraphPublic.test.ts)、[小程序呈现](../../tests/miniprogramRacePresentation.test.ts)。
- 验收证据：本 Handoff、两张黄山裁切预览、[图片 JSON](inputs/two-races-20261123/asset-verification-final.json)、[本地 HTTP JSON](inputs/two-races-20261123/local-api-evidence-final.json)。

原有 21 场、Outopia 数据与图片、两份指南、住宿原文与全部 Action、Source Registry、Pending、State、Workflow 和 Analytics 受保护。生产 Auto Apply 保持 OFF。 [完整 PR Diff](https://github.com/zlwison-maker/RaceNext/pull/58/files)
