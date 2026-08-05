# RaceNext 数据源 POC

生成时间：2026-06-26T09:52:42.444Z

pipelineVersion：data-poc-v0.3

## 1. 本轮验证目标

本轮只验证真实赛事数据源 POC，不做全量抓取，不接数据库，不接定时任务，不绕过登录或验证码。验证重点：

- 数据源是否可公开访问和低频抓取
- 字段是否足够支撑 RaceNext MVP 赛事库
- 原始字段是否能标准化为当前 Race 数据模型
- 多源去重是否可用规则完成
- 是否能支撑后续 Top100 / Top200 赛事库建设

## 2. 数据源评分体系

### 中国马拉松信息平台 / 田协

- 数据完整度：1/5
- 更新频率：4/5
- 官方可信度：5/5
- 抓取稳定性：1/5
- 是否需要 JS 渲染：未知
- 是否存在公开 API：未知
- 是否需要登录：未知
- 反爬风险：高
- 商业可持续性：3/5
- MVP 推荐等级：D
- 推荐用途：官方赛事基准源；用于认证赛事、赛事名录、权威校验
- 建议更新频率：手动确认

### 最酷 Zuicool

- 数据完整度：2/5
- 更新频率：4/5
- 官方可信度：3/5
- 抓取稳定性：4/5
- 是否需要 JS 渲染：否
- 是否存在公开 API：未知
- 是否需要登录：否
- 反爬风险：中
- 商业可持续性：4/5
- MVP 推荐等级：B
- 推荐用途：公开网页补充源；用于赛事名称、链接、部分距离信息验证
- 建议更新频率：周更

### ITRA

- 数据完整度：1/5
- 更新频率：4/5
- 官方可信度：5/5
- 抓取稳定性：1/5
- 是否需要 JS 渲染：是
- 是否存在公开 API：未知
- 是否需要登录：未知
- 反爬风险：中
- 商业可持续性：3/5
- MVP 推荐等级：D
- 推荐用途：越野难度和积分体系源；用于未来越野赛事难度模型
- 建议更新频率：暂不自动更新

## 3. 每个数据源抓取结果

### 中国马拉松信息平台 / 田协

- 抓取样本数：0
- 运行耗时：28594ms
- 失败原因分级：HTTP 访问失败、反爬限制、页面需要 JS 渲染、页面结构变化、找不到稳定列表页
- 候选页面：
  - https://www.runchina.org.cn/#/race/v/list
  - https://www.runchina.org.cn
  - https://www.runchina.org.cn/portal.php?mod=list&catid=2
  - https://www.runchina.org.cn/portal.php?mod=list&catid=3
  - https://www.athletics.org.cn
  - https://www.athletics.org.cn/marathon/
- 可访问页面：
  - https://www.athletics.org.cn/
- 失败页面：
  - https://www.runchina.org.cn/#/race/v/list：HTTP 567 / Tencent Cloud EdgeOne access restricted
  - https://www.runchina.org.cn：HTTP 567 / Tencent Cloud EdgeOne access restricted
  - https://www.runchina.org.cn/portal.php?mod=list&catid=2：fetch failed
  - https://www.runchina.org.cn/portal.php?mod=list&catid=3：fetch failed
  - https://www.athletics.org.cn/marathon/：fetch failed
- 成功 / 失败原因：未解析到可用样本；失败原因见上方分级。
- 探索备注：未从候选公开页面解析到可用赛事条目，可能需要 JS 渲染、页面结构变化或公开列表入口调整。
- 最终使用页面：https://www.athletics.org.cn/

### 最酷 Zuicool

- 抓取样本数：20
- 运行耗时：1927ms
- 失败原因分级：无
- 候选页面：
  - https://www.zuicool.com
  - https://www.zuicool.com/event
  - https://www.zuicool.com/events
  - https://www.zuicool.com/marathon
  - https://www.zuicool.com/trail
- 可访问页面：
  - https://zuicool.com/
- 失败页面：
  - 无
- 成功 / 失败原因：可从公开页面解析到赛事相关条目，但字段完整度仍需人工核验。
- 探索备注：无
- 最终使用页面：https://zuicool.com/

### ITRA

- 抓取样本数：0
- 运行耗时：12228ms
- 失败原因分级：HTTP 访问失败、页面需要 JS 渲染
- 候选页面：
  - https://itra.run
  - https://itra.run/Races/RaceCalendar
  - https://itra.run/Races
  - https://itra.run/Calendar
- 可访问页面：
  - https://itra.run/
  - https://itra.run/Races/RaceCalendar
- 失败页面：
  - https://itra.run/Races：HTTP 404
  - https://itra.run/Calendar：HTTP 404
- 成功 / 失败原因：未解析到可用样本；失败原因见上方分级。
- 探索备注：未从 ITRA 候选公开页面解析到赛事样本，Race Calendar 可能需要 JS/API 渲染。
- 最终使用页面：https://itra.run/

## 4. 字段覆盖与来源说明

