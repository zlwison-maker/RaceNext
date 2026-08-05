# Recommendation Rule Audit

Date: 2026-07-07

Scope:

- `components/RecommendationForm.tsx`
- `lib/raceAdapter.ts`
- `app/recommend/page.tsx`
- Related recommendation entry points: `components/HomeTabs.tsx`

This audit only describes current behavior. It does not change code.

## 1. 用户输入项

The active recommendation UI is `components/RecommendationForm.tsx`.

### 当前阶段

UI options:

- 不限: `any`
- 新手: `beginner`
- 跑过半马: `half_marathon`
- 跑过全马: `marathon`
- 跑过越野: `trail`
- 高阶跑者: `advanced`

Default: `any`.

Participation:

- Participates in target-race option filtering in `getGoalOptionsForStage()`.
- Participates in recommendation scoring through `getStageFitScore()`.
- Participates in recommendation reasons in a few specific branches, mainly `half_marathon` with `first_marathon`, and first-trail intent.
- It does not hard-filter candidates by itself.

Effect type:

- UI filtering for legal target goals.
- Score add/subtract through stage-fit score.
- Some reason text.

### 目标赛事

UI options:

- 不限: `any`
- 首个半马: `first_half`
- 首个全马: `first_marathon`
- 首个越野: `first_trail`
- 挑战 50K: `challenge_50k`
- 挑战 100K: `challenge_100k`
- 风景越野: `scenic_trail`

Default: `any`.

Stage-to-goal option rules:

- 不限: all target goals
- 新手: 不限 / 首个半马 / 风景越野
- 跑过半马: 不限 / 首个全马 / 首个越野 / 风景越野
- 跑过全马: 不限 / 首个越野 / 挑战 50K / 挑战 100K / 风景越野
- 跑过越野: 不限 / 挑战 50K / 挑战 100K / 风景越野
- 高阶跑者: all target goals

Default: `any`.

Participation:

- Participates in UI distance locking through `getLockedTargetDistance()`.
- Participates in recommendation scoring through `getTypeScore()`, `getStageFitScore()`, and `getCompletenessScore()`.
- Participates in recommendation reasons and risk tips.
- It does not hard-filter candidates by itself.

Effect type:

- UI state control.
- Score add/subtract.
- Reason generation.

### 目标距离

UI options when unlocked:

- 不限: `any`
- ≤30KM: `lte30`
- 30KM - 50KM: `30_50`
- 50KM - 100KM: `50_100`
- ＞100KM: `gt100`

Default: `any`.

Locking rules:

- 首个半马 -> `lte30`
- 首个全马 -> `30_50`
- 挑战 50K -> `50_100`
- 挑战 100K -> `gt100`
- 首个越野, 风景越野, 不限 keep the distance selector visible.

Participation:

- Participates in recommendation scoring through `getDistanceScoreForRace()`.
- If `targetDistance = any`, the engine uses `getGeneralDistanceCompletenessScore()` instead of distance matching.
- Participates in recommendation reasons through `isDistanceCloseToTarget()`.
- It does not hard-filter candidates.

Effect type:

- Score add/subtract.
- Some reason text.

### 所在地区

UI options:

- 不限: `all`
- 华东: `east_china`
- 华南: `south_china`
- 华北: `north_china`
- 西南: `southwest_china`
- 西北: `northwest_china`
- 东北: `northeast_china`
- 华中: `central_china`

Default: `all`.

Participation:

- Participates in recommendation scoring through `getRegionScore()`.
- Participates in recommendation reasons only when a specific region is selected and the race region matches.
- It does not hard-filter candidates.

Effect type:

- Score add/subtract.
- Reason generation.

### 报名状态

UI options:

- 优先可报名: `actionable`
- 不限: `any`

Default: `actionable`.

Participation:

- Participates in recommendation scoring through `getRegistrationScore()`.
- Does not hard-filter by registration status.
- The candidate pool has already removed closed and finished races before scoring.

Effect type:

- Score add/subtract only.

### Other Inputs

No active extra input is present in `RecommendationForm.tsx`.

There is an older `types/runner.ts` and a legacy `lib/recommend.ts`, but the current recommendation Tab does not import or use `lib/recommend.ts`.

## 2. 推荐候选池

Data source:

- `data/merged/merged_sample.json`
- Loaded by `lib/raceAdapter.ts`
- Converted to `RaceCardViewModel` through `getRaceCards()`

