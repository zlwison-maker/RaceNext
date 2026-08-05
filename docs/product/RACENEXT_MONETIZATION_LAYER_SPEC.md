# RaceNext Monetization Layer Spec

Version: 1.0
Status: Active proposal
Last Updated: 2026-07-31

---

# 1. Scope

本文定义 RaceNext MVP V2 的商业化数据层：

> Monetization Layer。

MVP V2 不再以 Decision Content 作为当前阶段的核心内容层。

Decision Content 属于未来 Decision Layer，服务“我下一场跑什么”的长期决策问题。

Monetization Layer 服务当前 MVP 问题：

> 我已经决定跑这个比赛，接下来怎么办？

本层优先维护能带来商业转化的数据，包括报名、交通、住宿、装备、保险和旅行服务。

---

# 2. Layer Relationship

未来架构：

```text
Race Event Data
↓
Monetization Layer
↓
Decision Layer
↓
Personalized Agent
```

## Race Event Data

基础赛事事实：

- 赛事名称
- 比赛日期
- 举办地点
- 组别
- 报名状态
- 报名入口

## Monetization Layer

围绕参赛准备和消费决策的数据：

- 怎么去
- 住哪里
- 买什么装备
- 买什么保险
- 周边怎么安排

## Decision Layer

围绕是否适合用户的数据和内容：

- AI 适合人群
- AI 难度分析
- AI 训练建议
- 赛事推荐理由
- 个性化匹配

## Personalized Agent

未来基于用户画像、训练状态、预算、城市、时间、完赛能力和偏好的赛事决策 Agent。

---

# 3. Data Structure

以下结构是产品规范，不代表当前必须进行数据库迁移。

MVP 阶段可以先用轻量维护方式承载，后续再决定是否进入正式数据模型。

## 3.1 赛事基础信息

```ts
type RaceBaseInfo = {
  name: string;
  date: string | null;
  location: {
    province?: string | null;
    city?: string | null;
    district?: string | null;
    venue?: string | null;
  };
  categories: Array<{
    name: string;
    distanceKm?: number | null;
    fee?: number | null;
    cutoffTime?: string | null;
  }>;
  registration: {
    status: string;
    url?: string | null;
    openDate?: string | null;
    closeDate?: string | null;
    sourceNote?: string | null;
  };
};
```

维护原则：

- 不编造赛事事实。
- 报名入口必须标注来源属性，不能把聚合平台误写成官方入口。
- 缺失字段可以为空，页面按真实数据展示。

## 3.2 Transportation

```ts
type TransportationInfo = {
  arrivalOptions: string[];
  recommendedTransport?: string | null;
  distances: Array<{
    from: string;
    to: string;
    distanceKm?: number | null;
    durationText?: string | null;
  }>;
  serviceLinks: Array<{
    label: string;
    provider: string;
    url: string;
    affiliate: boolean;
  }>;
  notes?: string[];
};
```

字段说明：

- 到达方式：飞机、高铁、火车、自驾、接驳车等。
- 推荐交通：面向外地跑者的最省心方案。
- 距离：机场 / 高铁站 / 市中心 / 住宿区到起终点。

## 3.3 Accommodation

```ts
type AccommodationInfo = {
  recommendedAreas: Array<{
    name: string;
    reason: string;
    distanceToStartKm?: number | null;
    distanceToFinishKm?: number | null;
    priceRange?: string | null;
  }>;
  affiliateLinks: Array<{
    label: string;
    provider: "ctrip" | "fliggy" | "meituan" | "other";
    url: string;
  }>;
  notes?: string[];
};
```

字段说明：

- 推荐住宿区域优先于单个酒店推荐。
- 距离比赛地点是核心字段。
- 价格区间用于帮助用户判断预算。
- 联盟链接必须可追踪。

## 3.4 Equipment

```ts
type EquipmentInfo = {
  requiredItems: string[];
  recommendedItems: Array<{
    name: string;
    reason: string;
    category?: string | null;
    affiliateLinks: Array<{
      label: string;
      provider: "taobao" | "jd" | "other";
      url: string;
    }>;
  }>;
  notes?: string[];
};
```

字段说明：

- 必备装备来自官方强制装备或赛事环境推导，但必须标注事实来源。
- 推荐装备服务用户准备，不应制造焦虑。
- 越野赛优先维护装备数据。

## 3.5 Insurance

```ts
type InsuranceInfo = {
  recommendedTypes: Array<{
    name: string;
    reason: string;
    coverageNotes?: string[];
  }>;
  affiliateLinks: Array<{
    label: string;
    provider: string;
    url: string;
  }>;
  notes?: string[];
};
```

字段说明：

- 推荐保险类型优先于具体产品。
- 必须提醒用户确认保障范围是否覆盖对应运动类型。
- 越野跑、高海拔、长距离、海外赛事优先维护。

## 3.6 Travel

```ts
type TravelInfo = {
  nearbyTrips: Array<{
    name: string;
    type: "scenic_spot" | "food" | "family" | "local_experience" | "other";
    distanceKm?: number | null;
    reason?: string | null;
    serviceLinks: Array<{
      label: string;
      provider: string;
      url: string;
      affiliate: boolean;
    }>;
  }>;
  notes?: string[];
};
```

字段说明：

- 周边旅行优先服务外地参赛用户。
- 不把赛事页面做成旅游攻略站，只保留能促进参赛消费决策的信息。

---

# 4. MVP Priority

MVP 阶段优先维护：

- 报名入口和报名状态。
- 推荐住宿区域。
- 起终点 / 领物点 / 交通枢纽距离。
- 推荐交通方案。
- 赛事相关必备装备。
- 装备联盟链接。
- 保险类型和保险联盟链接。
- 周边旅行服务链接。

这些字段直接影响：

- 页面转化。
- 联盟收入。
- 用户是否愿意把 RaceNext 当作参赛准备入口。

---

# 5. Deferred Decision Layer

以下能力延期，不作为 MVP V2 开发前置条件：

- AI 适合人群
- AI 难度分析
- AI 训练建议
- 个性化推荐
- 个性化参赛规划
- AI Chat
- 用户画像
- 复杂推荐算法
- 完整训练计划

这些能力属于未来 Decision Layer。

延期原因：

- 当前 3 个月目标是验证月收入 5000 元。
- 商业闭环依赖高意图搜索和服务转化，而不是复杂 AI 判断。
- 没有用户行为和消费数据前，个性化决策质量难以验证。

---

# 6. Page Usage Principles

Monetization Layer 在页面上应遵循：

- 商业入口前置，但不干扰报名信息获取。
- 推荐必须与赛事场景相关。
- 不伪装广告，不误导用户。
- 不展示无法维护的实时库存和实时价格。
- 优先展示区域、类型、路径和准备清单，再链接到外部服务。
- 所有联盟链接应能追踪来源赛事和模块。

页面优先顺序建议：

```text
赛事核心信息
↓
报名信息
↓
住宿
↓
交通
↓
装备
↓
保险
↓
周边旅行
↓
长期 Decision Layer 模块
```

长期 Decision Layer 模块可以保留扩展位置，但不应阻塞 MVP V2 上线。
