import { deepEqual, equal, ok } from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import sharp from "sharp";

import { getRaceAccommodationRecommendations } from "../data/accommodations/index.ts";
import { getRaceEditorialContent } from "../data/race-guides/index.ts";
import { createPublicRaceDetailResult } from "../lib/raceGraphPublic.ts";
import type { RaceGraphSnapshot } from "../types/raceUpdate.ts";
import { dalianEditionId, renshouEditionId } from "./fixtures/contentBatch20261020.ts";

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
const input = "docs/project/inputs/two-races-20261124";
type ApprovedRace = {
  eventId_candidate: string;
  editionId_candidate: string;
  delivery_file: string;
  research_file: string;
  image: { sha256: string; bytes: number; width: number; height: number };
  hotels: Array<{
    rank: number; hotelId: string; hotelName: string; recommendationTitle: string;
    recommendationReason: string; appId: string; path: string;
  }>;
};
const manifest: { events: ApprovedRace[] } = JSON.parse(read(`${input}/manifest.json`).toString());
const graph: RaceGraphSnapshot = JSON.parse(read("data/canonical/race-graph-v1.json").toString());
function getRace(editionId: string) {
  const result = createPublicRaceDetailResult(graph, editionId);
  equal(result.status, 200, editionId);
  if (result.status !== 200) throw new Error("Missing public race");
  return result.body.race;
}

