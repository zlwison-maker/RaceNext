import { deepEqual, equal, ok } from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

import { getRaceAccommodationRecommendations } from "../data/accommodations/index.ts";
import { getRaceEditorialContent } from "../data/race-guides/index.ts";
import { getRaceStrategyContent } from "../data/race-strategies/index.ts";
import { createPublicRaceDetailResult, createPublicRaceListResult } from "../lib/raceGraphPublic.ts";
import { evaluatePrePublishFactGate } from "../lib/prePublishFactGate.ts";
import { createRaceShareConfig } from "../miniprogram/utils/raceShare.ts";
import type { Category, Edition, Event } from "../types/event.ts";

type RaceGraphSnapshot = {
  schemaVersion: "race-graph-v1";
  generatedAt: string;
  records: Array<{ event: Event; edition: Edition; categories: Category[] }>;
};

type SourceRegistry = {
  schemaVersion: "race-source-registry-v1";
  editions: Array<{
    editionId: string;
    sources: Array<{ sourceId: string; tier: string; status: string; isPrimary: boolean }>;
  }>;
};

type ImageAssetRegistry = {
  assets: Array<{
    assetId: string;
    editionId: string;
    role: "cover" | "hero";
    publicPath: string;
    originalPublicPath: string;
    originalFilename: string;
    imageYear: number | null;
    imageYearEvidence: string | null;
    fileSizeBytes: number;
    sha256: string;
    source: { type: string; sourceUrl: string | null; usageRightsStatus: string };
    original: { fileSizeBytes: number; sha256: string };
  }>;
};

const canonical = JSON.parse(readFileSync(
  new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8",
)) as RaceGraphSnapshot;
const registry = JSON.parse(readFileSync(
  new URL("../data/sources/race-source-registry.json", import.meta.url), "utf8",
)) as SourceRegistry;
const imageAssets = JSON.parse(readFileSync(
  new URL("../data/assets/race-image-assets-v1.json", import.meta.url), "utf8",
)) as ImageAssetRegistry;

const batch = [
  ["xian-marathon", "xian-marathon-2026"],
  ["chengdu-marathon", "chengdu-marathon-2026"],
  ["tsaigu-kuocang", "tsaigu-kuocang-2026"],
  ["ninghai-ultra-trail", "ninghai-ultra-trail-2026"],
  ["guangzhou-marathon", "guangzhou-marathon-2026"],
  ["shenzhen-100", "shenzhen-100-2026"],
  ["chongqing-marathon", "chongqing-marathon-2027"],
] as const;

const first5EditionIds = [
  "kailas-gongga-100-2026",
  "beijing-marathon-2026",
  "shanghai-marathon-2026",
  "xiamen-marathon-2027",
  "hk100-2027",
];
const imageReadyEditionIds = batch.map(([, editionId]) => editionId);
const publicReadyEditionIds = new Set<string>(imageReadyEditionIds);

function record(eventId: string) {
  const result = canonical.records.find(({ event }) => event.eventId === eventId);
  ok(result, `Missing Canonical Event ${eventId}`);
  return result;
}

function category(eventId: string, categoryId: string) {
  const result = record(eventId).categories.find((candidate) => candidate.categoryId === categoryId);
  ok(result, `Missing Category ${categoryId}`);
  return result;
}

test("Batch Seven stable Event, Edition and Category identities are unique", () => {
  const batchRecords = batch.map(([eventId, editionId]) => {
    const result = record(eventId);
    equal(result.edition.editionId, editionId);
    equal(result.edition.eventId, eventId);
    ok(result.categories.every((item) => item.editionId === editionId));
    return result;
  });

  const allEventIds = canonical.records.map(({ event }) => event.eventId);
  const allEditionIds = canonical.records.map(({ edition }) => edition.editionId);
  const allCategoryIds = canonical.records.flatMap(({ categories }) => categories.map(({ categoryId }) => categoryId));
  equal(new Set(allEventIds).size, allEventIds.length);
  equal(new Set(allEditionIds).size, allEditionIds.length);
  equal(new Set(allCategoryIds).size, allCategoryIds.length);
  equal(batchRecords.length, 7);
  equal(canonical.records.some(({ event }) => event.eventId === "race-chaigudanxia-kuocang-2026"), false);
  equal(canonical.records.some(({ event }) => event.eventId === "chengdu-half-marathon"), false);
});

