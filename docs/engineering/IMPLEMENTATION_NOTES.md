# RaceNext Implementation Notes

## 2026-07-08

### Future Top100 Seed V1

Built the first future race seed data pool without changing the UI.

Files added this round:

- `data/seed/future_top100_seed.json`
- `data/seed/future_top100_seed_summary.json`
- `docs/engineering/FUTURE_TOP100_SEED_V1.md`
- `docs/engineering/FUTURE_TOP100_SEED_V1.json`
- `lib/raceDataSource.ts`
- `scripts/seed/buildFutureTop100Seed.ts`

Files modified this round:

- `lib/raceAdapter.ts`
- `package.json`
- `docs/engineering/IMPLEMENTATION_NOTES.md`

Command added:

- `npm run data:future-top100`

Latest generation result:

- future seed records: 100
- RunChina source records in final seed: 3
- Zuicool source records in final seed: 99
- merged duplicate records: 2
- duplicate groups: 2
- registration_open: 72
- lottery: 0
- upcoming: 0
- unknown: 28

Notes:

- Frontend data access now goes through `lib/raceDataSource.ts`.
- The data source prefers `data/seed/future_top100_seed.json` when non-empty and falls back to `data/merged/merged_sample.json`.
- RaceCard, tabs, filters, recommendation layout, copy structure, and interaction design were not changed.
- The seed script uses only RunChina and Zuicool public pages / APIs. No Official, ITRA, database, login, captcha bypass, or image download was added.
- Zuicool page 4 returned a restricted response body during the latest run; pages before that produced enough candidates for the 100-record seed.

## 2026-07-01

### Recommendation Input V1 Follow-up

Refined the `赛事推荐` input logic without changing connectors, data sources, RaceCard structure, or persisted data.

Implemented:

- Added P0 target-race hard filters before scoring, so trail goals cannot be backfilled with road races and long-trail goals require matching trail distance ranges.
- Fixed race type inference for multi-category races: trail signals are checked first, marathon-distance categories beat half-marathon categories, and short categories no longer prematurely classify mixed road races as half marathons.
- Removed weak semantic fallback from recommendation results. Scores below `70` are hidden; if fewer than 3 strong matches remain, the UI shows the existing matches plus a prompt to loosen distance, region, or registration preferences.
- Added `不限` to current stage and target race, and made both the default recommendation input state.
- Updated the stage-to-goal rules so `跑过全马` can choose `挑战 100K`.
- Removed the separate road-running target from target race because road-running intent is better expressed through target distance.
- Kept illegal goal combinations self-correcting when current stage changes.
- Kept target-distance locking for explicit goals, while `不限`, `首个越野`, and `风景越野` keep contextual distance choices visible.
- Updated trail target distance input to use ranges instead of fixed race distances.
- `风景越野` and `首个越野` now use trail ranges: `≤30KM`, `30KM - 50KM`, `50KM - 100KM`, and `＞100KM`.
- `跑过全马 + 首个越野` also keeps the trail range selector visible instead of locking to `30K`.
- Trail distance matching now checks whether category `distanceKm` falls inside the selected range.
- Target distance choices now use one unified range system: `不限`, `≤30KM`, `30KM - 50KM`, `50KM - 100KM`, and `＞100KM`.
- `首个半马` locks to `≤30KM`; `首个全马` locks to `30KM - 50KM`.
- `挑战 50K` locks to `50KM - 100KM`; `挑战 100K` locks to `＞100KM`.
- Updated the recommendation engine so `不限 + 不限`, stage-only, goal-only, and combined stage-goal states all produce non-empty recommendation results.
- Changed the recommendation input title to `你的下一场，想怎么跑？` with the subtitle `选择你的目标和偏好，我们会推荐更适合你的比赛。`
- For `不限 + 不限`, recommendation reasons now focus on action value and data quality, such as clear dates, registration/source availability, and complete distance/category information.

### Recommendation Input V1

Updated the `赛事推荐` tab from a static recommendation list into a lightweight rule-based race advisor.

Files modified:

- `components/RecommendationForm.tsx`
- `components/RaceCard.tsx`
- `lib/raceAdapter.ts`
- `docs/engineering/TOP100_MVP_UI_V1.md`
- `docs/engineering/IMPLEMENTATION_NOTES.md`

Implemented:

- Added structured client-side inputs for current stage, target race, target distance, region, and registration preference.
- Removed the standalone first-trail preference input. First-trail intent is inferred from current stage and target race.
- Added stage-to-goal filtering so invalid combinations are not shown or preserved after stage changes.
- Kept target-distance locking for clear race goals, while city road and scenic trail retain contextual distance options.
- Added `RecommendationInputProfile` and default profile in `lib/raceAdapter.ts`.
- Reworked `getRecommendationCards()` to score races by distance, type, region, registration/actionability, difficulty fit, data completeness, and future-race eligibility.
- Recommendation results update immediately when the user changes any input.
- Recommendation cards now show match score with a simple label: 高度匹配 / 较匹配 / 可考虑 / 备选.
- Risk tips now vary for road races, trail races, and 100K trail goals.

Scope intentionally unchanged:

- No Connector changes.
- No merged sample changes.
- No database, login, AI API, detail page, or persistence.

### Top100 MVP UI V1

Connected the frontend MVP UI to the existing merged connector sample:

- Main frontend data source: `data/merged/merged_sample.json`
- Adapter: `lib/raceAdapter.ts`
- Frontend view model: `RaceCardViewModel`
- Rule recommendation view model: `RecommendationViewModel`

Files added this round:

- `lib/raceAdapter.ts`
- `docs/engineering/TOP100_MVP_UI_V1.md`

Files modified this round:

- `app/page.tsx`
- `app/races/page.tsx`
- `app/recommend/page.tsx`
- `app/races/[slug]/page.tsx`
- `components/HomeTabs.tsx`
- `components/RaceCard.tsx`
- `components/RaceFilters.tsx`
- `components/RecommendationForm.tsx`
- `docs/engineering/IMPLEMENTATION_NOTES.md`

Implemented UI behavior:

- Home hero copy now matches the Top100 MVP brief.
- Home tabs are `赛事日历` and `赛事推荐`.
- Calendar filters use type, month, region, difficulty, and registration status.
- Recommendation is rule-based and uses current merged sample data only.
- Race cards no longer expose a detail-page CTA. The full card opens `registrationUrl` when present, otherwise it shows `报名信息待更新`.
- The legacy detail route is now a 404 compatibility placeholder and does not generate mock race detail pages.

Scope intentionally not implemented:

- No new data connectors.
- No database or Supabase integration.
- No AI recommendation.
- No login, commercial flow, detail-page workflow, or image download.
- Legacy mock `Race` files remain for compatibility, but the Top100 MVP entry points now use `RaceCardViewModel`.

## 2026-06-30

### Connector Engineering v1

Implemented a limited Connector POC pipeline alongside the existing `data:poc` pipeline.

New pipeline:

Source
↓
SourceRecord
↓
NormalizedConnectorRecord
↓
Merge POC
↓
local JSON output

Files added this round:

- `types/sourceRecord.ts`
- `scripts/connectors/shared.ts`
- `scripts/connectors/runchinaConnector.ts`
- `scripts/connectors/zuicoolConnector.ts`
- `scripts/normalize/normalizeSourceRecords.ts`
- `scripts/merge/mergeConnectorSamples.ts`
- `docs/engineering/CONNECTOR_POC_V1.md`
- `data/merged/merged_sample.json`

Files modified this round:

- `package.json`
- `docs/engineering/IMPLEMENTATION_NOTES.md`
- `data/raw/runchina_sample.json`
- `data/raw/zuicool_sample.json`
- `data/normalized/normalized_sample.json`

Commands added:

- `npm run data:runchina`
- `npm run data:zuicool`
- `npm run data:normalize`
- `npm run data:merge-samples`
- `npm run data:connectors:poc`

Latest Connector POC result:

- RunChina list records: 20
- RunChina detail records: 5
- Zuicool list records: 20
- Zuicool detail pages: 3
- Zuicool registration pages: 2
- normalized records: 40
- merged records: 40
- merged groups: 0
- conflicts: 0

Notes:

- RunChina Connector uses the public content-center API verified in `docs/research/REPORT_RUNCHINA.md`.
- Zuicool Connector uses public SSR HTML verified in `docs/research/REPORT_ZUICOOL.md`.
- Zuicool public pages include login modal HTML and captcha input markup, but the public event content itself is readable without login. The connector does not submit forms or interact with login / registration workflows.
- No database, scheduler, frontend UI, full crawl, login, captcha bypass, or image download was implemented.
- Node currently emits `MODULE_TYPELESS_PACKAGE_JSON` warnings when running `.ts` scripts directly. The warning does not block the POC, but the project should later standardize ESM execution or script compilation.
- This step does not remove the legacy `Race` naming in older compatibility files. New connector-specific types use `SourceRecord`, `NormalizedConnectorRecord`, and `MergedConnectorRecord`.

