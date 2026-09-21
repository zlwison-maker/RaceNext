import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

import { createPublicRaceDetailResult } from "../lib/raceGraphPublic.ts";
import { getRaceAccommodationRecommendations } from "../data/accommodations/index.ts";
import type { PublicRaceDetail } from "../miniprogram/types/races.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z0-9]+$/i.test(specifier)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* use original */ }
    }
    return nextResolve(specifier, context);
  },
});

const { createRaceDetailViewModel, selectRaceCategory } = await import(
  "../miniprogram/utils/raceDetailPresentation.ts"
);
const { openHotelMiniProgram } = await import("../miniprogram/services/accommodation.ts");

const canonical = JSON.parse(readFileSync(
  new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8",
)) as unknown;

function getPublicRace(editionId: string): PublicRaceDetail {
  const result = createPublicRaceDetailResult(canonical, editionId);
  if (result.status !== 200) throw new Error(`Missing public race fixture: ${editionId}`);
  return result.body.race;
}

test("legacy Detail DTO without accommodationRecommendations remains usable", () => {
  const {
    accommodationRecommendations: _accommodationRecommendations,
    ...legacyRace
  } = getPublicRace("beijing-marathon-2026");

  for (const race of [legacyRace, { ...legacyRace, accommodationRecommendations: undefined }]) {
    const detail = createRaceDetailViewModel(race);
    equal(detail.hasAccommodation, false);
    deepEqual(detail.accommodationRecommendations, []);
    ok(detail.raceGuide);
  }
});

test("an empty accommodationRecommendations array keeps accommodation hidden", () => {
  const detail = createRaceDetailViewModel({
    ...getPublicRace("beijing-marathon-2026"),
    accommodationRecommendations: [],
  });
  equal(detail.hasAccommodation, false);
  deepEqual(detail.accommodationRecommendations, []);
  ok(detail.raceGuide);
});

test("Beijing shows the accommodation tab with three ordered hotel cards", () => {
  const detail = createRaceDetailViewModel(getPublicRace("beijing-marathon-2026"));
  equal(detail.hasAccommodation, true);
  equal(detail.accommodationRecommendations.length, 3);
  deepEqual(detail.accommodationRecommendations.map(({ hotelName }) => hotelName), [
    "宜尚酒店（北京天安门广场前门地铁站店）",
    "全季酒店（北京天安门广场王府井店）",
    "万豪万枫酒店（北京鸟巢国家会议中心店）",
  ]);
  ok(detail.accommodationRecommendations.every(({ recommendationTitle, recommendationReason }) => recommendationTitle && recommendationReason));
  ok(detail.accommodationRecommendations.every(({ actions }) => actions.wechat?.appId === "wx0e6ed4f51db9d078"));
  ok(detail.accommodationRecommendations.every(({ actions }) => Boolean(actions.wechat?.path)));
});

