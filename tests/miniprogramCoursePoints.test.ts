import { equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

import { createPublicRaceDetailResult } from "../lib/raceGraphPublic.ts";
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

const shanghai = getPublicRace("shanghai-marathon-2026");
const gongga = getPublicRace("kailas-gongga-100-2026");
const hk100 = getPublicRace("hk100-2027");

test("road races never show Course Points, even if point data is present", () => {
  const roadWithPoints = structuredClone(shanghai);
  roadWithPoints.categories[0].coursePoints = gongga.categories.find(({ isPrimaryCategory }) => isPrimaryCategory)!.coursePoints;
  roadWithPoints.categories[0].coursePointDataStatus = "available";
  equal(createRaceDetailViewModel(roadWithPoints).selectedCategory?.coursePointSection, null);
});

test("trail selected Category with available Course Points shows the module", () => {
  const detail = createRaceDetailViewModel(gongga);
  const section = detail.selectedCategory?.coursePointSection;
  equal(section?.title, "补给与关门");
  equal(section ? "eyebrow" in section : false, false);
});

test("trail selected Category without accepted Course Points hides the module", () => {
  const sample = structuredClone(gongga);
  const sixty = sample.categories.find(({ categoryId }) => categoryId === "kailas-gongga-100-2026-snow-60")!;
  sixty.coursePoints = null;
  sixty.coursePointDataStatus = "unknown";
  const detail = createRaceDetailViewModel(sample);
  const selected = selectRaceCategory(detail, sixty.categoryId);
  equal(selected.selectedCategory?.coursePointSection, null);
});

test("Gongga switches among complete 100K, 60K and 40K Course Points", () => {
  const detail = createRaceDetailViewModel(gongga);
  equal(detail.selectedCategory?.label, "100K");
  equal(detail.selectedCategory?.coursePointSection?.points.length, 14);

  const sixty = selectRaceCategory(detail, "kailas-gongga-100-2026-snow-60");
  equal(sixty.selectedCategory?.coursePointSection?.points.length, 7);

  const forty = selectRaceCategory(sixty, "kailas-gongga-100-2026-trail-40");
  equal(forty.selectedCategory?.coursePointSection?.points.length, 5);

  const restored = selectRaceCategory(forty, "kailas-gongga-100-2026-glacier-100");
  equal(restored.selectedCategory?.coursePointSection?.points.length, 14);
});

test("HK100 defaults to Primary 100K with 11 points and preserves the 96km Finish", () => {
  const detail = createRaceDetailViewModel(hk100);
  equal(detail.selectedCategory?.label, "100K");
  equal(detail.selectedCategory?.coursePointSection?.points.length, 11);
  const finish = detail.selectedCategory?.coursePointSection?.points.at(-1);
  equal(finish?.pointLabel, "FINISH");
  equal(toPointLine(finish), "FINISH 大帽山扶轮公园 · 96 km · 次日 13:00 · 换装");
  equal(/^\d+$/.test(finish?.pointLabel ?? ""), false);
});

test("cross-midnight cutoff is presented as next day", () => {
  const hkPoints = createRaceDetailViewModel(hk100).selectedCategory?.coursePointSection?.points ?? [];
  equal(hkPoints.find(({ name }) => name === "基维尔营地")?.factsDisplay, "65 km · 次日 02:15");

  const gonggaPoints = createRaceDetailViewModel(gongga).selectedCategory?.coursePointSection?.points ?? [];
  equal(gonggaPoints.at(-1)?.factsDisplay, "100.1 km · 次日 06:00");
});

test("checkpoint presentation is one scan line without repeated cumulative wording", () => {
  const hkPoints = createRaceDetailViewModel(hk100).selectedCategory?.coursePointSection?.points ?? [];
  equal(toPointLine(hkPoints[0]), "01 东坝 · 10 km · 关门 09:15 · 医疗");
  equal(toPointLine(hkPoints.find(({ name }) => name === "企岭下")), "06 企岭下 · 52 km · 关门 21:15 · 换装 · 医疗");
  ok(hkPoints.every(({ factsDisplay }) => !factsDisplay?.includes("累计")));

  const gonggaPoints = createRaceDetailViewModel(gongga).selectedCategory?.coursePointSection?.points ?? [];
  equal(
    toPointLine(gonggaPoints.find(({ name }) => name === "半亩温泉")),
    "08 半亩温泉 · 55.8 km · 关门 17:30 · 换装",
  );
});

test("service labels remain inline and are absent when services are null", () => {
  const hkPoints = createRaceDetailViewModel(hk100).selectedCategory?.coursePointSection?.points ?? [];
  equal(hkPoints.find(({ name }) => name === "企岭下")?.serviceDisplay, "换装 · 医疗");

  const gonggaPoints = createRaceDetailViewModel(gongga).selectedCategory?.coursePointSection?.points ?? [];
  equal(gonggaPoints.find(({ name }) => name === "铁桥")?.serviceDisplay, null);
});

test("missing optional point facts do not remove the named point", () => {
  const sample = structuredClone(gongga);
  const primary = sample.categories.find(({ isPrimaryCategory }) => isPrimaryCategory)!;
  primary.coursePoints![0] = {
    ...primary.coursePoints![0],
    distanceKm: null,
    cutoffAt: null,
    services: null,
  };
  const point = createRaceDetailViewModel(sample).selectedCategory?.coursePointSection?.points[0];
  equal(point?.name, "铁桥");
  equal(point?.factsDisplay, null);
  equal(point?.serviceDisplay, null);
});

test("HK100 Category switching changes Course Points but preserves Race Guide", () => {
  const detail = createRaceDetailViewModel(hk100);
  const half = selectRaceCategory(detail, "hk100-2027-the-half-53k");
  equal(half.selectedCategory?.label, "53K");
  equal(half.selectedCategory?.coursePointSection?.points.length, 6);
  equal(half.raceGuide, detail.raceGuide);

  const third = selectRaceCategory(half, "hk100-2027-the-third-34k");
  equal(third.selectedCategory?.coursePointSection?.points.length, 4);
  equal(third.selectedCategory?.coursePointSection?.points[2]?.pointLabel, "WP");
  equal(third.raceGuide, detail.raceGuide);

  const restored = selectRaceCategory(third, "hk100-2027-hk100-100k");
  equal(restored.selectedCategory?.coursePointSection?.points.length, 11);
  equal(restored.raceGuide, detail.raceGuide);
});

test("Detail still loads Race Facts, Race Guide and Course Points in one request", async () => {
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
  equal(result.race?.categories.find(({ isPrimaryCategory }) => isPrimaryCategory)?.coursePoints?.length, 14);
});

test("Course Points belongs to Category Facts and keeps one compact passive list", () => {
  const wxml = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url),
    "utf8",
  );
  ok(wxml.indexOf("detail.selectedCategory.coursePointSection") < wxml.indexOf("detail.raceGuide"));
  ok(wxml.includes('class="category-facts"'));
  ok(wxml.includes('wx:for="{{detail.selectedCategory.coursePointSection.points}}"'));
  ok(wxml.includes("course-point__line"));
  ok(wxml.includes('class="execution-fact__label course-points__label"'));
  ok(wxml.includes('class="execution-fact__value course-point__name"'));
  equal(wxml.includes("course-points__title"), false);
  equal(wxml.includes("COURSE POINTS"), false);
  equal(wxml.includes("course-points__eyebrow"), false);
  equal(wxml.includes("查看全部"), false);
  equal(wxml.includes("bindtap=\"handleCoursePoint"), false);

  const styles = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxss", import.meta.url),
    "utf8",
  );
  ok(/\.course-point\s*\{[\s\S]*?padding:\s*17rpx 0 18rpx/.test(styles));
  ok(/\.course-points\s*\{[\s\S]*?margin-top:\s*24rpx/.test(styles));
  ok(/\.race-guide\s*\{[\s\S]*?margin-top:\s*112rpx/.test(styles));
  ok(/\.course-point__label\s*\{[\s\S]*?width:\s*80rpx/.test(styles));
  equal(/\.course-point__label\s*\{[\s\S]*?font-family:/.test(styles), false);
  ok(/\.course-point__line\s*\{[\s\S]*?display:\s*block/.test(styles));
  equal(/\.course-point__line\s*\{[\s\S]*?white-space:\s*nowrap/.test(styles), false);
});

function toPointLine(point: {
  pointLabel: string;
  name: string;
  factsDisplay: string | null;
  serviceDisplay: string | null;
} | undefined): string | null {
  if (!point) return null;
  return [
    `${point.pointLabel} ${point.name}`,
    point.factsDisplay,
    point.serviceDisplay,
  ].filter(Boolean).join(" · ");
}
