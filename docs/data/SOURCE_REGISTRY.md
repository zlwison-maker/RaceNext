# SOURCE_REGISTRY.md

Version: v1.0
Status: Draft
Project: RaceNext（下一场）

---

# 1. Background

Source Registry 是 RaceNext 数据治理体系中的数据源注册中心（Source Registry）。

所有进入 RaceNext 的数据源，都必须先完成注册，再参与：

- 数据抓取
- 数据清洗
- Merge
- Canonical
- Recommendation
- 商业化能力

Source Registry 不负责：

- 字段归属
- 字段优先级
- Merge 规则

这些内容分别由：

FIELD_OWNERSHIP.md

FIELD_PRIORITY_MATRIX.md

MERGE_RULES.md

负责。

---

# 2. Goals

Source Registry 的目标：

1. 建立统一的数据源目录。

2. 为每个数据源分配唯一 Source ID。

3. 定义数据源类型。

4. 定义数据源能力。

5. 定义当前接入状态。

6. 为未来持续扩展提供统一入口。

---

# 3. Source Type

RaceNext 所有数据源统一划分为以下七类。

| Type | 中文 | 说明 |
|------|------|------|
| Official | 官方数据源 | 官方赛事网站、官方公众号、官方报名入口 |
| Aggregator | 聚合平台 | 汇总赛事信息的平台 |
| International | 国际平台 | ITRA、UTMB 等国际赛事平台 |
| Community | 社区平台 | 用户分享、赛事体验 |
| Map | 地图平台 | POI、交通、酒店位置 |
| Commercial | 商业平台 | 酒店、装备、保险等合作平台 |
| Internal | RaceNext 内部 | AI、人工维护、推荐系统 |

---

# 4. Source Lifecycle

每个数据源必须属于以下状态之一。

| Status | 说明 |
|---------|------|
| Planned | 已规划，未开始研究 |
| Researching | 正在调研 |
| Developing | 开发中 |
| Active | 已正式接入 |
| Deprecated | 已废弃 |
| Disabled | 已停用 |

---

# 5. Source Registry

## Official

| Source ID | 数据源 | 覆盖范围 | 权威等级 | MVP | Status |
|------------|---------|---------|---------|---------|---------|
| official | 官方赛事官网 | 全部赛事 | ★★★★★ | ✅ | Planned |
| official_registration | 官方报名入口 | 报名信息 | ★★★★★ | ❌ | Planned |
| official_wechat | 官方公众号 | 公告资讯 | ★★★★★ | ❌ | Planned |

说明：

Official 是所有官方事实（Source of Truth）的第一来源。

负责：

- 比赛日期
- 报名日期
- 官网
- 报名链接
- 名额
- 规程
- 公告

---

## Aggregator

| Source ID | 数据源 | 覆盖范围 | 权威等级 | MVP | Status |
|------------|---------|---------|---------|---------|---------|
| runchina | 中国马拉松信息平台 | 马拉松 | ★★★★☆ | ✅ | Planned |
| zuicool | 最酷 | 马拉松 / 越野 | ★★★★☆ | ✅ | Planned |
| iranshao | 爱燃烧 | 马拉松 | ★★★★☆ | ❌ | Planned |
| gudong | 咕咚赛事 | 路跑 | ★★★☆☆ | ❌ | Planned |
| joyrun | 悦跑圈 | 路跑 | ★★★☆☆ | ❌ | Planned |

说明：

Aggregator 用于：

- 快速发现赛事
- 补充基础资料
- 提供图片
- 提供赛事列表

聚合平台不是最终事实来源。

---

## International

| Source ID | 数据源 | 覆盖范围 | 权威等级 | MVP | Status |
|------------|---------|---------|---------|---------|---------|
| itra | ITRA | 越野 | ★★★★★ | ✅ | Planned |
| utmb | UTMB Index | 越野 | ★★★★★ | ❌ | Planned |
| ultrasignup | UltraSignup | 越野 | ★★★★☆ | ❌ | Planned |

说明：

International 主要提供：

- ITRA
- UTMB
- Running Stones
- Qualification
- 越野赛事信息

国际平台不是所有赛事都覆盖。

