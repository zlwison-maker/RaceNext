import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { getRaceEditorialContent } from "../data/race-guides/index.ts";
import {
  createPublicRaceDetailResult,
  createPublicRaceListResult,
  toPublicRaceGuide,
} from "../lib/raceGraphPublic.ts";
import { loadRaceDetail } from "../miniprogram/pages/races/detail/loadRaceDetail.ts";
import type { PublicRaceDetail, PublicRaceDetailResponse } from "../miniprogram/types/races.ts";
import type { RaceEditorialContent } from "../types/raceDetail.ts";

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

const FIRST5 = [
  ["shanghai-marathon", "shanghai-marathon-2026"],
  ["beijing-marathon", "beijing-marathon-2026"],
  ["xiamen-marathon", "xiamen-marathon-2027"],
  ["hk100", "hk100-2027"],
  ["kailas-gongga-100", "kailas-gongga-100-2026"],
] as const;

function getPublicRace(editionId: string): PublicRaceDetail {
  const result = createPublicRaceDetailResult(canonical, editionId);
  if (result.status !== 200) throw new Error(`Missing public race fixture: ${editionId}`);
  return result.body.race;
}

test("First5 Race Guides enter the Detail Public DTO from the formal Web content source", () => {
  for (const [eventId, editionId] of FIRST5) {
    const source = getRaceEditorialContent(eventId);
    const race = getPublicRace(editionId);
    ok(source);
    deepEqual(race.raceGuide, toPublicRaceGuide(source));
    equal(race.raceGuide?.experiences.length, source.evidence.sections.length);
  }
});

test("Race Guide is detail-only and the list DTO remains compact", () => {
  const result = createPublicRaceListResult(canonical);
  equal(result.status, 200);
  if (result.status !== 200) return;
  ok(result.body.races.every((race) => !("raceGuide" in race)));
});

test("a missing Race Guide remains null and does not invalidate Detail data", () => {
  equal(toPublicRaceGuide(null), null);
  const race = getPublicRace("shanghai-marathon-2026");
  const detail = createRaceDetailViewModel({ ...race, raceGuide: null });
  equal(detail.raceGuide, null);
  equal(detail.name, "2026 上海马拉松");
});

test("optional Runner Fit and Closing stay absent instead of being generated", () => {
  const source = structuredClone(getRaceEditorialContent("shanghai-marathon")) as RaceEditorialContent;
  source.suitability.items = [];
  delete source.transition;
  const guide = toPublicRaceGuide(source);
  equal(guide?.runnerFit, null);
  equal(guide?.closing, null);
});

test("Mini Program presentation keeps Judgment separate and displays at most three source Experiences", () => {
  const source = getRaceEditorialContent("shanghai-marathon")!;
  const race = getPublicRace("shanghai-marathon-2026");
  const detail = createRaceDetailViewModel(race);
  equal(detail.raceGuide?.judgment.title, source.viewpoint.title);
  deepEqual(
    detail.raceGuide?.experiences.map(({ title }) => title),
    source.evidence.sections.slice(0, 3).map(({ title }) => title),
  );
  deepEqual(detail.raceGuide?.experiences.map(({ number }) => number), ["01", "02", "03"]);
});

test("Category switching preserves the same Race Guide", () => {
  const detail = createRaceDetailViewModel(getPublicRace("hk100-2027"));
  const switched = selectRaceCategory(detail, "hk100-2027-the-half-53k");
  equal(switched.raceGuide, detail.raceGuide);
  equal(switched.selectedCategory?.label, "53K");
});

test("Detail loads Race Facts and Race Guide through one API request", async () => {
  const race = getPublicRace("kailas-gongga-100-2026");
  let requestCount = 0;
  const response: PublicRaceDetailResponse = {
    schemaVersion: "race-graph-public-v1",
    dataUpdatedAt: "2026-09-11T00:00:00.000Z",
    race,
  };
  const result = await loadRaceDetail(race.editionId, async () => {
    requestCount += 1;
    return response;
  });
  equal(result.loadState, "success");
  equal(requestCount, 1);
  equal(result.race?.raceGuide?.opening.title, "跑贡嘎100，是一种什么体验？");
});

test("Mini Program source contains presentation bindings but no copied Guide prose", () => {
  const sourceText = readSourceTree(fileURLToPath(new URL("../miniprogram", import.meta.url)));
  ok(sourceText.includes("detail.raceGuide"));
  equal(sourceText.includes("很多人报名上马，心里其实都带着一个数字"), false);
  equal(sourceText.includes("第一次来到香港跑越野，很多人都会有一点反差感"), false);
  equal(sourceText.includes("身体在地狱，眼睛在天堂"), false);
});

test("Race Guide UI follows Opening, Judgment, Experiences, Runner Fit and optional Closing order", () => {
  const wxml = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url),
    "utf8",
  );
  const markers = [
    "race-guide__header",
    "detail.raceGuide.opening.body",
    "detail.raceGuide.judgment.title",
    "detail.raceGuide.experiences",
    "detail.raceGuide.runnerFit",
    "detail.raceGuide.closing",
  ];
  for (let index = 1; index < markers.length; index += 1) {
    ok(wxml.indexOf(markers[index - 1]) < wxml.indexOf(markers[index]));
  }
});

test("Runner Fit renders explanations at a weaker copy level and tolerates missing explanations", () => {
  const race = getPublicRace("tsaigu-kuocang-2026");
  const detail = createRaceDetailViewModel(race);
  ok(detail.raceGuide?.runnerFit?.items.every((item) => item.body.length > 0));

  const withoutExplanations = structuredClone(race);
  if (!withoutExplanations.raceGuide?.runnerFit) throw new Error("Missing Runner Fit fixture");
  withoutExplanations.raceGuide.runnerFit.items.forEach((item) => { item.body = []; });
  deepEqual(
    createRaceDetailViewModel(withoutExplanations).raceGuide?.runnerFit?.items.map(({ body }) => body),
    [[], [], []],
  );

  const wxml = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url),
    "utf8",
  );
  ok(/wx:for="\{\{item\.body\}\}"[\s\S]*?class="race-guide__fit-copy"/.test(wxml));
  const styles = readFileSync(
    new URL("../miniprogram/pages/races/detail/index.wxss", import.meta.url),
    "utf8",
  );
  ok(/\.race-guide__fit-copy\s*\{/.test(styles));
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
