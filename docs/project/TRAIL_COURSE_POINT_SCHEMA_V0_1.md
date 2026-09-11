# RaceNext Trail Course Point Schema V0.1

Status: **CURRENT / MINIMAL**

## Purpose and ownership

Course Point facts answer which checkpoint a runner reaches, its cumulative distance, its cutoff and its confirmed key services. They belong to the physical `Category` route:

`Event → Edition → Category → coursePoints[]`

V0.1 does not create Course, Route, shared Aid Station or physical Location entities.

## Canonical shape

```ts
type CoursePoint = {
  pointId: string;
  type: "checkpoint" | "water_point" | "finish";
  name: string;
  displayOrder: number;
  distanceKm: number | null;
  cutoffAt: string | null;
  services: ("water" | "food" | "hot_food" | "drop_bag" | "medical")[] | null;
};
```

`coursePointDataStatus` is a Category-level value based only on the P0 core structure:

- `available`: the official Course Point list is complete enough for RaceNext publication, with complete `name`, `displayOrder`, and publication-standard `distanceKm` and `cutoffAt` values.
- `partial`: official Course Point data exists, but RaceNext has accepted only part of that core structure, such as an incomplete point list or missing cumulative distance/cutoff values.
- `not_published`: the official source explicitly states that Course Point data has not yet been published or will be announced later.
- `unknown`: available official publication status cannot currently be confirmed from reliable sources.

`services` is optional enrichment and never determines `available` versus `partial`. Missing food menus, medical details, hot food, transportation or any deferred field do not downgrade an otherwise complete core structure.

## Semantics

- `pointId` combines the stable `categoryId` with a normalized semantic point identity. It must not depend on `displayOrder` or an array index.
- `displayOrder` is unique inside one Category and controls route order.
- `distanceKm` is cumulative and must not decrease in route order.
- `cutoffAt` uses a complete ISO 8601 date-time with an explicit timezone offset matching the Edition. This preserves cross-midnight meaning.
- `services: null` means the official source has not confirmed the supported service set. `services: []` means the official source explicitly confirms none of the V0.1 services.
- A non-empty `services` array contains only confirmed services; an omitted service is not automatically evidence that it is unavailable.
- An Event- or Category-wide service rule may be mapped onto individual Course Points only when its official Evidence has an explicit scope that covers those point types. A rule covering “all checkpoints” applies to `type = checkpoint`, not automatically to `finish` or `water_point`.
- A Finish row may appear in `coursePoints` without replacing `Category.finishLocation`.
- Evidence, source, confidence and review state remain in Category governance and are excluded from Public DTO.

## Deferred fields

Elevation, segment distance/gain/loss, cumulative gain, opening time, fastest expected time, retirement, transportation, GPS, shared location, notes, spectator access, detailed food menus and evacuation method are outside V0.1.

## Content boundary

Course Point data contains official route facts. Race Strategy is interpretation and advice. Strategy must consume accepted facts without being stored in `coursePoints` or promoted to Canonical fact.

## Future AI extraction TODO

Before AI extraction can propose Course Points, add a candidate contract, extraction whitelist, source locator requirements, enum and sequence validation, semantic-ID matching, diff behavior and Pending review support. AI output must remain a candidate and must not write Canonical directly.
