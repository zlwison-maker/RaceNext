# PR #44 · 福州 / 熊猫蜀道山官方事实补证 · 2026-10-20

**结论：19 个 Edition 通过原有 Public Fact Gate；实际本地 Public API 为18场。熊猫因图片 QA HOLD，继续由现有 `do_not_publish` 标记阻止公开。未合并、未部署，生产公开数未发生本轮变更。**

继续原分支 `codex/seven-race-content-integration-20261020`，补证前 Head `2414f9e80b0c4bcc4a872b8893e9167a3de5eb92`，main 基线仍为 `19982016b49fa49c12b3d1916762ce60529487d0`。本文更新[初次接入记录](SEVEN_RACE_CONTENT_INTEGRATION_20261020.md)，保留其17场及当时证据缺口作为历史记录。

## 证据索引与真实权威层级

| 编号 | 当届来源 URL | 性质与取证方式 |
| --- | --- | --- |
| F0 | https://www.fuzhou-marathon.com/ | 官方首页，正文直接嵌入 F1/F2；不是因首页 HTTP200 就宣称所有事实已验证 |
| F1 | https://www.fuzhou-marathon.com/t/icon/202609/202609101909521742.jpg | 官网当届主海报，4324×2162，人工直接读取赛事标题及底部日期 |
| F2 | https://www.fuzhou-marathon.com/t/icon/202609/202609101853106432.jpg | 官网“比赛路线”图，4961×3508，当届标题、两条组别路线及共同起终点标签 |
| F3 | https://news.fznews.com.cn/fzyw/20260910/316129C4V6.shtml | 福州新闻网记者陈君沂现场报道，trusted_secondary / media_report，不登记成 primary_official |
| P0 | https://tsaigu.saihuitong.com/events?mid=58097 | 柴古唐斯官方列表，只读2027卡片及其日期，不采相邻2026卡片 |
| P1 | https://tsaigu.saihuitong.com/event?id=741200&mid=58097 | 官方2027报名入口；“我要报名”直接链接微步 game 7664 |
| P2 | https://sport.luojiweiye.com/web/weibu/#/pages/event/gameDetailGuide?id=7664 | 官网直接链接的2027报名平台，实际渲染标题和赛期匹配 |
| P3 | https://sport.luojiweiye.com/web/weibu/#/pages/event/inquiryRegistration?nav_id=5423&game_id=7664&title=%E6%8A%A5%E5%90%8D%E9%A1%BB%E7%9F%A5 | 从 P2 点击“报名须知”得到，正文为 P4 图片；没有登录、报名或签署协议 |
| P4 | https://cdn.rockysports.cn/7664/image/20261013/lm13rkxWtL_hh6MsdygJDLzb0afq.jpg | P3 实际 img src，1080×43837；标题明确2027竞赛规程，按章节人工逐组核验 |
| P5 | https://gobichina.com/events/65276 | 第三方聚合，仅交叉线索；没有用于 Canonical 的官方字段取证或登记成 Tier1 |

这是一次只读网页/图片人工取证，不是新增 OCR、模型或抽取系统。图片在临时目录读取，生产字段证据保存在既有 Governance.sources / fieldSources / rawData；未复制整篇规程到公开资源或把它替换为 Hero。CDN信任只绑定 P1→P2→P3→P4 的具体引用链，不作整域名授权。

现有文本 Extractor 不能读取这些图片，动态报名页也是 JS 外壳：**本次手工 Verified 不代表日常 Pipeline 已具备读图能力，也不代表已建立跨运行字段 Artifact 继承证据。** Registry notes 保留此能力缺口，不修改 Pipeline 或安全边界。URL路径中的上传年月日不当成正式发布时间。

## 福州逐字段结果

| 对象 / 字段 | Canonical 值 | 当届直接证据 / 作用域 | 状态 |
| --- | --- | --- | --- |
| Edition.editionName | 2026左海·福州马拉松 | F1 主标题，F2 当届标题 | Verified |
| Edition.raceDate | 2026-12-27 | F1 底部明确2026.12.27；F3独立交叉确认 | Verified |
| Edition.venue | 五一广场 | F2 共同起点箭头，未用于猜测其他组别字段 | Verified |
| 全马 categoryName | 马拉松 | F2 洋红路线图例 | Verified |
| 全马 startLocation | 五一广场 | F2 洋红路线从共同起点发出 | Verified |
| 全马 finishLocation | 海峡国际会展中心 | F2 明确“全程/半程终点”与地标标签 | Verified |
| 半马 categoryName | 半程马拉松 | F2 蓝色路线图例 | Verified |
| 半马 startLocation | 五一广场 | F2 蓝色路线从共同起点发出 | Verified |
| 半马 finishLocation | 海峡国际会展中心 | F2 明确“全程/半程终点”与地标标签 | Verified |
| 两组 distanceKm | null / null | 目前直接官方图未列项目标称距离；途中的21.0975计时标注不替代组别距离声明。二级报道42.195/21.0975仅作线索 | Pending |
| 两组 startAt / startTimes | null | F3 07:30仅是赛事总体鸣枪时间，没有组别分枪直证；不把同一时刻赋给两个组别 | Pending |
| 两组 elevationGain / cutoffTimeHours / capacity | null | 当前官方图片无这些组别字段；F3规模数字不升级成官方字段直证 | Pending |
| registrationOpenDate / registrationCloseDate / registrationUrl | null | 没有本次取得的原始官方报名规程/可验证直达报名动作；仅保留线索 | Pending |

