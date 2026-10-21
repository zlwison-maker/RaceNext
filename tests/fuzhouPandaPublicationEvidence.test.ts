import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createPublicRaceDetailResult, createPublicRaceListResult } from "../lib/raceGraphPublic.ts";
import { evaluatePrePublishFactGate } from "../lib/prePublishFactGate.ts";
import { buildCanonicalReleaseManifest } from "../scripts/release/canonicalRelease.ts";
import { assertRaceGraphSnapshot } from "../scripts/race-update/validation.ts";
import { assertRaceSourceRegistry, activeFreshnessSources } from "../scripts/race-update/sourceRegistry.ts";
import type { RaceGraphSnapshot, RaceSourceRegistry } from "../types/raceUpdate.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url));
const graph = JSON.parse(read("data/canonical/race-graph-v1.json").toString()) as RaceGraphSnapshot;
const registry = JSON.parse(read("data/sources/race-source-registry.json").toString()) as RaceSourceRegistry;
const fz = graph.records.find(r => r.edition.editionId === "fuzhou-marathon-2026")!;
const panda = graph.records.find(r => r.edition.editionId === "panda-shudao-shan-2027")!;
const ruleHash = "b5b07e1c2853d24f746ad214c2d70df185a54440419368128631c0d6d1587a75";

test("Fuzhou date and both route endpoints have official image evidence; generic 07:30 stays unverified; nominal distances use explicit secondary evidence", () => {
  equal(fz.edition.raceDate, "2026-12-27");
  const kv = fz.edition.governance.sources.find(s => s.sourceRecordId === "fuzhou-marathon-official-kv-2026")!;
  equal(kv.sourceType, "official"); equal(kv.rawData?.contentHash, "46edc29c4fa5454c65d3be09388aa6356895893bb458f982de889bf23c46b097");
  equal(kv.rawData?.raceDate, fz.edition.raceDate);
  equal(fz.categories.length, 2);
  for (const [index, c] of fz.categories.entries()) {
    equal(c.startLocation, "五一广场"); equal(c.finishLocation, "海峡国际会展中心");
    equal(c.startAt, null); equal(c.startTimes, null); equal(c.distanceKm, [42.195, 21.0975][index]); equal(c.cutoffTimeHours, null);
    ok(!c.governance.fieldSources.startAt); equal(c.governance.fieldSources.distanceKm.sourceType, "media");
    ok(c.governance.missingFields.includes("startAt") && !c.governance.missingFields.includes("distanceKm"));
    const evidence = c.governance.sources[0]; equal(evidence.rawData?.categoryId, c.categoryId);
    equal(evidence.rawData?.contentHash, "b331b7bc81880b68e6ade544e76996c80a1f099bd197ea515a7f734398dc7584");
    equal(evidence.rawData?.startLocation, c.startLocation); equal(evidence.rawData?.finishLocation, c.finishLocation);
    equal(c.governance.fieldSources.startLocation.sourceType, "official");
  }
  const reporter = registry.editions.find(e => e.editionId === fz.edition.editionId)!.sources.find(s => s.sourceId === "fuzhou-marathon-launch-media-2026")!;
  equal(reporter.tier, "trusted_secondary"); equal(reporter.sourceType, "media_report");
  ok(!activeFreshnessSources(registry, fz.edition.editionId).some(s => s.sourceId === reporter.sourceId));
});

test("Panda profiles use the current 2027 rules, distinct wave times and approximate climbs without 2026 reuse", () => {
  deepEqual([panda.edition.raceDate, panda.edition.endDate], ["2027-03-26", "2027-03-28"]);
  deepEqual(panda.categories.map(c => c.distanceKm), [160, 105, 85, 60, 25]);
  deepEqual(panda.categories.map(c => c.elevationGain), [9300, 5550, 4600, 2600, 1100]);
  deepEqual(panda.categories.map(c => c.cutoffTimeHours), [46, 29, 24, 12.5, 6.5]);
  deepEqual(panda.categories.map(c => c.startAt), ["2027-03-26T15:30:00+08:00", "2027-03-27T06:00:00+08:00", "2027-03-27T10:00:00+08:00", "2027-03-27T08:00:00+08:00", "2027-03-28T09:00:00+08:00"]);
  deepEqual(panda.categories.map(c => c.startTimes?.length), [1, 1, 1, 3, 3]);
  deepEqual(panda.categories.map(c => c.startLocation), ["白鹿音乐广场", "白鹿音乐广场", "海窝子古镇", "龙门山镇宝山广场", "白鹿音乐广场"]);
  for (const c of panda.categories) {
    equal(c.finishLocation, "白鹿音乐广场"); equal(c.coursePoints, null);
    equal(c.coursePointDataStatus, "unknown");
    const s = c.governance.sources[0]; equal(s.rawData?.editionYear, 2027); equal(s.rawData?.contentHash, ruleHash);
    equal(s.rawData?.categoryId, c.categoryId); equal(s.rawData?.elevationQualifier, "约"); equal(s.rawData?.actualCourseDistanceKm, null);
    ok(JSON.stringify(s.rawData?.referenceChain).includes("gameDetailGuide?id=7664"));
    ok(JSON.stringify(s.rawData?.referenceChain).includes("nav_id=5423&game_id=7664"));
    for (const field of ["startAt", "startTimes", "startLocation", "finishLocation", "elevationGain", "cutoffTimeHours", "distanceKm"] as const) deepEqual(s.rawData?.[field], c[field]);
  }
});

