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

const batchOneAccommodation = [
  {
    editionId: "xian-marathon-2026",
    hotels: [
      {
        hotelName: "西安钟楼永宁门雅致酒店",
        recommendationTitle: "比赛日最省事",
        recommendationReason: "位于永宁门附近，适合优先步行前往起点，减少比赛日清晨交通的不确定性。",
        path: "/pages/hotel/detail/index?id=120417383&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789981783929&sct=open_platform",
      },
      {
        hotelName: "CitiGO Hotel 西安钟楼南门店",
        recommendationTitle: "古城内兼顾起跑",
        recommendationReason: "位于钟楼—南门核心区域，在保持起跑便利的同时，也方便把参赛和古城体验结合起来。",
        path: "/pages/hotel/detail/index?id=29790928&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789981839974&sct=open_platform",
      },
      {
        hotelName: "全季西安奥体国际会展中心酒店",
        recommendationTitle: "全马完赛后更省事",
        recommendationReason: "位于奥体片区，更适合把全马完赛后的返程便利放在首位的跑者；比赛日则需要提前安排前往永宁门起点的交通。",
        path: "/pages/hotel/detail/index?id=111253418&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789981897661&sct=open_platform",
      },
    ],
  },
  {
    editionId: "chengdu-marathon-2026",
    hotels: [
      {
        hotelName: "桔子酒店（成都一品天下金沙博物馆地铁站店）",
        recommendationTitle: "起点最直接",
        recommendationReason: "位于金沙遗址核心区域，适合把比赛日清晨少折腾、方便到达起点放在第一位的跑者。",
        path: "/pages/hotel/detail/index?id=98999166&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789983064850&sct=open_platform",
      },
      {
        hotelName: "成都金沙世纪酒店",
        recommendationTitle: "往届跑者实测",
        recommendationReason: "位于金沙片区，往届已有成马跑者实际入住，去起点也比较方便，适合希望参考真实参赛住宿经验的跑者。",
        path: "/pages/hotel/detail/index?id=2272797&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789983024767&sct=open_platform",
      },
      {
        hotelName: "和颐至格酒店（成都西南财大文化宫地铁站店）",
        recommendationTitle: "交通更均衡",
        recommendationReason: "位于文化宫片区，在保持金沙起点可达性的同时，也方便赛前赛后的城市出行。",
        path: "/pages/hotel/detail/index?id=1669899&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789983097816&sct=open_platform",
      },
      {
        hotelName: "成都泓宇酒店",
        recommendationTitle: "实用型起点选择",
        recommendationReason: "靠近金沙起点区域，也有往届成都马跑者实际入住反馈，适合不一定要住到起点门口、但希望比赛日出发足够省事的跑者。",
        path: "/pages/hotel/detail/index?id=1432148&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789983132105&sct=open_platform",
      },
      {
        hotelName: "成都世纪城假日酒店-东楼",
        recommendationTitle: "全马完赛后更省事",
        recommendationReason: "位于世纪城片区，更适合把全马完赛后的返程便利放在首位的跑者；比赛日则需要提前前往金沙起点。",
        path: "/pages/hotel/detail/index?id=429874&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789983165797&sct=open_platform",
      },
    ],
  },
  {
    editionId: "tsaigu-kuocang-2026",
    hotels: [
      {
        hotelName: "临海三抚一宅民宿（紫阳街台州府城店）",
        recommendationTitle: "离起终点最近",
        recommendationReason: "距兴善门很近，适合希望凌晨出门后直接步行去起点、长距离完赛后也尽快回住宿的跑者。",
        path: "/pages/hotel/detail/index?id=31572972&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789984047649&sct=open_platform",
      },
      {
        hotelName: "临海畣畣 dádá 民宿",
        recommendationTitle: "古城核心·跑者实测",
        recommendationReason: "位于临海古城核心区域，也有往届柴古跑者实际入住经验，适合希望住在起终点附近、同时参考真实参赛住宿体验的跑者。",
        path: "/pages/hotel/detail/index?id=127002105&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789984020007&sct=open_platform",
      },
      {
        hotelName: "台州府城印酒店",
        recommendationTitle: "酒店型步行方案",
        recommendationReason: "仍在兴善门步行范围内，同时更接近标准酒店住宿形态，适合不太想住小型民宿的跑者。",
        path: "/pages/hotel/detail/index?id=125785721&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789984128706&sct=open_platform",
      },
      {
        hotelName: "芊杉·M⁺民宿（临海紫阳街台州府城店）",
        recommendationTitle: "古城内步行优先",
        recommendationReason: "位于台州府城核心区域，起终点、古城和赛前赛后活动都集中在步行范围内。",
        path: "/pages/hotel/detail/index?id=131562564&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789984181370&sct=open_platform",
      },
      {
        hotelName: "台州临海开元名庭酒店",
        recommendationTitle: "标准酒店平衡型",
        recommendationReason: "距兴善门比前几家稍远，但仍处于合理步行范围，适合希望住标准酒店、又不想比赛日依赖车辆的跑者。",
        path: "/pages/hotel/detail/index?id=133280371&inday=2026-09-23&outday=2026-09-24&biz=1&ouid=link&AllianceID=9729651&sid=327120872&guid=10650054344_share_9729651_1789984212838&sct=open_platform",
      },
    ],
  },
] as const;

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

