# Codex 开发指令｜RaceNext 新增 2027 Outopia 莫干山云间花径 + 2027 黄山徽州古城百公里（2026-11-23）

## 0｜任务性质与授权边界

RaceNext 微信正式版已经上线。既有发布后的公开 Edition 基线应以**实际当前 main / Production API** 为准（上次 Human 确认 21 场，但不得在本轮写死）。

此次 Human 已明确选择 **2 张赛事 KV（每场一张 Cover/Hero 共用）+ 每场 5 家酒店 + 对应 10 条携程 Action**，授权 Codex 按两份 Final Integration Package 开发，形成 **Draft PR**，**不授权自动 Merge / Deploy / 微信提审**。

输入文件必须完整：
1. `RACENEXT_2027_OUTOPIA_MOGAN_FINAL_INTEGRATION_20261123.md`
2. `RACENEXT_2027_HUANGSHAN_HUIZHOU_FINAL_INTEGRATION_20261123.md`
3. `assets/outopia-mogan-cloud-flower-2027-original.png`
4. `assets/huangshan-huizhou-ancient-city-2027-original.jpeg`
5. `evidence/` 中对应完整 2026-11-23 Research Packages
6. `manifest.json`（10 条原始 Ctrip Action 的机器核对基准）
7. `previews/`（仅中心裁切模拟，不是发布资产）

## 1｜先只读检查仓库，严格遵守已有系统

- 检查最新 main、working tree、Open PR、数据自动维护 Pending / State；不得覆盖未提交改动。使用独立 Worktree 和唯一命名分支，例如 `codex/add-outopia-huangshan-2027`。
- 读取当前 Repo 中 Event/Edition/Category Schema、Canonical、Source Registry、Accommodation Pipeline、图片资产 Registry、Public API、Mini Program 实际 UI、分享图、Analytics、Pre-Publish Fact Gate。
- 核对当前活动 / 历史同名 Event，避免将 **Outopia 莫干山**与 **莫干山 by UTMB / 凯乐石莫干山**混淆；避免将**2027 黄山春赛**与 **2026 秋季环新安江**混淆。
- 冻结原则：当前项目标准 V1/V1.2、Human 最近明确决定优先。开发 Agent 不重新研究酒店名单或重写产品文案。

## 2｜仅允许接入这两场赛事

### 2.1 Facts 与治理

- 依据两份交付包中当届官方直接来源，核验日期、组别标称距离、爬升、起跑波次、关门时长、起终点、报名状态，逐条建立或复用可信 SourceRegistry / fieldSources；使用原始来源事实，不把内部 Evidence 文案公开。
- **Outopia 16K 分枪关键差异：**先前研究稿列 09:00 / 09:30 / 10:00，但 2026-11-23 当届合作报名页 `https://reg.zuicool.com/54221` 当前仅列 **09:00 / 09:30**，并标记 **16K 已报满**。必须实查主办方现行规程，记录冲突。没有当届明确支持就不能发布 10:00 第三枪。总体「报名中」不代表该组仍可报名。
- **黄山春赛日期：**Human 的 2027 当届竞赛规程为 **2027-03-27—28**；最酷当届页 `https://reg.zuicool.com/38938` 页头错误/冲突地写 03-28—29，但各组别和正文均为 03-27—28。保留来源冲突，不把 03-29 编进 Canonical。20K 爬升获得新直接来源 `约500m`，待 Fact Gate 复核。
- **黄山终点仍 Pending：**用户规程截图没有核实每组终点，不得未经当届直接证据写入府前广场。若现有 Fact Gate 不允许发布相关组别，单独 HOLD 并报告解除条件。不得臆造 2027 CP/补给、换装或赛道详细线路。
- 两场 `distanceKm` 沿用官方标称组别距离，保留多枪次 `startTimes`，不推算精确绝对关门或其他官方未定义字段。
- 按现有 Fact Gate 受控发布，**不修改 Schema、Gate、Pubic DTO 或维护 Pipeline 以绕过缺失事实**。

### 2.2 Race Guide / Trail Strategy

- 使用交付包第 2 节的 **A–E Race Guide 原文**，保留标准模块与自然表达，不添加 AI 研究过程、资料免责声明、内部标记；仅做 Schema 需要的结构映射。
- 两场 Trail Strategy 均 **HOLD / not for public**，不从历史个人赛记推导 2027 CP。若 Schema 需要，使用既有空值 / 未核实状态，切忌生成通用三段策略。

### 2.3 五家酒店和原始携程 Action

