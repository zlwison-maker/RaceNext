# RaceNext 1.9 · Seven-race integration handoff · 2026-10-20

> 本文保留初次提交 `2414f9e` 的17场状态及取证缺口。最新事实与准入以[福州/熊猫补证记录](PR44_FUZHOU_PANDA_FACT_SUPPLEMENT_20261020.md)为准：19场事实 Gate PASS，18场 API 公开，熊猫图片 HOLD；未部署。

**Integrated：YES；自动化 QA：PASS；设备/完整发布 QA：未完成；Deployed：NO；Live Verified：NO。**

基线 `19982016b49fa49c12b3d1916762ce60529487d0`；分支 `codex/seven-race-content-integration-20261020`。未合并，最终 main commit、正式发布时间未定。原工作树和未跟踪预览图保留。本轮不运行生产监测、不 Merge、不部署。

## 冻结内容与准入

逐字来源：[用户 V2 内容包](inputs/RACENEXT_7_RACE_CONTENT_V2_20261020.md)。新增 7 个 Event/Edition、18 个 Category；原有 12 场 / 26 Category 全部属性不变。7 篇 Guide、35 家酒店、推荐排序/文案、35 个 Ctrip AppID/opaque Path 已核对。日期、参数顺序、AllianceID/sid/guid 未改写；内部酒店 ID 使用 `ctrip-{id}`。广州100与熊猫未导入 CP 或未获本轮发布批准的 Strategy；归档中保留历史方向稿不代表公开展示。东京不在范围。

官方当届标题使用既有 `Edition.editionName`，DTO `name` 原样映射；Event 保持跨年品牌，无新增 Schema。

| Edition ID | 当届正式名称 | 事实 Gate / 本地详情 | Guide / Hotel / Ctrip 静态契约 | 发布 QA |
| --- | --- | --- | --- | --- |
| guangzhou-100-2027 | 2027凯乐石FUGA广州100越野赛 | PASS / 200；55K 独立 HOLD | 1 / 5 / 5 PASS | 待设备 QA、Human 发布许可 |
| nanjing-marathon-2026 | 2026南京银行南京马拉松 | PASS / 200 | 1 / 5 / 5 PASS | 同上 |
| shaoxing-marathon-2026 | 2026瑞丰银行绍兴马拉松 | PASS / 200 | 1 / 5 / 5 PASS | 同上；历史照片已获接受 |
| shenzhen-marathon-2026 | 2026深圳马拉松 | PASS / 200 | 1 / 5 / 5 PASS | 待设备 QA、Human 发布许可 |
| fuzhou-marathon-2026 | 2026左海·福州马拉松 | HOLD / 404 | 1 / 5 / 5 PASS | 官方字段证据缺口 |
| hengqin-marathon-2026 | 2026横琴人寿保险横琴马拉松 | PASS / 200 | 1 / 5 / 5 PASS | 待设备 QA、Human 发布许可 |
| panda-shudao-shan-2027 | 2027熊猫蜀道山超级越野赛 | HOLD / 404 | 1 / 5 / 5 PASS | 官方直证缺口、低清图片 |

Canonical 总记录 12 → 19；本地 Public List **12 → 17**，不是 19。事实 Gate PASS 不是完整发布许可。福州/熊猫为 `uncertain`、verification pending、日期 null，不进入公开列表或 Release Manifest。广州 55K 保持 pending 并由现有 Category Gate 隐藏，其他四组可返回。不降低 Gate 凑数量。

## 官方字段核验与缺口

2026-10-20 只读抓取真实页面，无付费模型调用。具体响应 URL、Hash 和字节见文末证据表；抓取成功不等于全部字段已验证。