test("Road races retain the required Category layer and Guangzhou is Marathon-only", () => {
  deepEqual(record("xian-marathon").categories.map(({ categoryName, distanceKm, capacity }) => ({ categoryName, distanceKm, capacity })), [
    { categoryName: "Marathon", distanceKm: 42.195, capacity: 24000 },
    { categoryName: "Half Marathon", distanceKm: 21.0975, capacity: 12000 },
  ]);
  deepEqual(record("chengdu-marathon").categories.map(({ categoryName, distanceKm, capacity }) => ({ categoryName, distanceKm, capacity })), [
    { categoryName: "Marathon", distanceKm: 42.195, capacity: 25000 },
    { categoryName: "Half Marathon", distanceKm: 21.0975, capacity: 10000 },
  ]);
  deepEqual(record("guangzhou-marathon").categories.map(({ categoryName, distanceKm, capacity }) => ({ categoryName, distanceKm, capacity })), [
    { categoryName: "Marathon", distanceKm: 42.195, capacity: 30000 },
  ]);
  deepEqual(record("chongqing-marathon").categories.map(({ categoryName, distanceKm, capacity }) => ({ categoryName, distanceKm, capacity })), [
    { categoryName: "Marathon", distanceKm: 42.195, capacity: 26000 },
  ]);
  equal(record("guangzhou-marathon").categories.some(({ categoryName }) => categoryName === "Half Marathon"), false);
});

test("Trail primary Categories and unresolved Course Point status stay explicit", () => {
  deepEqual([
    record("tsaigu-kuocang").edition.primaryCategoryId,
    record("ninghai-ultra-trail").edition.primaryCategoryId,
    record("shenzhen-100").edition.primaryCategoryId,
  ], [
    "tsaigu-kuocang-2026-105k",
    "ninghai-ultra-trail-2026-utnh-100",
    "shenzhen-100-2026-torx-chn100",
  ]);

  for (const eventId of ["tsaigu-kuocang", "ninghai-ultra-trail", "shenzhen-100"]) {
    for (const item of record(eventId).categories) {
      equal(item.coursePoints, null);
      ok(item.coursePointDataStatus === "unknown" || item.coursePointDataStatus === "not_published");
    }
  }
});

test("Tsaigu 105K conflict is retained without a definite Canonical elevation", () => {
  const tsaigu105 = category("tsaigu-kuocang", "tsaigu-kuocang-2026-105k");
  equal(tsaigu105.elevationGain, null);
  equal(tsaigu105.governance.verificationStatus, "pending");
  ok(tsaigu105.governance.internalFlags?.includes("elevation_gain_conflict_needs_review"));
  deepEqual(
    tsaigu105.governance.sources.map(({ rawData }) => rawData?.elevationGain).sort(),
    [6583, 6677],
  );
});

test("Shenzhen 35K uses 36.6 while preserving 36.96 only as superseded evidence", () => {
  const shenzhen35 = category("shenzhen-100", "shenzhen-100-2026-35k");
  equal(shenzhen35.distanceKm, 36.6);
  equal(shenzhen35.governance.sources.some(({ rawData }) => rawData?.distanceKm === 36.96 && rawData.status === "historical_superseded"), true);
  equal(record("shenzhen-100").edition.raceDistances?.includes(36.96), false);
});