Entry points:

- `/recommend`: `app/recommend/page.tsx` calls `getRaceCards()` and passes the result to `RecommendationForm`.
- `/`: `components/HomeTabs.tsx` also renders `RecommendationForm` with the same race cards.

Candidate generation:

1. `getRaceCards()` maps all merged sample records to `RaceCardViewModel`.
2. `getRecommendationCards()` filters with `isValuableFutureRace()`.
3. Remaining candidates are scored and sorted.

Current sample counts from the current engine on 2026-07-07:

- Raw merged records: 40
- Race cards: 40
- Recommendation candidates after `isValuableFutureRace()`: 9
- Candidate registration statuses:
  - `unknown`: 6
  - `registration_open`: 3
- Candidates with missing date: 0

Filtering rules:

- 已结束 and 已截止 are removed:
  - `registrationStatus === closed` -> excluded
  - `registrationStatus === finished` -> excluded
- If `raceDate` exists:
  - Past races are excluded.
- If `raceDate` is missing:
  - Only `registration_open`, `upcoming`, or `lottery` can remain.
- Registration-unavailable races are not all removed. `unknown` can remain if the race date is future.
- Date-missing races are not globally removed, but must have an actionable-like status to remain.

## 3. 推荐评分规则

`matchScore` is calculated in `scoreRecommendation()`.

Formula:

```text
matchScore =
  getTypeScore()
  + distanceScore
  + getStageFitScore()
  + getRegionScore()
  + getRegistrationScore()
  + getCompletenessScore()
```

Then:

```text
matchScore = round(score)
matchScore = clamp(matchScore, 0, 100)
```

There is no global base score. The effective score starts at zero and accumulates dimension scores.

### 目标赛事 / Type Score

Function: `getTypeScore()`

- `goal = any`
  - `other`: +16
  - all other race types: +22
- `first_half`
  - `half_marathon`: +30
  - `marathon`: +12
  - other: +0
- `first_marathon`
  - `marathon`: +30
  - `half_marathon`: +12
  - other: +0
- `first_trail`, `challenge_50k`, `challenge_100k`, `scenic_trail`
  - `trail` or `ultra_trail`: +30
  - other: +0

Important: This is not a hard filter. A non-matching type can still appear if other dimensions score enough, or if fallback returns weak matches.

### 目标距离 / Distance Score

Functions:

- `getDistanceScoreForRace()`
- `getDistanceScore()`
- `isDistanceInTargetRange()`

If `targetDistance = any`, the engine uses `getGeneralDistanceCompletenessScore()`:

- `distancesText === 距离待更新`: +8
- `categories.length >= 2`: +22
- otherwise: +18

If a distance range is selected, all category distances are checked:

- If any category falls inside the target range: +25
- Otherwise score is based on closest category distance:
  - `lte30`
    - `distance <= 30`: +25
    - `distance <= 50`: +16
    - `distance <= 100`: +7
    - otherwise: +0
  - `30_50`
    - `distance > 30 && distance <= 50`: +25
    - `distance > 20 && distance <= 60`: +16
    - `distance <= 100`: +7
    - otherwise: +0
  - `50_100`
    - `distance > 50 && distance <= 100`: +25
    - `distance > 40 && distance <= 120`: +16
    - `distance >= 30`: +7
    - otherwise: +0
  - `gt100`
    - `distance > 100`: +25
    - `distance >= 80`: +16
    - `distance >= 50`: +7
    - otherwise: +0

If no category distance exists: +10.

### 当前阶段 / Stage Fit Score

Function: `getStageFitScore()`

- `goal = challenge_100k`
  - max distance >= 90 and high challenge: +15
  - max distance >= 50: +8
  - otherwise: +0
- `goal = challenge_50k`
  - max distance >= 40 and < 100: +15
  - max distance >= 100: +6
  - otherwise: +4
- `stage = any` and `goal = any`
  - difficulty unknown: +6
  - high challenge: +8
  - otherwise: +12
- `stage = beginner` or `goal = first_half`
  - beginner difficulty: +15
  - intermediate difficulty: +9
  - otherwise: +0
- first-trail intent: `stage !== trail && goal === first_trail`
  - max distance >= 100: +0
  - beginner or intermediate difficulty: +15
  - challenge difficulty: +7
  - otherwise: +3