已满足当前 Gate 的身份、日期、地点、主组别和来源绑定条件，不是把缺失字段标记 Verified；missingFields 和 fieldSources 对应保留。Gov 的 verified 表示已填事实有证据，不表示全部动态事实齐全。未改变 Gate 对距离/分枪等缺失值的既有处理。

## 熊猫逐组别结果（均来自 P4 的2027当届规程）

Edition：`panda-shudao-shan-2027`，官方名称 `2027熊猫蜀道山超级越野赛`。P0 当届卡片、P2 实际页面和 P4 赛事介绍共同确认 **2027-03-26–28**；P4明确四川省彭州市，district=彭州市。主组别场地白鹿音乐广场，不把它推导为所有组别起点。

| 稳定 Category 后缀 | 正式组别 / distanceKm | elevationGain | cutoffTimeHours | startAt / startTimes（Asia/Shanghai） | startLocation → finishLocation | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 160k | 160K / 160 | 约9300m | 46 | 2027-03-26 15:30 | 白鹿音乐广场 → 白鹿音乐广场 | 表内字段 Verified |
| 105k | 105K / 105 | 约5550m | 29 | 2027-03-27 06:00 | 白鹿音乐广场 → 白鹿音乐广场 | 表内字段 Verified |
| 85k | 85K³（团队赛） / 85 | 约4600m | 24 | 2027-03-27 10:00 | 海窝子古镇 → 白鹿音乐广场 | 表内字段 Verified |
| 60k | 60K / 60 | 约2600m | 12.5 | 2027-03-27 08:00、08:30、09:00 | 龙门山镇宝山广场 → 白鹿音乐广场 | 表内字段 Verified |
| 25k | 25K / 25 | 约1100m | 6.5 | 2027-03-28 09:00、09:30、10:00 | 白鹿音乐广场 → 白鹿音乐广场 | 表内字段 Verified |

- nominal distance 依据 P4 赛事介绍正式定义的160K/105K/85K³/60K/25K组别口径，不套用2026实际赛道公里数。实际测量距离未给出，仍未知；85K³不解释成255km。每组 rawData 单独绑定 Category ID、正式组别标签、起跑日期、图片Hash及字段值。
- 爬升原文为“约”，数值保留该近似口径并在证据标注，不能对外宣称精确测量结果。P4 同时说明实际赛道、爬升及关门可能因施工等调整。
- **85K³是团队赛**：P4报名资格要求团队成员均满足；报名办法列1760元/2人、2400元/3人；竞赛处罚说明各CP（包括终点）队员打卡间隔超过2分钟累计罚时。保留一条原有稳定 Category ID，名称/shortName明确“团队赛”，规则存既有 qualificationRules / rawData；不建普通个人85K、不增团队Schema、不猜接力/混合组规则。没有填入单人 fee。
- capacity仍未知。报名窗口原文月份未单独据此推造年份；报名日期继续null。报名URL只采用P1明确指向的game7664。组别资格、装备、医疗等非本次目标未扩展为新产品能力。
- 各组 coursePoints=null、coursePointDataStatus=unknown；没有从本规程的通用CP规则制造具体站点。160K Strategy仍不存在于运行时及DTO。

人工证据定位：P4的赛事介绍约y=2600–4300，报名资格约y=8800–11000，团队费用约y=12600，总关门章节约y=27100–28600，团队CP间隔规则约y=34800；均以原图1080×43837坐标计。

## 发布状态与图片 HOLD

两场事实补证后 **19/19 Edition Public Fact Gate PASS**，没有改校验代码。福州实际详情200，本地列表17→18。熊猫 facts已验证、lifecycleStatus=active，但按本轮明确要求继续正式图片 QA HOLD；复用现有 `governance.internalFlags=["do_not_publish"]`，实际详情404，不进入公开列表或Release Manifest，不生成放大的分享图。

没有把图片问题伪装成赛事生命周期不明，也没有把 Fact Gate PASS冒充完整发布通过。只读内存副本中移除图片发布HOLD后，原有API可返回19场、熊猫五组/Guide/五酒店及明确团队赛名称；该模拟没有回写实际数据或代表Human已批准图片。