test("RC registration statuses and Shenzhen product naming are explicit without changing stable IDs", () => {
  equal(record("tsaigu-kuocang").edition.registrationStatus, "registration_closed");
  equal(record("shenzhen-100").edition.registrationStatus, "registration_closed");
  equal(record("ninghai-ultra-trail").edition.registrationStatus, "unknown");

  const shenzhen = record("shenzhen-100");
  equal(shenzhen.event.eventId, "shenzhen-100");
  equal(shenzhen.event.canonicalName, "FUGA深圳100跑山赛");
  equal(shenzhen.edition.editionId, "shenzhen-100-2026");
  equal(shenzhen.edition.editionName, "2026 FUGA深圳100跑山赛");
  ok(shenzhen.event.aliases?.includes("2026 FUGA深圳100跑山赛暨 TORX®中国站"));
  equal(category("shenzhen-100", "shenzhen-100-2026-torx-chn100").categoryName, "TORX CHN100");
  equal(category("shenzhen-100", "shenzhen-100-2026-10k-individual").categoryName, "10K 个人组");
});

test("multi-start Categories retain every official datetime without fabricating startAt", () => {
  const expected = new Map<string, string[]>([
    ["chengdu-marathon-2026-marathon", [
      "2026-10-25T07:30:00+08:00",
      "2026-10-25T07:50:00+08:00",
    ]],
    ["guangzhou-marathon-2026-marathon", [
      "2026-12-20T07:00:00+08:00",
      "2026-12-20T07:10:00+08:00",
      "2026-12-20T07:20:00+08:00",
      "2026-12-20T07:30:00+08:00",
    ]],
    ["tsaigu-kuocang-2026-105k", [
      "2026-10-31T05:10:00+08:00",
      "2026-10-31T05:30:00+08:00",
    ]],
    ["tsaigu-kuocang-2026-50k", [
      "2026-10-30T05:40:00+08:00",
      "2026-10-30T06:00:00+08:00",
    ]],
    ["tsaigu-kuocang-2026-25k", [
      "2026-11-01T07:45:00+08:00",
      "2026-11-01T08:00:00+08:00",
    ]],
    ["ninghai-ultra-trail-2026-cnh-60", [
      "2026-11-13T06:00:00+08:00",
      "2026-11-13T06:20:00+08:00",
    ]],
    ["ninghai-ultra-trail-2026-ynh-25", [
      "2026-11-15T07:00:00+08:00",
      "2026-11-15T07:20:00+08:00",
      "2026-11-15T07:40:00+08:00",
    ]],
  ]);

  for (const [categoryId, startTimes] of expected) {
    const target = canonical.records.flatMap(({ categories }) => categories)
      .find((candidate) => candidate.categoryId === categoryId);
    ok(target, `Missing Category ${categoryId}`);
    equal(target.startAt, null);
    deepEqual(target.startTimes, startTimes);
    ok(target.startTimes?.every((value) => /^2026-\d{2}-\d{2}T\d{2}:\d{2}:00\+08:00$/.test(value)));

    const detail = createPublicRaceDetailResult(canonical, target.editionId);
    equal(detail.status, 200);
    if (detail.status !== 200) continue;
    const publicCategory = detail.body.race.categories.find((candidate) => candidate.categoryId === categoryId);
    ok(publicCategory);
    equal(publicCategory.startAt, null);
    deepEqual(publicCategory.startTimes, startTimes);
  }
});

test("single-start Categories keep startAt and do not acquire synthetic startTimes", () => {
  const singleStarts = new Map<string, string>([
    ["xian-marathon-2026-marathon", "2026-10-18T07:30:00+08:00"],
    ["chengdu-marathon-2026-half-marathon", "2026-10-25T08:10:00+08:00"],
    ["ninghai-ultra-trail-2026-utnh-100", "2026-11-14T06:00:00+08:00"],
    ["shenzhen-100-2026-torx-chn100", "2026-12-26T06:00:00+08:00"],
    ["chongqing-marathon-2027-marathon", "2027-01-10T08:00:00+08:00"],
  ]);

  for (const [categoryId, startAt] of singleStarts) {
    const target = canonical.records.flatMap(({ categories }) => categories)
      .find((candidate) => candidate.categoryId === categoryId);
    ok(target, `Missing Category ${categoryId}`);
    equal(target.startAt, startAt);
    equal(target.startTimes, undefined);

    const detail = createPublicRaceDetailResult(canonical, target.editionId);
    equal(detail.status, 200);
    if (detail.status !== 200) continue;
    const publicCategory = detail.body.race.categories.find((candidate) => candidate.categoryId === categoryId);
    ok(publicCategory);
    equal(publicCategory.startAt, startAt);
    equal(publicCategory.startTimes, null);
  }
});