- `stage = advanced`
  - challenge or high_challenge: +15
  - otherwise: +8
- default:
  - difficulty unknown: +5
  - otherwise: +11

Important: The current stage is influential, but it is partly overridden by goal-specific branches. For example, `goal = challenge_100k` is evaluated before stage.

### 地区 / Region Score

Function: `getRegionScore()`

- `region = all`: +8
- exact region match: +10
- mismatch: +0

This is not a hard filter. A region mismatch only loses up to 10 points versus a match.

### 报名状态 / Registration Score

Function: `getRegistrationScore()`

If `registrationPreference = any`:

- has `registrationUrl`: +10
- has `sourceUrl`: +7
- status unknown: +3
- otherwise: +5

If `registrationPreference = actionable`:

- `registrationStatus = registration_open` and has `registrationUrl`: +10
- has `sourceUrl`: +6
- status unknown: +2
- otherwise: +0

This is not a hard filter. It is a scoring preference.

### 数据完整度 / Completeness Score

Function: `getCompletenessScore()`

Starts at +10 and subtracts:

- no `raceDate`: -2
- no `registrationUrl` and no `sourceUrl`: -2
- registration status unknown: -1
- distance text is `距离待更新`: -4
- trail-related target and elevation is `爬升待更新`: -2
- no categories: -2

Minimum: 0.

### 上限 / 下限

- Lower bound: 0
- Upper bound: 100
- Final score is rounded.

## 4. 排序规则

Function: `getRecommendationCards()`

Sorting:

```text
sort by matchScore descending
then by raceDate ascending
```

Tie-breaker:

- If scores are equal, earlier race date ranks higher.
- If dates are also equal, JavaScript sort behavior preserves current relative order in modern stable sort implementations, but the code does not explicitly define a third tie-breaker.

Not used in final recommendation sorting:

- Registration status priority is not a final sort key.
- Data completeness is not a final sort key, except through matchScore.
- Confidence is not a final sort key after scoring.

Result size rule:

```text
strongMatches = scored.filter(matchScore >= 70)
if strongMatches.length >= 3:
  return strongMatches.slice(0, 10)
else:
  return scored.slice(0, 3)
```

Important consequence:

- If fewer than 3 races score >= 70, the engine returns only 3 races, not 5 or 10.
- This is why some input combinations cannot show Top 5 even when more candidates exist.

## 5. 推荐理由生成规则

Function: `buildRecommendationReasons()`

Reason sources:

- `race.type`
- `profile.goal`
- `profile.stage`
- closest category distance vs target range
- selected region vs race region
- race city
- registration URL / source URL / unknown registration status
- category count
- trail elevation data
- countdown days
- race date presence

Special case:

- If `stage = any` and `goal = any`, reasons are generated from action value and data quality:
  - registration URL / source URL
  - race date
  - distance/category completeness
  - registration status clarity
  - preparation window

Whether reasons depend on user input:

- Yes, but only in some branches.
- Goal-specific reasons are generated for first half, first marathon, first trail, challenge 50K, challenge 100K, and scenic trail.
- Region reason appears only when a specific region is selected and matches.
- Distance reason appears only when `closestDistance` exists and falls inside the selected target range.

Why reasons may look repetitive:

- Many cards share the same generic fallback reasons:
  - city/location reason
  - source/registration availability reason
  - category count reason
  - preparation window reason
- `stage = any` and `goal = any` intentionally uses a small set of generic action-value reasons.
- For nonmatching races, goal-specific reasons may not fire, so generic fallback reasons dominate.
- Reasons are capped to the first 3 unique reasons, so ordering can suppress later, more specific reasons.

## 6. 当前问题判断

### 当前阶段是否影响推荐结果？

Yes.

It affects:

- target goal options in UI
- `getStageFitScore()`
- first-trail intent
- some reason text

But it is not a hard filter, and some goal-specific scoring branches take priority over stage.

### 目标赛事是否影响推荐结果？

Yes.

It affects:

- locked target distance
- race type scoring
- stage-fit scoring
- data completeness penalty for trail-related goals
- reason generation
- risk tip for 100K goal

However, it is not a hard filter. Nonmatching types can still appear if there are not enough strong matches, because of fallback behavior.

### 目标距离是否影响推荐结果？

Yes.

It affects `distanceScore` and the distance-match reason. Multi-category races match if any category falls into the selected range.