- **广州100**：官方规程确认 2027-01-15–17、比赛地点广州市体育馆。标称距离 100/55/30/10/10 km、爬升 5456/2531/1366/362/362 m。100K 三枪 19:30/20:00/20:30；55K 四枪、30K 六枪、两类 10K 单枪。起终点不由 Edition venue 推导。报名 2026-10-13–11-13，仅有日期不伪造时刻。**55K 表格 18h / 最后一枪次日 02:30 与详情 00:30 冲突，cutoffTimeHours=null、组别待审。** 96.39/54.11/32.93/9.77 是实际赛道长度，未写入 distanceKm。
- **南京**：2026-11-22，全马 42.195 km / 26000 人，07:30/07:45/08:00 三枪，南京奥林匹克体育中心东门 → 燕子矶滨江公园。关门及报名字段未取得直接取证，保持 null/unknown。
- **绍兴**：2026-11-29，全马 42.195 / 半马 21.0975 km，各 12500 人，关门 6h / 3h。两条路线分别确认同一起终点“奥体中心东南侧（解放大道与洋江西路交叉口）”。07:30 为总体首枪，组别分枪时间待补充通知，startAt/startTimes=null。原 HTTPS 连接拒绝，登记 unavailable；实际成功读取官方 HTTP 当届 event.html，两者 URL 均保留。不关闭 TLS 验证，历史 jsgc.html 不作当届直证。
- **深圳**：原官方专题为 HTTP 200 JS shell。政府门户明确转载主办方当届资料，作为给定可信官方辅证 notice，确认 2026-12-06、07:00、单组全马 42.195 km / 30000 人，深圳市民中心 → 宝安区海滨广场。报名 09-20 14:00–09-28 17:00。活动日历 09-20 不当比赛日、12-06 15:00 不当关门，关门保持 null。
- **横琴**：2026-12-27，全马 42.195 / 半马 21.0975 km、5000 / 15000 人、关门 6h / 3h，两条路线分别确认金融岛中央公园起终点。07:30 为总体首枪，组别精确分枪待定，保持 null。报名 08-18 10:00–09-12 22:00。
- **福州**：官网正文主要为图片，未取得可直接复核的日期/组别规则。福州新闻网注明“来源：福州体育”的转载为 trusted_secondary / media_report，不冒充官网规程。2026-12-27、完整组别、组别起终点和发枪仍需官方直证，关键字段留空；图片文件名不作日期证据。
- **熊猫**：报名页标题确认 2027 身份，但本次正文为动态模板，缺完整规程。160K/105K/85K³/60K/25K 仅保存用户方案标签，距离/爬升/起终点/发枪/CP 均 pending，不由标签推导 distanceKm，不用二级资讯补官方事实。2027-03-26–28 未写为已核验日期。

Registry：12 → 19 个 Edition，57 → 67 个来源（新增 10）：七个官方主条目、深圳原专题、福州转载、绍兴原 HTTPS。既有 57 个来源完整不变。新 Edition 各有来源可被现有 activeFreshnessSources 识别；福州 media_report 与 unavailable HTTPS 不进入正式字段抽取。共享赛会通继续受现有身份/届次规则限制，不放宽审批，不改 Extractor。

## 图片与使用批准

Human 最新回复明确允许七图直接使用，并接受广州图的 2026、绍兴图的 2025。按此记录使用批准；**原始 URL、作者、独立许可证明未提供，不冒称已独立验证版权**。深圳实际图片年份未知，文件名不作证据。

原图来自用户 Desktop，按原 bytes 保存为 `public/races/{eventId}/{year}/original.png`；Cover/Hero 共用 `/races/{eventId}/{year}/display-v1.jpg`。JPEG 4:4:4 / progressive / mozjpeg，最大宽度1600、quality84–88；Display 不裁切、不放大。Metadata/Hash/年份/来源记录于现有 Asset Registry，无重复在线 Cover/Hero 二进制。

[16:9 Cover / 2:1 Hero 中心裁切对照](previews/seven-race-20261020-crops.png)，上到下为广州、南京、绍兴、深圳、福州、横琴、熊猫。仅为像素裁切检查，不冒充设备布局或标题可读性验收。熊猫 480×189 原图有明显清晰度限制，正式图片 QA HOLD；绍兴及部分 Hero 低于长期建议，记 needs_higher_resolution。

分享生成器复用现有 isEditionPublishable，仅为17个公开 Edition 输出 750×600 的 5:4 分享图，原有12张 bytes不变。福州/熊猫没有公开分享路径，暂不生成分享文件，避免把低清熊猫放大到固定画布；解锁前补高清原图并生成。公开分享尺寸、路径、参数与埋点契约不变，Display 同样没有放大。

