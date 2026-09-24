import { deepEqual, equal, match, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  createPublicRaceDetailResult,
  createPublicRaceListResult,
  formatDateDisplay,
  formatLocationDisplay,
} from "../lib/raceGraphPublic.ts";
import { loadPublicRaceListResult } from "../lib/raceGraphPublicServer.ts";
import type { Category, Edition, Event } from "../types/event.ts";

type RaceGraphSnapshot = {
  schemaVersion: "race-graph-v1";
  generatedAt: string;
  records: Array<{ event: Event; edition: Edition; categories: Category[] }>;
};

const canonical = JSON.parse(
  readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8"),
) as RaceGraphSnapshot;

test("public list returns only publishable canonical editions", () => {
  const result = createPublicRaceListResult(canonical);
  equal(result.status, 200);
  if (result.status !== 200) return;
  deepEqual(result.body.races.map(({ editionId }) => editionId), [
    "kailas-gongga-100-2026",
    "beijing-marathon-2026",
    "xian-marathon-2026",
    "chengdu-marathon-2026",
    "tsaigu-kuocang-2026",
    "ninghai-ultra-trail-2026",
    "shanghai-marathon-2026",
    "guangzhou-marathon-2026",
    "shenzhen-100-2026",
    "chongqing-marathon-2027",
    "xiamen-marathon-2027",
    "hk100-2027",
  ]);
  equal(result.body.races.length, 12);
  ok(result.body.races.every(({ coverImage }) => Boolean(coverImage)));
  ok(result.body.races.every(({ heroImage }) => Boolean(heroImage)));
  equal(JSON.stringify(result.body).includes("raceStrategy"), false);
  equal(JSON.stringify(result.body).includes("accommodationRecommendations"), false);
  equal(JSON.stringify(result.body).includes("AllianceID"), false);
});

test("pending verification editions are not returned", () => {
  const pending = structuredClone(canonical.records[0]);
  pending.edition.editionId = "pending-race-2026";
  pending.edition.eventId = "pending-race";
  pending.event.eventId = "pending-race";
  pending.edition.governance.verified = false;
  pending.edition.governance.verificationStatus = "pending";
  pending.categories = [];
  pending.edition.primaryCategoryId = null;
  const result = createPublicRaceListResult(withRecords(canonical, [pending]));
  equal(result.status, 200);
  if (result.status !== 200) return;
  equal(result.body.races.some(({ editionId }) => editionId === "pending-race-2026"), false);
});

test("a localized optional-field conflict can publish when verified core Category facts remain complete", () => {
  const snapshot = withLocalizedOptionalConflict(canonical);
  const result = createPublicRaceDetailResult(snapshot, "kailas-gongga-100-2026");
  equal(result.status, 200);
  if (result.status !== 200) return;
  const primary = result.body.race.categories.find(({ isPrimaryCategory }) => isPrimaryCategory);
  ok(primary);
  equal(primary.distanceKm, 100.1);
  equal(primary.cutoffTimeHours, 30);
  equal(primary.elevationGain, null);
});

test("localized-conflict allowance still rejects missing core facts or a selected conflict value", () => {
  const missingCore = withLocalizedOptionalConflict(canonical);
  const missingCoreCategory = missingCore.records
    .find(({ edition }) => edition.editionId === "kailas-gongga-100-2026")!
    .categories.find(({ categoryId }) => categoryId === "kailas-gongga-100-2026-glacier-100")!;
  missingCoreCategory.distanceKm = null;
  equal(createPublicRaceDetailResult(missingCore, "kailas-gongga-100-2026").status, 404);

  const selectedConflict = withLocalizedOptionalConflict(canonical);
  const selectedConflictCategory = selectedConflict.records
    .find(({ edition }) => edition.editionId === "kailas-gongga-100-2026")!
    .categories.find(({ categoryId }) => categoryId === "kailas-gongga-100-2026-glacier-100")!;
  selectedConflictCategory.elevationGain = 6176;
  equal(createPublicRaceDetailResult(selectedConflict, "kailas-gongga-100-2026").status, 404);
});

test("detail returns the requested canonical edition", () => {
  const result = createPublicRaceDetailResult(canonical, "shanghai-marathon-2026");
  equal(result.status, 200);
  if (result.status !== 200) return;
  equal(result.body.race.editionId, "shanghai-marathon-2026");
  equal(result.body.race.eventId, "shanghai-marathon");
});

test("Beijing detail exposes three ordered accommodation recommendations", () => {
  const result = createPublicRaceDetailResult(canonical, "beijing-marathon-2026");
  equal(result.status, 200);
  if (result.status !== 200) return;
  equal(result.body.race.accommodationRecommendations.length, 3);
  deepEqual(result.body.race.accommodationRecommendations.map(({ displayOrder }) => displayOrder), [1, 2, 3]);
  ok(result.body.race.accommodationRecommendations.every(({ actions }) => actions.wechat?.type === "mini_program"));
});

