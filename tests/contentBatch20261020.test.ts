import { deepEqual, equal, ok } from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import sharp from "sharp";
import { batch20261020RaceGuides } from "../data/race-guides/batch-20261020.ts";
import { batch20261020Hotels, batch20261020Recommendations } from "../data/accommodations/batch-20261020.ts";
import { getRaceAccommodationRecommendations } from "../data/accommodations/index.ts";
import { getRaceStrategyContent } from "../data/race-strategies/index.ts";
import { createPublicRaceDetailResult, createPublicRaceListResult } from "../lib/raceGraphPublic.ts";
import { evaluatePrePublishFactGate } from "../lib/prePublishFactGate.ts";
import { assertRaceGraphSnapshot } from "../scripts/race-update/validation.ts";
import { assertRaceSourceRegistry, activeFreshnessSources } from "../scripts/race-update/sourceRegistry.ts";
import { buildRaceDailyCheckTargets } from "../scripts/race-update/dailyCheck.ts";
import { buildCanonicalReleaseManifest } from "../scripts/release/canonicalRelease.ts";
import type { RaceGraphSnapshot, RaceSourceRegistry } from "../types/raceUpdate.ts";
import { existingTwelveEditionIds, expectedPublicEditionIds, newPublicEditionIds, stagedEditionIds } from "./fixtures/contentBatch20261020.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url));
const graph = JSON.parse(read("data/canonical/race-graph-v1.json").toString()) as RaceGraphSnapshot;
const registry = JSON.parse(read("data/sources/race-source-registry.json").toString()) as RaceSourceRegistry;
const frozen = read("docs/project/inputs/RACENEXT_7_RACE_CONTENT_V2_20261020.md").toString();
const eventIds = Object.keys(batch20261020RaceGuides);
const newRecords = graph.records.filter(r => eventIds.includes(r.event.eventId));
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

test("seven V2 Guides retain every frozen paragraph in order, without either unapproved Strategy", () => {
  equal(eventIds.length, 7);
  const starts = ["### A. 2027 凯乐石 FUGA 广州100｜Human Approved", "### B. 2026 南京马拉松｜Human Approved", "### C. 2026 绍兴马拉松｜Human Approved", "# 2026 深圳马拉松｜Race Guide", "# 2026 福州马拉松｜Race Guide", "## 三、Race Guide｜Human Approved 原文", "# 2027 熊猫蜀道山超级越野赛｜Race Guide"];
  const ends = ["**100K Race Strategy｜", starts[2], starts[3], starts[4], starts[5], starts[6], "## 4. Accommodation｜35 家"];
  Object.values(batch20261020RaceGuides).forEach((g, i) => {
    const start = frozen.indexOf(starts[i]) + starts[i].length;
    const body = frozen.slice(start, frozen.indexOf(ends[i], start));
    const paragraphs = [...g.impression.paragraphs.map(p => p.text), ...g.viewpoint.paragraphs.map(p => p.text), ...g.evidence.sections.flatMap(s => s.paragraphs), ...g.suitability.items.flatMap(s => s.paragraphs.map(p => p.text)), g.transition];
    let cursor = 0;
    for (const p of paragraphs) { ok(p); const index = body.indexOf(p!, cursor); ok(index >= cursor, `Frozen paragraph missing/reordered: ${eventIds[i]}`); cursor = index + p!.length; }
    const sourceParagraphs = body.split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !p.startsWith("#") && !p.startsWith("**") && p !== "---" && p !== "（Human Approved · Frozen）");
    for (const p of sourceParagraphs) ok(paragraphs.includes(p), `Frozen body omitted: ${eventIds[i]} ${p}`);
    equal(g.evidence.sections.length, 3); equal(g.suitability.items.length, 3);
  });
  equal(getRaceStrategyContent("guangzhou-100"), null);
  equal(getRaceStrategyContent("panda-shudao-shan"), null);
});