test("85K cubed remains one explicit team Category, never individual 85K or 255km", () => {
  const c = panda.categories.find(c => c.categoryId.endsWith("-85k"))!;
  equal(c.categoryName, "85K³（团队赛）"); equal(c.shortName, "85K³（团队赛）"); equal(c.distanceKm, 85);
  ok(c.qualificationRules?.includes("2人/3人") && c.qualificationRules.includes("每位队员") && c.qualificationRules.includes("2分钟"));
  deepEqual(c.governance.sources[0].rawData?.teamEvidence, {feeForTwo:1760, feeForThree:2400, allMembersMustQualify:true, cpPunchGapMinutes:2});
});

test("19 Edition Fact Gates and API pass after Human accepts supplied image; explicit publication holds still fail closed", () => {
  assertRaceGraphSnapshot(graph); assertRaceSourceRegistry(registry);
  const factReady = graph.records.filter(r => evaluatePrePublishFactGate(r, registry.editions.find(e => e.editionId === r.edition.editionId)).publishable);
  equal(factReady.length, 19);
  const list = createPublicRaceListResult(graph); equal(list.status, 200); if (list.status !== 200) return;
  equal(list.body.races.length, 19); equal(createPublicRaceDetailResult(graph, fz.edition.editionId).status, 200);
  equal(createPublicRaceDetailResult(graph, panda.edition.editionId).status, 200);
  deepEqual(panda.edition.governance.internalFlags, []);
  const assets = JSON.parse(read("data/assets/race-image-assets-v1.json").toString()).assets;
  const image = assets.find((a: {assetId: string}) => a.assetId === "panda-shudao-shan-2027-cover");
  deepEqual([image.width, image.height], [480, 189]); equal(image.qualityStatus, "needs_higher_resolution");
  const manifest = buildCanonicalReleaseManifest(graph, registry, "a".repeat(40)); equal(manifest.expected.length, 20);
  ok(manifest.expected.some(e => e.path.endsWith(panda.edition.editionId)));
  // An explicit publication hold still blocks an otherwise fact-ready Edition.
  const held = structuredClone(graph);
  held.records.find(r => r.edition.editionId === panda.edition.editionId)!.edition.governance.internalFlags = ["do_not_publish"];
  const heldList = createPublicRaceListResult(held); equal(heldList.status, 200);
  if (heldList.status === 200) equal(heldList.body.races.length, 18);
  equal(createPublicRaceDetailResult(held, panda.edition.editionId).status, 404);
  ok(!buildCanonicalReleaseManifest(held, registry, "a".repeat(40)).expected.some(e => e.path.endsWith(panda.edition.editionId)));
  const detail = createPublicRaceDetailResult(graph, panda.edition.editionId); equal(detail.status, 200);
  if (detail.status === 200) {
    equal(detail.body.race.categories.length, 5); equal(detail.body.race.accommodationRecommendations.length, 5);
    equal(detail.body.race.raceStrategy, null); ok(detail.body.race.categories.every(c => c.coursePoints === null));
    equal(detail.body.race.categories.find(c => c.categoryId.endsWith("-85k"))!.name, "85K³（团队赛）");
  }
});

test("official-date mutation or removing date evidence still fails closed", () => {
  for (const record of [fz, panda]) {
    const mutated = structuredClone(record); mutated.edition.raceDate = `${record.edition.editionYear}-02-01`;
    equal(evaluatePrePublishFactGate(mutated).publishable, false);
    const missing = structuredClone(record); missing.edition.governance.sources = [];
    equal(evaluatePrePublishFactGate(missing).publishable, false);
  }
});
