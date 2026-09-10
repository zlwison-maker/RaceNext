# RaceNext 微信小程序

原生微信小程序 + TypeScript。当前实现首页 V1、Detail V1.1 与“我的”占位页，不使用云开发、登录、数据库、状态管理库或跨端框架。

## 本地开发

1. 在 RaceNext 仓库根目录运行 `npm install`，安装类型检查依赖。微信开发者工具无需执行“构建 npm”。
2. 微信开发者工具导入 **RaceNext 仓库根目录**。根目录 `project.config.json` 通过 `miniprogramRoot` 指向 `miniprogram/`。
3. 正式 AppID 只保留在 Git 忽略的 `project.private.config.json` 中。不要在客户端代码中保存 AppSecret、Token 或服务端密钥。
4. 点击编译，检查首页真实赛事、封面图、Loading/Error 状态和底部 TabBar。

## 页面

- `pages/index/index`：首页 V1。通过 `getRaces()` 读取 Public API，展示赛事封面、名称、日期和城市。
- `pages/races/detail/index`：Detail V1.1。通过 `editionId` 调用 `getRace()`，展示统一 Hero 与 Race Facts；多组别赛事支持 Category 切换。
- `pages/mine/index`：“我的”占位页，仅用于建立正式双 Tab 结构，不包含用户功能。

## 数据边界

Web 位于根目录 `app/`，Public API 位于 `app/api/races/`，小程序源码位于 `miniprogram/`。

`types/races.ts` 使用 `export type` 复用根目录 `types/publicRaceGraph.ts`。类型在编译时移除，不复制 Public DTO、Canonical Race Graph 或赛事 JSON。首页只建立展示 ViewModel，用于压缩地点显示和跟踪图片加载失败。

- `services/api.ts`：薄 `wx.request` GET 封装。
- `services/races.ts`：提供 `getRaces()` 与 `getRace(editionId)`。
- `utils/config.ts`：集中管理 API Base URL；当前开发和生产均使用 `https://racenext.run`。

公众平台“小程序 → 开发管理 → 开发设置 → 服务器域名”需要将 `https://racenext.run` 配置为 request 合法域名，不附加 API 路径。工程保持 `urlCheck: true`，不使用 localhost、代理或关闭校验绕过正式规则。

## 品牌资源

首页使用 `assets/brand/next-logo-mini-header-black.png`。它复制自已冻结的 `brand/racenext/mini-program/header/next-logo-mini-header-black-20px@3x.png`，按品牌规范以 20px 显示高度使用，没有修改 Logo 结构、比例或颜色。

## 检查

```bash
npm run typecheck:miniprogram
npm run typecheck
npm test
npm run build
```