test("Ninghai precise Category facts remain Tier 2 and retain the CNH precision difference", () => {
  const entry = registry.editions.find(({ editionId }) => editionId === "ninghai-ultra-trail-2026");
  ok(entry);
  const preciseSources = entry.sources.filter(({ sourceId }) =>
    sourceId === "gobichina-ninghai-2026" || sourceId === "itra-ninghai-cnh60-2026");
  ok(preciseSources.every(({ tier }) => tier === "trusted_structured"));
  ok(preciseSources.every(({ tier }) => tier !== "primary_official"));

  const cnh60 = category("ninghai-ultra-trail", "ninghai-ultra-trail-2026-cnh-60");
  deepEqual({ distanceKm: cnh60.distanceKm, elevationGain: cnh60.elevationGain }, { distanceKm: 60, elevationGain: 2400 });
  ok(cnh60.governance.sources.some(({ sourceRecordId, rawData }) =>
    sourceRecordId === "itra-ninghai-cnh60-2026" && rawData?.distanceKm === 59.13 && rawData?.elevationGain === 2378));
});

test("all seven frozen Race Guides are available with the complete V1 structure", () => {
  for (const [eventId] of batch) {
    const guide = getRaceEditorialContent(eventId);
    ok(guide, `Missing Race Guide ${eventId}`);
    ok(guide.impression.paragraphs.length > 0);
    ok(guide.viewpoint.paragraphs.length > 0);
    equal(guide.evidence.sections.length, 3);
    equal(guide.suitability.items.length, 3);
    ok(guide.suitability.items.every((item) => item.paragraphs.length === 1));
    ok(guide.suitability.items.every((item) => item.paragraphs[0]?.text.trim().length > 0));
    ok(guide.transition);
    equal(guide.raceStrategy, undefined);
    equal(getRaceStrategyContent(eventId), null);
  }
});

test("Batch Seven Opening sections retain the approved copy after source-tail cleanup", () => {
  const expectedOpenings = new Map<string, string[]>([
    ["xian-marathon", [
      "西马最容易让人记住的，可能不是某一个公里数，而是站在永宁门下等待起跑的那个早晨。比赛从西安最有辨识度的城市地标之一出发，跑过钟楼、城墙与大明宫，再一路向东进入浐灞，最后在西安奥体中心完成全马。2026 年官方确认继续沿用这条经典路线。",
      "这种变化让西马并不是一条只围绕古城打转的观光赛道。前半程的历史感很强，后面则逐渐进入更开阔、更现代的城市空间。近届赛事沿途持续设置文化加油站，秦腔、传统鼓乐和古风表演也已经成为西马现场体验的一部分。",
    ]],
    ["chengdu-marathon", [
      "成马从金沙遗址博物馆出发，这本身就给比赛定下了很明确的基调。前半程一路经过成都老城、文化地标和生活街区，宽窄巷子、人民公园、天府广场逐渐展开；继续向南以后，城市空间又开始变得开阔、现代。2026 年路线还新增杜甫草堂、四川博物院、青羊宫和琴台路。",
      "如果说有些城市马拉松只是“在一座城市里跑”，成马更像是把成都本身放进了赛道。",
    ]],
    ["tsaigu-kuocang", [
      "柴古的比赛从临海古城里开始。跑者从兴善门出发，很快离开城墙和老街，向括苍山里钻进去。几十个小时以后，如果一切顺利，最后又会重新跑回这座城。",
      "这种“古城—山野—古城”的转换，是柴古很难被其他越野赛复制的体验。2025 年路线从城市空间进入括苍山，最后重新穿过紫阳古街，在当地群众和观众营造的氛围里冲刺。",
    ]],
    ["ninghai-ultra-trail", [
      "宁海给人的第一印象和很多百公里不太一样。它当然有山、有竹林、有溪谷、有古村，也有接近 5000 米累计爬升，但这条路线长期建立在成熟的国家登山健身步道体系上，“可跑性”是赛事长期最鲜明的特征之一。",
      "2024 年 105K 有 8 名跑者刷新原赛道纪录，冠军蒙光富也明确评价赛道可跑性很强。",
    ]],
    ["guangzhou-marathon", [
      "广马最鲜明的体验，从路线结构就已经决定了。比赛从天河体育中心出发，大量赛程围绕珠江展开，跑过江边、桥梁和两岸城区，最终来到海心沙。",
      "所以这不是一场需要不停寻找城市地标的比赛。",
      "珠江本身就是整条赛道的主轴。",
    ]],
    ["shenzhen-100", [
      "深圳100最容易让人产生错觉的地方，是它离城市太近。",
      "100K 从大鹏所城出发，最终抵达大梅沙。中间不是一直远离城市，而是在深圳东部的山脊、郊野公园、林道和城市边缘之间不断切换。101.3km 和 7190m 爬升意味着：城市看得见，比赛一点都不会因此变简单。",
    ]],
    ["chongqing-marathon", [
      "第一次听到“重庆马拉松”，很容易先想到：重庆这么多坡，这场马拉松会不会特别难？",
      "真正站到重马赛道上，感觉却刚好相反。比赛从海棠烟雨公园出发，绝大部分路线沿长江展开，在南滨路、巴滨路和城市两岸景观之间完成 42.195 公里。",
      "所以它最鲜明的反差是：",
      "你在中国最有山城感的城市里，却跑着一条以沿江和竞速著称的马拉松。",
    ]],
  ]);

  for (const [eventId, paragraphs] of expectedOpenings) {
    const guide = getRaceEditorialContent(eventId);
    ok(guide);
    deepEqual(guide.impression.paragraphs.map(({ text }) => text), paragraphs);
  }
});

