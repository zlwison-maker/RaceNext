import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

import { createPublicRaceDetailResult } from "../lib/raceGraphPublic.ts";
import { loadRaceDetail } from "../miniprogram/pages/races/detail/loadRaceDetail.ts";
import { buildRaceDetailApiPath } from "../miniprogram/services/racePaths.ts";
import type { PublicRaceDetail } from "../miniprogram/types/races.ts";
import { navigateToRaceDetail } from "../miniprogram/utils/raceNavigation.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z0-9]+$/i.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Fall through so Node reports the original unresolved specifier.
      }
    }
    return nextResolve(specifier, context);
  },
});

const {
  createRaceDetailViewModel,
  selectRaceCategory,
} = await import("../miniprogram/utils/raceDetailPresentation.ts");

const canonical = JSON.parse(
  readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8"),
) as unknown;

function getPublicRace(editionId: string): PublicRaceDetail {
  const result = createPublicRaceDetailResult(canonical, editionId);
  if (result.status !== 200) throw new Error(`Missing public race fixture: ${editionId}`);
  return result.body.race;
}

const shanghai = getPublicRace("shanghai-marathon-2026");
const beijing = getPublicRace("beijing-marathon-2026");
const xiamen = getPublicRace("xiamen-marathon-2027");
const gongga = getPublicRace("kailas-gongga-100-2026");
const hk100 = getPublicRace("hk100-2027");
const xian = getPublicRace("xian-marathon-2026");
const chengdu = getPublicRace("chengdu-marathon-2026");
const tsaigu = getPublicRace("tsaigu-kuocang-2026");
const ninghai = getPublicRace("ninghai-ultra-trail-2026");
const guangzhou = getPublicRace("guangzhou-marathon-2026");
const shenzhen = getPublicRace("shenzhen-100-2026");
const chongqing = getPublicRace("chongqing-marathon-2027");

test("homepage detail navigation keeps editionId identity and marks the home source", () => {
  let navigatedUrl = "";
  navigateToRaceDetail("shanghai-marathon-2026", "home", ({ url }) => { navigatedUrl = url; });
  equal(navigatedUrl, "/pages/races/detail/index?editionId=shanghai-marathon-2026&source=home");
});

test("Detail API path uses editionId", () => {
  equal(buildRaceDetailApiPath("shanghai-marathon-2026"), "/api/races/shanghai-marathon-2026");
});

test("single Category integrates type and distance without a selector", () => {
  const detail = createRaceDetailViewModel(shanghai);
  equal(detail.name, "2026 上海马拉松");
  equal(detail.showCategorySelector, false);
  equal(detail.categories.length, 1);
  equal(detail.summaryDisplay, "马拉松 · 42.195 km");
});

test("multiple Categories can switch core and execution facts", () => {
  const detail = createRaceDetailViewModel(hk100);
  const switched = selectRaceCategory(detail, "hk100-2027-the-half-53k");
  equal(detail.showCategorySelector, true);
  equal(switched.selectedCategory?.label, "53K");
  deepEqual(switched.selectedCategory?.coreFacts.map(({ value }) => value), ["53 km", "2,263 m", "14 h"]);
  deepEqual(switched.selectedCategory?.executionFacts.map(({ value }) => value), ["2027.01.22", "北潭涌"]);
});

test("Primary Category is selected on first load", () => {
  const detail = createRaceDetailViewModel(gongga);
  equal(detail.selectedCategoryId, "kailas-gongga-100-2026-glacier-100");
  equal(detail.selectedCategory?.label, "100K");
});

test("multi-Category trail does not repeat the race type", () => {
  const detail = createRaceDetailViewModel(gongga);
  equal(detail.summaryDisplay, null);
});

test("multi-Category road races do not repeat type or distance in Edition facts", () => {
  equal(createRaceDetailViewModel(xian).summaryDisplay, null);
  equal(createRaceDetailViewModel(chengdu).summaryDisplay, null);
  equal(createRaceDetailViewModel(guangzhou).summaryDisplay, "马拉松 · 42.195 km");
});

