import { deepEqual, equal, ok } from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import sharp from "sharp";
import { batch20261119RaceGuides } from "../data/race-guides/batch-20261119.ts";
import { getRaceAccommodationRecommendations } from "../data/accommodations/index.ts";
import { getRaceStrategyContent } from "../data/race-strategies/index.ts";
import { createPublicRaceDetailResult, createPublicRaceListResult } from "../lib/raceGraphPublic.ts";
import { evaluatePrePublishFactGate } from "../lib/prePublishFactGate.ts";
import { assertRaceGraphSnapshot } from "../scripts/race-update/validation.ts";
import { loadRaceSourceRegistry, activeFreshnessSources } from "../scripts/race-update/sourceRegistry.ts";
import type { RaceGraphSnapshot } from "../types/raceUpdate.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z0-9]+$/i.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* Try the original specifier. */ }
    }
    return nextResolve(specifier, context);
  },
});
const { createRaceDetailViewModel, selectRaceCategory } = await import("../miniprogram/utils/raceDetailPresentation.ts");
const { createRaceShareConfig } = await import("../miniprogram/utils/raceShare.ts");
const { openHotelMiniProgram } = await import("../miniprogram/services/accommodation.ts");
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url));
const graph = JSON.parse(read("data/canonical/race-graph-v1.json").toString()) as RaceGraphSnapshot;
const registry = await loadRaceSourceRegistry(new URL("../data/sources/race-source-registry.json", import.meta.url).pathname);
const eventIds = ["standard-chartered-hong-kong-marathon", "ultra-trail-mogan-by-utmb"] as const;
const files = ["RACENEXT_2027_HK_MARATHON_FINAL_INTEGRATION_20261119.md", "RACENEXT_2027_MOGAN_UTMB_FINAL_INTEGRATION_20261119.md"];
const packages = files.map(file => read(`docs/project/inputs/two-races-20261119/${file}`).toString());
const records = eventIds.map(id => graph.records.find(r => r.event.eventId === id)!);

test("both guides preserve every approved paragraph, heading and closing in order", () => {
  for (const [index, id] of eventIds.entries()) {
    const source = packages[index].split("## 2｜Race Guide：")[1].split("## 3｜住宿")[0];
    const guide = batch20261119RaceGuides[id];
    const expected = source.split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !p.startsWith("#") && !p.startsWith("来自 V2")).map(p => p.replace(/^\*\*|\*\*$/g, ""));
    const actual = [
      ...guide.impression.paragraphs.map(p => p.text), ...guide.viewpoint.paragraphs.map(p => p.text),
      ...guide.evidence.sections.flatMap(s => s.paragraphs),
      ...guide.suitability.items.flatMap(s => s.paragraphs.map(p => p.text)), guide.transition,
    ];
    deepEqual(actual, expected, id);
    const headings = [guide.impression.title, guide.viewpoint.title, guide.evidence.title, guide.suitability.title, ...guide.evidence.sections.map(s => s.title), ...guide.suitability.items.map(s => s.title)];
    for (const heading of headings) ok(source.includes(heading));
    equal(getRaceStrategyContent(id), null);
  }
});