test("Batch Seven Race Guide Editorial V1.1 titles and closing copy match the approved decisions", () => {
  const expected = new Map<string, { experienceTitles: string[]; runnerFitTitles: string[]; closing: string }>([
    ["xian-marathon", {
      experienceTitles: ["从永宁门开始，赛事身份从第一公里就很明确", "前后半程像是在跑两个西安", "跑进奥体中心，让完赛本身更有仪式感"],
      runnerFitTitles: ["你希望一场马拉松真的代表这座城市", "你在意大型赛事的现场感和完赛仪式感", "你愿意把比赛和一次西安旅行放在一起"],
      closing: "如果已经决定去西安跑一次，接下来最值得提前想清楚的，就是比赛早晨怎么到永宁门，以及全马在奥体中心完赛后怎么回酒店。",
    }],
    ["chengdu-marathon", {
      experienceTitles: ["从金沙出发，前半程几乎是在跑成都的城市名片", "后半程越来越像一条可以认真跑的路线", "城市氛围不是背景，而是比赛的一部分"],
      runnerFitTitles: ["你希望马拉松真的带你认识一座城市", "你既想体验比赛，也想认真跑一次成绩", "你愿意把参赛变成一个成都周末"],
      closing: "如果已经决定来成都跑一次，住宿最值得提前考虑的，就是比赛日怎么方便到金沙，以及全马在世纪城完赛后怎么回酒店。",
    }],
    ["tsaigu-kuocang", {
      experienceTitles: ["古城不是赛前背景，而是比赛的一部分", "真正难的，不只是爬了多少米", "跑回临海以后，这场比赛才真正结束"],
      runnerFitTitles: ["你已经不是第一次面对长距离越野", "你希望赛事本身有很强的人格", "你能接受天气和路况改变比赛"],
      closing: "如果已经决定跑柴古，住宿最值得优先考虑的，就是离兴善门够近，让赛前出发和长距离完赛后都少一点折腾。",
    }],
    ["ninghai-ultra-trail", {
      experienceTitles: ["能跑起来，是宁海真正的赛事性格", "前半程跑得太舒服，可能也是问题", "这里的赛道不是为了比赛临时拼出来的"],
      runnerFitTitles: ["你希望百公里不只是“熬完”", "你已经具备比较完整的长距离基础", "你更喜欢成熟赛道，而不是单纯追求最野"],
      closing: "如果已经决定去跑宁海，住宿最值得提前解决的，就是怎样住得离西门城楼够近，让出发和完赛后都尽量少折腾。",
    }],
    ["guangzhou-marathon", {
      experienceTitles: ["珠江不是一个景点，而是整场比赛的主线", "赛道有速度感，但天气可能完全改变体感", "城市的参与感，会一路跟着你"],
      runnerFitTitles: ["你既在意城市体验，也想认真跑一次全马", "你能接受比赛日天气存在变量", "你喜欢大型城市赛事里的沿途参与感"],
      closing: "如果已经决定跑广马，住宿最值得提前想清楚的，就是比赛早晨怎么到天河体育中心，以及海心沙完赛后怎么回酒店。",
    }],
    ["shenzhen-100", {
      experienceTitles: ["山、海、城不会只出现一次", "100K 的难度，不只是距离和累计爬升", "从大鹏所城跑到大梅沙，是一条很完整的路线"],
      runnerFitTitles: ["你已经拥有真正的长距离越野经验", "你喜欢一场比赛里不断变化的环境", "你想跑一场够硬的百公里，也在意赛前赛后的城市配套"],
      closing: "如果已经决定跑深圳100，住宿最值得提前想清楚的，是100K到底住大鹏还是大梅沙，以及当届接驳怎么安排。",
    }],
    ["chongqing-marathon", {
      experienceTitles: ["山城里的比赛，反而大量沿江展开", "能跑快，不等于一路都没有消耗", "一月比赛，让竞速环境成为赛事的一部分"],
      runnerFitTitles: ["你真的想认真跑一次成绩", "你希望成绩和城市体验不用二选一", "你能够接受热门赛事的人流变量"],
      closing: "如果已经决定去重庆认真跑一次，住宿最值得提前解决的，就是能不能方便到达海棠烟雨公园，并在完赛后轻松回酒店。",
    }],
  ]);

  for (const [eventId, approved] of expected) {
    const guide = getRaceEditorialContent(eventId);
    ok(guide);
    deepEqual(guide.evidence.sections.map(({ title }) => title), approved.experienceTitles);
    deepEqual(guide.suitability.items.map(({ title }) => title), approved.runnerFitTitles);
    equal(guide.transition, approved.closing);
    const visibleCopy = JSON.stringify(guide);
    equal(visibleCopy.includes("expedition"), false);
    equal(visibleCopy.includes("Accommodation Guide"), false);
    equal(visibleCopy.includes("Race Strategy"), false);
    equal(visibleCopy.includes("trade-off"), false);
  }
});

