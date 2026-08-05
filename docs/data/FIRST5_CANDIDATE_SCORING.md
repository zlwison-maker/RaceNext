# First5 Candidate Scoring

Last Updated: 2026-07-31

Source: `data/seed/future_top100_seed.json`

## 1. 评分模型说明

本报告基于当前 seed 数据生成候选评分。

重要说明：

- 评分是启发式代理评分，不是真实搜索量、真实讨论量或真实商业收入。
- 不编造缺失字段。
- 不生成 RaceNext 决策内容。
- 当前候选池保留全部 seed 赛事，低分赛事也保留，方便后续排除和复核。

新评分维度：

| Dimension | Max | Input Signals |
|---|---:|---|
| Runner Attention | 30 | 赛事类型、名称中的知名赛事信号、多组别、是否明显训练/亲子/线上活动 |
| Search Value | 25 | 赛事名明确度、马拉松/越野/168/100/50K 等搜索词、是否适合 SEO |
| Commercial Value | 20 | 是否是线下赛事，是否涉及住宿、交通、装备、训练计划、赛事周边 |
| Decision Complexity | 15 | 用户报名前需要判断的因素数量：距离、爬升、关门、装备、补给、天气、住宿交通、完赛能力 |
| Data Completeness | 10 | P0 / P1 当前字段完整度，仅作为可执行性参考，不主导 First5 选择 |
| Content Difficulty | 0 | 本轮不因内容生产难易度加分，避免因为“好做”而选错样板 |

## 2. 候选赛事排名

候选池规模：100

Top20 如下。

## 3. Top20 候选列表

### 1. 2026凯乐石贡嘎100冰川极限挑战赛

- Race ID: `future-zuicool-86332`
- 类型：ultra_trail
- 地点：四川 · 甘孜藏族自治州 · 泸定县
- 比赛日期：2026-09-26
- 总分：98
- 评分：Runner Attention 29 / Search Value 25 / Commercial Value 20 / Decision Complexity 15 / Data Completeness 9 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；用户报名决策复杂，需要 RaceNext 提供判断
- 最大问题：官方来源校验和路线信息仍需补充
- 适合作为 RaceNext 首批案例的原因：决策复杂度高，能验证 RaceNext 是否能帮助用户判断适不适合跑。
- 预计补全成本：low

### 2. 2026“阿尔1198”阿尔山马拉松

- Race ID: `future-zuicool-33844`
- 类型：marathon
- 地点：内蒙古 · 兴安盟 · 阿尔山市
- 比赛日期：2026-08-09
- 总分：83
- 评分：Runner Attention 25 / Search Value 25 / Commercial Value 18 / Decision Complexity 9 / Data Completeness 6 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：搜索入口明确，能验证赛事决策页的 SEO 流量价值。
- 预计补全成本：medium

### 3. 2026阿尔山马拉松

- Race ID: `future-runchina-1000420190`
- 类型：marathon
- 地点：内蒙古自治区 · 兴安盟
- 比赛日期：2026-08-09
- 总分：83
- 评分：Runner Attention 25 / Search Value 25 / Commercial Value 18 / Decision Complexity 9 / Data Completeness 6 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：搜索入口明确，能验证赛事决策页的 SEO 流量价值。
- 预计补全成本：medium

### 4. 2026吉木萨尔天山马拉松

- Race ID: `future-zuicool-70165`
- 类型：marathon
- 地点：新疆 · 昌吉回族自治州 · 吉木萨尔县
- 比赛日期：2026-08-16
- 总分：83
- 评分：Runner Attention 25 / Search Value 25 / Commercial Value 18 / Decision Complexity 9 / Data Completeness 6 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：搜索入口明确，能验证赛事决策页的 SEO 流量价值。
- 预计补全成本：medium

### 5. 耐克ACG 2026崇礼168超级越野赛

- Race ID: `future-zuicool-14601`
- 类型：trail
- 地点：河北 · 张家口市 · 崇礼区
- 比赛日期：2026-07-10
- 总分：82
- 评分：Runner Attention 24 / Search Value 20 / Commercial Value 20 / Decision Complexity 13 / Data Completeness 5 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；用户报名决策复杂，需要 RaceNext 提供判断
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：商业闭环自然，适合验证住宿、交通、装备和训练计划转化。
- 预计补全成本：high

### 6. 2026第一届阿尔山168超级越野赛

- Race ID: `future-zuicool-30550`
- 类型：trail
- 地点：内蒙古 · 兴安盟 · 阿尔山市
- 比赛日期：2026-07-10
- 总分：82
- 评分：Runner Attention 24 / Search Value 20 / Commercial Value 20 / Decision Complexity 13 / Data Completeness 5 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；用户报名决策复杂，需要 RaceNext 提供判断
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：商业闭环自然，适合验证住宿、交通、装备和训练计划转化。
- 预计补全成本：high