---

## Community

| Source ID | 数据源 | 覆盖范围 | 权威等级 | MVP | Status |
|------------|---------|---------|---------|---------|---------|
| xiaohongshu | 小红书 | 用户体验 | ★★☆☆☆ | ❌ | Planned |
| bilibili | B站 | 视频体验 | ★★☆☆☆ | ❌ | Planned |
| douyin | 抖音 | 视频体验 | ★★☆☆☆ | ❌ | Planned |
| strava | Strava | 全球赛事 | ★★☆☆☆ | ❌ | Planned |

说明：

Community 不负责官方事实。

主要提供：

- 用户体验
- 风景
- 补给
- 停车
- 住宿体验
- 赛事氛围

---

## Map

| Source ID | 数据源 | 覆盖范围 | 权威等级 | MVP | Status |
|------------|---------|---------|---------|---------|---------|
| amap | 高德地图 | POI | ★★★★★ | ❌ | Planned |
| baidu_map | 百度地图 | POI | ★★★★☆ | ❌ | Planned |

说明：

Map 提供：

- 经纬度
- 酒店位置
- 高铁站
- 机场
- 停车场
- 景点

地图不是赛事信息来源。

---

## Commercial

| Source ID | 数据源 | 覆盖范围 | 权威等级 | MVP | Status |
|------------|---------|---------|---------|---------|---------|
| ctrip | 携程 | 酒店 | ★★★★★ | ❌ | Planned |
| fliggy | 飞猪 | 酒店 | ★★★★☆ | ❌ | Planned |
| jd_union | 京东联盟 | 装备 | ★★★★☆ | ❌ | Planned |
| taobao_union | 淘宝联盟 | 装备 | ★★★★☆ | ❌ | Planned |
| pdd_union | 拼多多联盟 | 装备 | ★★★☆☆ | ❌ | Planned |

说明：

Commercial 用于商业化能力。

不会参与赛事事实。

---

## Internal

| Source ID | 数据源 | 覆盖范围 | 权威等级 | MVP | Status |
|------------|---------|---------|---------|---------|---------|
| racenext_ai | RaceNext AI | 推荐系统 | ★★★★★ | ✅ | Planned |
| racenext_manual | 人工维护 | 全部 | ★★★★★ | ✅ | Planned |

说明：

Internal 是 RaceNext 自己的数据能力。

负责：

- Difficulty
- Recommendation
- Tag
- Risk
- Training
- Experience
- AI Summary

---

# 6. MVP Source Scope

MVP 第一阶段，仅接入以下六个数据源：

| Source | 用途 |
|---------|------|
| official | 官方事实 |
| runchina | 国内赛事聚合 |
| zuicool | 国内赛事聚合 |
| itra | 越野赛事数据 |
| racenext_ai | 推荐能力 |
| racenext_manual | 人工补充 |

其余数据源：

全部保留 Registry。

暂不开发。

---

# 7. Source Capability

不同 Source 的能力不同。

| Type | 官方事实 | 推荐 | 商业 | 用户体验 |
|------|----------|------|------|----------|
| Official | ✅ | ❌ | ❌ | ❌ |
| Aggregator | ⚠️ | ❌ | ❌ | ❌ |
| International | ⚠️ | ⚠️ | ❌ | ❌ |
| Community | ❌ | ⚠️ | ❌ | ✅ |
| Map | ❌ | ❌ | ⚠️ | ⚠️ |
| Commercial | ❌ | ❌ | ✅ | ❌ |
| Internal | ⚠️ | ✅ | ✅ | ✅ |

说明：

✅：主要能力

⚠️：辅助能力

❌：不负责

---

# 8. Future Expansion

未来新增数据源：

必须：

1. 分配唯一 Source ID。

2. 指定 Source Type。

3. 指定 Status。

4. 更新：

FIELD_PRIORITY_MATRIX.md

不得：

直接修改：

Merge Rules。

---

# 9. Freeze

Source Registry v1.0

作为 RaceNext 全部数据源的唯一注册中心。

新增任何数据源：

必须：

先完成 Source Registry 注册。

Version：

v1.0

Status：

Draft（待 Freeze）
