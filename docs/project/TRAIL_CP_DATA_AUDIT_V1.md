# RaceNext Trail CP Data Audit V1

Status: **ARCHIVED AUDIT — 2026-09-11**

This document records the completed audit that preceded Trail Course Point Schema V0.1. It is an evidence and gap report, not a product specification.

## Current model

Before this audit, Race Graph represented Event, Edition and Category facts but had no accepted structure for per-checkpoint distance, cutoff or services. Race Guide remained editorial content and could not be used as a checkpoint fact store. The smallest correct owner is the Category because routes, distances, cutoffs and services differ by physical race category inside one Edition.

The audit found no need for a Course, Route, shared Aid Station or physical Location entity at this stage.

## 2026 Kailas Gongga 100 — 100km audit

Tier 1 source: [2026 official competition regulations](https://moganshan.saihuitong.com/article?id=70868&mid=57201), including the official 100km route table.

Accepted findings:

- 13 named checkpoints in route order, plus the Finish row.
- Cumulative distance and cutoff are published for every accepted row.
- The schedule crosses midnight from 2026-09-26 into 2026-09-27.
- CP8 半亩温泉 is explicitly marked as the change-clothes/drop-bag point.
- Other per-point services and retirement/evacuation details are either outside V0.1 or do not have sufficiently granular evidence for publication.

## 2027 HK100 — HK100 100K audit

Tier 1 sources: [HK100 category and checkpoint table](https://hk100ultra.com/zh-hant/hk100/), [Rules](https://hk100ultra.com/zh-hant/rules/), [Transportation](https://hk100ultra.com/zh-hant/transportation/) and [Bag Drop](https://hk100ultra.com/zh-hant/bag-drop/).

Accepted findings:

- 10 named checkpoints, plus the Finish row.
- Cumulative distance and cutoff are published for every accepted row.
- The schedule crosses midnight from 2027-01-23 into 2027-01-24.
- CP6 企岭下 and the Finish have official drop-bag evidence.
- The Rules state that every checkpoint has emergency medical service; this supports `medical` on the 10 checkpoints.
- Food and drink details are not yet published, so they are not inferred.
- The official Category is 100K while the current official table lists the Finish at 96km. Both source facts must remain unchanged and the difference requires review.

## Data-chain gaps found

The previous Canonical Category, Public Detail DTO and mapper had no `coursePoints` contract. Source Registry entries existed for the principal event/category pages, but HK100 Rules, Transportation and Bag Drop were not individually registered. There was also no small invariant check for semantic IDs, unique order, controlled enums, monotonic distance or cross-midnight cutoff order.

## Risks and controls

- **Edition/category mismatch:** bind every point set to one accepted `categoryId` and official Edition source.
- **Unstable identity:** never derive `pointId` from array index or display order.
- **False service inference:** keep `services: null` unless an official statement supports the point or all checkpoints; preserve `[]` only for an explicit statement of no supported service.
- **Midnight ambiguity:** require full ISO 8601 date-time values with explicit offsets.
- **Source disagreement:** retain both facts in Evidence and Canonical where their semantics differ; mark the conflict for review rather than normalizing it away.
- **Governance leakage:** source, confidence, locator and review flags stay internal and never enter Public DTO.

## AI extraction boundary

V0.1 data is manually verified and accepted. The current AI extraction runtime is not extended in this work. A future implementation would need an explicit Course Point candidate schema, extraction whitelist, evidence locators, enum and monotonic validation, point-level diff behavior, and Pending review handling. It must continue to produce candidates rather than write Canonical directly.

## Later evolution

After the two primary-category samples are stable in production, other categories may be added through the same evidence path. Fields such as elevation, segment metrics, opening time, retirement, transportation, GPS, spectator access and detailed food menus stay deferred until proven necessary. No new entity is implied by this audit.
