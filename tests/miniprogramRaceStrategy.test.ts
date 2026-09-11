import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";
import { test } from "node:test";

import { getRaceEditorialContent } from "../data/race-guides/index.ts";
import { getRaceStrategyContent } from "../data/race-strategies/index.ts";
import { createPublicRaceDetailResult, createPublicRaceListResult } from "../lib/raceGraphPublic.ts";
import { loadRaceDetail } from "../miniprogram/pages/races/detail/loadRaceDetail.ts";
import type { PublicRaceDetail, PublicRaceDetailResponse } from "../miniprogram/types/races.ts";

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

const { createRaceDetailViewModel, selectRaceCategory } = await import(
  "../miniprogram/utils/raceDetailPresentation.ts"
);

const canonical = JSON.parse(
  readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8"),
) as unknown;

function getPublicRace(editionId: string): PublicRaceDetail {
  const result = createPublicRaceDetailResult(canonical, editionId);
  if (result.status !== 200) throw new Error(`Missing public race fixture: ${editionId}`);
  return result.body.race;
}

const gongga = getPublicRace("kailas-gongga-100-2026");
const hk100 = getPublicRace("hk100-2027");

test("Gongga and HK100 expose a three-item Strategy scoped to the Primary 100K", () => {
  equal(gongga.raceStrategy?.categoryId, "kailas-gongga-100-2026-glacier-100");
  equal(hk100.raceStrategy?.categoryId, "hk100-2027-hk100-100k");

  for (const race of [gongga, hk100]) {
    const strategy = race.raceStrategy;
    ok(strategy);
    equal(strategy.categoryId, race.categories.find(({ isPrimaryCategory }) => isPrimaryCategory)?.categoryId);
    ok(strategy.scopeNote.length > 0);
    equal(strategy.items.length, 3);
    ok(strategy.closing);
  }
});

test("shared editorial readers use the same Strategy content asset", () => {
  for (const eventId of ["kailas-gongga-100", "hk100"]) {
    equal(getRaceEditorialContent(eventId)?.raceStrategy, getRaceStrategyContent(eventId));
  }
});

test("Strategy source metadata stays internal to the Public DTO", () => {
  const internal = getRaceStrategyContent("hk100")!;
  ok(internal.sources.some(({ type }) => type === "official"));
  ok(internal.sources.some(({ type }) => type === "runner_report"));

  const serialized = JSON.stringify(hk100.raceStrategy);
  equal(serialized.includes("sources"), false);
  equal(serialized.includes("supports"), false);
  equal(serialized.includes("reddit.com"), false);
});

test("road races have no Strategy and list responses never include it", () => {
  for (const editionId of ["shanghai-marathon-2026", "beijing-marathon-2026", "xiamen-marathon-2027"]) {
    equal(getPublicRace(editionId).raceStrategy, null);
  }
  const list = createPublicRaceListResult(canonical);
  equal(list.status, 200);
  equal(JSON.stringify(list.body).includes("raceStrategy"), false);
});

test("category switching hides 100K Strategy on other groups and restores it on return", () => {
  const gongga100 = createRaceDetailViewModel(gongga);
  equal(gongga100.showRaceStrategy, true);
  ok(gongga100.selectedCategory?.coursePointSection);
  ok(gongga100.raceGuide);

  const gongga60 = selectRaceCategory(gongga100, "kailas-gongga-100-2026-snow-60");
  equal(gongga60.showRaceStrategy, false);
  equal(gongga60.selectedCategory?.coursePointSection?.points.length, 7);
  equal(gongga60.raceGuide, gongga100.raceGuide);

  const gongga40 = selectRaceCategory(gongga60, "kailas-gongga-100-2026-trail-40");
  equal(gongga40.showRaceStrategy, false);
  equal(gongga40.selectedCategory?.coursePointSection?.points.length, 5);

  const gonggaRestored = selectRaceCategory(gongga40, "kailas-gongga-100-2026-glacier-100");
  equal(gonggaRestored.showRaceStrategy, true);

  const hkPrimary = createRaceDetailViewModel(hk100);
  const hkThird = selectRaceCategory(hkPrimary, "hk100-2027-the-third-34k");
  const hkHalf = selectRaceCategory(hkThird, "hk100-2027-the-half-53k");
  equal(hkThird.showRaceStrategy, false);
  equal(hkThird.selectedCategory?.coursePointSection?.points.length, 4);
  equal(hkHalf.showRaceStrategy, false);
  equal(hkHalf.selectedCategory?.coursePointSection?.points.length, 6);
  equal(hkHalf.raceGuide, hkPrimary.raceGuide);
  equal(selectRaceCategory(hkHalf, "hk100-2027-hk100-100k").showRaceStrategy, true);
});

