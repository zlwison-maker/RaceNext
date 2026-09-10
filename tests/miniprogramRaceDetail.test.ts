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

test("homepage detail navigation uses editionId as the only query identity", () => {
  let navigatedUrl = "";
  navigateToRaceDetail("shanghai-marathon-2026", ({ url }) => { navigatedUrl = url; });
  equal(navigatedUrl, "/pages/races/detail/index?editionId=shanghai-marathon-2026");
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
  equal(createRaceDetailViewModel(beijing).registrationDisplay, null);
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
  equal(createRaceDetailViewModel(shanghai).heroFocalPoint, "62% 50%");
  equal(createRaceDetailViewModel(gongga).heroFocalPoint, "44% 50%");
  equal(JSON.stringify(canonical).includes("miniProgramHeroImage"), false);
  equal(JSON.stringify(canonical).includes("webHeroImage"), false);

  const styles = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxss", import.meta.url),
    "utf8",
  );
  ok(/\.hero\s*\{[\s\S]*?height:\s*375rpx/.test(styles));
});

test("Detail H1 is one step above card titles and physically capped at two lines", () => {
  const styles = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxss", import.meta.url),
    "utf8",
  );
  ok(/\.race-title\s*\{[\s\S]*?max-height:\s*104rpx[\s\S]*?font-size:\s*40rpx[\s\S]*?line-height:\s*52rpx/.test(styles));
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