test("multi-start Categories display every official wave without changing single-start formatting", () => {
  const chengduDetail = createRaceDetailViewModel(chengdu);
  equal(categoryStart(chengduDetail, "chengdu-marathon-2026-marathon"), "2026.10.25 07:30 / 07:50 分枪");
  equal(categoryStart(chengduDetail, "chengdu-marathon-2026-half-marathon"), "2026.10.25 08:10");

  equal(
    categoryStart(createRaceDetailViewModel(guangzhou), "guangzhou-marathon-2026-marathon"),
    "2026.12.20 07:00 / 07:10 / 07:20 / 07:30 分枪",
  );

  const tsaiguDetail = createRaceDetailViewModel(tsaigu);
  equal(categoryStart(tsaiguDetail, "tsaigu-kuocang-2026-105k"), "2026.10.31 05:10 / 05:30 分枪");
  equal(categoryStart(tsaiguDetail, "tsaigu-kuocang-2026-50k"), "2026.10.30 05:40 / 06:00 分枪");
  equal(categoryStart(tsaiguDetail, "tsaigu-kuocang-2026-25k"), "2026.11.01 07:45 / 08:00 分枪");

  const ninghaiDetail = createRaceDetailViewModel(ninghai);
  equal(categoryStart(ninghaiDetail, "ninghai-ultra-trail-2026-utnh-100"), "2026.11.14 06:00");
  equal(categoryStart(ninghaiDetail, "ninghai-ultra-trail-2026-cnh-60"), "2026.11.13 06:00 / 06:20 分枪");
  equal(categoryStart(ninghaiDetail, "ninghai-ultra-trail-2026-ynh-25"), "2026.11.15 07:00 / 07:20 / 07:40 分枪");

  equal(categoryStart(createRaceDetailViewModel(shenzhen), "shenzhen-100-2026-torx-chn100"), "2026.12.26 06:00");
  equal(categoryStart(createRaceDetailViewModel(chongqing), "chongqing-marathon-2027-marathon"), "2027.01.10 08:00");
});

test("multi-start formatting preserves dates when waves cross calendar days", () => {
  const race = structuredClone(chengdu);
  race.categories[0].startAt = null;
  race.categories[0].startTimes = [
    "2026-10-25T23:50:00+08:00",
    "2026-10-26T00:10:00+08:00",
  ];
  equal(
    categoryStart(createRaceDetailViewModel(race), "chengdu-marathon-2026-marathon"),
    "2026.10.25 23:50 / 2026.10.26 00:10 分枪",
  );
});

test("Trail Core Facts show three metrics without an empty descent slot", () => {
  const detail = createRaceDetailViewModel(gongga);
  deepEqual(
    detail.selectedCategory?.coreFacts,
    [
      { key: "distance", label: "距离", value: "100.1 km" },
      { key: "elevationGain", label: "爬升", value: "7,025 m" },
      { key: "cutoff", label: "关门时间", value: "30 h" },
    ],
  );
});

test("Trail Core Facts insert sourced descent between climb and cutoff", () => {
  const race = structuredClone(gongga);
  race.categories[0].elevationLoss = 6888;
  const detail = createRaceDetailViewModel(race);
  deepEqual(
    detail.selectedCategory?.coreFacts,
    [
      { key: "distance", label: "距离", value: "100.1 km" },
      { key: "elevationGain", label: "爬升", value: "7,025 m" },
      { key: "elevationLoss", label: "下降", value: "6,888 m" },
      { key: "cutoff", label: "关门时间", value: "30 h" },
    ],
  );
});

test("Gongga official facts switch with all three Categories", () => {
  const detail = createRaceDetailViewModel(gongga);
  deepEqual(detail.selectedCategory?.coreFacts.map(({ value }) => value), ["100.1 km", "7,025 m", "30 h"]);
  deepEqual(detail.selectedCategory?.executionFacts.map(({ value }) => value), [
    "2026.09.26 00:00",
    "杉树坪",
    "海螺沟游客中心",
  ]);

  const sixty = selectRaceCategory(detail, "kailas-gongga-100-2026-snow-60");
  deepEqual(sixty.selectedCategory?.coreFacts.map(({ value }) => value), ["58.6 km", "5,129 m", "20 h"]);
  deepEqual(sixty.selectedCategory?.executionFacts.map(({ value }) => value), [
    "2026.09.25 20:00",
    "海螺沟游客中心",
    "四号营地",
  ]);

  const forty = selectRaceCategory(detail, "kailas-gongga-100-2026-trail-40");
  deepEqual(forty.selectedCategory?.coreFacts.map(({ value }) => value), ["40.5 km", "2,771 m", "12 h"]);
  deepEqual(forty.selectedCategory?.executionFacts.map(({ value }) => value), [
    "2026.09.26 06:00",
    "海螺沟游客中心",
  ]);
});