test("Ninghai scope narrowing and Shenzhen Runner Fit final adjustment are preserved", () => {
  const ninghai = getRaceEditorialContent("ninghai-ultra-trail");
  ok(ninghai);
  equal(ninghai.evidence.sections[0]?.paragraphs[1], "但这并不是“容易”。恰恰因为很多地方能跑，你的有氧能力、跑步经济性和长距离效率会更直接地暴露出来。");
  equal(ninghai.evidence.sections[1]?.paragraphs[1], "所以宁海真正考验的并不是“有没有勇气一直跑”，而是能不能在能跑的时候仍然控制住自己的节奏，把效率留到后半程。");
  equal(ninghai.suitability.items[1]?.title, "你已经具备比较完整的长距离基础");
  equal(ninghai.suitability.items[2]?.title, "你更喜欢成熟赛道，而不是单纯追求最野");

  const shenzhen = getRaceEditorialContent("shenzhen-100");
  ok(shenzhen);
  equal(shenzhen.suitability.items[2]?.title, "你想跑一场够硬的百公里，也在意赛前赛后的城市配套");
  equal(shenzhen.suitability.items[2]?.paragraphs[0]?.text, "深圳的交通、住宿和生活配套比很多偏远山地赛事成熟，但 100K 起终点并不在同一地点，住宿和接驳仍然需要提前规划。对不想把整趟参赛都变成野外远征的跑者来说，这是它比较实际的优势。");
});

