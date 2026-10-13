# RaceNext 微信小程序 1.0.1 Release Handoff

**Status: SUBMITTED_FOR_REVIEW**
**Updated: 2026-10-13**

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

Web / API 最近已确认部署基线为 `2c83dd19c1c7980c7b03085a0ac4c6b45d161497`。PR #24 仅包含小程序配置，不要求再次部署 Web / API。

## 5. QA

- Codex 自动化测试：`343/343 PASS`。
- Human Final Device QA：`PASS`。
- 好友分享、朋友圈分享、赛事详情分享：`PASS`。

## 6. Release Status

2026-10-13，版本已上传并提交微信审核，当前状态为：

```text
SUBMITTED_FOR_REVIEW
```

这不等于审核通过或正式发布完成。审核结果和正式发布时间由后续 Release Handoff 补充。

## 7. Analytics Status

以下事件代码已实现：

- `home_share`
- `home_share_entry`
- `race_share`

`home_share` 表示分享回调触发，不证明用户完成发送；`home_share_entry` 表示带来源参数进入，不等于独立新用户；`race_share` 表示赛事详情分享回调。微信后台事件配置和实际采集仍需用真实结果验证。
