# Race Decision Page Data Priority Matrix

Last Updated: 2026-07-31

Status: Active proposal for First50 MVP.

## 1. Scope

This matrix defines which fields should be built for RaceNext First50.

Rules:

- Do not add fields only because the page has empty modules.
- Add a field only when it has user decision value, can be obtained, and can be maintained.
- Separate raw race facts from RaceNext-owned decision content.
- Prefer JSON/Markdown enrichment before database migration.

## 2. Field Priority Levels

| Priority | Meaning |
|---|---|
| P0 | Must have; otherwise the decision page cannot work |
| P1 | Strongly improves decision quality |
| P2 | Adds content depth and SEO/service value |
| P3 | Future; do not build now |

## 3. Race-Level Fields

| Field | Priority | Current Status | Source / Maintenance | Notes |
|---|---|---|---|---|
| raceId | P0 | 已有 | System | Use current record id for now |
| raceName | P0 | 已有 100% | Source + manual clean | Must remove obvious marketing noise later |
| raceType | P0 | 已有但需清洗 | Source + derived + manual | Needed for page logic and First50 mix |
| raceDate | P0 | 已有 99% | Source + official verification | Month acceptable only for candidate, not publish |
| province | P0 | 已有 100% | Source | Needs physical/online flag |
| city | P0 | 已有 96% | Source + manual | Required for SEO and travel decisions |
| district / venue | P1 | 部分已有 / venue缺失 | Source + manual | Venue improves travel planning |
| registrationStatus | P0 | 已有但粗 | Source + derived + manual checkedAt | Must store checked date |
| registrationUrl | P0 | 弱 | Source + manual | Can be official or platform, but label honestly |
| officialWebsite | P1 | 缺失 | Manual / official source | Useful for trust |
| officialRegistrationUrl | P1 | 缺失 | Manual / official source | Distinguish from Zuicool |
| registrationOpenDate | P1 | 缺失 | Crawl + manual | Helps “什么时候报名” |
| registrationCloseDate | P1 | 缺失 | Crawl + manual | High decision value |
| coverImage | P2 | 已有 99% | Source + rights review | Useful for SEO but rights need policy |
| organizer | P2 | 缺失 | Official/manual | Trust and context |
| raceIntroduction | P2 | 缺失 | Source + AI summary + manual review | Keep factual, not marketing copy |
| raceHistory | P3 | 缺失 | Manual | Nice to have, not MVP |

## 4. Race Category Fields

| Field | Priority | Current Status | Source / Maintenance | Notes |
|---|---|---|---|---|
| categoryId | P0 | 派生 | System | Stable local id acceptable |
| categoryName | P0 | 已有 100% | Source + clean | Need remove package/medal naming where possible |
| distanceKm | P0 | 已有 58% | Source + parser + manual | Required for category decision |
| categoryRegistrationUrl | P0 | 已有 46% | Source + manual | Stronger than race-level URL |
| categoryRegistrationStatus | P0 | 缺失 | Source + manual | Needed when categories differ |
| registrationFee | P1 | 已有 46% | Source + manual | High decision value |
| elevationGain | P1 | 已有 8% | Zuicool / ITRA / official / manual | Critical for trail |
| cutoffTime | P1 | 已有 9% | Source + manual | Critical for finish feasibility |
| courseDescription | P1 | 缺失 | Official / source text + manual | Can support route analysis |
| courseMapUrl | P1 | 缺失 | Official / source | Only use official/traceable links |
| gpxUrl | P2 | 缺失 | Official / ITRA / manual | Valuable but not always available |
| elevationChartUrl | P2 | 缺失 | Official / source | Valuable for trail |
| aidStations | P2 | 缺失 | Official / manual | Useful for planning |
| mandatoryGear | P2 | 缺失 | Official / manual | Important for trail but not all races |
| qualificationRules | P2 | 缺失 | Official / manual | Important for high challenge races |
| altitudeMax | P2 | 缺失 | ITRA / official | Good for high-altitude risk |
| remainingQuota | P3 | 缺失 | Official/live systems | Do not build now |
| livePriceTiers | P3 | 缺失 | Registration platform | Too volatile |

## 5. Race Decision Content Fields

These are RaceNext-owned fields. They must not be written into raw Race or Category source facts.

Recommended location:

- `data/first50/content/{raceId}.json`
- optional editorial notes in `data/first50/content/{raceId}.md`

