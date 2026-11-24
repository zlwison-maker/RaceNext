# RaceNext PR #58 Production Release Closeout

2026-11-24，生产 Public API 从 **21 场增至 23 场**。Human 已确认两场图片使用权限，发布前微信 Final Device QA 和 GPT Code Review 均通过。服务端独立部署和生产 API PASS。Human 于同日确认**线上正式版微信真机 Smoke QA 全部 PASS**，PR #58 发布验收正式结项。[PR #58](https://github.com/zlwison-maker/RaceNext/pull/58) · [公网验收数据](inputs/two-races-20261123/production-evidence.json)

## Merge 与部署

| 检查 | 证据 |
| --- | --- |
| 审核 Head | `9769a0e50a75b037cad913e14b839a24501017cd`，与 Merge Commit 的 Git 树一致 |
| Merge 与实际部署 | `70d57b14ba3d58191b1ea108921c966a7343633b`，11:29:26 北京时间切换 PASS |
| 服务端构建 | Node.js 22.23.2、Next.js 16.4.6；独立构建和旁路 24 个 API 端点、5 个 JPEG 资源全部 PASS |
| 生产服务 | PM2 `racenext` online，Nginx active；第 2 次启动探针通过，切换检查期间 PM2 错误日志未增长 |
| 回滚点 | `75fc7540d57fe40d7b8b4c27380be9d8c7bc33f0`，完整目录 `/home/ubuntu/RaceNext-before-pr58-75fc7540-20261124` |
| 发布方式 | 复用 Lighthouse 和既有 PM2。自动发布 Workflow 的部署门禁保持原设置，无小程序客户端改动或重新提审 |
| 数据维护 | Pending / State 字节一致，Auto Apply OFF；PR #46 仍 Open，Head `c243b49d3a290415adf349de34d087fd5d0a6fb7` |

[合并提交](https://github.com/zlwison-maker/RaceNext/commit/70d57b14ba3d58191b1ea108921c966a7343633b) · [PR CI](https://github.com/zlwison-maker/RaceNext/actions/runs/45158227870) · [自动发布 Workflow 记录](https://github.com/zlwison-maker/RaceNext/actions/runs/45315480575) · [Data PR #46](https://github.com/zlwison-maker/RaceNext/pull/46)

## 公网验收

2026-11-24 11:29:45 北京时间，从公网独立读取生产列表及 **23/23** 个详情，均 HTTP 200 且与审核版本的发布清单一致。原有 21 场列表和详情回归通过，详情比较只排除全局 `dataUpdatedAt`。公开 API 未发现内部 Evidence、Pending 或 Governance 字段。两场的 Cover、Hero、Share 均可访问，四个独立公开图片 URL 的 JPEG 字节和 SHA-256 匹配，两个封面的图片优化请求通过。服务器另对黄山原图执行了相同的网络校验。[生产赛事列表](https://racenext.run/api/races) · [公网验收数据](inputs/two-races-20261123/production-evidence.json)

| 赛事 | 公开组别与事实 | 内容与商业链接 |
| --- | --- | --- |
| Outopia 莫干山云间花径 | 41K、31K、16K，16K 两枪 09:00 和 09:30 | A–E Race Guide 匹配审核版，5 家酒店及 5 条原始携程 Action 一致 |
| 黄山徽州古城百公里 | 100K、75K、50K、35K、20K；2027-03-27 至 03-28，20K 爬升约 500 米，各组起终点保持 `null` | A–E Race Guide 匹配审核版，4 家酒店及 4 条原始携程 Action 一致，吴怡本堂单项 HOLD |

两场均未公开未核实的 CP 或 Race Strategy。两个 Race Guide 与交付包原文的逐段比对由 PR 测试覆盖，生产响应与审核清单相匹配。**9/9** 条公开 Action 按原始清单精确比较 AppID、Hotel ID、完整 Path、参数顺序及原 2026 年入住日期。Analytics 契约未改动。Human 线上真机 Smoke QA 包含携程跳转抽查。实际成交及归因仍未验证。[Outopia 生产详情](https://racenext.run/api/races/outopia-mogan-cloud-flower-trail-2027) · [黄山生产详情](https://racenext.run/api/races/huangshan-huizhou-ancient-city-trail-2027) · [原始交付清单](inputs/two-races-20261123/manifest.json) · [回归测试](../../tests/contentBatch20261123.test.ts)

## 图片权限及住宿 HOLD

两场生产图片使用权限由 Human 确认。作者、拍摄年份及独立授权证明未提供。早期图片 HOLD 和预发布验收记录保留各自时点。[最终发布前 Handoff](PR58_FINAL_RELEASE_READINESS_20261123.md) · [最初接入 Handoff](TWO_RACE_INTEGRATION_20261123.md)

歙县吴怡本堂民宿（Hotel ID `68030616`）原内容、排序和 Action 完整保留。恢复展示前须确认 2027 年实际检录口及比赛日清晨可用通路和管制，或由 Human 单独批准有依据的推荐文案。此处应用住宿标准 V1.2 的独立发布审核要求。[住宿风险复核](PR58_FINAL_RELEASE_READINESS_20261123.md#黄山住宿单项风险复核)

## 线上真机 Smoke QA

2026-11-24，Human 完成微信正式版 Smoke QA 并确认全部 PASS。验收覆盖两场赛事列表及详情、Cover、Hero、分享卡片、组别切换、黄山未确认起终点的隐藏、九家公开住宿及吴怡本堂单项 HOLD，并抽查两场的携程跳转。
