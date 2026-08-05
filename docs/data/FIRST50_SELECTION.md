# RaceNext First50 Selection

Last Updated: 2026-07-31

Status: Active proposal.

## 1. Why First50

RaceNext 当前最大瓶颈不是页面数量，而是单场赛事的数据深度。

Top100 适合展示“我们有很多赛事”，但不适合验证“RaceNext 能不能帮跑者做报名决策”。

First50 的目标是：

- 用 50 个高价值赛事验证 Race Decision Page。
- 优先覆盖越野跑和高搜索价值路跑。
- 允许人工补充高价值字段。
- 形成可复用的数据生产流程，再扩展到更多赛事。

## 2. First50 Principles

- 少而深，先做 50 场，不继续追 Top100 数量。
- 决策价值优先，能回答“值不值得跑、适不适合我、怎么准备”。
- 数据可获得，不选完全无法补全关键事实的赛事。
- 维护成本可控，不依赖高频、复杂、不可持续的数据源。
- RaceNext 内容独立管理，不污染基础赛事事实数据。

## 3. Selection Criteria

RaceNext 不是赛事数据库，也不是帮助用户“找到赛事”。

First50 的选择优先回答：

- 用户是否需要 RaceNext 帮他判断这场比赛值不值得跑？
- 用户是否愿意依赖 RaceNext 做报名决策？
- 这场赛事是否有自然商业闭环？

| Criteria | Weight | Description |
|---|---:|---|
| Runner Attention | 30 | 跑者关注度、社群讨论、赛事知名度、报名竞争度 |
| Search Value | 25 | 百度/微信/小红书等搜索潜力，赛事名明确，适合 SEO |
| Commercial Value | 20 | 装备、住宿、交通、保险、训练、赛事周边等商业转化潜力 |
| Decision Complexity | 15 | 用户报名前需要判断的因素数量，例如距离、爬升、关门、装备、补给、天气、住宿交通、完赛能力 |
| Data Completeness | 10 | 日期、地点、组别、报名、距离、爬升、费用、关门时间可补齐程度 |
| Content Production Difficulty | 0 | 不因内容容易生产而加分，避免因为“好做”选择低决策价值赛事 |

Score: 100.

Suggested threshold:

- 80+: First50 core.
- 65-79: candidate pool.
- <65: not First50 unless strategic reason exists.

## 4. Race Type Mix

First50 以中国大陆跑者高价值赛事为主。

不再固定：

- 30 场越野
- 15 场马拉松
- 5 场海外 / 特殊赛事

具体比例动态决定，主要依据：

- 用户关注度
- 搜索价值
- 近期报名 / 抽签 / 截止 / 比赛节点
- 商业价值
- 数据可补全程度

当前阶段仍优先关注中国大陆越野跑和高搜索价值路跑，但不为了凑比例收录低价值赛事。

Avoid in First50:

- 纯线上赛。
- 只卖奖牌/套餐的活动。
- 亲子/徒步活动，除非有明确跑者搜索价值。
- 缺日期、地点、组别、报名路径且短期无法补齐的赛事。

## 5. Data Completeness Gate

First50 candidate must satisfy:

### Required For Candidate

- race name
- race date or confirmed month
- province/city
- at least one category name
- source URL

### Required Before Publish

- registration status
- registration URL or official source explaining报名未开放/已截止
- primary category distance
- primary category fee or explicit unknown
- RaceNext one-line verdict
- RaceNext recommended/not recommended users

### Required For Trail Publish

- elevation gain, or manual note explaining why not available
- cutoff time, or manual note explaining why not available
- route description or course map link, if obtainable
- gear/qualification note, if applicable

## 6. First50 Candidate Scoring Template

Recommended file path:

- `data/first50/first50_candidates.json`

Suggested shape:

```json
{
  "generatedAt": "2026-07-31",
  "records": [
    {
      "raceId": "future-zuicool-55206",
      "name": "2026金沙茶马古道穿越赛",
      "status": "candidate",
      "scores": {
        "runnerAttention": 24,
        "searchValue": 20,
        "commercialValue": 18,
        "decisionComplexity": 15,
        "dataCompleteness": 8,
        "contentDifficulty": 0
      },
      "totalScore": 85,
      "reason": "越野决策复杂度高，具备搜索和商业价值，适合验证 RaceNext 决策页。",
      "owner": "manual",
      "reviewStatus": "pending"
    }
  ]
}
```