test("Accommodation Batch 1 exposes all 13 approved hotels and exact Ctrip actions", () => {
  let total = 0;
  for (const expectedRace of batchOneAccommodation) {
    const shared = getRaceAccommodationRecommendations(expectedRace.editionId);
    const publicRace = getPublicRace(expectedRace.editionId);
    const detail = createRaceDetailViewModel(publicRace);
    total += shared.length;

    equal(shared.length, expectedRace.hotels.length);
    equal(publicRace.accommodationRecommendations.length, expectedRace.hotels.length);
    equal(detail.hasAccommodation, true);
    ok(detail.raceGuide?.closing);
    deepEqual(detail.accommodationRecommendations.map((recommendation) => ({
      hotelName: recommendation.hotelName,
      recommendationTitle: recommendation.recommendationTitle,
      recommendationReason: recommendation.recommendationReason,
      appId: recommendation.wechatAction?.appId,
      path: recommendation.wechatAction?.path,
    })), expectedRace.hotels.map((hotel) => ({
      ...hotel,
      appId: "wx0e6ed4f51db9d078",
    })));
    deepEqual(
      publicRace.accommodationRecommendations.map(({ displayOrder }) => displayOrder),
      expectedRace.hotels.map((_, index) => index + 1),
    );
    deepEqual(
      publicRace.accommodationRecommendations.map(({ actions }) => actions.wechat),
      shared.map(({ hotel }) => hotel.actions.wechat),
    );
  }
  equal(total, 13);
});

test("Race Guide Closing uses the same Accommodation availability as the guide tab", () => {
  const beijingRace = getPublicRace("beijing-marathon-2026");
  const beijing = createRaceDetailViewModel(beijingRace);

  equal(beijing.hasAccommodation, true);
  ok(beijing.raceGuide?.closing);
  for (const { editionId } of batchOneAccommodation) {
    const detail = createRaceDetailViewModel(getPublicRace(editionId));
    equal(detail.hasAccommodation, true, editionId);
    ok(detail.raceGuide?.closing, editionId);
  }
  for (const editionId of [
    "ninghai-ultra-trail-2026",
    "guangzhou-marathon-2026",
    "shenzhen-100-2026",
    "chongqing-marathon-2027",
  ]) {
    const detail = createRaceDetailViewModel(getPublicRace(editionId));
    equal(detail.hasAccommodation, false, editionId);
    ok(detail.raceGuide?.closing, editionId);
  }

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
  const recommendations = batchOneAccommodation.flatMap(({ editionId }) =>
    createRaceDetailViewModel(getPublicRace(editionId)).accommodationRecommendations);
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
  deepEqual(received.map(({ envVersion }) => envVersion), recommendations.map(() => "release"));
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
