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
import type { RaceGraphSnapshot } from "../types/raceUpdate.ts";
import { NINGHAI_MULTI_CATEGORY_STRUCTURAL_FIXTURE } from "./fixtures/raceGraphFixtures.ts";

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
    "shanghai-marathon-2026",
    "xiamen-marathon-2027",
    "hk100-2027",
  ]);
  equal(result.body.races.length, 5);
  ok(result.body.races.every(({ coverImage }) => Boolean(coverImage)));
  ok(result.body.races.every(({ heroImage }) => Boolean(heroImage)));
  equal(JSON.stringify(result.body).includes("raceStrategy"), false);
});

test("non-production structural fixture is not publishable", () => {
  const snapshot = withRecords(canonical, [NINGHAI_MULTI_CATEGORY_STRUCTURAL_FIXTURE]);
  const result = createPublicRaceListResult(snapshot);
  equal(result.status, 200);
  if (result.status !== 200) return;
  equal(result.body.races.some(({ editionId }) => editionId === NINGHAI_MULTI_CATEGORY_STRUCTURAL_FIXTURE.edition.editionId), false);
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

test("detail returns the requested canonical edition", () => {
  const result = createPublicRaceDetailResult(canonical, "shanghai-marathon-2026");
  equal(result.status, 200);
  if (result.status !== 200) return;
  equal(result.body.race.editionId, "shanghai-marathon-2026");
  equal(result.body.race.eventId, "shanghai-marathon");
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
    "categories", "coverImage", "dateDisplay", "editionId", "endDate", "eventId", "heroImage", "location",
    "locationDisplay", "name", "raceDate", "raceGuide", "raceStrategy", "raceType", "registrationStatus", "registrationUrl", "slug",
  ]);
  match(result.body.dataUpdatedAt, /^\d{4}-\d{2}-\d{2}/);
});

function withRecords(snapshot: RaceGraphSnapshot, records: RaceGraphSnapshot["records"]): RaceGraphSnapshot {
  return { ...structuredClone(snapshot), records: [...structuredClone(snapshot.records), ...structuredClone(records)] };
}