test("Batch Seven source and Public Race Guides contain no visible source markers", () => {
  const sourceMarkers = [
    "广州市人民政府",
    "盐田政府网",
    "重庆日报",
    "RQrun",
    "人民网",
    "西安市体育局",
    "新华社",
    "新华网",
    "体育总局",
    "栏目动态",
    "西安统计信息网",
    "搜狐",
    "乐途体育",
    "http://",
    "https://",
    "www.",
  ];

  for (const [eventId, editionId] of batch) {
    const guide = getRaceEditorialContent(eventId);
    ok(guide);
    const detail = createPublicRaceDetailResult(canonical, editionId);
    equal(detail.status, 200);
    if (detail.status !== 200) continue;
    const visibleCopy = JSON.stringify({ source: guide, public: detail.body.race.raceGuide });
    for (const marker of sourceMarkers) {
      equal(visibleCopy.includes(marker), false, `${eventId} contains visible source marker ${marker}`);
    }
  }
});

test("First5 Runner Fit explanations remain populated in source and Public DTO", () => {
  for (const editionId of first5EditionIds) {
    const target = canonical.records.find(({ edition }) => edition.editionId === editionId);
    ok(target);
    const guide = getRaceEditorialContent(target.event.eventId);
    ok(guide);
    ok(guide.suitability.items.every((item) => item.paragraphs.length > 0));

    const detail = createPublicRaceDetailResult(canonical, editionId);
    equal(detail.status, 200);
    if (detail.status !== 200) continue;
    ok(detail.body.race.raceGuide?.runnerFit?.items.every((item) => item.body.length > 0));
  }
});

test("First5, V1.3 trail data and V1.4 Accommodation remain unchanged", () => {
  const list = createPublicRaceListResult(canonical);
  equal(list.status, 200);
  if (list.status !== 200) return;
  equal(list.body.races.length, 12);
  ok(first5EditionIds.every((editionId) => list.body.races.some((race) => race.editionId === editionId)));
  ok(list.body.races.every(({ coverImage, heroImage }) => Boolean(coverImage) && Boolean(heroImage)));

  for (const editionId of ["hk100-2027", "kailas-gongga-100-2026"]) {
    const detail = createPublicRaceDetailResult(canonical, editionId);
    equal(detail.status, 200);
    if (detail.status !== 200) continue;
    ok(detail.body.race.categories.every(({ coursePoints, coursePointDataStatus }) =>
      coursePointDataStatus === "available" && Boolean(coursePoints?.length)));
    ok(detail.body.race.raceGuide);
    ok(detail.body.race.raceStrategy);
  }

  const accommodations = getRaceAccommodationRecommendations("beijing-marathon-2026");
  equal(accommodations.length, 3);
  ok(accommodations.every(({ hotel }) => hotel.actions.wechat?.type === "mini_program"));
  ok(accommodations.every(({ hotel }) => hotel.actions.wechat?.path.includes("AllianceID=")));
});

test("share and launch-navigation safeguards remain intact", () => {
  const share = createRaceShareConfig({
    editionId: "xian-marathon-2026",
    raceId: "xian-marathon",
    name: "2026西安马拉松",
    coverImage: "/races/xian/cover.jpg",
    heroImage: "/races/xian/hero.jpg",
  });
  equal(share.appMessage.title, "2026西安马拉松｜下一场参赛指南");
  equal(share.appMessage.path, "/pages/races/detail/index?editionId=xian-marathon-2026");
  equal(share.appMessage.imageUrl, "/races/xian/cover.jpg");

  const detailTemplate = readFileSync(new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url), "utf8");
  ok(detailTemplate.includes('open-type="share"'));
  const appConfig = JSON.parse(readFileSync(new URL("../miniprogram/app.json", import.meta.url), "utf8")) as { pages: string[]; tabBar?: unknown };
  equal("tabBar" in appConfig, false);
  equal(appConfig.pages.includes("pages/mine/index"), false);
  equal(existsSync(new URL("../miniprogram/pages/mine", import.meta.url)), false);
});