### 7. 2026多彩贵州马拉松超级联赛（第四站）暨“恒维地产”六盘水马拉松

- Race ID: `future-zuicool-59855`
- 类型：marathon
- 地点：贵州 · 六盘水市 · 钟山区
- 比赛日期：2026-07-19
- 总分：82
- 评分：Runner Attention 25 / Search Value 25 / Commercial Value 18 / Decision Complexity 8 / Data Completeness 6 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：搜索入口明确，能验证赛事决策页的 SEO 流量价值。
- 预计补全成本：medium

### 8. 2026斯巴达勇士越野周末-崇礼站

- Race ID: `future-zuicool-18644`
- 类型：trail
- 地点：河北 · 张家口市 · 崇礼区
- 比赛日期：2026-08-07
- 总分：82
- 评分：Runner Attention 24 / Search Value 20 / Commercial Value 20 / Decision Complexity 13 / Data Completeness 5 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；用户报名决策复杂，需要 RaceNext 提供判断
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：商业闭环自然，适合验证住宿、交通、装备和训练计划转化。
- 预计补全成本：high

### 9. 2026斯巴达勇士赛-崇礼站

- Race ID: `future-zuicool-84911`
- 类型：trail
- 地点：河北 · 张家口市 · 崇礼区
- 比赛日期：2026-08-15
- 总分：82
- 评分：Runner Attention 24 / Search Value 20 / Commercial Value 20 / Decision Complexity 13 / Data Completeness 5 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；用户报名决策复杂，需要 RaceNext 提供判断
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：商业闭环自然，适合验证住宿、交通、装备和训练计划转化。
- 预计补全成本：high

### 10. 户外特工第十一届崇礼翠云山50公里越野赛暨崇礼·她山径女子越野赛

- Race ID: `future-zuicool-75940`
- 类型：ultra_trail
- 地点：河北 · 张家口市 · 崇礼区
- 比赛日期：2026-08-16
- 总分：82
- 评分：Runner Attention 16 / Search Value 25 / Commercial Value 20 / Decision Complexity 15 / Data Completeness 6 / Content Difficulty 0
- 优势：赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；用户报名决策复杂，需要 RaceNext 提供判断；可验证越野赛事高决策成本场景
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：决策复杂度高，能验证 RaceNext 是否能帮助用户判断适不适合跑。
- 预计补全成本：medium

### 11. 2026青海同德第七届“宗日杯”高原越野跑挑战赛

- Race ID: `future-zuicool-58535`
- 类型：trail
- 地点：青海 · 海南藏族自治州 · 同德县
- 比赛日期：2026-07-12
- 总分：81
- 评分：Runner Attention 24 / Search Value 20 / Commercial Value 20 / Decision Complexity 12 / Data Completeness 5 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；可验证越野赛事高决策成本场景
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：商业闭环自然，适合验证住宿、交通、装备和训练计划转化。
- 预计补全成本：high

### 12. 奔跑贵阳・2026阳明问道100越野赛

- Race ID: `future-zuicool-13686`
- 类型：trail
- 地点：贵州 · 贵阳市 · 修文县
- 比赛日期：2026-07-25
- 总分：81
- 评分：Runner Attention 24 / Search Value 20 / Commercial Value 20 / Decision Complexity 12 / Data Completeness 5 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；可验证越野赛事高决策成本场景
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：商业闭环自然，适合验证住宿、交通、装备和训练计划转化。
- 预计补全成本：high

### 13. 奔跑贵阳·2026双龙城市生态越野跑

- Race ID: `future-zuicool-27830`
- 类型：trail
- 地点：贵州 · 贵阳市 · 贵州双龙航空港经济区
- 比赛日期：2026-08-16
- 总分：81
- 评分：Runner Attention 24 / Search Value 20 / Commercial Value 20 / Decision Complexity 12 / Data Completeness 5 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；可验证越野赛事高决策成本场景
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：商业闭环自然，适合验证住宿、交通、装备和训练计划转化。
- 预计补全成本：high

### 14. 2026FUGA西湖青芝坞隆冬跑山赛

- Race ID: `future-zuicool-24150`
- 类型：trail
- 地点：浙江 · 杭州市 · 西湖区
- 比赛日期：2026-12-12
- 总分：81
- 评分：Runner Attention 17 / Search Value 20 / Commercial Value 20 / Decision Complexity 15 / Data Completeness 9 / Content Difficulty 0
- 优势：赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；用户报名决策复杂，需要 RaceNext 提供判断；现有 P0/P1 字段基础较好
- 最大问题：越野爬升数据不足
- 适合作为 RaceNext 首批案例的原因：决策复杂度高，能验证 RaceNext 是否能帮助用户判断适不适合跑。
- 预计补全成本：low