test("Race Guide Closing uses the same Accommodation availability as the guide tab", () => {
  const beijingRace = getPublicRace("beijing-marathon-2026");
  const xianRace = getPublicRace("xian-marathon-2026");
  const beijing = createRaceDetailViewModel(beijingRace);
  const xian = createRaceDetailViewModel(xianRace);

  equal(beijing.hasAccommodation, true);
  ok(beijing.raceGuide?.closing);
  for (const editionId of [
    "xian-marathon-2026",
    "chengdu-marathon-2026",
    "tsaigu-kuocang-2026",
    "ninghai-ultra-trail-2026",
    "guangzhou-marathon-2026",
    "shenzhen-100-2026",
    "chongqing-marathon-2027",
  ]) {
    const detail = createRaceDetailViewModel(getPublicRace(editionId));
    equal(detail.hasAccommodation, false, editionId);
    ok(detail.raceGuide?.closing, editionId);
  }

  const futureXian = createRaceDetailViewModel({
    ...xianRace,
    accommodationRecommendations: beijingRace.accommodationRecommendations,
  });
  equal(futureXian.hasAccommodation, true);
  equal(futureXian.raceGuide?.closing, xian.raceGuide?.closing);

  const wxml = readFileSync(new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url), "utf8");
  ok(wxml.includes('wx:if="{{detail.hasAccommodation && detail.raceGuide.closing}}"'));

  const styles = readFileSync(new URL("../miniprogram/pages/races/detail/index.wxss", import.meta.url), "utf8");
  ok(/\.race-guide__closing\s*\{[\s\S]*?color:\s*#353535;[\s\S]*?font-size:\s*28rpx;[\s\S]*?font-weight:\s*400;/.test(styles));
});

test("races without recommendations do not show an accommodation tab", () => {
  for (const editionId of ["shanghai-marathon-2026", "xiamen-marathon-2027", "hk100-2027", "kailas-gongga-100-2026"]) {
    equal(createRaceDetailViewModel(getPublicRace(editionId)).hasAccommodation, false);
  }
});

test("hotel jump passes the complete Ctrip action without rewriting it", () => {
  const recommendations = createRaceDetailViewModel(getPublicRace("beijing-marathon-2026")).accommodationRecommendations;
  type CapturedJump = { appId: string; path?: string; envVersion?: string };
  const received: CapturedJump[] = [];
  (globalThis as typeof globalThis & { wx: { navigateToMiniProgram(option: CapturedJump): unknown } }).wx = {
    navigateToMiniProgram(option: CapturedJump) {
      received.push(option);
      return undefined;
    },
  };
  recommendations.forEach((recommendation) => {
    openHotelMiniProgram(recommendation.wechatAction!, { success() {}, fail() {} });
  });
  deepEqual(received.map(({ appId }) => appId), recommendations.map(({ wechatAction }) => wechatAction?.appId));
  deepEqual(received.map(({ envVersion }) => envVersion), ["release", "release", "release"]);
  deepEqual(received.map(({ path }) => path), recommendations.map(({ wechatAction }) => wechatAction?.path));
});

test("Detail DTO preserves each opaque Ctrip action from shared Accommodation Data", () => {
  const shared = getRaceAccommodationRecommendations("beijing-marathon-2026");
  const publicRecommendations = getPublicRace("beijing-marathon-2026").accommodationRecommendations;
  equal(shared.length, 3);
  deepEqual(
    publicRecommendations.map(({ actions }) => actions.wechat),
    shared.map(({ hotel }) => hotel.actions.wechat),
  );
});

test("RaceNext application code does not interpret Ctrip stay-date parameters", () => {
  for (const path of [
    "../lib/raceGraphPublic.ts",
    "../miniprogram/utils/raceDetailPresentation.ts",
    "../miniprogram/services/accommodation.ts",
    "../miniprogram/pages/races/detail/index.ts",
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    equal(/\b(?:inday|outday)\b/.test(source), false);
  }
});

test("Detail loads accommodation through the existing race request only", () => {
  const page = readFileSync(new URL("../miniprogram/pages/races/detail/index.ts", import.meta.url), "utf8");
  const service = readFileSync(new URL("../miniprogram/services/accommodation.ts", import.meta.url), "utf8");
  equal((page.match(/loadRaceDetail\(this\.editionId, getRace\)/g) ?? []).length, 1);
  equal(/wx\.request\s*\(/.test(`${page}\n${service}`), false);
  ok(service.includes("wx.navigateToMiniProgram"));
});

test("V1.3 trail category and Strategy state stay unchanged", () => {
  const gongga = createRaceDetailViewModel(getPublicRace("kailas-gongga-100-2026"));
  equal(gongga.showRaceStrategy, true);
  equal(selectRaceCategory(gongga, "kailas-gongga-100-2026-snow-60").showRaceStrategy, false);
  ok(gongga.selectedCategory?.coursePointSection);
  ok(gongga.raceGuide);
});

test("Detail template keeps race content and renders the minimal hotel card fields", () => {
  const wxml = readFileSync(new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url), "utf8");
  ok(wxml.includes("activeGuideTab === 'race'"));
  ok(wxml.includes("detail.accommodationRecommendations"));
  for (const field of ["item.hotelName", "item.recommendationTitle", "item.recommendationReason", "查看酒店 →"]) {
    ok(wxml.includes(field));
  }
  ok(wxml.indexOf("item.recommendationTitle") < wxml.indexOf("item.hotelName"));
  ok(wxml.indexOf("item.hotelName") < wxml.indexOf("item.recommendationReason"));
  ok(wxml.includes('hover-class="hotel-card__cta--pressed"'));
});

test("accommodation analytics uses the approved event names and one lifecycle guard", () => {
  const page = readFileSync(new URL("../miniprogram/pages/races/detail/index.ts", import.meta.url), "utf8");
  for (const eventName of ["accommodation_view", "hotel_card_impression", "hotel_click", "hotel_jump_success", "hotel_jump_fail"]) {
    ok(page.includes(`\"${eventName}\"`));
  }
  ok(page.includes("accommodationTracked"));
  ok(page.includes('channel: "wechat"'));
  ok(page.includes('partner: "ctrip"'));
});