test("all ten Human-selected hotel identities, copy and opaque Ctrip paths round-trip exactly", () => {
  const guids = new Set<string>();
  for (const [index, record] of records.entries()) {
    const source = packages[index].split("## 3｜住宿")[1].split("## 4｜")[0];
    const cards = source.split(/^### 0\d｜/m).slice(1);
    const actual = getRaceAccommodationRecommendations(record.edition.editionId);
    equal(actual.length, 5);
    for (const [position, item] of actual.entries()) {
      const card = cards[position];
      const field = (key: string) => card.match(new RegExp(`\\*\\*${key}：\\*\\*\\s*([^\\n]+)`))![1].trim().replace(/^`|`$/g, "");
      const path = card.match(/```text\n([^\n]+)\n```/)![1];
      equal(item.hotel.hotelName, field("hotelName"));
      equal(item.hotel.hotelId, `ctrip-${field("hotelId")}`);
      equal(item.hotel.actions.wechat?.appId, field("appId"));
      equal(item.hotel.actions.wechat?.path, path);
      equal(item.recommendation.recommendationTitle, field("recommendationTitle"));
      equal(item.recommendation.recommendationReason, field("recommendationReason"));
      equal(item.recommendation.displayOrder, position + 1);
      const query = new URL(`https://example.invalid${path}`).searchParams;
      equal(query.get("id"), field("hotelId"));
      equal(query.get("AllianceID"), "9729651"); equal(query.get("sid"), "327120872");
      guids.add(query.get("guid")!);
    }
  }
  equal(guids.size, 10);
  ok(getRaceAccommodationRecommendations(records[1].edition.editionId)[0].hotel.actions.wechat?.path.startsWith("/pages/hotel/detail/index?biz=1&id=1748643&inday=2026-11-19&outday=2026-11-20&"));
});

test("Hong Kong retains three starts and excludes incomplete side projects and January 16 races", () => {
  const record = records[0];
  equal(record.edition.editionName, "渣打香港馬拉松2027");
  equal(record.edition.timezone, "Asia/Hong_Kong");
  equal(record.edition.registrationStatus, "registration_closed");
  equal(record.edition.registrationUrl, null);
  const marathon = record.categories[0];
  deepEqual(marathon.startTimes, ["2027-01-17T06:00:00+08:00", "2027-01-17T06:25:00+08:00", "2027-01-17T06:50:00+08:00"]);
  equal(marathon.startAt, null); equal(marathon.distanceKm, 42.195); equal(marathon.cutoffTimeHours, 6);
  equal(marathon.startLocation, "九龍尖沙咀彌敦道"); equal(marathon.finishLocation, "香港維多利亞公園");
  equal(record.categories.length, 4);
  ok(record.categories.slice(1).every(c => c.governance.verificationStatus === "pending"));
  const result = createPublicRaceDetailResult(graph, record.edition.editionId);
  equal(result.status, 200); if (result.status !== 200) return;
  deepEqual(result.body.race.categories.map(c => c.categoryId), [marathon.categoryId]);
  const view = createRaceDetailViewModel(result.body.race);
  equal(view.showCategorySelector, false);
  equal(view.showRaceStrategy, false);
});

test("all ten hotel CTAs pass their exact actions to the existing release navigation function", () => {
  const previous = Reflect.get(globalThis, "wx");
  const calls: Array<{ appId: string; path: string; envVersion: string }> = [];
  let successes = 0;
  Reflect.set(globalThis, "wx", {
    navigateToMiniProgram(options: { appId: string; path: string; envVersion: string; success(): void }) {
      calls.push({ appId: options.appId, path: options.path, envVersion: options.envVersion });
      options.success();
    },
  });
  try {
    const expected = records.flatMap(record => getRaceAccommodationRecommendations(record.edition.editionId))
      .map(({ hotel }) => hotel.actions.wechat!);
    for (const action of expected) {
      openHotelMiniProgram(action, { success: () => { successes++; }, fail: () => { throw new Error("Unexpected hotel navigation failure"); } });
    }
    deepEqual(calls, expected.map(({ appId, path }) => ({ appId, path, envVersion: "release" })));
    equal(successes, 10);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(globalThis, "wx");
    else Reflect.set(globalThis, "wx", previous);
  }
});

test("Mogan uses the reviewed nominal distances and preserves distinct actual-page evidence and starts", () => {
  const record = records[1];
  equal(record.edition.editionName, "2027 莫干山越野赛 by UTMB®");
  deepEqual([record.edition.raceDate, record.edition.endDate], ["2027-04-16", "2027-04-18"]);
  equal(record.edition.registrationStatus, "unknown");
  equal(registry.editions.find(e => e.editionId === record.edition.editionId)!.sources.find(s => s.sourceId.endsWith("-nmg-2027"))!.status, "pending_review");
  ok(!activeFreshnessSources(registry, record.edition.editionId).some(s => s.sourceId.endsWith("-nmg-2027")));
  deepEqual(record.categories.map(c => c.distanceKm), [100, 65, 50, 35, 20, 10]);
  deepEqual(record.categories.map(c => c.governance.sources[0].rawData?.pageDistanceKm), [96, 67, 52, 36, 23, 10]);
  deepEqual(record.categories.map(c => c.elevationGain), [5000, 3400, 2900, 1900, 1200, 300]);
  deepEqual(record.categories.map(c => c.cutoffTimeHours), [28, 19, 15, 11, 7, 3.5]);
  deepEqual(record.categories.map(c => c.startAt), ["2027-04-16T20:00:00+08:00", "2027-04-17T07:00:00+08:00", "2027-04-16T22:00:00+08:00", "2027-04-17T09:00:00+08:00", "2027-04-18T09:00:00+08:00", "2027-04-18T10:00:00+08:00"]);
  equal(record.categories[1].startLocation, "裸心谷生态度假区"); equal(record.categories[1].finishLocation, "郡安里");
  ok(record.categories.slice(3).every(c => c.startLocation === "郡安里" && c.finishLocation === "郡安里" && c.governance.verificationStatus === "pending"));
  ok(!/Jiameng|Dazhao|Liujiayan/.test(JSON.stringify(record)));
  ok(record.categories.every(c => c.coursePoints === null && c.coursePointDataStatus === "unknown"));
  const result = createPublicRaceDetailResult(graph, record.edition.editionId);
  equal(result.status, 200); if (result.status !== 200) return;
  deepEqual(result.body.race.categories.map(c => c.distanceKm), [100, 65, 50]);
  equal(result.body.race.raceStrategy, null);
  let view = createRaceDetailViewModel(result.body.race);
  equal(view.showCategorySelector, true);
  view = selectRaceCategory(view, record.categories[1].categoryId);
  equal(view.selectedCategoryId, record.categories[1].categoryId);
  equal(view.showRaceStrategy, false);
});

test("Mogan Chinese locations retain original English evidence and conflicting groups stay withheld", () => {
  const record = records[1];
  deepEqual(record.categories.slice(0, 3).map(c => [c.startLocation, c.finishLocation]), [
    ["郡安里", "郡安里"], ["裸心谷生态度假区", "郡安里"], ["郡安里", "郡安里"],
  ]);
  for (const [index, c] of record.categories.entries()) {
    const original = c.governance.sources[0];
    equal(original.rawData?.startLocation, index === 1 ? "naked Stables" : index < 3 ? "Jun'anli" : "J.LALLI VALLEY");
    const startSource = c.governance.fieldSources.startLocation;
    const finishSource = c.governance.fieldSources.finishLocation;
    ok(startSource); ok(finishSource);
    ok(c.governance.sources.some(s => s.sourceName === startSource.sourceName && s.rawData?.evidenceText));
    ok(c.governance.sources.some(s => s.sourceName === finishSource.sourceName && s.rawData?.evidenceText));
    if (index >= 3) {
      equal(c.governance.verified, false);
      equal(c.governance.verificationStatus, "pending"); equal(c.governance.verifiedAt, null);
      const rule = c.governance.sources.find(s => s.sourceRecordId?.endsWith("-official-rulebook-image-2027"))!;
      const facts = rule.rawData?.categoryFacts as { elevationGain: number; actualCourseDistanceKm: number };
      equal(facts.elevationGain, [2180, 1260, 340][index - 3]);
      equal(facts.actualCourseDistanceKm, [35.6, 23, 11.3][index - 3]);
      ok(facts.elevationGain !== c.elevationGain);
      ok(String(rule.rawData?.conflictResolution).includes("Human decision required"));
      ok(!c.governance.missingFields.includes("finishLocation"));
    }
  }
  const response = createPublicRaceDetailResult(graph, record.edition.editionId);
  equal(response.status, 200); if (response.status !== 200) return;
  deepEqual(response.body.race.categories.map(c => c.name), ["DMG 100K", "CMG 65K", "MMG 50K"]);
  let view = createRaceDetailViewModel(response.body.race);
  for (const category of response.body.race.categories) {
    view = selectRaceCategory(view, category.categoryId);
    equal(view.selectedCategoryId, category.categoryId);
    ok(!/Jun'anli|naked Stables|J\.LALLI/.test(JSON.stringify(view)));
  }
});

test("unresolved registration has a visible truthful fallback without inferring a race place", () => {
  const response = createPublicRaceDetailResult(graph, records[1].edition.editionId);
  equal(response.status, 200); if (response.status !== 200) return;
  equal(response.body.race.registrationStatus, "unknown");
  equal(response.body.race.registrationUrl, null);
  const view = createRaceDetailViewModel(response.body.race);
  equal(view.registrationDisplay, "报名信息待确认");
  ok(view.headerMetaDisplay.includes("报名信息待确认"));
  ok(!view.headerMetaDisplay.includes("报名中"));
  const entry = records[1].edition.governance.sources.find(s => s.sourceRecordId?.endsWith("-official-lungking-entry-2027"))!;
  equal(entry.rawData?.registrationStatus, "APPLYING");
  equal(entry.rawData?.entryDoesNotConferRacePlace, true);
  const hongKong = createPublicRaceDetailResult(graph, records[0].edition.editionId);
  equal(hongKong.status, 200); if (hongKong.status !== 200) return;
  equal(createRaceDetailViewModel(hongKong.body.race).registrationDisplay, "报名已结束");
});

test("both Edition Fact Gates and public contracts pass without exposing internal evidence", () => {
  assertRaceGraphSnapshot(graph);
  const list = createPublicRaceListResult(graph); equal(list.status, 200);
  if (list.status !== 200) return;
  for (const record of records) {
    const entry = registry.editions.find(e => e.editionId === record.edition.editionId)!;
    deepEqual(evaluatePrePublishFactGate(record, entry).issues, []);
    ok(activeFreshnessSources(registry, record.edition.editionId).length > 0);
    ok(list.body.races.some(r => r.editionId === record.edition.editionId));
    const response = createPublicRaceDetailResult(graph, record.edition.editionId);
    equal(response.status, 200); if (response.status !== 200) continue;
    equal(response.body.race.accommodationRecommendations.length, 5);
    ok(response.body.race.raceGuide);
    ok(!/"(?:evidence|governance|pending|contentHash|sourceRecordId|pageDistanceKm)":/.test(JSON.stringify(response.body)));
    const share = createRaceShareConfig({ editionId: record.edition.editionId, raceId: record.event.eventId, name: record.edition.editionName, coverImage: record.edition.coverImage ?? null, heroImage: record.edition.heroImage ?? null });
    equal(share.appMessage.path, `/pages/races/detail/index?editionId=${record.edition.editionId}&source=share`);
    ok(share.appMessage.imageUrl?.endsWith("/share-cover-5x4.jpg"));
  }
});

test("each shared Cover/Hero retains original hashes, lightweight pixels and unverified rights", async () => {
  const assets = JSON.parse(read("data/assets/race-image-assets-v1.json").toString()).assets;
  for (const record of records) {
    const pair = assets.filter((a: {editionId: string}) => a.editionId === record.edition.editionId);
    equal(pair.length, 2); equal(pair[0].publicPath, pair[1].publicPath);
    equal(record.edition.coverImage, record.edition.heroImage);
    const asset = pair[0]; const display = read(`public${asset.publicPath}`); const original = read(`public${asset.originalPublicPath}`);
    const sha = (body: Buffer) => createHash("sha256").update(body).digest("hex");
    equal(sha(display), asset.sha256); equal(sha(original), asset.original.sha256);
    equal(display.length, asset.fileSizeBytes); ok(display.length <= 600 * 1024);
    const metadata = await sharp(display).metadata();
    equal(metadata.format, "jpeg"); equal(metadata.width, asset.width); equal(metadata.height, asset.height);
    ok(asset.width <= asset.original.width && asset.height <= asset.original.height);
    equal(asset.source.type, "user_provided"); equal(asset.source.usageRightsStatus, "unverified");
    equal(asset.source.sourceUrl, null); equal(asset.qualityStatus, "temporary");
    const share = await sharp(read(`public${asset.publicPath.replace(/[^/]+$/, "share-cover-5x4.jpg")}`)).metadata();
    equal(share.width! * 4, share.height! * 5);
  }
});