test("other race details have no accommodation recommendations", () => {
  for (const editionId of ["kailas-gongga-100-2026"]) {
    const result = createPublicRaceDetailResult(canonical, editionId);
    equal(result.status, 200);
    if (result.status === 200) deepEqual(result.body.race.accommodationRecommendations, []);
  }
});

test("detail categories are sorted by displayOrder", () => {
  const snapshot = structuredClone(canonical);
  const gongga = snapshot.records.find(({ edition }) => edition.editionId === "kailas-gongga-100-2026")!;
  gongga.categories.reverse();
  const result = createPublicRaceDetailResult(snapshot, gongga.edition.editionId);
  equal(result.status, 200);
  if (result.status !== 200) return;
  deepEqual(result.body.race.categories.map(({ displayOrder }) => displayOrder), [1, 2, 3]);
});

test("isPrimaryCategory is derived from Edition primaryCategoryId", () => {
  const result = createPublicRaceDetailResult(canonical, "kailas-gongga-100-2026");
  equal(result.status, 200);
  if (result.status !== 200) return;
  const primary = result.body.race.categories.filter(({ isPrimaryCategory }) => isPrimaryCategory);
  equal(primary.length, 1);
  equal(primary[0].categoryId, "kailas-gongga-100-2026-glacier-100");
});

test("Road and Trail editions use the same public DTO shape", () => {
  const road = createPublicRaceDetailResult(canonical, "shanghai-marathon-2026");
  const trail = createPublicRaceDetailResult(canonical, "kailas-gongga-100-2026");
  equal(road.status, 200);
  equal(trail.status, 200);
  if (road.status !== 200 || trail.status !== 200) return;
  deepEqual(Object.keys(road.body.race).sort(), Object.keys(trail.body.race).sort());
  deepEqual(Object.keys(road.body.race.categories[0]).sort(), Object.keys(trail.body.race.categories[0]).sort());
  equal(road.body.race.raceType, "marathon");
  equal(trail.body.race.raceType, "ultra_trail");
});

test("elevationLoss stays null when no sourced fact exists and is never copied from elevationGain", () => {
  for (const editionId of [
    "kailas-gongga-100-2026",
    "hk100-2027",
    "tsaigu-kuocang-2026",
    "ninghai-ultra-trail-2026",
    "shenzhen-100-2026",
  ]) {
    const result = createPublicRaceDetailResult(canonical, editionId);
    equal(result.status, 200);
    if (result.status !== 200) continue;
    ok(result.body.race.categories.some(({ elevationGain }) => elevationGain !== null));
    ok(result.body.race.categories.every(({ elevationLoss }) => elevationLoss === null));
  }

  const road = createPublicRaceDetailResult(canonical, "beijing-marathon-2026");
  equal(road.status, 200);
  if (road.status === 200) {
    ok(road.body.race.categories.every(({ elevationLoss }) => elevationLoss === null));
  }
});

test("a sourced Canonical elevationLoss value is exposed independently from elevationGain", () => {
  const snapshot = structuredClone(canonical);
  const category = snapshot.records
    .find(({ edition }) => edition.editionId === "kailas-gongga-100-2026")!
    .categories.find(({ categoryId }) => categoryId === "kailas-gongga-100-2026-glacier-100")!;
  category.elevationLoss = 6888;

  const result = createPublicRaceDetailResult(snapshot, "kailas-gongga-100-2026");
  equal(result.status, 200);
  if (result.status !== 200) return;
  const primary = result.body.race.categories.find(({ isPrimaryCategory }) => isPrimaryCategory);
  ok(primary);
  equal(primary.elevationGain, 7025);
  equal(primary.elevationLoss, 6888);
});

test("invalid elevationLoss values fail the public Category gate", () => {
  const snapshot = structuredClone(canonical);
  const category = snapshot.records
    .find(({ edition }) => edition.editionId === "kailas-gongga-100-2026")!
    .categories.find(({ categoryId }) => categoryId === "kailas-gongga-100-2026-glacier-100")!;
  category.elevationLoss = -1;

  equal(createPublicRaceDetailResult(snapshot, "kailas-gongga-100-2026").status, 404);
});

test("locationDisplay removes duplicate municipalities and location prefixes", () => {
  equal(formatLocationDisplay({
    country: "中国",
    province: "上海市",
    city: "上海市",
    district: "黄浦区",
    venue: "上海市黄浦区外滩金牛广场",
  }), "上海市 · 黄浦区 · 外滩金牛广场");
});

test("single-day dateDisplay uses a compact standard-date derivative", () => {
  equal(formatDateDisplay("2026-12-06", null), "12月6日");
});