现有熊猫Cover/Hero仍480×189，七张图片资产/Hash均未替换、未放大；本次附图实际702×277，也未被当作已获正式QA通过的高清替代。Human需提供或明确批准合适高清图并完成压缩/裁切/分享检查，才能解除真实发布HOLD。当前目标“19场一起正式公开”**尚未达成**，剩余阻断为图片，及独立设备/上线授权；不是事实Gate失败。

## 保护、验收及交接

- 七篇冻结Guide、35家酒店/推荐排序/文案、35条AppID/Path零修改；另外17场（原12+已通过5场）的Canonical和Registry条目不变。
- 正式Pending仍36条、全部审核记录及Ingestion State bytes不变；无生产Pipeline、模型、Workflow Dispatch、Approve/Apply。Auto Apply OFF。
- 只修改福州/熊猫事实、对应来源/证据、直接相关测试与文档。福州通过公开准入后，按已有生成器新增其分享派生文件；未改图片生成器、业务逻辑、API、UI、Schema、工作流或发布机制。
- Registry本分支67→73来源：新增福州KV/路线图/记者报道，熊猫列表/官网指向的报名入口/当前规程图片。媒体不升级成官方原文，已登记Source ID不重复。
- PR #43仍Open、Head `8314207aa7e419f23fc9dcec5ba2c08d4ddd77b9`，当前只改Ingestion State；与本次写入无文件覆盖。合并任一PR前重新fetch main，复核生产连续性Guard和真实基线，不覆盖、关闭或强推 #43。

验收结果将在下方记录。本次只继续原 PR #44，Push后保持Draft；不Merge、不Deploy。Human下一步：审核字段及图片HOLD；提供/批准高清熊猫图；后续单独完成真机图片、携程实际跳转/改日期/联盟链路、分享埋点、生产发布。

## 原响应 Hash（2026-10-20 只读抓取）

| 证据 | SHA-256 | bytes |
| --- | --- | --- |
| F0 | `e1e04f5dccff3d09b880dd81d0019c8653092a681b8f82456b39f72b45d6b547` | 18,323 |
| F1 | `46edc29c4fa5454c65d3be09388aa6356895893bb458f982de889bf23c46b097` | 1,429,323 |
| F2 | `b331b7bc81880b68e6ade544e76996c80a1f099bd197ea515a7f734398dc7584` | 8,444,111 |
| F3 | `1fe28cdc60c4a858e441e51f0dc2f5cdaf13ed7a8a7ad89d03c9e6d7801504b0` | 120,689 |
| P0 | `7f98ae03b535ab6bc0e094bf4c290db444eb52a4b405fab488ee469a8307ad03` | 38,211 |
| P1 | `e460db9b456af43083dae257321bb64caf1eb96888ce498a1b3650379153dccc` | 44,809 |
| P4 | `b5b07e1c2853d24f746ad214c2d70df185a54440419368128631c0d6d1587a75` | 4,993,288 |

## 最终验收记录

| 项目 | 结果 |
| --- | --- |
| 福州/熊猫专项 | 5/5 PASS，含19场事实Gate、18场真实API准入和只读19场预览、日期/证据丢失拒绝 |
| 监测+补证专项 | 16/16 PASS |
| 既有API/Gate/分享/列表定向回归 | 68/68 PASS |
| npm test | **441/441 PASS** |
| npm run typecheck / typecheck:miniprogram / lint | PASS |
| npm run images:share -- --check | 18/18 PASS；熊猫没有生成放大的分享图 |
| npm run build -- --webpack | PASS；复用本环境已验证构建后端，配置不变 |
| localhost:3220真实HTTP | /api/races=200/18场，福州详情200/两个组别/Guide/5酒店，熊猫详情404 |
| git diff --check / 本地Markdown链接 | PASS |
| 另外17场Canonical/Registry、Guide/35酒店、Asset Registry、Pending/State | 与补证前Head逐项比较不变 |

定向测试新增来源后，旧Phase4A模拟时钟把分钟拼接到60以上，产生无效时间；本轮仅将测试夹具改为真实时间加法，原有来源处理、Ninghai去重、HK100和深圳健康隔离断言全部保留。没有修改生产时间或监测实现。

**生产只读数量核对**：2026-10-20 **18:38:10（Asia/Shanghai）**，GET https://racenext.run/api/races 返回200、application/json、12场；响应SHA-256为 `dc52454091adf1a57788a9f1ef857d3591b222da1ca98de2bba66ee8fbc2aedd`。这次读取不执行生产Pipeline或部署。

因此分别为：**19个事实Gate合格 / 分支18场可公开 / 线上实测12场**。不把内存模拟解除HOLD或本地测试当成19场已发布。PR继续Draft，尚需Human审核及独立发布授权。