test("field-level conflict does not keep an otherwise public-ready Batch Seven Edition private", () => {
  const list = createPublicRaceListResult(canonical);
  equal(list.status, 200);
  if (list.status !== 200) return;

  for (const editionId of imageReadyEditionIds) {
    const target = canonical.records.find(({ edition }) => edition.editionId === editionId);
    ok(target);
    ok(target.edition.coverImage);
    ok(target.edition.heroImage);
    equal(target.edition.governance.internalFlags?.includes("final_image_pending") ?? false, false);
    const publicReady = publicReadyEditionIds.has(editionId);
    equal(target.edition.governance.internalFlags?.includes("do_not_publish") ?? false, !publicReady);
    equal(list.body.races.some((race) => race.editionId === editionId), publicReady);
    const detail = createPublicRaceDetailResult(canonical, editionId);
    equal(detail.status, publicReady ? 200 : 404);
    if (detail.status !== 200) continue;
    equal(detail.body.race.coverImage, target.edition.coverImage);
    equal(detail.body.race.heroImage, target.edition.heroImage);
    const share = createRaceShareConfig({
      editionId,
      raceId: target.event.eventId,
      name: target.edition.editionName,
      coverImage: detail.body.race.coverImage,
      heroImage: detail.body.race.heroImage,
    });
    const shareImage = target.edition.coverImage.replace(/\/[^/]+$/, "/share-cover-5x4.jpg");
    equal(share.appMessage.imageUrl, shareImage);
    equal(share.timeline.imageUrl, shareImage);
  }

  equal(list.body.races.length, 12);
});

test("selected image files match Asset Registry bytes and do not cross races", () => {
  const pathOwners = new Map<string, string>();
  for (const editionId of imageReadyEditionIds) {
    const target = canonical.records.find(({ edition }) => edition.editionId === editionId);
    ok(target);
    const assets = imageAssets.assets.filter((asset) => asset.editionId === editionId);
    deepEqual(assets.map(({ role }) => role).sort(), ["cover", "hero"]);
    for (const asset of assets) {
      equal(asset.assetId, `${editionId}-${asset.role}`);
      equal(asset.publicPath, target.edition[asset.role === "cover" ? "coverImage" : "heroImage"]);
      ok(asset.publicPath.includes(`/${target.event.eventId}/`));
      const existingOwner = pathOwners.get(asset.publicPath);
      ok(!existingOwner || existingOwner === editionId);
      pathOwners.set(asset.publicPath, editionId);
      equal(asset.imageYear, null);
      equal(asset.imageYearEvidence, null);
      equal(asset.source.type, "user_provided_human_approved");
      equal(asset.source.sourceUrl, null);
      equal(asset.source.usageRightsStatus, "requires_confirmation");
      const file = new URL(`../public${asset.publicPath}`, import.meta.url);
      ok(existsSync(file));
      equal(statSync(file).size, asset.fileSizeBytes);
      equal(createHash("sha256").update(readFileSync(file)).digest("hex"), asset.sha256);
      const original = new URL(`../public${asset.originalPublicPath}`, import.meta.url);
      ok(existsSync(original));
      equal(statSync(original).size, asset.original.fileSizeBytes);
      equal(createHash("sha256").update(readFileSync(original)).digest("hex"), asset.original.sha256);
    }
  }
  for (const editionId of first5EditionIds) {
    for (const asset of imageAssets.assets.filter((item) => item.editionId === editionId)) {
      const file = new URL(`../public${asset.publicPath}`, import.meta.url);
      equal(createHash("sha256").update(readFileSync(file)).digest("hex"), asset.sha256);
    }
  }
});

test("Batch Seven passes the existing fact-evidence validator before the separate image gate", () => {
  for (const [eventId, editionId] of batch) {
    const target = record(eventId);
    const registryEntry = registry.editions.find((entry) => entry.editionId === editionId);
    ok(registryEntry, `Missing Source Registry entry ${editionId}`);
    const gate = evaluatePrePublishFactGate(target, registryEntry);
    equal(gate.publishable, true, `${editionId}: ${gate.issues.join(", ")}`);
    deepEqual(gate.issues, []);
  }
});
