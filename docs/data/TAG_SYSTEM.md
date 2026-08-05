TAG_SYSTEM.md

Race Discovery 标签体系 V1.0

一、设计目标

标签体系服务于：

1. 赛事筛选
2. AI赛事推荐
3. SEO页面生成
4. 相似赛事推荐
5. 用户画像匹配

标签不是为了描述赛事。

标签是为了帮助用户完成决策。

核心问题：

“什么比赛适合我？”

⸻

二、设计原则

原则1

所有标签必须来自白名单。

禁止：

AI自由生成标签。

禁止：

人工随意新增标签。

⸻

原则2

标签必须服务于决策。

保留：

首马推荐

删除：

赛事历史悠久

因为用户不会因为这个完成报名决策。

⸻

原则3

优先用户语言。

例如：

保留：

首越推荐

不保留：

Trail Beginner Level

⸻

三、标签结构

标签分为：

一级标签（系统分类）

二级标签（用户决策）

⸻

四、一级标签

一级标签主要用于筛选器。

⸻

赛事类型

MARATHON

HALF_MARATHON

ROAD_RUNNING

TRAIL

ULTRA_TRAIL

UTMB

TRIATHLON

⸻

地域

EAST_CHINA

SOUTH_CHINA

NORTH_CHINA

CENTRAL_CHINA

SOUTHWEST_CHINA

NORTHWEST_CHINA

NORTHEAST_CHINA

HONGKONG_MACAO_TAIWAN

ASIA

EUROPE

NORTH_AMERICA

OVERSEAS

⸻

季节

SPRING

SUMMER

AUTUMN

WINTER

⸻

五、二级标签

二级标签用于推荐和决策。

⸻

A. 新手友好标签

FIRST_5K

FIRST_10K

FIRST_HALF

FIRST_MARATHON

FIRST_TRAIL

FIRST_50K

⸻

说明：

适合作为：

第一次参加对应赛事。

⸻

B. 能力进阶标签

BEGINNER

INTERMEDIATE

ADVANCED

ELITE

⸻

说明：

推荐系统主要使用。

⸻

C. 赛道属性标签

CITY_ROUTE

MOUNTAIN_ROUTE

FOREST_ROUTE

SEA_ROUTE

LAKE_ROUTE

DESERT_ROUTE

GRASSLAND_ROUTE

STAIRS_HEAVY

TECHNICAL_ROUTE

FAST_ROUTE

⸻

说明：

用户非常关心赛道特点。

⸻

D. 风景标签

CITY_VIEW

MOUNTAIN_VIEW

FOREST_VIEW

SEA_VIEW

LAKE_VIEW

SNOW_MOUNTAIN_VIEW

SUNRISE_VIEW

SUNSET_VIEW

⸻

说明：

风景是越野跑重要决策因素。

⸻

E. 难度标签

EASY

MODERATE

HARD

EXTREME

⸻

说明：

对应 Difficulty System。

用于快速筛选。

⸻

F. 交通标签

HIGH_SPEED_RAIL_FRIENDLY

AIRPORT_FRIENDLY

SELF_DRIVE_FRIENDLY

TRANSPORT_CHALLENGE

⸻

说明：

特别适用于外地参赛。

⸻

G. 赛事属性标签

POPULAR_RACE

CLASSIC_RACE

UTMB_QUALIFIER

ITRA_CERTIFIED

WORLD_CLASS_EVENT

HOT_RACE

LOTTERY_REQUIRED

⸻

说明：

用于赛事价值判断。

⸻

H. 氛围标签

CROWD_FAVORITE

FAMILY_FRIENDLY

HARDCORE_RUNNERS

SOCIAL_FRIENDLY

INTERNATIONAL_FIELD

⸻

说明：

帮助用户感知赛事氛围。

⸻

I. 环境标签

HIGH_ALTITUDE

HOT_WEATHER

COLD_WEATHER

HUMID_WEATHER

SUMMER_ESCAPE

⸻

说明：

对越野赛事特别重要。

⸻

六、推荐系统核心标签

以下标签优先级最高。

未来推荐系统主要参考。

FIRST_HALF

FIRST_MARATHON

FIRST_TRAIL

FIRST_50K

BEGINNER

INTERMEDIATE

ADVANCED

ELITE

EASY

MODERATE

HARD

EXTREME

POPULAR_RACE

UTMB_QUALIFIER

HIGH_SPEED_RAIL_FRIENDLY

AIRPORT_FRIENDLY

CITY_ROUTE

MOUNTAIN_ROUTE

TECHNICAL_ROUTE

⸻

七、SEO核心标签

未来自动生成SEO页面。

例如：

⸻

首马推荐

FIRST_MARATHON

生成页面：

适合首马跑者的马拉松赛事推荐

⸻

首越推荐

FIRST_TRAIL

生成页面：

适合新手的越野赛事推荐

⸻

UTMB积分赛

UTMB_QUALIFIER

生成页面：

中国UTMB积分赛事大全

⸻

江浙沪赛事

EAST_CHINA

生成页面：

江浙沪越野赛事推荐

⸻

八、标签使用规范

每个赛事：

建议：

5-10个标签

最多：

15个标签

禁止：

超过20个标签

⸻

示例

柴古唐斯括苍越野赛

[
“TRAIL”,
“EAST_CHINA”,
“AUTUMN”,
“ADVANCED”,
“MOUNTAIN_ROUTE”,
“TECHNICAL_ROUTE”,
“MOUNTAIN_VIEW”,
“POPULAR_RACE”,
“HARDCORE_RUNNERS”,
“HARD”
]

⸻

莫干山越野赛

[
“TRAIL”,
“EAST_CHINA”,
“AUTUMN”,
“FIRST_TRAIL”,
“INTERMEDIATE”,
“FOREST_ROUTE”,
“FOREST_VIEW”,
“POPULAR_RACE”,
“HIGH_SPEED_RAIL_FRIENDLY”,
“MODERATE”
]

⸻

九、未来演进原则

新增标签必须满足：

1. 能帮助用户做决策
2. 能提升推荐准确率
3. 能产生SEO价值

否则不新增。

避免标签无限膨胀。

⸻

十、最终目标

标签体系最终服务于：

赛事数据库

↓

赛事筛选

↓

赛事比较

↓

AI赛事推荐

↓

AI赛事顾问

帮助用户找到：

最适合自己的下一场比赛。
