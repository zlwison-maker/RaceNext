# Race Decision Page Data Gap Report

Last Updated: 2026-07-11

Scope: Race Decision Page MVP based on `data/seed/future_top100_seed.json` and merged source records.

Current sample:

- Race records: 100
- Category records: 154
- Records with race date: 99 / 100
- Records with city: 96 / 100
- Records with cover image: 99 / 100
- Records with race-level registration URL: 13 / 100
- Categories with distance: 89 / 154
- Categories with elevation gain: 13 / 154
- Categories with fee: 71 / 154
- Categories with cutoff time: 14 / 154
- Categories with category registration URL: 71 / 154

## 1. 已有数据

These fields can support MVP display now:

- Race identity: id, name, source URL.
- Race date: mostly available.
- Location: province, city, district mostly available.
- Cover image: mostly available.
- Registration status: available as raw source status and page-derived status.
- Registration URL: partial race-level URL and stronger category-level URL.
- Category name.
- Category distance for part of records.
- Category fee for part of records.
- Category registration URL for part of records.
- Source IDs, confidence, missing fields.

## 2. 已有但需要清洗

- Registration status: values are source-specific and sometimes too coarse. Page currently derives status from URL, date and raw status, but a normalized `registrationStatus` should be produced in pipeline.
- Race type: seed data has type, but page still needs fallback inference from name/categories because merged records do not expose a fully trusted normalized race type.
- Category name: some names are package/product names rather than real race categories, such as medal packages or training events.
- Date and location: usable, but online events and “不限地点” should be separated from physical race venues.
- Cover image: available, but image rights and hotlinking policy need review before production SEO scaling.
- Source URL versus official URL: current source URL is often aggregator/event page, not official website.

## 3. 部分赛事有

- Category distance.
- Category elevation gain.
- Category cutoff time.
- Category registration fee.
- Category registration URL.
- Multi-category structure.
- Trail-related facts, mostly from Zuicool-derived records.

Impact:

- Decision Card and Core Data are strong for categories with distance/elevation/cutoff/fee.
- AI static guide can only render when at least one useful category fact exists.
- Some cards only show status/date/location because category facts are weak.

## 4. 完全缺失

The following fields are not currently structured in source records:

- Registration open date.
- Registration close date.
- Official website as verified official source.
- Official registration URL as verified official source.
- Highest altitude.
- Elevation loss.
- Official course map URL.
- GPX URL.
- Elevation chart URL.
- Aid stations.
- Aid station spacing.
- Course official description.
- Packet pickup location/time.
- Parking.
- Transport guide.
- Accommodation guide.
- Nearby dining.
- Organizer.
- Race history.
- Manual curated review.
- Official rulebook URL.
- Qualification rules.
- Mandatory gear.
- Weather risk.
- Map coordinates.
- Commercial affiliate slots and partner inventory.

## 5. 建议新增字段

Do not add these immediately unless the MVP page needs them in data pipeline. Suggested minimal future additions:

- Edition-level:
  - `registrationOpenDate`
  - `registrationCloseDate`
  - `officialWebsite`
  - `officialRegistrationUrl`
  - `organizer`
  - `venue`
  - `packetPickup`
  - `transportationNotes`
  - `parkingNotes`
  - `accommodationNotes`
  - `diningNotes`
  - `manualReviewSummary`
- Category-level:
  - `altitudeMax`
  - `officialCourseMapUrl`
  - `gpxUrl`
  - `elevationChartUrl`
  - `aidStations`
  - `courseDescription`
  - `mandatoryGear`
  - `qualificationRules`
- Internal/RaceNext:
  - `decisionVerdict`
  - `raceNextAdvice`
  - `recommendedFor`
  - `notRecommendedFor`
  - `manualReviews`
  - `commercialPlacementStatus`

Recommendation:

Add fields only when the data source and maintenance owner are clear. For MVP, prefer manual enrichment for the first 50 high-value trail races.

## 6. MVP 暂不维护

These should remain out of scope until product/business validation:

- User comments and UGC.
- Star ratings and numeric user scores.
- Real-time AI chat.
- Personalized training plans.
- Full recommendation algorithm.
- Live registration inventory.
- Hotel/transport affiliate deep integration.
- Weather forecast automation.
- Map POI scoring.
- Social sharing analytics beyond basic SEO/OG.

## Spec Conflicts And Suggestions

- Spec requires Registration Guide to include registration start/end and countdown. Current data does not provide start/end dates, so the implementation hides those fields. Suggest parsing official/registration page text into Edition-level fields later.
- Spec requires Course Analysis to include official map, GPX, elevation chart and aid stations. Current data does not expose these fields. Suggest adding them at Category level and filling only when official sources are available.
- Spec requires Travel Guide. Current data has location but not travel facts. Suggest manual enrichment before showing this module, especially for first 50 trail races.
- Spec requires Selected Reviews but says first version only supports manual整理. Current data has no manual review source. Suggest a small internal markdown/JSON review source after MVP user interviews.
- Spec requires “官网报名”. Current URL may be Zuicool or source page, not verified official URL. UI labels it as报名入口 where possible, and final official-field governance should distinguish `officialRegistrationUrl` from aggregator `registrationUrl`.