test("Detail loads Facts, Guide, Course Points and Strategy through one request", async () => {
  let requestCount = 0;
  const response: PublicRaceDetailResponse = {
    schemaVersion: "race-graph-public-v1",
    dataUpdatedAt: "2026-09-11T00:00:00.000Z",
    race: gongga,
  };
  const result = await loadRaceDetail(gongga.editionId, async () => {
    requestCount += 1;
    return response;
  });
  equal(result.loadState, "success");
  equal(requestCount, 1);
  ok(result.race?.raceGuide);
  ok(result.race?.raceStrategy);
  ok(result.race?.categories.find(({ isPrimaryCategory }) => isPrimaryCategory)?.coursePoints);
});

test("Mini Program renders Guide before Strategy without copied editorial prose", () => {
  const wxml = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url),
    "utf8",
  );
  ok(wxml.indexOf("detail.raceGuide") < wxml.indexOf("detail.showRaceStrategy"));
  ok(wxml.includes("detail.raceStrategy.items"));
  ok(wxml.includes("paragraph.emphasis"));

  const sourceText = readSourceTree(fileURLToPath(new URL("../miniprogram", import.meta.url)));
  equal(sourceText.includes("前21公里：先处理海拔，不要处理成绩"), false);
  equal(sourceText.includes("前半程：好跑的时候，更要忍住"), false);
});

test("Strategy content keeps the approved three-item titles", () => {
  deepEqual(gongga.raceStrategy?.items.map(({ title }) => title), [
    "前21公里：先处理海拔，不要处理成绩",
    "4000米以上：能吃、能喝、能保暖，比计划配速更重要",
    "离开高海拔以后，比赛并没有结束",
  ]);
  deepEqual(hk100.raceStrategy?.items.map(({ title }) => title), [
    "前半程：好跑的时候，更要忍住",
    "中段以后：能继续吃，比吃得“完美”更重要",
    "后半程：把比赛拆成下一个 CP",
  ]);
});

test("Gongga Strategy keeps official route facts in context and execution in RaceNext judgment", () => {
  const strategy = getRaceStrategyContent("kailas-gongga-100")!;
  const first = strategy.sections[0].paragraphs.map(({ text }) => text);
  const second = strategy.sections[1].paragraphs.map(({ text }) => text);
  const third = strategy.sections[2].paragraphs.map(({ text }) => text);

  equal(strategy.sections[0].title, "前21公里：先处理海拔，不要处理成绩");
  ok(first.indexOf("RaceNext 的判断是：") < first.indexOf("这段真正的问题不是“我能不能爬得快”，而是“我的身体进入3000米、4000米以后，还能不能稳定工作”。"));
  equal(second.some((text) => text.includes("喝水、吃东西、判断冷热、保持注意力和控制节奏，都可能")), false);
  ok(second.indexOf("RaceNext 的判断是：") < second.indexOf("这个阶段不要继续执着于计划配速。"));
  equal(third.some((text) => text.includes("腿部力量、能量、胃口和注意力")), false);
  ok(third.indexOf("RaceNext 的判断是：") < third.indexOf("前面已经产生的体力消耗，以及补给和装备管理压力，不会因为海拔下降自动清零。"));
});

function readSourceTree(root: string): string {
  const parts: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      parts.push(readSourceTree(path));
    } else if ([".ts", ".wxml", ".wxss", ".json", ".md"].includes(extname(entry.name))) {
      parts.push(readFileSync(path, "utf8"));
    }
  }
  return parts.join("\n");
}
