# RaceNext PR #60 Production Release Closeout

2026-11-24 17:19:19（北京时间），RaceNext 生产 Public API 从 **23 场增至 25 场**，新增 2027 眉山仁寿半程马拉松和 2027 大连100。Human 已验收发布前真机版本，并确认两场图片可用于生产。Human 已确认线上正式版真机 Smoke QA **PASS**，PR #60 发布验收已结项。 [PR #60](https://github.com/zlwison-maker/RaceNext/pull/60) · [生产赛事列表](https://racenext.run/api/races)

## Merge 与部署

| 检查 | 结果 |
| --- | --- |
| 最终审核 Head | `9fc6b35bee4e13f30765e2996732f101c8727e52`。GitHub CI 524/524 PASS，审核 Head 和合并提交的文件树一致 |
| Merge Commit 与部署 SHA | `339f6f6a9d11c7b222632c6f3af6800939d0dc8d`。在腾讯云 Lighthouse 独立构建，旁路核验 26 个 API 端点和 8 个图片文件后切换 |
| 生产服务 | PM2 `racenext` online，Nginx active。第 2 次启动探针通过，切换检查期间 PM2 错误日志字节数持平 |
| 回滚点 | `70d57b14ba3d58191b1ea108921c966a7343633b`，完整保留于 `/home/ubuntu/RaceNext-before-pr60-70d57b14-20261124` |
| 数据维护 | PR #46 仍 Open，Head `c243b49d3a290415adf349de34d087fd5d0a6fb7`。Pending / State 字节一致，Workflow 沿用原配置，Auto Apply OFF |
| 微信客户端 | 沿用当前线上客户端版本。小程序客户端与 Analytics 契约没有改动，未重新提审或发布微信客户端 |

[合并提交](https://github.com/zlwison-maker/RaceNext/commit/339f6f6a9d11c7b222632c6f3af6800939d0dc8d) · [审核 Head CI](https://github.com/zlwison-maker/RaceNext/actions/runs/45352074701) · [Data PR #46](https://github.com/zlwison-maker/RaceNext/pull/46)

## 公网验收

北京时间 17:20:50，从公网读取赛事列表及 **25/25** 个详情，全部返回 HTTP 200，并与部署版本的发布清单一致。原有 23 场列表项及详情逐条回归通过，详情比较仅排除全局 `dataUpdatedAt`。公共响应未检出内部 Governance、Evidence 或 Pending 等字段。[公网验收数据](inputs/two-races-20261124/production-evidence.json)

| 赛事 | 生产事实与内容 | 仍待补证 |
| --- | --- | --- |
| 眉山仁寿半程马拉松 | 2027-02-28，半马单组 21.0975 km，大会 08:30 开赛，各分区发令后限时 3 小时。终点为 `null`。A–E Race Guide 与批准稿一致，5 家住宿公开 | 官方竞赛规程原图、具体分区枪次和终点 |
| 大连100 | 2027-05-22 至 05-23，100K／50K／30K 共 3 组，起终点均为傅家庄公园。A–E Race Guide 与批准稿一致，5 家住宿公开 | CP 与 Race Strategy 保持 HOLD。统一报名截止时间仍待官方核实 |

大连三个组别按标称距离展示，100K 爬升 5536 m、05-22 06:00 开跑、限时 30 h，50K 爬升 2889 m、05-22 08:00 开跑、限时 15 h，30K 爬升 1478 m、05-23 06:00 开跑、限时 8 h。时间均为北京时间。[仁寿生产详情](https://racenext.run/api/races/meishan-renshou-half-marathon-2027) · [大连100生产详情](https://racenext.run/api/races/dalian-100-2027)

发布前复核时，仁寿默认最酷入口仍显示预报名开放。大连三个官方组别详情显示人数已满，最酷对应组别显示已截止。Human 确认大连赛事级状态以官方报名截止时间为准，满额不作为发布门禁。本次保留已审赛事级状态和 100K 官方直达入口。官方报名须知说明退赛后的补录机制。[仁寿报名入口](https://reg.zuicool.com/17623) · [大连报名须知](https://dl100k.saihuitong.com/text?mid=81901) · [大连官方 100K 入口](https://dl100k.saihuitong.com/event?id=910774&mid=81873)

两场均使用 Cover V3（16:9）、Hero V2（2:1）及先前批准的独立 5:4 分享图。6 张公开衍生图及 2 张原件的公网请求均为 HTTP 200，MIME、字节数及 SHA-256 与批准的资产记录一致。两张 Cover 的站点优化请求也返回可用图片。[资产记录](inputs/two-races-20261124/asset-verification.json) · [V3 与 Hero 预览](previews/renshou-dalian100-cover-from-hero-20261124.jpg)

十条住宿 Action 的 AppID、完整 Path、参数顺序、联盟参数及原 2026 年入住日期逐字符匹配原始清单。两个 Race Guide 的原文及分享图选择由 PR CI 定向测试覆盖，生产响应与审核清单一致。[原始清单](inputs/two-races-20261124/manifest.json) · [接入测试](../../tests/contentBatch20261124.test.ts)

## 线上正式版真机 Smoke QA

**PASS。** Human 于 2026-11-24 确认线上环境验收通过，本次记录为线上正式版真机 Smoke QA 的整体结论。[发布前验收记录](RENSHOU_DALIAN100_INTEGRATION_20261124.md)