| Field | Priority | Source / Maintenance | Notes |
|---|---|---|---|
| primaryCategory | P0 | Manual | Which category the page defaults to |
| oneLineVerdict | P1 | AI generated + human reviewed | High page value |
| raceNextAdvice | P1 | AI generated + human reviewed | Must reference known facts |
| recommendedFor | P1 | AI generated + human reviewed | User decision value |
| notRecommendedFor | P1 | AI generated + human reviewed | Risk control |
| aiGuide.level | P2 | AI + human review | Static content for MVP |
| aiGuide.preparation | P2 | AI + human review | Must avoid training plan depth |
| aiGuide.gear | P2 | AI + human review | Especially trail |
| aiGuide.caution | P2 | AI + human review | Risk and official confirmation |
| aiGuide.finish | P2 | AI + human review | Completion planning |
| courseHighlights | P2 | AI + manual | Use only if route facts exist |
| travelTips | P2 | Manual | Accommodation/transport/packet pickup |
| faq | P2 | Static + manual variations | Supports FAQ Schema |
| selectedReviews | P3 | Manual curated | Do later after source policy |
| userPersonalizedFit | P3 | Product algorithm | Do not build now |

## 6. Source Strategy By Field Group

| Field Group | Best MVP Source | Maintenance Cost | Decision Value | Recommendation |
|---|---|---:|---:|---|
| Name/date/location | Zuicool + RunChina + manual | Low | High | P0 |
| Registration URL/status | Zuicool + official/manual | Medium | Very high | P0 |
| Category distance | Zuicool/parser/manual | Medium | Very high | P0 |
| Fee | Zuicool/manual | Medium | High | P1 |
| Elevation/cutoff | Zuicool/ITRA/official/manual | Medium | Very high for trail | P1 |
| Course map/description | Official/source/manual | Medium | High | P1 |
| Travel notes | Manual | Medium | Medium | P2 |
| RaceNext advice | AI + human review | Medium | High | P1/P2 |
| User reviews | Community | High | Medium | P3 |
| Live quota/weather | API/live source | High | Medium | P3 |

## 7. P0 Publish Gate

A First50 race should not be considered publish-ready unless these are complete:

- raceName
- raceType
- raceDate or confirmed official month with note
- province/city
- registrationStatus
- registrationUrl or clear official/source note
- at least one categoryName
- primary category selected
- primary category distance

For trail races, add:

- elevationGain or explicit reviewed unknown
- cutoffTime or explicit reviewed unknown

### Minimum RaceNext Decision Content For Publish

正式发布赛事页面前，除了基础 P0 字段，还必须满足 primaryCategory 的最低 RaceNext Decision Content 要求：

- `oneLineVerdict`
- `recommendedFor` 至少 2 条
- `notRecommendedFor` 至少 1 条

Scope:

- 只要求 primaryCategory 主组别。
- 不要求所有组别一次性完成。
- 非 primaryCategory 可以先只展示真实事实字段。

Content workflow:

```text
AI generated
↓
human reviewed
↓
published
```

Rules:

- `draft` 和 `ai_generated` 内容不可正式展示。
- `human_reviewed` 可以进入预发布检查。
- 只有 `published` 内容可以进入正式页面。
- RaceNext Decision Content 必须引用已知事实，不允许补写不存在的赛事事实。

## 8. P1 Completion Target

For the first 20 launch races, target:

- registrationFee
- registrationOpenDate
- registrationCloseDate
- officialWebsite
- officialRegistrationUrl if available
- courseDescription or courseMapUrl
- RaceNext oneLineVerdict
- RaceNext recommendedFor / notRecommendedFor

## 9. Do Not Build Now

Keep out of MVP data model:

- User rating score.
- Star rating.
- User comments.
- Personalized recommendations.
- Live remaining quota.
- Full training plan.
- Weather automation.
- Hotel/transport booking inventory.
- Complex CMS/admin backend.

## 10. Suggested Minimal Files

```text
data/first50/
  first50_candidates.json
  first50_races.json
  content/
    {raceId}.json
    {raceId}.md
```

No database migration required for the next step.

## 11. Suggested Model Adjustment

Do not modify the core Event / Edition / Category schema immediately.

Add a lightweight enrichment layer:

```ts
type First50RaceEnrichment = {
  raceId: string;
  sourceRecordId: string;
  race: Partial<{
    officialWebsite: string | null;
    officialRegistrationUrl: string | null;
    registrationOpenDate: string | null;
    registrationCloseDate: string | null;
    organizer: string | null;
    introduction: string | null;
  }>;
  categories: Array<{
    categoryName: string;
    registrationStatus?: string | null;
    courseMapUrl?: string | null;
    courseDescription?: string | null;
    mandatoryGear?: string[] | null;
    qualificationRules?: string | null;
    sourceNote?: string | null;
  }>;
  review: {
    status: "draft" | "reviewed" | "published";
    reviewer?: string | null;
    updatedAt: string;
  };
};
```

Decision content remains separate:

```ts
type First50DecisionContent = {
  raceId: string;
  categoryName?: string;
  contentStatus: "draft" | "ai_generated" | "human_reviewed" | "published";
  oneLineVerdict?: string;
  raceNextAdvice?: string;
  recommendedFor?: string[];
  notRecommendedFor?: string[];
  aiGuide?: Record<string, string>;
  faq?: Array<{ question: string; answer: string }>;
};
```