However, if `targetDistance = any`, the distance dimension becomes a completeness score, not a distance preference.

### 所在地区是否影响推荐结果？

Yes.

It adds +10 for exact match, +8 for all regions, and +0 for mismatch. It does not filter mismatches out.

### 报名状态是否影响推荐结果？

Yes.

It changes `getRegistrationScore()`. But it does not filter unavailable races. Unknown status can still score and appear.

### 是否存在 UI 选项没有接入规则的问题？

No fully disconnected active UI input was found.

All active fields are read by `getRecommendationCards()` through `profile`. However:

- Some inputs have weak effect because they only add or subtract a small score.
- `registrationPreference = actionable` sounds like a filter but is only a scoring preference.
- Region sounds like a filter but is only a scoring preference.

### 是否存在评分变化但排序不明显的问题？

Yes.

Reasons:

- Candidate pool is small: 9 current candidates.
- Many records share similar status, date quality, category count, and source URL availability.
- Region default `all` gives most races +8, so it does not separate candidates.
- If fewer than 3 strong matches exist, fallback returns only top 3 overall scored candidates, which can include weak semantic matches.
- Final sorting uses only score, then date. Registration status and data completeness only affect score indirectly.

## 7. 示例验证

Audit script reproduced current `raceAdapter.ts` logic against `data/merged/merged_sample.json`.

### A. 当前阶段 = 不限，目标赛事 = 不限

Input:

```json
{
  "stage": "any",
  "goal": "any",
  "targetDistance": "any",
  "region": "all",
  "registrationPreference": "actionable"
}
```

Top 5:

| Rank | Race | Score | Key Rule Hits | Reasons |
|---:|---|---:|---|---|
| 1 | 2026FUGA西湖青芝坞隆冬跑山赛 | 84 | type +22, distance completeness +22, stage +12, region +8, registration +10, completeness +10 | 有报名入口，可以进一步查看。 / 比赛日期明确，便于安排行程。 / 距离和组别信息较完整。 |
| 2 | 2026凯乐石贡嘎100冰川极限挑战赛 | 80 | type +22, distance completeness +22, stage +8, region +8, registration +10, completeness +10 | 有报名入口，可以进一步查看。 / 比赛日期明确，便于安排行程。 / 距离和组别信息较完整。 |
| 3 | 澳康达·2026天津武清半程马拉松 | 80 | type +22, distance completeness +18, stage +12, region +8, registration +10, completeness +10 | 有报名入口，可以进一步查看。 / 比赛日期明确，便于安排行程。 / 距离和组别信息较完整。 |
| 4 | 2026楚雄马拉松 | 79 | type +22, distance completeness +22, stage +12, region +8, registration +6, completeness +9 | 可先查看赛事来源页面，确认报名安排。 / 比赛日期明确，便于安排行程。 / 距离和组别信息较完整。 |
| 5 | 2026阿尔山马拉松 | 79 | type +22, distance completeness +22, stage +12, region +8, registration +6, completeness +9 | 可先查看赛事来源页面，确认报名安排。 / 比赛日期明确，便于安排行程。 / 距离和组别信息较完整。 |

Observation:

- This behaves like a curated “action-ready and complete data” ranking.
- Reasons are intentionally repetitive because the `any + any` branch uses generic action-value reasons.

### B. 当前阶段 = 跑过全马，目标赛事 = 首个越野，目标距离 = 50KM - 100KM

Input:

```json
{
  "stage": "marathon",
  "goal": "first_trail",
  "targetDistance": "50_100",
  "region": "all",
  "registrationPreference": "actionable"
}
```

Current engine returned only 3 races because fewer than 3 races scored >= 70, so fallback returned `scored.slice(0, 3)`.

| Rank | Race | Score | Key Rule Hits | Reasons |
|---:|---|---:|---|---|
| 1 | 2026FUGA西湖青芝坞隆冬跑山赛 | 87 | type +30, distance +16, stage +15, region +8, registration +10, completeness +8 | 距离适合作为首次越野尝试。 / 比赛位于杭州市，便于你提前评估交通和住宿。 / 报名信息完整，可以直接行动。 |
| 2 | 2026凯乐石贡嘎100冰川极限挑战赛 | 83 | type +30, distance +25, stage +0, region +8, registration +10, completeness +10 | 距离偏长，不建议作为首次越野的唯一选择。 / 组别距离接近你的目标距离。 / 比赛位于甘孜藏族自治州，便于你提前评估交通和住宿。 |
| 3 | 2026楚雄马拉松 | 52 | type +0, distance +16, stage +15, region +8, registration +6, completeness +7 | 比赛位于楚雄彝族自治州，便于你提前评估交通和住宿。 / 可先查看赛事来源页面，确认报名安排。 / 2 个组别可选，方便比较报名选择。 |

