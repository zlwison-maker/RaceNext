# Future Top100 Seed V1

Date: 2026-07-08

## 1. 本轮目标

建立第一版未来赛事数据池 `future_top100_seed`，只处理数据，不修改 RaceNext 前端 UI。

## 2. 数据来源

- RunChina：中国马拉松信息平台公开赛事列表，用于赛事身份、日期、城市、路跑认证赛事。
- Zuicool：最酷公开赛事列表和公开赛事详情页，用于报名链接、费用、组别、越野赛事、图片 URL 字段保存。

本轮未接入 Official、ITRA、数据库或任何需要登录的数据源。

## 3. 获取方法

- RunChina：公开 API 有限分页抓取，pageSize=20，最多 5 页。
- Zuicool：公开 HTML 列表有限分页抓取，最多 4 页；详情页最多 35 条，用于补充报名链接和组别。
- 请求使用现有 Connector policy，包含 User-Agent、重试和 1.5 秒级低频间隔。

## 4. 筛选规则

保留未来赛事、报名中、抽签中、即将开放、以及信息待更新但有 sourceUrl 的赛事。

过滤已结束赛事、明显早于今天的赛事、无 sourceUrl 的记录、以及已截止且无报名链接的低价值记录。

## 5. Top100 选择规则

排序优先考虑报名中 / 抽签中、有 registrationUrl、有 sourceUrl、有明确 raceDate、有组别距离、热门城市 / 热门赛事、类型覆盖均衡、日期从近到远。

## 6. 输出字段

`data/seed/future_top100_seed.json` 每条记录包含：

- id
- name
- type
- province / city / district
- raceDate
- registrationStatus
- registrationUrl
- sourceUrl
- coverImage
- categories
- sourceIds
- confidence
- missingFields

缺失字段使用 `null`，不编造。

## 7. 实际生成数量

- 总数：100
- RunChina 来源：3
- Zuicool 来源：99
- 去重合并：2
- 疑似重复组：2

## 8. 缺失字段情况

```json
{
  "city": 4,
  "registrationUrl": 87,
  "raceDate": 1
}
```

## 9. 风险

- RunChina 列表对报名链接覆盖较弱，更多适合作为路跑身份和日期基准。
- Zuicool 列表可补充报名与组别，但部分赛事详情或报名页可能缺字段。
- 当前去重仍是规则去重，同名同城同年可能覆盖大多数情况，但跨城市命名和延期赛事需要后续人工复核。
- 本轮没有下载图片，只保存公开图片 URL 字段。

## 10. 下一步建议

- 对热门城市马拉松建立人工白名单，提高 Top100 排序稳定性。
- 为 Zuicool 详情页解析补充更多组别结构识别。
- 在不改变 UI 的前提下继续提升 adapter 对低字段完整度记录的兼容。

## Warnings

- Zuicool list fetch failed on page 4: restricted response body detected