## 7. Manual Enrichment Mechanism

Do not build an admin backend for MVP.

Use simple files:

```text
data/first50/
  first50_candidates.json
  first50_races.json
  content/
    future-zuicool-55206.md
    future-zuicool-55206.json
```

### `first50_races.json`

Holds curated facts and source notes only.

```json
{
  "raceId": "future-zuicool-55206",
  "sourceRecordId": "future-zuicool-55206",
  "race": {
    "officialWebsite": null,
    "officialRegistrationUrl": null,
    "registrationOpenDate": null,
    "registrationCloseDate": null,
    "organizer": null,
    "introduction": null
  },
  "categories": [
    {
      "categoryName": "金沙50K",
      "courseDescription": null,
      "courseMapUrl": null,
      "mandatoryGear": null,
      "sourceNote": "From Zuicool registration page, needs official verification."
    }
  ],
  "review": {
    "status": "draft",
    "reviewer": null,
    "updatedAt": "2026-07-31"
  }
}
```

### Decision Content JSON

RaceNext-owned content goes here, not in source facts.

```json
{
  "raceId": "future-zuicool-55206",
  "primaryCategory": "金沙50K",
  "contentStatus": "human_reviewed",
  "oneLineVerdict": "进阶越野挑战组别，需要稳定长距离训练和爬升能力。",
  "raceNextAdvice": "适合有长距离越野经验的跑者，报名前重点核对强制装备和关门时间。",
  "recommendedFor": ["有马拉松或越野完赛经验", "近三个月有稳定爬升训练"],
  "notRecommendedFor": ["没有越野补给经验", "近期缺少长距离训练"],
  "aiGuide": {
    "level": "适合进阶跑者。",
    "preparation": "至少安排一次长距离山地训练。",
    "gear": "越野鞋、水袋、能量补给、防风雨层。",
    "caution": "累计爬升会显著放大体感强度。",
    "finish": "前半程保守，按补给点拆分目标。"
  },
  "reviewer": "manual",
  "reviewedAt": "2026-07-31"
}
```

## 8. First50 Workflow

1. Select candidates from current seed and manual known races.
2. Score candidates using the First50 matrix.
3. Pick 50, mark 10 as priority launch races.
4. Complete P0 fields for all 50.
5. Complete P1 fields for top 20.
6. Add RaceNext Decision Content for top 20.
7. Publish pages only when P0 passes.
8. Expand content depth based on search and user feedback.

## 9. Execution Stages

### Stage 1: First5 样板赛事验证

目标：

- 选 5 场最高价值赛事作为数据样板。
- 验证 P0 / P1 字段是否能被稳定补齐。
- 验证 RaceNext Decision Content 的 AI 生成 -> 人工审核 -> published 流程。
- 验证 JSON / Markdown 维护方式是否足够轻。

完成标准：

- 5 场赛事 P0 完整。
- 每场至少 1 个 primaryCategory 可发布。
- 每场都有已审核的最低决策内容。

### Stage 2: First20 首批上线

目标：

- 扩展到 20 场可以正式承接搜索流量的赛事。
- 优先选择近期有报名、抽签、截止或比赛节点的赛事。
- 补齐 P1 中对决策价值最高的字段。

完成标准：

- 20 场赛事 P0 完整。
- Top 20 中重点越野赛事有爬升、关门时间或明确 reviewed unknown。
- 每场至少 primaryCategory 有 RaceNext Decision Content。

### Stage 3: First50 扩展

目标：

- 扩展到 50 场高价值赛事。
- 形成稳定数据维护节奏。
- 为后续页面接入、SEO 和商业化验证准备数据资产。

完成标准：

- 50 场赛事进入 First50 数据层。
- 所有 published 页面通过 P0 publish gate。
- P1 / P2 字段按赛事价值逐步补齐，不追求一次性填满。

## 10. First50 Definition Of Done

For each race:

- P0 facts complete.
- Primary category selected.
- Registration path checked.
- Trail difficulty facts either filled or explicitly marked unknown.
- RaceNext Decision Content reviewed.
- Page has no fake rating, fake score, or unsupported claims.