Observation:

- Target race strongly boosts trail races.
- Distance range affects ranking.
- A non-trail road race still appears as fallback because the engine does not hard-filter nonmatching race type and returns 3 races when strong matches are fewer than 3.
- This is a trust risk for “首个越野” recommendations.

### C. 当前阶段 = 跑过半马，目标赛事 = 首个全马，目标距离 = 30KM - 50KM

Input:

```json
{
  "stage": "half_marathon",
  "goal": "first_marathon",
  "targetDistance": "30_50",
  "region": "all",
  "registrationPreference": "actionable"
}
```

Current engine returned only 3 races because fewer than 3 races scored >= 70, so fallback returned `scored.slice(0, 3)`.

| Rank | Race | Score | Key Rule Hits | Reasons |
|---:|---|---:|---|---|
| 1 | 2026楚雄马拉松 | 71 | type +12, distance +25, stage +11, region +8, registration +6, completeness +9 | 组别距离接近你的目标距离。 / 比赛位于楚雄彝族自治州，便于你提前评估交通和住宿。 / 可先查看赛事来源页面，确认报名安排。 |
| 2 | 2026阿尔山马拉松 | 71 | type +12, distance +25, stage +11, region +8, registration +6, completeness +9 | 组别距离接近你的目标距离。 / 比赛位于兴安盟，便于你提前评估交通和住宿。 / 可先查看赛事来源页面，确认报名安排。 |
| 3 | 澳康达·2026天津武清半程马拉松 | 67 | type +12, distance +16, stage +11, region +8, registration +10, completeness +10 | 比赛位于武清区，便于你提前评估交通和住宿。 / 报名信息完整，可以直接行动。 / 距离比赛还有较长准备周期，适合安排系统训练。 |

Observation:

- Target distance clearly affects score.
- `first_marathon` does not strongly prefer inferred `marathon` records in this sample because `inferRaceType()` classifies records with half-marathon categories as `half_marathon` before checking marathon categories.
- This weakens “首个全马” trust.

## 8. 修复建议

### P0 必须修复

1. Add hard compatibility filters for target race type before scoring.
   - `first_trail`, `scenic_trail`, `challenge_50k`, `challenge_100k` should not fall back to road races unless explicitly showing a no-match empty state.
   - `first_marathon` should not surface pure half-marathon-only records as top candidates unless they include a marathon-distance category.

2. Fix race type inference for multi-category road races.
   - Current `inferRaceType()` returns `half_marathon` if any category is <= 22KM before checking for marathon-distance categories.
   - This can misclassify races with both 42.2KM and 21.1KM as half marathon.

3. Change fallback behavior.
   - Current fallback returns `scored.slice(0, 3)` when fewer than 3 strong matches exist.
   - This can show semantically wrong races.
   - Prefer an empty/relax-conditions state, or show weak matches in a separate “可放宽条件考虑” section.

### P1 建议优化

1. Split scoring from explainability.
   - Store rule-hit details in the returned view model so UI and audits can explain why a race ranked high.

2. Strengthen region and registration semantics.
   - If a control feels like a filter, consider making it a hard filter or clearly label it as preference.

3. Improve reason priority.
   - Current first-3 slicing can hide more meaningful reasons behind generic city/source/category reasons.
   - Rank reasons by specificity.

4. Add explicit sorting tie-breakers.
   - After score and race date, sort by registration/actionability and data completeness to make outcomes deterministic and product-aligned.

### P2 以后再做

1. Add a lightweight test suite for recommendation profiles.
   - Snapshot Top 5 for critical profiles.
   - Include trust-sensitive cases like first trail and first marathon.

2. Add telemetry once product instrumentation exists.
   - Track changed inputs, clicked race, and no-match states.

3. Revisit `types/runner.ts` and legacy `lib/recommend.ts`.
   - They are not active in the current Top100 MVP recommendation surface and may confuse future development.
