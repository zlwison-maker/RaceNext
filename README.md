# RaceNext（下一场）

帮跑者找到最适合的下一场比赛。

## Current Status

Current Phase:

Phase 2｜Launch

Current Step:

Step 2.1｜MVP 最后一轮产品 Review

## What RaceNext Does

RaceNext 是一个面向跑者的赛事决策平台，当前 MVP 聚焦赛事日历、赛事推荐和报名跳转。

项目通过本地合并样本数据展示赛事卡片，帮助用户按类型、月份、地区、难度和报名状态筛选比赛。

推荐功能当前是规则驱动，基于现有赛事数据给出匹配分数、推荐理由和风险提示。

后续方向包括更完整的数据源治理、AI 推荐、用户决策辅助和商业化服务，但这些都不是当前 Step 的执行目标。

## Quick Start

```bash
npm install
npm run dev
npm run build
```

访问本地开发服务：

```text
http://localhost:3000
```

运行现有 data pipeline：

```bash
npm run data:connectors:poc
```

## Repository Hygiene

### 微信开发者工具

始终打开 repository root，不要直接导入 `miniprogram/`。正式 `project.config.json` 位于仓库根目录；直接导入子目录会生成本地配置，并可能产生或使用 ignored JavaScript 编译产物，导致 TypeScript 源码与实际运行代码不一致。

### Release Worktree

- Release worktree 只能创建在主仓库目录之外，禁止创建在 `RaceNext/` 内部。
- 每个 release 只保留一个 worktree，并锁定明确的 release commit。
- 微信开发者工具必须打开该 worktree 的 repository root。
- Production Release PASS 后，先归档必要 QA evidence，再使用 `git worktree remove` 移除并执行 `git worktree prune`。
- 主开发目录不得长期承担 release checkout。

## Project Roadmap

[docs/strategy/ROADMAP.md](docs/strategy/ROADMAP.md) 是 RaceNext 当前最高层规划文档，也是项目路线、阶段、Step 和优先级的最高入口。

## Project Context

开始产品或功能开发前，请先阅读 [RaceNext Project Context](docs/project/README.md)。数据技术架构从 [RaceNext Data Foundation V1](docs/data/RACENEXT_DATA_FOUNDATION_V1.md) 进入。

## Key Documents

### Strategy

- [docs/strategy/ROADMAP.md](docs/strategy/ROADMAP.md)
- [docs/strategy/RACENEXT_PRODUCT_STRATEGY_V2.md](docs/strategy/RACENEXT_PRODUCT_STRATEGY_V2.md)
- `docs/PRODUCT_FOUNDATION.md` - Not Found

### Product

- [docs/product/PROJECT_STRUCTURE.md](docs/product/PROJECT_STRUCTURE.md)
- [docs/product/RECOMMENDATION_LOGIC.md](docs/product/RECOMMENDATION_LOGIC.md)

### Data Architecture

- [RaceNext Data Foundation V1](docs/data/RACENEXT_DATA_FOUNDATION_V1.md) — 当前数据架构、状态、公开读取层与 Deferred 项总览
- [docs/data/RACE_SCHEMA_V1.md](docs/data/RACE_SCHEMA_V1.md)
- [docs/data/EVENT_MODEL_V1.md](docs/data/EVENT_MODEL_V1.md)
- [docs/data/DIFFICULTY_SYSTEM.md](docs/data/DIFFICULTY_SYSTEM.md)
- [docs/data/TAG_SYSTEM.md](docs/data/TAG_SYSTEM.md)
- [docs/data/DATA_SOURCE_POC.md](docs/data/DATA_SOURCE_POC.md)

### Source Governance

- [docs/data/SOURCE_PRIORITY_V1.md](docs/data/SOURCE_PRIORITY_V1.md)
- [docs/data/SOURCE_REGISTRY.md](docs/data/SOURCE_REGISTRY.md)
- [docs/data/SOURCE_COVERAGE_MATRIX_V1.md](docs/data/SOURCE_COVERAGE_MATRIX_V1.md)
- [docs/data/FIELD_OWNERSHIP.md](docs/data/FIELD_OWNERSHIP.md)
- [docs/data/FIELD_PRIORITY_MATRIX.md](docs/data/FIELD_PRIORITY_MATRIX.md)
- [docs/data/MERGE_RULES.md](docs/data/MERGE_RULES.md)
- [docs/data/SYNC_POLICY.md](docs/data/SYNC_POLICY.md)

### Engineering

- [docs/engineering/CONNECTOR_POC_V1.md](docs/engineering/CONNECTOR_POC_V1.md)
- [docs/engineering/TOP100_MVP_UI_V1.md](docs/engineering/TOP100_MVP_UI_V1.md)
- [docs/engineering/IMPLEMENTATION_NOTES.md](docs/engineering/IMPLEMENTATION_NOTES.md)

### Research

- [docs/research/REPORT_RUNCHINA.md](docs/research/REPORT_RUNCHINA.md)
- [docs/research/REPORT_ZUICOOL.md](docs/research/REPORT_ZUICOOL.md)

## Development Principles

- 用户价值优先
- 完成比完美重要
- 每次只推进一个 Step
- 完成后 Review / Freeze / 再进入下一步
- 不为技术而技术
- 不为数据而抓数据
- 不为 AI 而做 AI

## Current Next Action

下一步是：

Step 2.1｜MVP 最后一轮产品 Review

不是：

- 新增 Connector
- 接 Supabase
- 做 AI 推荐
- 做商业化
- 继续重构数据架构