test("unknown edition date formatting remains explicit instead of being invented", () => {
  equal(formatDateDisplay(null, null), "日期待公布");
});

test("multi-day dateDisplay compacts a same-month range", () => {
  equal(formatDateDisplay("2026-11-13", "2026-11-15"), "11月13–15日");
});

test("unknown detail ID maps to 404", () => {
  const result = createPublicRaceDetailResult(canonical, "unknown-edition-2026");
  equal(result.status, 404);
  if (result.status !== 404) return;
  equal(result.body.error.code, "race_not_found");
});

test("public responses do not expose internal governance", () => {
  const result = createPublicRaceDetailResult(canonical, "shanghai-marathon-2026");
  equal(result.status, 200);
  const serialized = JSON.stringify(result.body);
  equal(serialized.includes("governance"), false);
  equal(serialized.includes("mergeTrace"), false);
  equal(serialized.includes("confidence"), false);
  equal(serialized.includes("verifiedAt"), false);
  equal(serialized.includes("sources"), false);
  equal(serialized.includes("supports"), false);
});

test("public responses do not expose Source Registry data", () => {
  const input = { ...structuredClone(canonical), sourceRegistry: { secretSourceId: "registry-private" } };
  const result = createPublicRaceListResult(input);
  equal(result.status, 200);
  equal(JSON.stringify(result.body).includes("registry-private"), false);
});

test("public responses do not expose Pending data", () => {
  const input = { ...structuredClone(canonical), pending: [{ secretPendingChange: "pending-private" }] };
  const result = createPublicRaceListResult(input);
  equal(result.status, 200);
  equal(JSON.stringify(result.body).includes("pending-private"), false);
});

test("canonical read or parse failure maps to a safe 500 response", async () => {
  const result = await loadPublicRaceListResult(async () => "{malformed-json");
  equal(result.status, 500);
  if (result.status !== 500) return;
  deepEqual(result.body.error, {
    code: "canonical_unavailable",
    message: "Race data is temporarily unavailable.",
  });
  equal(JSON.stringify(result.body).includes("data/canonical"), false);
});

test("every public response includes the public schemaVersion", () => {
  const list = createPublicRaceListResult(canonical);
  const detail = createPublicRaceDetailResult(canonical, "shanghai-marathon-2026");
  equal(list.body.schemaVersion, "race-graph-public-v1");
  equal(detail.body.schemaVersion, "race-graph-public-v1");
});

test("public mapping does not modify Canonical", () => {
  const before = JSON.stringify(canonical);
  createPublicRaceListResult(canonical);
  createPublicRaceDetailResult(canonical, "kailas-gongga-100-2026");
  equal(JSON.stringify(canonical), before);
});

test("public DTO exposes only the approved product field set", () => {
  const result = createPublicRaceDetailResult(canonical, "shanghai-marathon-2026");
  equal(result.status, 200);
  if (result.status !== 200) return;
  deepEqual(Object.keys(result.body.race).sort(), [
    "accommodationRecommendations", "categories", "coverImage", "dateDisplay", "editionId", "endDate", "eventId", "heroImage", "location",
    "locationDisplay", "name", "raceDate", "raceGuide", "raceStrategy", "raceType", "registrationStatus", "registrationUrl", "slug",
  ]);
  match(result.body.dataUpdatedAt, /^\d{4}-\d{2}-\d{2}/);
});

function withRecords(snapshot: RaceGraphSnapshot, records: RaceGraphSnapshot["records"]): RaceGraphSnapshot {
  return { ...structuredClone(snapshot), records: [...structuredClone(snapshot.records), ...structuredClone(records)] };
}

function withLocalizedOptionalConflict(snapshot: RaceGraphSnapshot): RaceGraphSnapshot {
  const cloned = structuredClone(snapshot);
  const record = cloned.records.find(({ edition }) => edition.editionId === "kailas-gongga-100-2026")!;
  const primary = record.categories.find(({ categoryId }) => categoryId === "kailas-gongga-100-2026-glacier-100")!;
  primary.elevationGain = null;
  primary.governance.verified = false;
  primary.governance.verificationStatus = "pending";
  primary.governance.missingFields = [...new Set([...primary.governance.missingFields, "elevationGain"])];
  delete primary.governance.fieldSources.elevationGain;
  primary.governance.mergeTrace = [{
    field: "elevationGain",
    selectedSource: "placeholder",
    reason: "Two official sources conflict, so no value is selected.",
    candidates: [
      { sourceType: "official", sourceName: "Official source A", value: 6176 },
      { sourceType: "official", sourceName: "Official source B", value: 6200 },
    ],
  }];
  primary.governance.internalFlags = ["elevation_gain_conflict_needs_review"];
  return cloned;
}