test("Edition facts use a natural vertical reading axis", () => {
  const shanghaiDetail = createRaceDetailViewModel(shanghai);
  const gonggaDetail = createRaceDetailViewModel(gongga);
  equal(shanghaiDetail.dateDisplay, "2026.12.06 周日");
  equal(shanghaiDetail.locationDisplay, "上海市 · 外滩金牛广场");
  equal(gonggaDetail.dateDisplay, "2026.09.25–09.27");
  equal(createRaceDetailViewModel(hk100).locationDisplay, "中国香港 · 西贡 · 北潭涌");
});

test("unknown registration status stays hidden", () => {
  equal(createRaceDetailViewModel(hk100).registrationDisplay, null);
});

test("registration status distinguishes not started from officially not announced", () => {
  equal(createRaceDetailViewModel({ ...beijing, registrationStatus: "upcoming" }).registrationDisplay, "报名未开始");
  equal(
    createRaceDetailViewModel({ ...beijing, registrationStatus: "registration_not_announced" }).registrationDisplay,
    "报名时间待公布",
  );
});

test("all First5 share the Canonical Hero asset with independent Mini Program presentation", () => {
  deepEqual(
    [shanghai, beijing, xiamen, hk100, gongga].map((race) => createRaceDetailViewModel(race).heroMode),
    ["aspectFill", "aspectFill", "aspectFill", "aspectFill", "aspectFill"],
  );
  equal(createRaceDetailViewModel(shanghai).heroImage, shanghai.heroImage);
  equal(createRaceDetailViewModel(shanghai).heroFocalPoint, "82% 50%");
  equal(createRaceDetailViewModel(shanghai).heroUsesFocalBackground, true);
  equal(createRaceDetailViewModel(gongga).heroUsesFocalBackground, false);
  equal(createRaceDetailViewModel(gongga).heroFocalPoint, "44% 50%");
  equal(JSON.stringify(canonical).includes("miniProgramHeroImage"), false);
  equal(JSON.stringify(canonical).includes("webHeroImage"), false);

  const styles = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxss", import.meta.url),
    "utf8",
  );
  const template = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url),
    "utf8",
  );
  ok(/\.hero\s*\{[\s\S]*?height:\s*375rpx/.test(styles));
  ok(template.includes("detail.heroUsesFocalBackground"));
  ok(/\.hero-image--positioned\s*\{[\s\S]*?background-size:\s*cover/.test(styles));
  ok(/class="hero-image__probe"[\s\S]*?binderror="handleHeroImageError"/.test(template));
});

test("Batch launch races keep their finalized Canonical Hero URLs", () => {
  equal(createRaceDetailViewModel(tsaigu).heroImage, "/races/tsaigu-kuocang/2026/cover-hero-original.png");
  equal(createRaceDetailViewModel(ninghai).heroImage, "/races/ninghai-ultra-trail/2026/hero-original.jpeg");
  equal(createRaceDetailViewModel(shenzhen).heroImage, "/races/shenzhen-100/2026/cover-hero.png");
});

test("Detail H1 is one step above card titles and physically capped at two lines", () => {
  const styles = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxss", import.meta.url),
    "utf8",
  );
  ok(/\.race-title\s*\{[\s\S]*?max-height:\s*120rpx[\s\S]*?font-size:\s*44rpx[\s\S]*?line-height:\s*60rpx/.test(styles));
  ok(/-webkit-line-clamp:\s*2/.test(styles));
});

test("HK100 exposes three physical Categories in official order and exact core metrics", () => {
  const detail = createRaceDetailViewModel(hk100);
  deepEqual(detail.categories.map(({ label }) => label), ["34K", "53K", "100K"]);
  deepEqual(
    detail.categories.map(({ coreFacts }) => coreFacts.map(({ value }) => value)),
    [
      ["34 km", "1,558 m", "10 h"],
      ["53 km", "2,263 m", "14 h"],
      ["100 km", "5,142 m", "30 h"],
    ],
  );
  equal(detail.selectedCategory?.label, "100K");
});

test("Detail request failure returns a stable Error state", async () => {
  const result = await loadRaceDetail("shanghai-marathon-2026", async () => {
    throw new Error("network unavailable");
  });
  equal(result.loadState, "error");
  equal(result.race, null);
  ok(result.error instanceof Error);
});

function categoryStart(detail: ReturnType<typeof createRaceDetailViewModel>, categoryId: string): string | null {
  const category = detail.categories.find((item) => item.categoryId === categoryId);
  return category?.executionFacts.find(({ key }) => key === "startAt" || key === "startTimes")?.value ?? null;
}