## 2026-06-26

### Event / Edition / Category Migration

`docs/data/RACE_SCHEMA_V1.md` and `docs/data/EVENT_MODEL_V1.md` now define the formal data architecture as:

RawRecord
↓
NormalizedRecord
↓
Dedupe
↓
Merge
↓
CanonicalRecord
↓
Entity Split
↓
Event / Edition / Category

The current application still contains legacy single-layer `Race` types and JSON data:

- `types/race.ts`
- `types/rawRace.ts`
- `types/canonicalRace.ts`
- `data/races.json`
- UI components that render `Race`

These are retained for compatibility with the current pages. `types/race.ts` is now marked deprecated, and the new standard interfaces live in `types/event.ts`.

Future migration should move the frontend and POC pipeline gradually toward:

- `Event`
- `Edition`
- `Category`
- `CanonicalRecord`
- `RaceCardViewModel`
- `RecommendationCardViewModel`

No broad UI migration was performed in this step to avoid breaking the running app.

### Source Governance Review

Reviewed these documents together:

- `docs/data/RACE_SCHEMA_V1.md`
- `docs/data/EVENT_MODEL_V1.md`
- `docs/data/SOURCE_PRIORITY_V1.md`
- `docs/data/SOURCE_REGISTRY.md`
- `docs/data/FIELD_OWNERSHIP.md`
- `docs/data/FIELD_PRIORITY_MATRIX.md`
- `docs/data/MERGE_RULES.md`
- `docs/data/SYNC_POLICY.md`

Consistency findings:

- The architecture is aligned on `RawRecord -> NormalizedRecord -> Dedupe -> Merge -> CanonicalRecord -> Entity Split -> Event / Edition / Category`.
- `SOURCE_REGISTRY.md` uses display labels such as RunChina / Zuicool in prose and tables, while runtime source IDs must remain lowercase snake_case. `config/sourceRegistry.ts` uses snake_case IDs.
- Field naming still has a few documented aliases that need later normalization before database work: `registrationOpen` vs `registrationOpenDate`, `registrationClose` vs `registrationCloseDate`, `cutoffTime` vs `cutoffTimeHours`, `qualification` vs `qualificationRules`, `ITRAPoints` vs `itraPoints`, `UTMBIndex` vs `utmbIndex`, and `dataQuality` vs `dataQualityLevel`.
- `scripts/sources/index.ts` remains the POC fetch registry for three live sample sources. `config/sourceRegistry.ts` is the Source Governance registry from `SOURCE_REGISTRY.md`. These should be reconciled in a later migration so fetch code reads governance config without losing POC controls like `fetchSample`.
- Existing POC pipeline files still use deprecated `RawRace`, `NormalizedRace`, and `CanonicalRace` names. They are retained for build compatibility and should be renamed to `RawRecord`, `NormalizedRecord`, and `CanonicalRecord` in a later pipeline migration.

Files added this round:

- `types/sourceGovernance.ts`
- `config/sourceRegistry.ts`
- `config/fieldPriorityMatrix.ts`
- `scripts/sync/syncPolicy.ts`

Files modified this round:

- `scripts/merge/mergeRaces.ts`
- `types/canonicalRace.ts`
- `docs/engineering/IMPLEMENTATION_NOTES.md`

Merge Engine status:

- `ResolutionStrategy` is now represented in TypeScript.
- `mergeRaces.ts` now writes structured `mergeTrace` entries with field, source, previousValue, newValue, strategy, timestamp, and operator.
- Current merge is still a POC helper, not a complete rule engine. It does not yet consume every field from `config/fieldPriorityMatrix.ts`, does not maintain a persistent conflict queue, and does not implement manual override state.
- Derived and RaceNext recommendation fields now have guard notes in merge helpers, but full enforcement should move to a central field resolver before production use.

Sync status:

- `scripts/sync/syncPolicy.ts` provides basic frequency and emergency-sync helpers.
- No scheduler, queue, webhook, or background sync was implemented.
