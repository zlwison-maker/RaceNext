import { deepEqual, equal, ok } from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import sharp from "sharp";
import {
  batch20261123Hotels,
  batch20261123Recommendations,
  heldHuangshanHotelRecommendationId,
} from "../data/accommodations/batch-20261123.ts";
import { getRaceAccommodationRecommendations } from "../data/accommodations/index.ts";
import { getRaceEditorialContent } from "../data/race-guides/index.ts";
import { getRaceStrategyContent } from "../data/race-strategies/index.ts";
import { evaluatePrePublishFactGate } from "../lib/prePublishFactGate.ts";
import { createPublicRaceDetailResult, createPublicRaceListResult } from "../lib/raceGraphPublic.ts";
import { loadRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import type { RaceGraphSnapshot } from "../types/raceUpdate.ts";
import { expectedPublicEditionIds, huangshanEditionId, outopiaEditionId } from "./fixtures/contentBatch20261020.ts";

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
const batchInputs = "docs/project/inputs/two-races-20261123";
const manifest = JSON.parse(read(`${batchInputs}/manifest.json`).toString()) as { appid: string; events: PackageEvent[] };
const graph = JSON.parse(read("data/canonical/race-graph-v1.json").toString()) as RaceGraphSnapshot;
const registry = await loadRaceSourceRegistry();
const outopia = graph.records.find(({ edition }) => edition.editionId === outopiaEditionId)!;
const huangshan = graph.records.find(({ edition }) => edition.editionId === huangshanEditionId)!;

type PackageEvent = {
  eventId_candidate: string;
  editionId_candidate: string;
  delivery_file: string;
  image_original: string;
  image_sha256: string;
  image_width: number;
  image_height: number;
  image_bytes: number;
  hotels: Array<{
    rank: number;
    hotelId: string;
    hotelName: string;
    recommendationTitle: string;
    recommendationReason: string;
    appId: string;
    path: string;
  }>;
};

test("both Race Guides preserve the approved A–E wording, paragraphs and headings in order", () => {
  for (const entry of manifest.events) {
    const input = read(`${batchInputs}/${entry.delivery_file}`).toString().split("## 02｜")[1].split("## 3｜")[0];
    const approved = input.split(/^### [A-E]｜/m).slice(1).map(section =>
      section.trim().split(/\n\s*\n/).map(text => text.trim().replaceAll("**", "")),
    );
    const guide = getRaceEditorialContent(entry.eventId_candidate)!;
    deepEqual([
      [guide.impression.title, ...guide.impression.paragraphs.map(({ text }) => text)],
      [guide.viewpoint.title, ...guide.viewpoint.paragraphs.map(({ text }) => text)],
      [guide.evidence.title, ...guide.evidence.sections.map(section => `${section.number}｜${section.title} ${section.paragraphs.join("\n")}`)],
      [guide.suitability.title, ...guide.suitability.items.map(item => `${item.title} ${item.paragraphs.map(({ text }) => text).join("\n")}`)],
      [approved[4][0], guide.transition],
    ], approved, entry.eventId_candidate);
    equal(getRaceStrategyContent(entry.eventId_candidate), null);
  }
});

test("all ten approved hotels and opaque actions survive storage and existing release navigation", () => {
  const previous = Reflect.get(globalThis, "wx");
  const calls: Array<{ appId: string; path: string; envVersion: string }> = [];
  Reflect.set(globalThis, "wx", {
    navigateToMiniProgram(options: typeof calls[number] & { success(): void }) {
      const { appId, path, envVersion } = options;
      calls.push({ appId, path, envVersion });
      options.success();
    },
  });
  try {
    for (const entry of manifest.events) {
      const recommendations = batch20261123Recommendations.filter(({ editionId }) => editionId === entry.editionId_candidate)
        .map(recommendation => ({ recommendation, hotel: batch20261123Hotels.find(({ hotelId }) => hotelId === recommendation.hotelId)! }));
      deepEqual(getRaceAccommodationRecommendations(entry.editionId_candidate), recommendations.filter(
        ({ recommendation }) => recommendation.recommendationId !== heldHuangshanHotelRecommendationId,
      ));
      equal(recommendations.length, 5);
      for (const [position, { hotel, recommendation }] of recommendations.entries()) {
        const approved = entry.hotels[position];
        const action = hotel.actions.wechat!;
        equal(hotel.hotelName, approved.hotelName);
        equal(recommendation.displayOrder, approved.rank);
        equal(recommendation.recommendationTitle, approved.recommendationTitle);
        equal(recommendation.recommendationReason, approved.recommendationReason);
        equal(action.appId, manifest.appid);
        equal(action.appId, approved.appId);
        equal(action.path, approved.path);
        equal(new URLSearchParams(action.path.split("?")[1]).get("id"), approved.hotelId);
        openHotelMiniProgram(action, { success() {}, fail() { throw new Error("Unexpected hotel navigation failure"); } });
      }
    }
    deepEqual(calls, manifest.events.flatMap(({ hotels }) =>
      hotels.map(({ appId, path }) => ({ appId, path, envVersion: "release" }))));
    equal(calls.length, 10);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(globalThis, "wx");
    else Reflect.set(globalThis, "wx", previous);
  }
});

test("Outopia exposes each official wave, retains channel-level 16K sellout evidence and shows no CP or Strategy", () => {
  const result = createPublicRaceDetailResult(graph, outopiaEditionId);
  equal(result.status, 200);
  if (result.status !== 200) return;
  const race = result.body.race;
  const expectedTimes = [["06:00", "06:30"], ["07:00", "07:30", "08:00"], ["09:00", "09:30"]]
    .map(times => times.map(time => `2027-03-28T${time}:00+08:00`));
  deepEqual(race.categories.map(c => c.startTimes), expectedTimes);
  deepEqual(race.categories.map(c => [c.distanceKm, c.elevationGain, c.cutoffTimeHours]), [[41, 2814, 12], [31, 2010, 9.5], [16, 1099, 5.5]]);
  equal(race.raceDate, "2027-03-28");
  equal(race.registrationStatus, "registration_open");
  equal(race.raceStrategy, null);
  ok(race.categories.every(c => c.startAt === null && c.startLocation === "郡安里" && c.finishLocation === "郡安里" && c.coursePoints === null));
  const short = race.categories[2];
  equal(short.registrationUrl, null);
  equal(outopia.categories[2].governance.sources[0].rawData?.registrationAvailability, "sold_out_on_partner_channel");
  equal(outopia.categories[2].governance.sources[0].rawData?.unsupportedEarlierStart, "10:00");
  let view = createRaceDetailViewModel(race);
  equal(view.registrationDisplay, "报名中");
  equal(view.showCategorySelector, true);
  equal(view.showRaceStrategy, false);
  const share = createRaceShareConfig(view);
  const sharePath = "/races/outopia-mogan-cloud-flower-trail/2027/share-cover-5x4.jpg";
  equal(share.appMessage.imageUrl, sharePath);
  equal(share.timeline.imageUrl, sharePath);
  equal(share.appMessage.path, `/pages/races/detail/index?editionId=${outopiaEditionId}&source=share`);
  equal(share.timeline.query, `editionId=${outopiaEditionId}&source=share`);
  deepEqual(view.accommodationRecommendations.map(({ wechatAction }) => wechatAction?.path), manifest.events[0].hotels.map(({ path }) => path));
  for (const [index, category] of race.categories.entries()) {
    view = selectRaceCategory(view, category.categoryId);
    equal(view.selectedCategoryId, category.categoryId);
    const facts = [...view.selectedCategory!.coreFacts, ...view.selectedCategory!.executionFacts];
    const times = expectedTimes[index].map(time => time.slice(11, 16));
    for (const time of times) ok(facts.some(fact => fact.value.includes(time)), time);
  }
});

test("Huangshan publishes its five proven Categories, leaving unresolved locations and one risky hotel out", () => {
  for (const record of [outopia, huangshan]) {
    const gate = evaluatePrePublishFactGate(record, registry.editions.find(e => e.editionId === record.edition.editionId));
    deepEqual(gate.issues, []);
    equal(gate.publishable, true);
  }
  deepEqual([huangshan.edition.raceDate, huangshan.edition.endDate], ["2027-03-27", "2027-03-28"]);
  deepEqual(huangshan.edition.governance.sources[0].rawData?.pageHeaderDates, ["2027-03-28", "2027-03-29"]);
  deepEqual(huangshan.categories.map(c => [c.distanceKm, c.elevationGain, c.cutoffTimeHours]),
    [[100, 4900, 26], [75, 3100, 19], [50, 2100, 14], [35, 1100, 9], [20, 500, 6]]);
  deepEqual(huangshan.categories.map(({ startTimes }) => startTimes), [
    ["2027-03-27T05:30:00+08:00"],
    ["2027-03-27T06:30:00+08:00"],
    ["2027-03-27T07:30:00+08:00", "2027-03-27T08:00:00+08:00"],
    ["2027-03-28T08:00:00+08:00", "2027-03-28T08:30:00+08:00"],
    ["2027-03-28T09:00:00+08:00", "2027-03-28T09:30:00+08:00"],
  ]);
  ok(huangshan.categories.slice(2).every(({ startAt }) => startAt === null));
  equal(huangshan.categories[4].governance.sources[0].rawData?.elevationGainQualifier, "约 / subject to final course release");
  ok(huangshan.categories.every(c => c.startLocation === null && c.finishLocation === null
    && c.governance.verificationStatus === "pending" && c.governance.missingFields.includes("startLocation")
    && c.governance.missingFields.includes("finishLocation") && c.coursePoints === null));
  const result = createPublicRaceDetailResult(graph, huangshanEditionId);
  equal(result.status, 200);
  if (result.status !== 200) return;
  const { race } = result.body;
  equal(race.location.venue, "徽州古城府前广场");
  equal(race.raceStrategy, null);
  deepEqual(race.categories.map(c => c.categoryId), huangshan.categories.map(c => c.categoryId));
  ok(race.categories.every(c => c.startLocation === null && c.finishLocation === null && c.coursePoints === null));
  let view = createRaceDetailViewModel(race);
  equal(view.heroImage, race.coverImage);
  equal(view.heroMode, "aspectFill");
  equal(view.heroFocalPoint, "50% 50%");
  equal(view.showCategorySelector, true);
  const share = createRaceShareConfig(view);
  const sharePath = "/races/huangshan-huizhou-ancient-city-trail/2027/share-cover-5x4.jpg";
  equal(share.appMessage.imageUrl, sharePath);
  equal(share.timeline.imageUrl, sharePath);
  for (const category of race.categories) {
    view = selectRaceCategory(view, category.categoryId);
    equal(view.selectedCategoryId, category.categoryId);
    const times = category.startTimes!.map(time => time.slice(11, 16));
    const facts = view.selectedCategory!.executionFacts;
    ok(times.every(time => facts.some(fact => fact.value.includes(time))), category.categoryId);
    ok(facts.every(({ key }) => key !== "start" && key !== "finish" && key !== "startFinish"));
  }
  deepEqual(view.accommodationRecommendations.map(({ wechatAction }) => wechatAction?.path),
    manifest.events[1].hotels.slice(1).map(({ path }) => path));
  equal(race.accommodationRecommendations.some(({ recommendationId }) => recommendationId === heldHuangshanHotelRecommendationId), false);
  for (const key of ["governance", "rawData", "fieldSources", "missingFields", "verificationStatus", "mergeTrace"]) {
    ok(!JSON.stringify(race).includes('"' + key + '":'));
  }
  const list = createPublicRaceListResult(graph);
  equal(list.status, 200);
  if (list.status === 200) deepEqual(new Set(list.body.races.map(({ editionId }) => editionId)), new Set(expectedPublicEditionIds));
});

test("source photo bytes match the supplied originals and no undersized image is enlarged", async () => {
  for (const entry of manifest.events) {
    const folder = `public/races/${entry.eventId_candidate}/2027`;
    const extension = entry.image_original.split(".").at(-1);
    const original = read(`${folder}/original.${extension}`);
    equal(original.length, entry.image_bytes);
    equal(createHash("sha256").update(original).digest("hex"), entry.image_sha256);
    const image = await sharp(original).metadata();
    const display = await sharp(read(`${folder}/display-v1.jpg`)).metadata();
    deepEqual([image.width, image.height], [entry.image_width, entry.image_height]);
    deepEqual([display.width, display.height], [image.width, image.height]);
    const share = await sharp(read(folder + "/share-cover-5x4.jpg")).metadata();
    const expected = entry.editionId_candidate === huangshanEditionId ? [750, 600] : [585, 468];
    deepEqual([share.width, share.height], expected);
  }
  const folder = "public/races/huangshan-huizhou-ancient-city-trail/2027";
  const original = read(folder + "/original-v2.jpg");
  const display = read(folder + "/display-v2.jpg");
  equal(original.length, 231628);
  equal(createHash("sha256").update(original).digest("hex"), "adea7fb25ee90b49c9c1301c82e44a970ab7d99c1b7452eb67275bf36e3842ed");
  for (const bytes of [original, display]) {
    const { width, height, format } = await sharp(bytes).metadata();
    deepEqual([width, height, format], [1080, 608, "jpeg"]);
  }
  ok(display.length < original.length);
});

test("a directly evidenced endpoint still renders for its own Category only", () => {
  const record = structuredClone(huangshan);
  const category = record.categories[0];
  category.startLocation = "测试出发点";
  const source = category.governance.sources[0];
  source.rawData!.startLocation = category.startLocation;
  category.governance.fieldSources.startLocation = {
    field: "startLocation", sourceType: source.sourceType, sourceName: source.sourceName,
  };
  category.governance.missingFields = category.governance.missingFields.filter(field => field !== "startLocation");

  const result = createPublicRaceDetailResult({ ...graph, records: [record] }, huangshanEditionId);
  equal(result.status, 200);
  if (result.status !== 200) return;
  const view = createRaceDetailViewModel(result.body.race);
  equal(view.selectedCategory?.executionFacts.find(({ key }) => key === "start")?.value, "测试出发点");
  ok(result.body.race.categories.slice(1).every(c => c.startLocation === null));
});

test("the optional location allowance rejects absent core evidence, inconsistent facts and unresolved conflicts", async t => {
  type Record = typeof huangshan;
  const cases: Array<[string, (record: Record) => void]> = [
    ["missing Edition date", ({ edition }) => { edition.raceDate = null; }],
    ["unresolved Edition year", ({ edition }) => { edition.governance.publicationGate!.latestRelevantOfficialEditionYear = 2026; }],
    ["absent Category identity", ({ categories: [category] }) => { category.categoryName = ""; }],
    ["wrong Category scope", ({ categories: [category] }) => { category.governance.sources[0].rawData!.categoryId = huangshan.categories[1].categoryId; }],
    ["historical core evidence", ({ categories: [category] }) => { category.governance.sources[0].rawData!.editionYear = 2026; }],
    ["distance differs from the official label", ({ categories: [category] }) => { category.distanceKm = 103; }],
    ["not all waves are supported", ({ categories: [category] }) => { category.startTimes!.push("2027-03-27T06:00:00+08:00"); }],
    ["mandatory field is pending", ({ categories: [category] }) => { category.governance.missingFields.push("cutoffTimeHours"); }],
    ["explicit category conflict", ({ categories: [category] }) => { category.governance.internalFlags = ["distance_conflict_needs_review"]; }],
    ["verified label does not bypass a known endpoint conflict", ({ categories: [category] }) => {
      category.governance.verified = true;
      category.governance.verificationStatus = "verified";
      category.governance.internalFlags = ["finish_location_conflict_needs_review"];
    }],
    ["evidenced finish cannot be erased", ({ categories: [category] }) => { category.governance.sources[0].rawData!.finishLocation = "当届有明确证据的终点"; }],
    ["filled location has no direct support", ({ categories: [category] }) => {
      category.startLocation = "徽州古城府前广场";
      category.governance.missingFields = category.governance.missingFields.filter(field => field !== "startLocation");
    }],
    ["unresolved endpoint gets no allowance even when left blank", ({ categories: [category] }) => {
      category.governance.mergeTrace = [{
        field: "finishLocation",
        selectedSource: "placeholder",
        reason: "Two inconsistent observations remain unresolved.",
        candidates: [
          { sourceType: "official", sourceName: "rules", value: "A" },
          { sourceType: "registration_platform", sourceName: "entry", value: "B" },
        ],
      }];
    }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const record = structuredClone(huangshan);
      mutate(record);
      equal(createPublicRaceDetailResult({ ...graph, records: [record] }, huangshanEditionId).status, 404);
    });
  }
});
