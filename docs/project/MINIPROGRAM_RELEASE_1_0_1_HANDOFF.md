# RaceNext 微信小程序 1.0.1 Release Handoff

**Status: RELEASED / HUMAN CONFIRMED 2026-10-14**
**Updated: 2026-10-14**

## 1. Version

RaceNext 微信小程序 `1.0.1`。

## 2. Changes

- 赛事详情页信息结构统一。
- 单组别事实显示 Bug 修复。
- 单组别英文通用名称中文化。
- 首页好友分享。
- 首页朋友圈分享。
- V2 品牌封面。
- `home_share`。
- `home_share_entry`。
- 组件按需注入。

## 3. Git Evidence

- [PR #22](https://github.com/zlwison-maker/RaceNext/pull/22)，merge commit `2c83dd19c1c7980c7b03085a0ac4c6b45d161497`。
- [PR #24](https://github.com/zlwison-maker/RaceNext/pull/24)，merge commit `baa79c57550bd25eb9f8f2ddf407091c7b15aea1`。

## 4. Production Asset

V2 分享图片：

<https://racenext.run/share/racenext-home-v2-5x4.jpg>

2026-10-13 验证结果：

- HTTP `200`。
- Content-Type `image/jpeg`。
- 尺寸 `750 × 600`。

2026-10-13 的 Web / API 部署基线为 `2c83dd19c1c7980c7b03085a0ac4c6b45d161497`（历史快照）。2026-10-14 宁海 B2 发布线程确认服务器已经部署 `8b07c7bc7df7d9c889421690ea285a1eac01b92c`，生产 API 与三个组别真机 QA PASS；这是服务端 Canonical 更新，没有重新提交微信小程序客户端。PR #24 仅为客户端配置变更，不要求因其再次部署 Web / API。

## 5. QA

- Codex 自动化测试：`343/343 PASS`。
- Human Final Device QA：`PASS`。
- 好友分享、朋友圈分享、赛事详情分享：`PASS`。

## 6. Release Status

2026-10-13，1.0.1 已上传并提交微信审核，历史状态为 `SUBMITTED_FOR_REVIEW`。

**2026-10-14 最新状态：Human 已明确确认微信审核通过、1.0.1 正式发布。**

```text
RELEASED
```

此状态来自项目负责人的发布确认；尚未单独附微信公众平台发布记录、精确发布时间及发布流水号，不虚构这些信息。1.0.1 客户端发布与 2026-10-14 宁海 B2 服务端数据部署属于两条独立操作，不应混记。

## 7. Analytics Status

以下事件代码已实现：

- `home_share`
- `home_share_entry`
- `race_share`

`home_share` 表示分享回调触发，不证明用户完成发送；`home_share_entry` 表示带来源参数进入，不等于独立新用户；`race_share` 表示赛事详情分享回调。微信后台事件配置和实际采集仍需用真实结果验证。