- 每场 **5 家**，严格使用 Human 已提供并在交付包第 3 节列出的顺序、名字、Title、Reason、Hotel ID、AppID 与 **Opaque Path 原样字符串**。不得默默替换酒店名称或“优化推荐文案”。
- 对照 `manifest.json` 运行精确字符串回归：共 10 条；特别保证歙县井陌的 `biz=1` 位于 `id` 前，其余链接按各自真实原始顺序；独立 `guid` 不可重用；`AllianceID=9729651`、`sid=327120872`、`sct=open_platform` 均不能丢失。
- **原 Path 的 `inday/outday` 是 2026 年临时日期，非 2027 赛期！** 严格原样存储和导航，不替换成赛日。用户最终在携程侧核对并调整入住日期。用户端若需要提示，不要在缺少设计共识时增加页面模块；沿用既有产品行为和信息层级。
- 核验 10 个 Hotel ID 是否到对应酒店，优先查看携程正式酒店身份；不要把不同赛事住客的历史服务个案升级成 2027 保证的早餐、延迟退房、接驳等。
- 使用现有 `openHotelMiniProgram` 行为和事件语义；`hotel_click` 等已有埋点不得变更。路径正确不代表已验证联盟转化，真机和归因独立列 Gate。

### 2.4 Cover / Hero / Share（本次风险最高）

- 本次两张原图由 Human 上传，**无损保留原始文件与 Hash**；每场使用同一图作为 Cover 和 Hero，按现有 Edition Asset Registry 注册。不要删除画面 Logo、擦除文字或生成“相似风格”的替代海报。
- 实际源图仅 `702×468` (Outopia) 与 `750×289` (黄山)，**均低于图片标准的分辨率建议值**。不能以插值放大 2x–3x 后伪称清晰度合格，也不应把小文件大小误认为性能质量 PASS。
- 允许尝试现有格式压缩、Display 复用、对象定位/最小裁切；不得另建一套图片服务或重做整页 UI。若 Cover 16:9 / Hero / 5:4 分享裁切截断主办方标题或 Logo，标记 `IMAGE_QA_HOLD`，明确提出需更大尺寸或更适合构图的 **同一当届授权素材**。不要让这种风险静默通过。
- 记录 Image Registry：Edition、Source=`user_provided`、original filename / hash、imageYear=2027 visual（非已举办比赛摄影）、版权作者/授权凭证若未提供则保持 Unverified。**Human 图片选择 ≠ 已证明可商用授权**；发布前由 Human 确认。
- 验证两图 Display 的实际网络响应和尺寸、冷/热缓存、列表与详情裁切、Title 可读性、Share 5:4；缺微信真机只能写 `NOT VERIFIED`。

## 3｜严格禁止范围

- 不修改现有 21 场赛事数据、图片、Guide、住宿、分享、Fact Gate 或发布/数据自动维护系统；若当前 main 已有更多赛事，按最新真实基线保护全部旧赛事。
- 不关闭、改写、自动合并仍 Open 的自动维护 Data PR；不修改 Pending / State；保持 Auto Apply OFF。
- 不重写 A–E 正文，不再次筛选 Human 已定的十家酒店；不做 UI 重构或商业追踪体系重建。
- 不部署到生产、不提审微信小程序、不在本次任务 Merge PR，也不自行审批图片版权。

## 4｜完整验收和交付

1. **输入：**包中两张原图 SHA、尺寸和 10 个 Hotel Path 与 `manifest.json` 完全一致；任何差异停止并报告。
2. **事实：**两场各组 Official Fact Gate；日期、组别、时间/爬升、起终点、报名状态符合可核实当届来源；记录 16K 分枪及黄山页头冲突，终点和 CP 的 HOLD 必须如实列出。
3. **内容：**A–E 原文完整；Top5 各5家及顺序不变；Hotel ID、appId、Path、Title、Reason 字符级对比；History / Evidence 不公开。
4. **资产：**Original、Derived、Share、Hash、Content-Type、实际下载大小；小程序 16:9 / Hero / Share 裁切模拟以及真机（如有）；不可接受时 HOLD。
5. **回归：**`npm ci`、`npm audit --omit=dev`、完整 `npm test`、`npm run typecheck`、`npm run typecheck:miniprogram`、`npm run lint`、`npm run build`、现有 Public Fact Gate、`git diff --check`。安全 Gate Critical/High 不得新增阻断（与最新 main 基线相比）；不得使用 `npm audit fix --force`。
6. **API：**逐一验证当前实际 `/api/races` 列表/两个新增详情及原有全部详情。**公开赛事是否达到基线+2，以 Gate 真实结果为准**，未能通过的单个组别/Edition 保留 HOLD。
7. **Handoff：**给出 Source Registry、Edition / Category ID、真实测试输出、现有赛事回归、图片构图/画质、五家酒店 Actions 逐一核对、未解决 Release Gates。
8. **Git：**最小文件范围 Commit、Push，创建 **Draft PR**。不要自动 Merge/Deploy；交还 Human Review。

**验收重点：**正确、安全地把两场真实赛事接入开发分支；不因想把赛事数加二就绕开事实或图片 Gate。下一阶段待 Human Review 后另行发布。