本地 Next HTTP 逐图确认 200 / image/jpeg / Content-Length 与下载 bytes 等于 Registry。计划线上 URL 为 `https://racenext.run` + publicPath，**尚未部署，线上 URL、同网真机冷热缓存、滚动加载、黑屏/空白、19图并发均 Not Verified**；lazy-load 不是性能验收证明。

## API / 客户端与安全边界

本地已构建应用 `http://127.0.0.1:3219`：列表 200 / 17 条，七详情 5×200 + 2×404；标题、Guide、5酒店、同源 Cover/Hero、无 Strategy、无内部证据泄漏均核对。API/DTO/WXML/WXSS/Analytics 代码零修改，标题沿用既有两行截断，真机小屏排版待验收。

小程序现有 services/races.ts 动态请求列表和详情，携程 navigateToMiniProgram 原样传 AppID/path。**按代码依赖可只部署服务端数据/图片，不需要客户端新功能**；是否可免提审、已发布1.0.1与仓库客户端一致性、域名/跳转后台设置仍需 Human 确认，静态检查不能保证免审。35个真实携程跳转、酒店对应、手动改日期、联盟链路、分享/埋点采集均 Not Verified。

**既有 Web 限制**：app/page.tsx 和 app/races/[slug] 仍走 raceDecision → First5/seed/merged，未统一消费 Canonical API。本批未迁移 Web，也未复制七场事实到平行 Seed。API与小程序共享 Edition 图源，但不能声称旧 Web 首页/静态详情已新增七场或多端显示 QA PASS；统一旧 Web 新增展示需明确最小适配范围。

Pending 基线 **36**（非历史28/34），与 Ingestion State 均 bytes不变，无 Approve/Apply。原12个 Canonical、57来源、24图片记录 deep equal 并保留原格式；旧图和分享文件不变。Auto Apply OFF，生产 Guard / Data-only allowlist 不改。Open Data PR #43（Run #38852113654）保持原状；合并前复核其 main 连续性，不覆盖或关闭。

## 验收与交接

| Gate | 结果 |
| --- | --- |
| 基线 npm test | 430/430 PASS |
| 本批专项 | 6/6 PASS；加分享专项合计20/20：冻结正文/35 paths/准入/组别语义/来源/图片/分享 |
| npm test | 436/436 PASS |
| typecheck / typecheck:miniprogram / lint | PASS |
| images:share -- --check | 17/17 PASS；两场非公开不生成分享图 |
| Public Fact Gate / Release Manifest | PASS：17场，18个API预期，非公开不入manifest |
| 连续性 / Fail Closed / Data-only Guard | 既有全量回归PASS；无放宽allowlist |
| npm run build | 环境阻断：Turbopack编译进程 bind port EPERM；提升权限仍同 |
| npm run build -- --webpack | PASS；同应用生产构建，未修改配置 |
| 本地真实 HTTP | 列表、7详情、7 JPEG响应/bytes PASS |
| git diff --check | PASS |

本分支是内容/图片集成 PR，不是自动 Data-only PR；不为让本分支通过仅限 Pending/State 的路径 Guard 而放宽 allowlist。其允许/拒绝与连续性均由原有回归覆盖。未运行生产 Pipeline，无模型调用，除上述现有图片生成器的公开准入过滤外，无业务代码/Schema/Workflow/API/UI/Provider 变更。

待 Human Review：五场合格事实、广州55K冲突、福州/熊猫官方补证和高清熊猫图；设备检查图片/35携程/分享/埋点，再确定实际发布集合。图片版权材料继续追踪。**Commit/Push/PR不是Merge/部署/Live；本次交付后停止，不宣称19场上线。**

下方为本次只读取证与资源大小，不作为生产发布记录。

## Response evidence (read-only, 2026-10-20)