test("all 35 approved hotel names, order, copy and opaque Ctrip actions match V2 exactly", () => {
  const section = frozen.slice(frozen.indexOf("## 4. Accommodation｜35 家"));
  const paths = [...section.matchAll(/^(\/pages\/hotel\/detail\/index\?[^\n]+)$/gm)].map(m => m[1]);
  const names = [...section.matchAll(/^(?:\d\. \*\*(.+)\*\*|### 0\d｜(.+))$/gm)].map(m => m[1] ?? m[2]);
  const titles = [...section.matchAll(/recommendationTitle`?：(.+)$/gm)].map(m => m[1]);
  const reasons = [...section.matchAll(/recommendationReason`?：(.+)$/gm)].map(m => m[1]);
  equal(paths.length, 35); equal(batch20261020Hotels.length, 35); equal(batch20261020Recommendations.length, 35);
  batch20261020Hotels.forEach((h, i) => {
    equal(h.hotelName, names[i]); equal(h.actions.wechat?.appId, "wx0e6ed4f51db9d078"); equal(h.actions.wechat?.path, paths[i]);
    equal(h.hotelId, `ctrip-${paths[i].match(/[?&]id=(\d+)/)![1]}`);
    const rec = batch20261020Recommendations[i]; equal(rec.hotelId, h.hotelId);
    equal(rec.recommendationTitle, titles[i]); equal(rec.recommendationReason, reasons[i]); equal(rec.displayOrder, i % 5 + 1);
  });
  for (const r of newRecords) {
    const items = getRaceAccommodationRecommendations(r.edition.editionId);
    equal(items.length, 5);
    deepEqual(items.map(x => x.hotel.hotelId), batch20261020Recommendations.filter(x => x.editionId === r.edition.editionId).map(x => x.hotelId));
  }
});

test("existing Fact Gate accepts supplemented facts; Public API retains the Human Panda image hold", () => {
  assertRaceGraphSnapshot(graph); assertRaceSourceRegistry(registry);
  equal(graph.records.length, 19); equal(newRecords.length, 7);
  const list = createPublicRaceListResult(graph); equal(list.status, 200); if (list.status !== 200) return;
  deepEqual(new Set(list.body.races.map(r => r.editionId)), new Set(expectedPublicEditionIds));
  ok(existingTwelveEditionIds.every(id => list.body.races.some(r => r.editionId === id)));
  for (const r of newRecords) {
    const id = r.edition.editionId;
    const gate = evaluatePrePublishFactGate(r, registry.editions.find(e => e.editionId === id));
    const detail = createPublicRaceDetailResult(graph, id);
    if (stagedEditionIds.includes(id)) {
      equal(gate.publishable, true); equal(r.edition.raceDate, "2027-03-26"); equal(r.edition.lifecycleStatus, "active"); equal(detail.status, 404);
      deepEqual(r.edition.governance.internalFlags, ["do_not_publish"]);
      ok(r.categories.every(c => c.governance.verificationStatus === "verified"));
    } else {
      ok(newPublicEditionIds.includes(id)); deepEqual(gate.issues, []); equal(gate.publishable, true); equal(detail.status, 200);
      if (detail.status === 200) {
        equal(detail.body.race.name, r.edition.editionName);
        equal(detail.body.race.accommodationRecommendations.length, 5); ok(detail.body.race.raceGuide);
        equal(detail.body.race.raceStrategy, null);
        equal(detail.body.race.coverImage, detail.body.race.heroImage);
        ok(!JSON.stringify(detail.body).includes("contentHash"));
      }
    }
  }
  const manifest = buildCanonicalReleaseManifest(graph, registry, "a".repeat(40));
  equal(manifest.expected.length, 19); // list + 18 public details; image-held Panda does not enter deployment manifest.
});

test("official category precision, wave times and conflict isolation do not infer missing facts", () => {
  const gz = newRecords.find(r => r.event.eventId === "guangzhou-100")!;
  deepEqual(gz.categories.map(c => c.distanceKm), [100, 55, 30, 10, 10]);
  deepEqual(gz.categories.map(c => c.startTimes?.length), [3, 4, 6, 1, 1]);
  equal(gz.categories[0].startAt, "2027-01-15T19:30:00+08:00"); equal(gz.categories[0].elevationGain, 5456);
  equal(gz.categories[1].cutoffTimeHours, null); equal(gz.categories[1].governance.verificationStatus, "pending");
  ok(gz.categories.every(c => c.startLocation === null && c.finishLocation === null && c.coursePoints === null));
  const detail = createPublicRaceDetailResult(graph, gz.edition.editionId); equal(detail.status, 200);
  if (detail.status === 200) ok(!detail.body.race.categories.some(c => c.categoryId === gz.categories[1].categoryId));
  const sz = newRecords.find(r => r.event.eventId === "shenzhen-marathon")!;
  equal(sz.edition.raceDate, "2026-12-06"); equal(sz.categories[0].startAt, "2026-12-06T07:00:00+08:00"); equal(sz.categories.length, 1);
  for (const id of ["shaoxing-marathon", "hengqin-marathon"]) {
    const r = newRecords.find(r => r.event.eventId === id)!;
    deepEqual(r.categories.map(c => c.distanceKm), [42.195, 21.0975]);
    ok(r.categories.every(c => c.startAt === null && c.startTimes === null && c.elevationGain === null));
  }
  const nj = newRecords.find(r => r.event.eventId === "nanjing-marathon")!;
  equal(nj.categories[0].startTimes?.length, 3); equal(nj.categories[0].cutoffTimeHours, null);
});

test("new registry identities are unique, domain-matched and usable without changing daily discovery or approval rules", () => {
  equal(registry.editions.length, 19);
  const sourceIds = registry.editions.flatMap(e => e.sources.map(s => s.sourceId)); equal(new Set(sourceIds).size, sourceIds.length);
  for (const r of newRecords) {
    const e = registry.editions.find(e => e.editionId === r.edition.editionId)!; ok(e);
    for (const s of e.sources) equal(new URL(s.url).hostname, s.domain);
    ok(activeFreshnessSources(registry, e.editionId).length >= 1);
  }
  const targets = buildRaceDailyCheckTargets(graph, registry, "2026-10-20T09:00:00Z");
  for (const r of newRecords) ok(targets.some(t => t.editionId === r.edition.editionId));
  const fz = registry.editions.find(e => e.editionId === "fuzhou-marathon-2026")!;
  equal(fz.sources[1].tier, "trusted_secondary"); equal(fz.sources[1].sourceType, "media_report");
  ok(!activeFreshnessSources(registry, fz.editionId).some(s => s.sourceId === fz.sources[1].sourceId));
});

test("seven deduplicated display assets preserve originals, stay within budget and never enlarge display pixels", async () => {
  const assets = JSON.parse(read("data/assets/race-image-assets-v1.json").toString()).assets;
  const paths = new Set<string>(); let bytes = 0;
  for (const r of newRecords) {
    const pair = assets.filter((a: {editionId: string}) => a.editionId === r.edition.editionId);
    equal(pair.length, 2); equal(pair[0].publicPath, pair[1].publicPath); equal(pair[0].sha256, pair[1].sha256);
    const a = pair[0]; ok(!paths.has(a.publicPath)); paths.add(a.publicPath);
    const b = read(`public${a.publicPath}`), original = read(`public${a.originalPublicPath}`);
    equal(sha(b), a.sha256); equal(sha(original), a.original.sha256); equal(b.length, a.fileSizeBytes);
    ok(b.length <= 600 * 1024); bytes += b.length;
    const meta = await sharp(b).metadata(); equal(meta.format, "jpeg"); equal(meta.width, a.width); equal(meta.height, a.height);
    ok(a.width <= a.original.width && a.height <= a.original.height); equal(a.source.sourceUrl, null); equal(a.source.usageRightsStatus, "human_approved");
  }
  equal(paths.size, 7); ok(bytes <= 4.1 * 1024 * 1024);
  equal(assets.find((a: {assetId: string}) => a.assetId === "guangzhou-100-2027-cover").imageYear, 2026);
  equal(assets.find((a: {assetId: string}) => a.assetId === "shaoxing-marathon-2026-cover").imageYear, 2025);
  equal(assets.find((a: {assetId: string}) => a.assetId === "panda-shudao-shan-2027-cover").qualityStatus, "needs_higher_resolution");
});
