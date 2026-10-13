# RaceNext 数据自动维护下一阶段验证计划

**Status: CURRENT VALIDATION PLAN / NOT IMPLEMENTED CAPABILITY**
**Frozen: 2026-10-13**

## 1. Long-term Goal

RaceNext 数据自动维护系统应当能够：

- 主动发现赛事核心事实缺失及变化。
- 从官方或可信来源获取直接证据。
- 正确识别 Event、Edition、Category。
- 对字段进行身份、来源、数值及风险核验。
- 自动生成可靠更新提案。
- 在满足安全条件时，逐步实现受控的自动写入与自动发布。
- 让有效事实更新及时反映到 Web 和微信小程序。
- 让人工逐渐从主动寻找、录入数据，转向处理高影响、冲突和异常事项。

该目标必须同时满足：

```text
DATA ACCURACY
+ MAINTENANCE AUTOMATION
+ LOW MAINTENANCE COST
```

不得仅以 Workflow Success 衡量完成度。

## 2. First Validation: Ninghai Ultra Trail

首个验证对象：`ninghai-ultra-trail-2026`。

选择宁海是因为比赛临近，现有数据存在缺失或精度验证空间，适合作为自动维护有效性的具体案例。

当前 Canonical 基线：

| Category | distanceKm | elevationGain | startLocation | finishLocation |
| --- | ---: | ---: | --- | --- |
| UTNH-100 | 100 | 4986 | `null` | `null` |
| CNH-60 | 60 | 2400 | `null` | `null` |
| YNH-25 | 25 | 618 | `null` | `null` |

这些值只是当前 Canonical 基线，不代表已完成当届重新核验。现有爬升值并非完全缺失；如果小程序未展示，必须区分数据源、API 和客户端显示问题。Edition `venue` 不能自动等同于具体 Category `startLocation`。

官方网站可能存在更精确的赛道距离、爬升、起终点资料。实施时必须重新取得当届官方证据，不得在本次文档任务中把未确认值写入 Canonical。

## 3. Validation Scope

仅使用现有 Schema：

- `distanceKm`
- `elevationGain`
- `startLocation`
- `finishLocation`

必要时核验对应来源、Category 身份和展示链路。不扩展至住宿、路线 CP、Strategy、图片或内容生产。

## 4. Minimum Experiment

计划时间盒：`3–5` 个工作日。

系统应尽可能主动完成：

1. **缺失字段扫描**：识别 `null` / `unknown` 及重要字段的核验缺口。
2. **新来源或公告发现**：寻找已登记来源未覆盖的官方新公告、路线说明和组别资料。
3. **事实提取**：提取具体字段值与直接证据。
4. **事实核验**：确认 2026 Edition、正确 Category、正确字段、数值与单位、来源权限与可信度、发布时间或适用时间及冲突。
5. **安全输出**：证据充分时生成 Fact Candidate / Pending；证据不足时生成 Verification Alert，不得猜测填空。
6. **Human Review**：高影响、冲突和证据不足事项继续人工确认。
7. **发布闭环**：Human Approved / Merge 后，通过现有安全部署流程更新服务端数据，并验证 API 和小程序实际呈现。

第 7 步属于验证计划，不是本次 Docs PR 的执行授权。

## 5. Acceptance Gate

- 已知缺失字段能够被系统识别。
- 已知精度差异能够被识别并分类。
- 可信证据生成准确的字段级 Candidate。
- 无证据不得自动填入。
- 错误自动发布为 `0`。
- 已批准更新可以进入 Canonical。
- 已批准更新经部署可以在终端验证。
- 记录人工审核时间和总维护时间。

不能仅通过 Mock Test 宣称端到端生产验证完成。

## 6. Second Validation: Existing 12 Races

宁海试点通过后，再覆盖现有 12 场。重点衡量：

- Critical Fact Verification Coverage。
- Fact Change Detection Effectiveness。
- 关键更新发现到发布的时延。
- 人工介入率。
- 每场赛事每月人工维护分钟数。
- 模型与运行成本。
- 误报和漏报。

质量、成本和效率必须一起评估。

## 7. Auto Apply Boundary

现阶段：

```text
Auto Apply = OFF
```

Human Review 继续生效。宁海试点不授权自动修改高影响赛事事实。

只有真实生产证据证明来源权威、身份准确、直接证据充分、无冲突、重复运行安全、错误率可接受、可回滚且发布后可验证，才可以单独讨论低风险字段的受控自动写入。本计划不修改任何 Auto Apply 配置。

## 8. Priority and Exclusions

数据可信度和自动维护有效性是与真实用户获取并行的 P0 工作，但不替代增长和商业验证主线。宁海验证通过后才扩至 12 场。

当前不做：

- 全网赛事搜索系统。
- 50 / 100 场扩容开发。
- 新数据库。
- CMS。
- 新 Schema。
- 新队列。
- 复杂 Agent 架构。
- 全自动高影响事实发布。

长期目标和验收边界见 [RaceNext 赛事数据自动维护目标与验收标准 V1](RACE_DATA_AUTOMATION_STANDARD_V1.md)，当前实现与生产证据见 [RaceNext Data Foundation V1](../data/RACENEXT_DATA_FOUNDATION_V1.md)。