- rawName: 20/20；主要来源：zuicool；分源覆盖：runchina 0/0，zuicool 20/20，itra 0/0；缺失原因：部分公开页面提供该字段，当前解析可覆盖一部分样本。；人工补全：暂不强制补全，保留 rawData 供后续解析。
- rawDate: 0/20；主要来源：无；分源覆盖：runchina 0/0，zuicool 0/20，itra 0/0；缺失原因：字段未出现在已解析的公开列表文本中，可能需要详情页、JS/API 或人工补全。；人工补全：进入详情页或人工校验赛事公告。
- rawLocation: 0/20；主要来源：无；分源覆盖：runchina 0/0，zuicool 0/20，itra 0/0；缺失原因：字段未出现在已解析的公开列表文本中，可能需要详情页、JS/API 或人工补全。；人工补全：暂不强制补全，保留 rawData 供后续解析。
- rawCity: 0/20；主要来源：无；分源覆盖：runchina 0/0，zuicool 0/20，itra 0/0；缺失原因：字段未出现在已解析的公开列表文本中，可能需要详情页、JS/API 或人工补全。；人工补全：进入详情页或人工校验赛事公告。
- rawProvince: 0/20；主要来源：无；分源覆盖：runchina 0/0，zuicool 0/20，itra 0/0；缺失原因：字段未出现在已解析的公开列表文本中，可能需要详情页、JS/API 或人工补全。；人工补全：进入详情页或人工校验赛事公告。
- rawType: 0/20；主要来源：无；分源覆盖：runchina 0/0，zuicool 0/20，itra 0/0；缺失原因：页面没有提供稳定结构化字段，或当前解析规则未覆盖。；人工补全：暂不强制补全，保留 rawData 供后续解析。
- rawDistance: 9/20；主要来源：zuicool；分源覆盖：runchina 0/0，zuicool 9/20，itra 0/0；缺失原因：部分公开页面提供该字段，当前解析可覆盖一部分样本。；人工补全：暂不强制补全，保留 rawData 供后续解析。
- rawElevationGain: 0/20；主要来源：无；分源覆盖：runchina 0/0，zuicool 0/20，itra 0/0；缺失原因：页面没有提供稳定结构化字段，或当前解析规则未覆盖。；人工补全：越野赛事需人工或 ITRA/官方详情补充爬升。
- rawRegistrationStatus: 0/20；主要来源：无；分源覆盖：runchina 0/0，zuicool 0/20，itra 0/0；缺失原因：字段未出现在已解析的公开列表文本中，可能需要详情页、JS/API 或人工补全。；人工补全：需要结合报名页状态或官方公告人工确认。
- rawRegistrationUrl: 0/20；主要来源：无；分源覆盖：runchina 0/0，zuicool 0/20，itra 0/0；缺失原因：当前仅解析到列表链接或锚文本，未能稳定区分官方链接和报名链接。；人工补全：需要人工区分官网链接与报名平台链接。
- rawOfficialUrl: 0/20；主要来源：无；分源覆盖：runchina 0/0，zuicool 0/20，itra 0/0；缺失原因：当前仅解析到列表链接或锚文本，未能稳定区分官方链接和报名链接。；人工补全：需要人工区分官网链接与报名平台链接。

## 5. 数据质量评估

- unverified: 20

## 6. 去重结果

- 原始数据总数：20
- 去重后数量：20
- 疑似重复组数：0
- 直接重复赛事：0
- duplicateGroups：0

- 未发现直接重复赛事。

- 未发现疑似重复赛事。

## 7. Canonical Merge 结果

- normalized race 数量：20
- canonical race 数量：20
- 自动合并组数：0
- 自动合并赛事数：0
- 待人工 review 数量：0

### Merge 规则说明

- exact duplicate group 自动合并为一个 CanonicalRecord。
- possible duplicate 只进入 mergeReviewList，不自动合并。
- 字段选择优先 sourcePriority 高的数据源；sourcePriority 相同时优先非空字段。
- URL 字段单独处理：registrationUrl 优先报名平台类来源，officialUrl 优先官方类来源。
- categories 按 distanceKm 合并去重。
- aliases 保留不同 source 的标准化名称。

### 字段可信度说明

- fieldSources 记录 canonical 字段来自哪个 source，多个来源参与时标记为 merged，缺失或占位时标记为 placeholder。
- confidence 是 normalized race 的 0-100 简单可信度评分，基于名称、日期、城市、距离、链接和权威源加权。
- missingFields 记录当前 normalized/canonical 仍缺失的关键字段，后续由人工、详情页或独立 enrichment engine 补齐。

## 8. 后续是否建议继续接入

- 中国马拉松信息平台 / 田协：暂不建议继续自动接入，先人工确认公开入口、API 或白名单访问方式。
- 最酷 Zuicool：建议作为补充数据源继续验证。
- ITRA：暂不建议继续自动接入，先人工确认公开入口、API 或白名单访问方式。

## 9. 下一步建议

- 继续保持每源小样本验证，先补齐稳定列表页 URL 和字段映射，再考虑 Top100 / Top200。
- 对公开列表页无法直接解析的源，优先确认是否存在官方公开 API、RSS、站点地图或静态 HTML 列表。
- 对 ITRA 这类越野数据源，重点验证距离、累计爬升、积分/难度字段，不建议在 MVP 阶段触碰登录会员数据。
- 去重规则下一步应加入人工 review 队列：同名同城同年但日期不同的赛事先标记 possibleDuplicate，不自动合并。

## 10. 输出文件

- Raw samples:
  - `data/raw/runchina_sample.json`
  - `data/raw/zuicool_sample.json`
  - `data/raw/itra_sample.json`
- Normalized sample: `data/normalized/races_sample.json`
- Canonical sample: `data/normalized/canonical_races_sample.json`
- JSON report: `data/normalized/data_source_poc_report.json`
