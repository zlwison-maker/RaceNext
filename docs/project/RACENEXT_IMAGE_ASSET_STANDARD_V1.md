# RaceNext Image Asset Standard V1

**Status: CURRENT / FROZEN**

## 1. 图片目标

赛事图片不是装饰，而是赛事信息资产。图片应帮助用户快速识别赛事，并在需要时表达赛事人格、环境与氛围。

## 2. Cover Image

Cover Image 主要用于首页赛事列表、Web 列表、搜索、My Races 与推荐。它以赛事识别效率为第一目标，不承担大面积沉浸式视觉任务。

## 3. Hero Image

Hero Image 主要用于赛事详情首屏及其他大面积视觉场景。它以赛事人格、氛围与沉浸感为第一目标。

## 4. 图片来源优先级

1. 当届官方图片
2. 当届可信媒体图片
3. 上一届官方或可信赛事图片
4. 更早届次的高质量赛事图片
5. 城市或地貌兜底图片

## 5. 年份原则

图片优先与目标 Edition 一致。当届赛事尚未举行时，可以组合使用当届官方 KV 与最近一届真实赛事摄影。未知图片年份必须明确记录为 `null`，不能根据文件名或主观判断补写。

## 6. 赛事识别度

优先选择同时包含跑者、赛道以及城市、山地、海岸等赛事特征的图片。纯城市旅游图片不能长期代替赛事图片。

## 7. 图片质量

质量检查不能只看尺寸，还必须考虑分辨率、锐度、压缩、有效画质与构图。

- Cover 源图优先不低于 1600x900，最低尽量不低于 1200x675。
- Hero 尽量不低于 1920px 宽。
- 低于长期建议但足以满足 MVP 的图片可以使用，同时标记 `needs_higher_resolution`。
- 禁止为了达标而 AI 放大或机械放大。

质量状态采用以下固定词汇：

- `approved`：当前画质、尺寸与构图满足正式使用要求。
- `temporary`：当前可以作为短期占位，但内容、构图或来源仍需替换或确认。
- `needs_higher_resolution`：内容与构图已接受，可用于当前 MVP，但分辨率或有效画质低于长期建议，应在取得更高质量原图后替换。

## 8. Cover 比例

Cover 默认适配接近 16:9 的横向卡片。源图可以采用其他比例，但必须能够安全裁切。客户端默认使用 `aspectFill`；只有中心裁切会损坏主体、核心地标、官方赛事标识或整体构图时，才建立专用 focal point 或派生裁切。

## 9. Hero 构图

Hero 可以采用超宽官方 KV、大景或正式赛事摄影，不要求与 Cover 使用相同比例。

## 10. Detail Hero Viewport / 产品展示规范

Hero Asset 的原始比例与产品中的 Hero Viewport 是两个概念。原始资产可以保留官方发布时的任意合理比例；小程序 Detail 页面必须使用统一的产品显示容器，当前推荐约 `2:1` 的横向 viewport，以保持不同赛事详情页的首屏节奏一致。

- 普通赛事摄影默认使用 `aspectFill` 填满统一 viewport，裁切必须保留核心人物、赛事标识和关键地标。
- 小程序中的超宽官方 KV 优先使用 `aspectFill` 与经过审核的 focal point，使移动端 Hero 保持饱满；允许裁去非核心左右区域，但必须尽量保留赛事标识、人物与关键地标。
- 如果单纯的 viewport crop 无法保留核心识别元素，可以从原图建立经过审核的 Presentation derivative；它不能替代 Edition 的正式 `heroImage` 或覆盖 original。
- 原始图片永远保留；derived asset 不得覆盖 original asset。
- 不允许通过让页面高度跟随每一张原图变化来适配资产。
- 不允许拉伸、压缩变形、机械放大或 AI upscale。
- Web 与小程序可以采用不同的 UI viewport 和裁切方式，但必须共享同一 `heroImage` 资产语义，不建立分端赛事事实。

### Same Asset, Different Presentation

`Edition.heroImage` 是 Web 与小程序共同消费的 Edition 级正式资产。客户端可以根据各自界面采用不同的 viewport、crop、focal point、object position 与 rendering mode；这些差异属于 UI Presentation，不构成新的赛事事实或第二套图片资产。

- 不得创建 `miniProgramHeroImage`、`webHeroImage` 等端级正式字段。
- Web 可以使用更宽的 viewport，完整保留官方 KV；小程序可以为移动端可读性裁去非核心区域。
- 如确实需要 Derived Crop，必须标记为 Presentation derivative，并保持其与原始 `heroImage` 的来源关系。
- Original Asset 永远保留，任何客户端裁切都不得回写或覆盖原图。

## 11. 原图与派生资产

必须保留收到的原始文件。任何裁切遵循 `Original Asset -> Derived Cover / Hero Asset`，不得覆盖或破坏原图。

## 12. 来源与 Edition

每个正式图片资产都必须记录来源、目标 Edition、图片年份、尺寸、格式、文件大小、质量状态和使用权状态。目标 Edition 不等同于图片拍摄年份。

## 13. 版权与使用权

正式长期使用必须确认版权与 usage rights。“网络可下载”不代表允许商业使用。尚未取得使用权证据的资产必须明确标记并继续追踪。

## 14. 当前阶段

当前阶段由人工选择正式图片。自动化可以执行技术检查和候选整理，但不能替代人工选择。

## 15. 未来流程

未来演进方向为：`Source Registry -> Image Discovery -> Quality Gate -> Visual Ranking -> Candidate Images -> Human Review`。

## 16. AI 与自动化边界

AI 和自动化负责寻找、检查和排序候选，不负责最终定义赛事正式主图。

## 17. 多端 Single Source of Truth

Web 与小程序共享 Edition 的 `coverImage` 与 `heroImage`。终端只决定 crop、container 和 ViewModel，不维护 `miniProgramCoverImage`、`webCoverImage` 等平行事实字段。
