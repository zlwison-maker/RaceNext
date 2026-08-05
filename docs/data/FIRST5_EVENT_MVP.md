# RaceNext First 5 Event MVP

## 1. 目标

First 5 MVP 赛事用于验证 RaceNext 当前商业闭环：

SEO 流量 -> 赛事详情页访问 -> 参赛住宿指南点击 -> 酒店联盟转化可能性。

当前阶段不验证酒店订单、不验证酒店库存、不验证实时价格，也不验证复杂赛事决策能力。

## 2. First 5 赛事

| 赛事 | 类型 | 选择原因 |
| --- | --- | --- |
| 上海马拉松 | 城市马拉松 | 搜索需求高，城市住宿与交通服务需求明确，适合验证大众马拉松流量。 |
| 北京马拉松 | 城市马拉松 | 赛事心智强，抽签与报名关注度高，外地跑者住宿需求稳定。 |
| 厦门马拉松 | 城市马拉松 | 海滨热门赛事，外地参赛和旅行住宿需求明显。 |
| 香港100 HK100 | 越野赛事 | 越野用户消费能力强，跨城/跨境交通和住宿决策复杂度高。 |
| 凯乐石贡嘎100冰川极限挑战赛 | 越野赛事 | 长距离越野代表赛事，住宿、交通、装备和保险需求强，适合作为高客单验证样本。 |

## 3. 数据配置范围

First 5 MVP 配置文件位于：

`data/events/first5-events.ts`

First 5 数据拆分为两层：

### 3.1 Event Base Data

赛事基础数据负责客观信息，未来可由 AI 获取、数据抓取和人工校验共同维护。

- `eventId`
- `eventName`
- `eventYear`
- `eventDate`
- `eventLocation`
- `eventStatus`
- `coverImage`
- `categories`
- `source`
- `lastUpdated`

### 3.2 RaceNext Decision Data

RaceNext 决策数据负责商业化验证与住宿决策表达，当前允许人工维护。

- `eventId`
- `accommodationAreas`

住宿决策字段：

- `areaName`
- `priorityType`
- `recommendationReason`
- `suitableUsers`
- `coreAdvantage`
- `affiliateLinks`

`priorityType` 只允许：

- `distance`
- `transportation`
- `balance`

`affiliateLinks` 当前结构：

```ts
{
  ctrip: {
    distance: string;
    transportation: string;
    balance: string;
  }
}
```

## 4. MVP 验证指标

第一阶段优先关注：

- 赛事详情页 PV
- 参赛住宿指南模块曝光率
- 酒店入口点击率 CTR
- 不同赛事的住宿入口点击差异
- 不同住宿区域的点击差异

当前阶段暂不以订单收入作为第一判断指标。订单、佣金和 ROI 进入联盟接入后再纳入验证。

## 4.1 轻量统计事件

当前优先使用 GA4 记录商业闭环关键事件，不新增后台：

| 事件 | 触发时机 | 关键参数 |
| --- | --- | --- |
| `event_page_view` | 用户进入赛事详情页 | `event_id`, `event_slug`, `source` |
| `accommodation_impression` | 住宿区域卡片展示 | `event_id`, `event_slug`, `area_type`, `source` |
| `accommodation_click` | 用户点击住宿 CTA | `event_id`, `event_slug`, `area_type`, `provider`, `source` |

住宿入口 CTR 可按以下方式计算：

`accommodation_click / accommodation_impression`

也可以按赛事维度计算：

`指定 event_id 的 accommodation_click / 指定 event_id 的 accommodation_impression`

按住宿区域维度计算：

`指定 area_type 的 accommodation_click / 指定 area_type 的 accommodation_impression`

## 4.2 住宿跳转链路

所有住宿 CTA 不直接跳转第三方平台，统一经过：

`/go/accommodation`

参数：

- `eventId`
- `areaType`
- `provider`
- `source`

流程：

用户点击住宿 CTA -> GA4 记录 `accommodation_click` -> `/go/accommodation` 查找联盟目标链接 -> 302 跳转携程联盟链接。

当前 `/go/accommodation` 只做轻量中间层，不写数据库，不维护订单，不读取酒店库存。

## 5. 当前不验证

MVP 阶段不验证：

- 酒店库存
- 酒店实时价格
- 酒店评分
- 用户评论
- 酒店排序
- 酒店订单转化
- 复杂 AI 赛事决策
- 个性化推荐算法
- 训练建议

RaceNext 当前只维护赛事消费决策所需的数据，不维护酒店平台能力。

## 6. 后续扩展方式

从 5 个赛事扩展到 50 个赛事时，保持同一数据结构：

1. 先补齐赛事基础字段。
2. 每个赛事最多维护 3 个住宿区域。
3. 住宿区域优先围绕距离、交通、价格三个因素生成。
4. AI 可辅助生成推荐理由，但必须基于赛事地点、起跑区域、城市交通和公开地图信息。
5. 人工只做快速审核，不长期维护酒店列表。
6. 联盟接入时只替换 `affiliateLinks`，不引入 Hotel Model。

## 7. 联盟接入状态

当前已接入首批携程 Ctrip 联盟链接，页面 CTA 通过 `/go/accommodation` 中间层跳转：

- 上海马拉松：距离优先、交通优先、综合优先。
- 北京马拉松：距离优先、交通优先、综合优先。
- 厦门马拉松：距离优先、交通优先、综合优先。
- 香港100 HK100：距离优先、交通优先、综合优先。
- 凯乐石贡嘎100冰川极限挑战赛：距离优先、交通优先、综合优先。

未来接入飞猪、美团时，只新增 provider 链接层，不引入 Hotel Model。

RaceNext 负责：

- 赛事场景理解
- 住宿区域推荐
- 用户决策辅助
- 点击行为统计

第三方平台负责：

- 酒店详情
- 酒店价格
- 酒店库存
- 订单
- 佣金结算