| Edition | Fetched URL / status | Response SHA-256 |
| --- | --- | --- |
| `guangzhou-100-2027` | [https://moganshan.saihuitong.com/article?id=71446&mid=57201](https://moganshan.saihuitong.com/article?id=71446&mid=57201) / 200 | `e52ea92055e5cfdefce575e2829cd191944cdd25e0426a5b1cb2eeaab91d7363` |
| `nanjing-marathon-2026` | [https://nanjing.marathon.org.cn/page/nqAYNxdmyZqxDr12ekZB.html](https://nanjing.marathon.org.cn/page/nqAYNxdmyZqxDr12ekZB.html) / 200 | `3a6275d1846ede3a5d9f05defc9c96108105a6e753b81849e5a35629920bb796` |
| `shaoxing-marathon-2026` | [http://www.sxym.org.cn/html/event.html](http://www.sxym.org.cn/html/event.html) / 200 | `46a08f37ef07a5947cf955276aa125f7448c3b8a04931707fb19ad6ce384b3ed` |
| `shenzhen-marathon-2026` | [https://www.szns.gov.cn/ztzl/hdrl/content/post_12992578.html](https://www.szns.gov.cn/ztzl/hdrl/content/post_12992578.html) / 200 | `217a2eeef86a4d8b84a4fde64ae91ae1e7d27bf1050fd014db4a18ca6a793cb9` |
| `fuzhou-marathon-2026` | [https://www.fuzhou-marathon.com/](https://www.fuzhou-marathon.com/) / 200 | `e1e04f5dccff3d09b880dd81d0019c8653092a681b8f82456b39f72b45d6b547` |
| `hengqin-marathon-2026` | [https://www.hengqinmarathon.com/race-255.html](https://www.hengqinmarathon.com/race-255.html) / 200 | `9fb95780bcfe24671137cfd6db0014c885087cf8400b24e1b000a087c106fd0f` |
| `panda-shudao-shan-2027` | [https://tsaigu.saihuitong.com/event?id=741200&mid=58097](https://tsaigu.saihuitong.com/event?id=741200&mid=58097) / 200 | `eeac7665ebf7c013b2ec1241f3fb008f8fbf11a8bac1bc523d79297eaa72c0bb` |

Additional references: [Shenzhen original dynamic shell](https://shenzhenmarathon.org.cn/subject.html?detailId=7447924346894135&topicId=6990420672320300); [Fuzhou republication](https://news.fznews.com.cn/fzyw/20260911/W75RC3kmNp.shtml). Original Shaoxing HTTPS retained as unavailable: https://sxym.org.cn/html/event.html.

## Original / Display bytes

| Event / year | Original dimensions / bytes | Display dimensions / bytes | Reduction |
| --- | --- | --- | --- |
| guangzhou-100 / 2027 | 1776x1332 / 4,053,827 | 1280x960 / 462,195 | 88.6% |
| nanjing-marathon / 2026 | 1280x720 / 794,207 | 1280x720 / 141,883 | 82.1% |
| shaoxing-marathon / 2026 | 1225x450 / 1,379,115 | 1225x450 / 346,599 | 74.9% |
| shenzhen-marathon / 2026 | 4000x2668 / 11,452,815 | 1600x1067 / 508,190 | 95.6% |
| fuzhou-marathon / 2026 | 4324x2162 / 3,461,557 | 1600x800 / 296,515 | 91.4% |
| hengqin-marathon / 2026 | 1280x720 / 436,974 | 1280x720 / 184,961 | 57.7% |
| panda-shudao-shan / 2027 | 480x189 / 235,155 | 480x189 / 60,129 | 74.4% |

Total originals: 21,813,650 bytes; seven unique displays: **2,000,472 bytes / 1.908 MiB**. Largest: 508,190 bytes / 496.3 KiB. All below 600 KiB; batch below 4.1 MiB. Byte savings do not establish latency improvements.

## Protected Store SHA-256

```text
c9472c6f321916dfa8838ef2cf5a3cc0b65850dfcfd51e18cc75ca0ce8bfc579  data/pending/race-update-pending.json
5bfb6225cdfab9ca0b7a813028601e4f02df8a241da07dc997568e03e6e2f990  data/sources/official-source-ingestion-state.json
```
