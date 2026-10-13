# RaceNext 小程序详情页与分享标准 V1

**Status: CURRENT / FROZEN**
**Updated: 2026-10-13**

## 1. Scope

本文记录已完成 Human Review 并合入 `main` 的小程序详情页和分享长期规则。具体实现以已合并代码和 Human Approved 版本为准；图片资产仍遵循 [RaceNext 图片资产标准 V1](RACENEXT_IMAGE_ASSET_STANDARD_V1.md)。

## 2. Detail Page Structure

详情页信息顺序为：

1. Hero
2. 赛事标题
3. 日期 · 城市 · 报名状态
4. 赛事指南 / 住宿指南
5. 组别
6. Core Facts
7. Execution Facts
8. Course Points（有数据时）
9. Race Guide
10. Race Strategy（符合条件时）

住宿指南只在有数据时展示。

## 3. Category Rules

单组别赛事：

- 静态显示组别名称。
- 正常展示 Core Facts 与 Execution Facts。
- 不显示伪 Tab。
- `Marathon` 与 `Half Marathon` 等通用英文名称在展示层中文化，不改动事实源。

多组别赛事：

- 显示可切换的组别 Tab。
- 切换后展示对应组别的事实和适用 Strategy。

`showCategorySelector` 只控制多组别选择器，不得用于隐藏 Core Facts 或 Execution Facts。没有可信事实时不编造，也不增加空占位。

## 4. Home Share

好友分享标题：

> 下一场跑哪场？马拉松与越野参赛指南

朋友圈分享标题：

> 马拉松与越野参赛指南｜RaceNext

首页分享 V2 使用真实跑步氛围的虚构生成场景，核心价值表达为：

> 赛事信息 · 参赛建议 · 住宿指南

正式图片：<https://racenext.run/share/racenext-home-v2-5x4.jpg>

好友分享路径和朋友圈 Query 均使用 `source=share`。原有赛事详情分享保持独立，不与首页分享配置合并。

## 5. Analytics Semantics

- `home_share`：首页分享回调触发，不代表发送成功。
- `home_share_entry`：通过 `source=share` 进入首页，不代表独立新用户。
- `race_share`：赛事详情分享回调。

三个指标含义不同，不得直接相除或等同为分享转化率。微信后台配置和实际采集必须另行验证。

## 6. Authority

本标准只冻结会影响后续开发的产品规则，不重复定义 UI 像素参数。实现证据来自 [PR #22](https://github.com/zlwison-maker/RaceNext/pull/22) 及其 merge commit `2c83dd19c1c7980c7b03085a0ac4c6b45d161497`。