test("approved Race Guides preserve Final and V2 wording, structure and transition", () => {
  const getSection = (name: string) => read(`${input}/${name}`).toString()
    .split("## 02｜赛事指南")[1].split("## 03｜")[0].trim();
  for (const { eventId_candidate, delivery_file, research_file } of manifest.events) {
    const finalSection = getSection(delivery_file);
    equal(finalSection, getSection(research_file));
    const actual = getRaceEditorialContent(eventId_candidate)!;
    const approved = finalSection.split(/^### [A-D]｜/m).slice(1);
    const paragraphs = (text: string) => text.trim().split(/\n\s*\n/);
    const [impression, viewpoint, evidence, fit] = approved.map(part => {
      const firstBreak = part.indexOf("\n");
      return [part.slice(0, firstBreak), ...paragraphs(part.slice(firstBreak))];
    });
    deepEqual([actual.impression.title, ...actual.impression.paragraphs.map(({ text }) => text)], impression);
    deepEqual([actual.viewpoint.title, ...actual.viewpoint.paragraphs.map(({ text }) => text)], viewpoint);
    deepEqual([actual.evidence.title, ...actual.evidence.sections.flatMap(section => [
      `**${section.number}｜${section.title}**`, ...section.paragraphs,
    ])], evidence);
    deepEqual([actual.suitability.title, ...actual.suitability.items.map(item =>
      `**${item.title}** ${item.paragraphs.map(({ text }) => text).join("\n")}`), actual.transition], fit);
    equal(actual.raceStrategy, undefined);
  }
});

test("single road race and three trail groups keep verified locations, starts and time limits", () => {
  const road = getRace(renshouEditionId);
  const trail = getRace(dalianEditionId);
  deepEqual([road.raceDate, road.endDate, road.categories.length], ["2027-02-28", null, 1]);
  deepEqual([trail.raceDate, trail.endDate], ["2027-05-22", "2027-05-23"]);
  for (const { editionId } of [road, trail]) {
    equal(graph.records.find(({ edition }) => edition.editionId === editionId)?.edition.timezone, "Asia/Shanghai");
  }
  deepEqual(road.categories.map(c => [c.distanceKm, c.startAt, c.cutoffTimeHours, c.startLocation, c.finishLocation, c.elevationGain]),
    [[21.0975, "2027-02-28T08:30:00+08:00", 3, "仁寿体育场", null, null]]);
  deepEqual(trail.categories.map(c => [c.distanceKm, c.elevationGain, c.cutoffTimeHours, c.startAt]), [
    [100, 5536, 30, "2027-05-22T06:00:00+08:00"],
    [50, 2889, 15, "2027-05-22T08:00:00+08:00"],
    [30, 1478, 8, "2027-05-23T06:00:00+08:00"],
  ]);
  const roadView = createRaceDetailViewModel(road);
  equal(roadView.showCategorySelector, false);
  ok(roadView.selectedCategory?.coreFacts.some(({ key }) => key === "distance"));
  ok(roadView.selectedCategory?.executionFacts.some(({ key, value }) => key === "start" && value === "仁寿体育场"));
  ok(roadView.selectedCategory?.executionFacts.every(({ key }) => key !== "finish" && key !== "startFinish"));
  const trailView = createRaceDetailViewModel(trail);
  equal(trailView.showCategorySelector, true);
  for (const c of trail.categories) {
    equal(c.startLocation, "傅家庄公园");
    equal(c.finishLocation, "傅家庄公园");
    equal(c.elevationLoss, null);
    equal(c.coursePoints, null);
    const group = selectRaceCategory(trailView, c.categoryId);
    equal(group.selectedCategoryId, c.categoryId);
    ok(group.selectedCategory?.executionFacts.some(({ key, value }) => key === "startFinish" && value === "傅家庄公园"));
    equal(group.selectedCategory?.coursePointSection, null);
    equal(group.showRaceStrategy, false);
  }
  for (const race of [road, trail]) {
    equal(race.raceStrategy, null);
    for (const internal of ["governance", "rawData", "fieldSources", "missingFields", "verificationStatus"]) {
      ok(!JSON.stringify(race).includes(`"${internal}":`));
    }
  }
});

test("ten public hotels pass the unchanged approved Action to the existing release navigation", () => {
  const previous = Reflect.get(globalThis, "wx");
  const calls: Array<{ appId: string; path: string; envVersion: string }> = [];
  Reflect.set(globalThis, "wx", { navigateToMiniProgram(options: typeof calls[number] & { success(): void }) {
    const { appId, path, envVersion } = options;
    calls.push({ appId, path, envVersion });
    options.success();
  } });
  try {
    for (const event of manifest.events) {
      const canonical = getRaceAccommodationRecommendations(event.editionId_candidate);
      const publicHotels = getRace(event.editionId_candidate).accommodationRecommendations;
      equal(canonical.length, 5);
      equal(publicHotels.length, 5);
      for (const [index, approved] of event.hotels.entries()) {
        const { hotel, recommendation } = canonical[index];
        const actual = publicHotels[index];
        equal(hotel.hotelId, `ctrip-${approved.hotelId}`);
        equal(actual.hotelName, approved.hotelName);
        deepEqual([recommendation.displayOrder, actual.recommendationTitle, actual.recommendationReason],
          [approved.rank, approved.recommendationTitle, approved.recommendationReason]);
        const action = actual.actions.wechat!;
        deepEqual(action, { type: "mini_program", appId: approved.appId, path: approved.path });
        openHotelMiniProgram(action, { success() {}, fail() { throw new Error("Unexpected hotel navigation failure"); } });
      }
    }
    deepEqual(calls, manifest.events.flatMap(({ hotels }) => hotels.map(({ appId, path }) => ({ appId, path, envVersion: "release" }))));
  } finally {
    if (previous === undefined) Reflect.deleteProperty(globalThis, "wx");
    else Reflect.set(globalThis, "wx", previous);
  }
});

test("asset originals match the Manifest and compiled view models use the three safe derivatives", async () => {
  for (const approved of manifest.events) {
    const race = getRace(approved.editionId_candidate);
    const prefix = `/races/${approved.eventId_candidate}/2027`;
    const original = read(`public${prefix}/original.png`);
    const source = await sharp(original).metadata();
    equal(original.length, approved.image.bytes);
    equal(createHash("sha256").update(original).digest("hex"), approved.image.sha256);
    deepEqual([source.width, source.height], [approved.image.width, approved.image.height]);
    const view = createRaceDetailViewModel(race);
    equal(view.coverImage, `${prefix}/cover-display-v3.jpg`);
    equal(view.heroImage, `${prefix}/hero-display-v2.jpg`);
    equal(view.heroMode, "aspectFill");
    const share = createRaceShareConfig(view);
    const derivatives = await Promise.all([
      view.coverImage!, view.heroImage!, share.appMessage.imageUrl!,
    ].map(async path => sharp(read(`public${path}`)).metadata()));
    const [cover, hero, shareImage] = derivatives;
    equal(cover.width * 9, cover.height * 16);
    equal(hero.width, hero.height * 2);
    deepEqual([shareImage.width, shareImage.height], [750, 600]);
    ok(derivatives.every(({ format }) => format === "jpeg"));
    equal(share.timeline.imageUrl, share.appMessage.imageUrl);
    equal(share.appMessage.path, `/pages/races/detail/index?editionId=${race.editionId}&source=share`);
    equal(share.timeline.query, `editionId=${race.editionId}&source=share`);
  }
});
