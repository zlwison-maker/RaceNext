DIFFICULTY_SYSTEM.md

Race Discovery 难度体系 V1.0

一、设计目标

本系统用于回答：

“这场比赛对我来说难不难？”

以及：

“我适合报名这场比赛吗？”

⸻

本系统服务于：

* 赛事详情页
* 赛事筛选
* AI赛事推荐
* 跑者能力匹配
* 赛事比较

⸻

二、核心原则

原则1

赛事距离 ≠ 赛事难度

错误示例：

30KM = L5

50KM = L7

⸻

因为：

30KM

1000m爬升

和

30KM

3000m爬升

难度完全不同。

⸻

原则2

难度必须量化

所有赛事最终得到：

Difficulty Score

范围：

0-100

⸻

同时映射：

Difficulty Level

L1-L10

⸻

原则3

难度是赛事属性

不是用户属性。

⸻

例如：

莫干山30KM

永远是同一个难度。

不会因为用户不同而变化。

⸻

用户能力单独计算。

后续推荐系统进行匹配。

⸻

三、系统结构

难度体系包含：

1. Difficulty Score
2. Difficulty Level
3. Difficulty Tag

⸻

关系：

Difficulty Score

↓

Difficulty Level

↓

Difficulty Tag

⸻

四、Difficulty Score

范围：

0-100

⸻

计算维度：

距离

爬升

技术路面

海拔

关门时间

夜跑

⸻

权重：

距离

40%

⸻

累计爬升

30%

⸻

技术路面

15%

⸻

海拔

10%

⸻

夜跑

5%

⸻

总计：

100%

⸻

五、Difficulty Level

Difficulty Score

映射：

L1-L10

⸻

L1

0-10

完全新手

⸻

L2

11-20

入门

⸻

L3

21-30

首个半马

⸻

L4

31-40

首马 / 首越预备

⸻

L5

41-50

首越

⸻

L6

51-60

进阶越野

⸻

L7

61-70

挑战级

⸻

L8

71-80

硬核级

⸻

L9

81-90

超长距离

⸻

L10

91-100

大神级

⸻

六、Difficulty Tag

用于快速筛选。

⸻

L1-L2

EASY

⸻

L3-L5

MODERATE

⸻

L6-L8

HARD

⸻

L9-L10

EXTREME

⸻

七、赛事难度参考

以下为参考。

并非绝对标准。

⸻

城市10KM

L1

EASY

⸻

半马

L3

MODERATE

⸻

普通全马

L4

MODERATE

⸻

越野20KM

500m爬升

L4

MODERATE

⸻

越野30KM

1000m爬升

L5

MODERATE

⸻

越野35KM

1500m爬升

L6

HARD

⸻

越野50KM

2500m爬升

L7

HARD

⸻

越野80KM

4000m爬升

L8

HARD

⸻

越野100KM

6000m爬升

L9

EXTREME

⸻

UTMB CCC

L9

EXTREME

⸻

UTMB

L10

EXTREME

⸻

八、跑者能力体系

注意：

跑者等级

≠

赛事难度

⸻

跑者等级：

BEGINNER

INTERMEDIATE

ADVANCED

ELITE

⸻

用于描述用户。

⸻

赛事难度：

L1-L10

用于描述比赛。

⸻

两者不能混用。

⸻

九、推荐匹配规则

推荐系统核心规则：

不要推荐明显超出能力范围的赛事。

⸻

示例：

BEGINNER

推荐：

L1-L4

⸻

INTERMEDIATE

推荐：

L4-L7

⸻

ADVANCED

推荐：

L6-L9

⸻

ELITE

推荐：

L8-L10

⸻

十、挑战推荐机制

允许推荐：

高于当前能力一级的赛事。

⸻

例如：

当前能力：

L5

⸻

推荐：

L5

L6

L7

⸻

但不要推荐：

L9

L10

⸻

避免用户受伤或弃赛。

⸻

十一、推荐分计算

未来推荐分：

0-100

⸻

组成：

能力匹配

40%

⸻

赛事难度匹配

25%

⸻

目标距离匹配

15%

⸻

地理位置匹配

10%

⸻

标签匹配

10%

⸻

总计：

100%

⸻

十二、未来能力评估体系

后续版本新增：

Runner Score

跑者能力评分

范围：

0-100

⸻

评估维度：

跑龄

半马PB

全马PB

历史赛事

历史越野距离

历史爬升

训练频率

⸻

最终形成：

Runner Score

VS

Difficulty Score

⸻

实现：

AI赛事顾问

⸻

十三、MVP阶段要求

MVP阶段暂不计算复杂公式。

每个赛事先人工标注：

difficultyLevel

difficultyScore

⸻

例如：

莫干山30KM

difficultyLevel: L5

difficultyScore: 48

⸻

柴古50KM

difficultyLevel: L7

difficultyScore: 72

⸻

UTMB

difficultyLevel: L10

difficultyScore: 98

⸻

后续随着赛事库增长。

再升级自动评分系统。

⸻

十四、最终目标

赛事数据库

↓

赛事难度体系

↓

跑者能力体系

↓

推荐匹配引擎

↓

AI赛事顾问

帮助用户回答：

“下一场比赛，我应该报什么？”