### 15. 2026金沙茶马古道穿越赛

- Race ID: `future-zuicool-55206`
- 类型：ultra_trail
- 地点：贵州 · 毕节市 · 金沙县
- 比赛日期：2026-07-12
- 总分：80
- 评分：Runner Attention 19 / Search Value 17 / Commercial Value 20 / Decision Complexity 15 / Data Completeness 9 / Content Difficulty 0
- 优势：住宿、交通、装备或旅行商业场景较强；用户报名决策复杂，需要 RaceNext 提供判断；现有 P0/P1 字段基础较好；可验证越野赛事高决策成本场景
- 最大问题：官方来源校验和路线信息仍需补充
- 适合作为 RaceNext 首批案例的原因：决策复杂度高，能验证 RaceNext 是否能帮助用户判断适不适合跑。
- 预计补全成本：low

### 16. 2026穿越西乌旗草原“99号公路”美丽乡村跑暨西乌旗草原越野跑（草原王挑战赛）

- Race ID: `future-zuicool-35292`
- 类型：trail
- 地点：内蒙古 · 锡林郭勒盟 · 西乌珠穆沁旗
- 比赛日期：2026-07-11
- 总分：79
- 评分：Runner Attention 17 / Search Value 20 / Commercial Value 20 / Decision Complexity 14 / Data Completeness 8 / Content Difficulty 0
- 优势：赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；用户报名决策复杂，需要 RaceNext 提供判断；现有 P0/P1 字段基础较好
- 最大问题：越野爬升数据不足
- 适合作为 RaceNext 首批案例的原因：决策复杂度高，能验证 RaceNext 是否能帮助用户判断适不适合跑。
- 预计补全成本：low

### 17. 2026斯巴达勇士赛-长春站

- Race ID: `future-zuicool-64803`
- 类型：half_marathon
- 地点：吉林 · 长春市 · （详细地点后续公布）
- 比赛日期：2026-07-18
- 总分：76
- 评分：Runner Attention 25 / Search Value 20 / Commercial Value 14 / Decision Complexity 9 / Data Completeness 8 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；现有 P0/P1 字段基础较好
- 最大问题：官方来源校验和路线信息仍需补充
- 适合作为 RaceNext 首批案例的原因：具备一定样板价值，但进入 First5 前需要人工复核战略意义。
- 预计补全成本：low

### 18. 2026北京积分越野跑-香山站

- Race ID: `future-zuicool-35798`
- 类型：trail
- 地点：北京 · 海淀区 · 北京香山北门停车场
- 比赛日期：2026-07-19
- 总分：76
- 评分：Runner Attention 24 / Search Value 20 / Commercial Value 15 / Decision Complexity 12 / Data Completeness 5 / Content Difficulty 0
- 优势：跑者认知或赛事品牌信号较强；赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；可验证越野赛事高决策成本场景
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：具备一定样板价值，但进入 First5 前需要人工复核战略意义。
- 预计补全成本：high

### 19. 2026楚雄马拉松

- Race ID: `future-merged-楚雄马拉松-楚雄彝族自治州-2026`
- 类型：marathon
- 地点：云南省 · 楚雄彝族自治州 · 楚雄市
- 比赛日期：2026-08-02
- 总分：76
- 评分：Runner Attention 18 / Search Value 25 / Commercial Value 18 / Decision Complexity 9 / Data Completeness 6 / Content Difficulty 0
- 优势：赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强
- 最大问题：报名入口不足
- 适合作为 RaceNext 首批案例的原因：搜索入口明确，能验证赛事决策页的 SEO 流量价值。
- 预计补全成本：medium

### 20. 2026凯乐石莫干山跑山赛训练赛专场暨2026虞山追光跑

- Race ID: `future-zuicool-90146`
- 类型：trail
- 地点：江苏 · 苏州市 · 常熟市
- 比赛日期：2026-07-11
- 总分：75
- 评分：Runner Attention 17 / Search Value 20 / Commercial Value 15 / Decision Complexity 14 / Data Completeness 9 / Content Difficulty 0
- 优势：赛事名和类型具备明确搜索价值；住宿、交通、装备或旅行商业场景较强；用户报名决策复杂，需要 RaceNext 提供判断；现有 P0/P1 字段基础较好
- 最大问题：官方来源校验和路线信息仍需补充
- 适合作为 RaceNext 首批案例的原因：决策复杂度高，能验证 RaceNext 是否能帮助用户判断适不适合跑。
- 预计补全成本：low
