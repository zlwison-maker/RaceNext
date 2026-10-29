import { expectedPublicEditionIds } from "./fixtures/contentBatch20261020.ts";
import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createPublicRaceDetailResult, createPublicRaceListResult } from "../lib/raceGraphPublic.ts";
import { validateCoursePointDataStatus, validateTrailCoursePoints } from "../lib/trailCoursePoints.ts";
import type { Category, CoursePoint } from "../types/event.ts";

type CanonicalRecord = {
  event: { eventId: string };
  edition: { editionId: string; primaryCategoryId: string | null; [key: string]: unknown };
  categories: Category[];
};

type CanonicalSnapshot = {
  schemaVersion: "race-graph-v1";
  generatedAt: string;
  records: CanonicalRecord[];
};

const canonical = JSON.parse(
  readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8"),
) as CanonicalSnapshot;

function primaryCategory(editionId: string): Category {
  const record = canonical.records.find(({ edition }) => edition.editionId === editionId);
  ok(record, `Missing Edition ${editionId}`);
  const category = record.categories.find(({ categoryId }) => categoryId === record.edition.primaryCategoryId);
  ok(category, `Missing primary Category for ${editionId}`);
  return category;
}

function category(categoryId: string): Category {
  const result = canonical.records.flatMap(({ categories }) => categories)
    .find((candidate) => candidate.categoryId === categoryId);
  ok(result, `Missing Category ${categoryId}`);
  return result;
}

const gongga = primaryCategory("kailas-gongga-100-2026");
const hk100 = primaryCategory("hk100-2027");
const gongga60 = category("kailas-gongga-100-2026-snow-60");
const gongga40 = category("kailas-gongga-100-2026-trail-40");
const hkThird = category("hk100-2027-the-third-34k");
const hkHalf = category("hk100-2027-the-half-53k");
const ninghai60 = category("ninghai-ultra-trail-2026-cnh-60");
const completeTrailCategories = [gongga, gongga60, gongga40, hk100, hkThird, hkHalf];
const allTrailCategories = [...completeTrailCategories, ninghai60];

test("coursePoints belong to the seven accepted trail Categories", () => {
  equal(canonical.records.some(({ edition }) => "coursePoints" in edition), false);
  const categoriesWithPoints = canonical.records.flatMap(({ categories }) => categories)
    .filter(({ coursePoints }) => Array.isArray(coursePoints));
  deepEqual(categoriesWithPoints.map(({ categoryId }) => categoryId).sort(), [
    "hk100-2027-hk100-100k",
    "hk100-2027-the-half-53k",
    "hk100-2027-the-third-34k",
    "kailas-gongga-100-2026-glacier-100",
    "kailas-gongga-100-2026-snow-60",
    "kailas-gongga-100-2026-trail-40",
    "ninghai-ultra-trail-2026-cnh-60",
  ]);
});

test("accepted pointId values are semantic, stable and independent from displayOrder", () => {
  for (const category of allTrailCategories) {
    const points = category.coursePoints!;
    equal(validateTrailCoursePoints(category.categoryId, points).filter(({ field }) => field === "pointId").length, 0);
    const reordered = points.map((point, index) => ({ ...point, displayOrder: points.length - index }));
    deepEqual(reordered.map(({ pointId }) => pointId), points.map(({ pointId }) => pointId));
  }
});

test("displayOrder is unique and distanceKm is monotonic inside each Category", () => {
  for (const category of allTrailCategories) {
    const points = category.coursePoints!;
    equal(new Set(points.map(({ displayOrder }) => displayOrder)).size, points.length);
    ok(points.every((point, index) => index === 0 || point.distanceKm! >= points[index - 1].distanceKm!));
    equal(validateTrailCoursePoints(category.categoryId, points).length, 0);
  }
});

test("full offset cutoffs stay monotonic across midnight", () => {
  for (const category of completeTrailCategories) {
    const timestamps = category.coursePoints!.map(({ cutoffAt }) => Date.parse(cutoffAt!));
    ok(timestamps.every((timestamp, index) => index === 0 || timestamp >= timestamps[index - 1]));
    ok(category.coursePoints!.every(({ cutoffAt }) => /(?:Z|[+-]\d{2}:\d{2})$/.test(cutoffAt!)));
  }
});

test("validator rejects types and services outside the V0.1 controlled enums", () => {
  const badType = [{ ...gongga.coursePoints![0], type: "start" }] as unknown as CoursePoint[];
  const badService = [{ ...gongga.coursePoints![0], services: ["massage"] }] as unknown as CoursePoint[];
  ok(validateTrailCoursePoints(gongga.categoryId, badType).some(({ field }) => field === "type"));
  ok(validateTrailCoursePoints(gongga.categoryId, badService).some(({ field }) => field === "services"));
});

test("Public mapper preserves the distinct null and empty-array service meanings", () => {
  const sample = structuredClone(canonical);
  const record = sample.records.find(({ edition }) => edition.editionId === "kailas-gongga-100-2026")!;
  const category = record.categories.find(({ categoryId }) => categoryId === gongga.categoryId)!;
  category.coursePoints![0].services = null;
  category.coursePoints![1].services = [];

  const result = createPublicRaceDetailResult(sample, record.edition.editionId);
  equal(result.status, 200);
  if (result.status !== 200) return;
  const publicPoints = result.body.race.categories.find(({ categoryId }) => categoryId === gongga.categoryId)!.coursePoints!;
  equal(publicPoints[0].services, null);
  deepEqual(publicPoints[1].services, []);
});

test("complete core Course Point data remains available when every service is null", () => {
  for (const category of completeTrailCategories) {
    const points = category.coursePoints!.map((point) => ({ ...point, services: null }));
    deepEqual(validateCoursePointDataStatus(category.categoryId, points, "available"), []);
  }
});

test("Ninghai CNH-60 preserves the official six checkpoints and Finish, including N/A and actual course distance", () => {
  const expected = [
    ["fengshan-village-first-pass", "峰山村", 9.2, "08:05"],
    ["wailiao", "外辽", 16.4, "09:50"],
    ["baisha-forest-farm", "白沙林场", 26.4, null],
    ["liliao", "里辽", 33.9, "14:05"],
    ["fengshan-village-second-pass", "峰山村", 43.1, "16:30"],
    ["tuaocai", "屠岙蔡", 53, "18:50"],
    ["ximen-gate-finish", "西门城楼", 58.8, "20:20"],
  ] as const;
  deepEqual(ninghai60.coursePoints, expected.map(([identity, name, distanceKm, cutoff], index) => ({
    pointId: `${ninghai60.categoryId}-${identity}`,
    type: index === 6 ? "finish" : "checkpoint", name, displayOrder: index + 1, distanceKm,
    cutoffAt: cutoff === null ? null : `2026-11-13T${cutoff}:00+08:00`, services: null,
  })));
  equal(ninghai60.coursePointDataStatus, "partial");
  deepEqual(validateCoursePointDataStatus(ninghai60.categoryId, ninghai60.coursePoints, "partial"), []);
  ok(validateCoursePointDataStatus(ninghai60.categoryId, ninghai60.coursePoints, "available").length > 0);
  equal(ninghai60.distanceKm, 60);
  equal(ninghai60.elevationGain, 2400);
  deepEqual(ninghai60.startTimes, ["2026-11-13T06:00:00+08:00", "2026-11-13T06:20:00+08:00"]);
  equal(ninghai60.startAt, null);
  ok(ninghai60.coursePoints![0].pointId !== ninghai60.coursePoints![4].pointId);
  equal(ninghai60.governance.dataQualityLevel, "B");
  const source = ninghai60.governance.sources.find(({ sourceRecordId }) => sourceRecordId === "ninghai100-official-cnh60-course-points-2026");
  ok(source);
  equal(source.sourceUrl, "https://ninghai100.com/page/CNH-60");
  equal(source.rawData?.editionYear, 2026);
  equal(source.rawData?.categoryName, "CNH-60");
  equal(ninghai60.governance.fieldSources.coursePoints.sourceName, source.sourceName);
  equal(ninghai60.governance.fieldSources.coursePointDataStatus.sourceName, source.sourceName);
  const rows = source.rawData?.coursePointRows as Array<{ officialLabel: string; pointId: string; name: string; cumulativeDistanceKm: number; cutoffText: string }>;
  deepEqual(rows.map(({ officialLabel }) => officialLabel), ["CP1", "CP2", "CP3", "CP4", "CP5", "CP6", "终点"]);
  for (const point of ninghai60.coursePoints!) {
    const evidence = rows.find(({ pointId }) => pointId === point.pointId)!;
    equal(evidence.name, point.name);
    equal(evidence.cumulativeDistanceKm, point.distanceKm);
    equal(evidence.cutoffText === "N/A" ? null : evidence.cutoffText.padStart(5, "0"), point.cutoffAt?.slice(11, 16) ?? null);
  }
  equal(ninghai60.governance.missingFields.includes("coursePoints"), false);
  ok(ninghai60.governance.missingFields.includes("coursePoints.CP3.cutoffAt"));
  ok(ninghai60.governance.missingFields.includes("coursePointServices"));
});

test("Ninghai Detail publishes partial CNH-60 points without source leakage or cross-Category inheritance", () => {
  const detail = createPublicRaceDetailResult(canonical, "ninghai-ultra-trail-2026");
  equal(detail.status, 200);
  if (detail.status !== 200) return;
  const sixty = detail.body.race.categories.find(({ categoryId }) => categoryId === ninghai60.categoryId)!;
  equal(sixty.coursePointDataStatus, "partial");
  deepEqual(sixty.coursePoints, ninghai60.coursePoints);
  equal(sixty.distanceKm, 60);
  for (const point of sixty.coursePoints!) {
    deepEqual(Object.keys(point).sort(), ["cutoffAt", "displayOrder", "distanceKm", "name", "pointId", "services", "type"]);
  }
  for (const other of detail.body.race.categories.filter(({ categoryId }) => categoryId !== ninghai60.categoryId)) {
    equal(other.coursePoints, null);
    equal(other.coursePointDataStatus, "unknown");
  }
  const publicText = JSON.stringify(detail.body.race.categories);
  for (const internal of ["governance", "sourceUrl", "evidenceLocator", "confidence", "rawData", "reviewNotes"]) {
    equal(publicText.includes(`"${internal}"`), false);
  }
});

test("partial is reserved for an incomplete P0 core structure", () => {
  const incomplete = gongga.coursePoints!.map((point, index) => index === 0 ? { ...point, cutoffAt: null } : point);
  deepEqual(validateCoursePointDataStatus(gongga.categoryId, incomplete, "partial"), []);
  ok(validateCoursePointDataStatus(gongga.categoryId, incomplete, "available").some(
    ({ field }) => field === "coursePointDataStatus",
  ));
});

test("Gongga 100K exposes 13 checkpoints plus Finish and retains CP8 drop bag", () => {
  equal(gongga.coursePoints?.length, 14);
  equal(gongga.coursePoints?.filter(({ type }) => type === "checkpoint").length, 13);
  deepEqual(gongga.coursePoints?.map(({ name }) => name), [
    "铁桥", "羌活棚", "4500m 垭口", "四号营地", "月牙湖", "草海子", "一号营地",
    "半亩温泉", "青岗坪", "燕子沟", "跃进坪村", "胜利沟", "康乐村", "海螺沟游客中心",
  ]);
  ok(gongga.coursePoints?.find(({ name }) => name === "半亩温泉")?.services?.includes("drop_bag"));
  equal(gongga.coursePointDataStatus, "available");
});

test("Gongga 60K and 40K expose complete official Course Points without inherited services", () => {
  equal(gongga60.coursePointDataStatus, "available");
  equal(gongga60.coursePoints?.length, 7);
  deepEqual(gongga60.coursePoints?.map(({ name }) => name), [
    "青岗坪", "共和村", "半亩温泉", "铁桥", "羌活棚", "4500m 垭口", "四号营地",
  ]);
  equal(gongga60.coursePoints?.at(-1)?.type, "finish");
  ok(gongga60.coursePoints?.every(({ services }) => services === null));

  equal(gongga40.coursePointDataStatus, "available");
  equal(gongga40.coursePoints?.length, 5);
  deepEqual(gongga40.coursePoints?.map(({ name }) => name), [
    "燕子沟", "跃进坪村", "胜利沟", "康乐村", "海螺沟游客中心",
  ]);
  equal(gongga40.coursePoints?.at(-1)?.type, "finish");
  ok(gongga40.coursePoints?.every(({ services }) => services === null));
});

test("HK100 exposes 10 checkpoints plus the official 96km Finish and retains CP6 drop bag", () => {
  equal(hk100.coursePoints?.length, 11);
  equal(hk100.coursePoints?.filter(({ type }) => type === "checkpoint").length, 10);
  deepEqual(hk100.coursePoints?.map(({ name }) => name), [
    "东坝", "西湾亭", "北潭凹", "白沙澳", "榕树澳", "企岭下",
    "基维尔营地", "笔架山", "城门", "铅矿坳", "大帽山扶轮公园",
  ]);
  deepEqual(hk100.coursePoints?.find(({ name }) => name === "企岭下")?.services, ["drop_bag", "medical"]);
  equal(hk100.coursePoints?.at(-1)?.distanceKm, 96);
  equal(hk100.distanceKm, 100);
  ok(hk100.governance.internalFlags?.includes("course_point_finish_distance_conflict_needs_review"));
  equal(hk100.coursePointDataStatus, "available");
});

test("HK100 The Third and The Half expose complete official Course Points", () => {
  equal(hkThird.coursePointDataStatus, "available");
  equal(hkThird.coursePoints?.length, 4);
  deepEqual(hkThird.coursePoints?.map(({ name, type }) => ({ name, type })), [
    { name: "东坝", type: "checkpoint" },
    { name: "西湾亭", type: "checkpoint" },
    { name: "赤径", type: "water_point" },
    { name: "北潭涌", type: "finish" },
  ]);
  deepEqual(hkThird.coursePoints?.find(({ name }) => name === "赤径")?.services, ["water"]);

  equal(hkHalf.coursePointDataStatus, "available");
  equal(hkHalf.coursePoints?.length, 6);
  deepEqual(hkHalf.coursePoints?.map(({ name }) => name), [
    "东坝", "西湾亭", "北潭凹", "白沙澳", "榕树澳", "北潭涌",
  ]);
  equal(hkHalf.coursePoints?.at(-1)?.type, "finish");
});

test("HK100 medical uses one all-checkpoints rule and never propagates to Finish", () => {
  const ruleEvidence = hk100.governance.sources.filter(
    ({ sourceRecordId }) => sourceRecordId === "hk100-official-rules-2027",
  );
  equal(ruleEvidence.length, 1);
  equal(ruleEvidence[0].rawData?.allCheckpointsHaveEmergencyMedicalService, true);
  equal(hk100.coursePoints?.filter(({ type, services }) =>
    type === "checkpoint" && services?.includes("medical")).length, 10);
  const finish = hk100.coursePoints?.find(({ type }) => type === "finish");
  equal(finish?.services?.includes("medical"), false);
  deepEqual(finish?.services, ["drop_bag"]);
});

test("HK100 checkpoint medical never propagates to water points or finishes", () => {
  for (const target of [hkThird, hkHalf, hk100]) {
    ok(target.coursePoints?.filter(({ type }) => type === "checkpoint")
      .every(({ services }) => services?.includes("medical")));
    ok(target.coursePoints?.filter(({ type }) => type !== "checkpoint")
      .every(({ services }) => !services?.includes("medical")));
  }
  ok([hkThird, hkHalf].every((target) => target.coursePoints?.every(
    ({ services }) => !services?.includes("drop_bag"),
  )));
});

test("list API does not expose coursePoints while Detail API does", () => {
  const list = createPublicRaceListResult(canonical);
  equal(list.status, 200);
  if (list.status === 200) {
    equal(list.body.races.length, expectedPublicEditionIds.length);
    ok(list.body.races.every((race) => !("coursePoints" in race)));
  }

  for (const editionId of ["kailas-gongga-100-2026", "hk100-2027"]) {
    const detail = createPublicRaceDetailResult(canonical, editionId);
    equal(detail.status, 200);
    if (detail.status !== 200) continue;
    ok(detail.body.race.categories.every(({ coursePoints, coursePointDataStatus }) =>
      coursePointDataStatus === "available" && Boolean(coursePoints?.length)));
  }
});

test("Public Course Point DTO excludes internal Evidence and governance", () => {
  const detail = createPublicRaceDetailResult(canonical, "hk100-2027");
  equal(detail.status, 200);
  if (detail.status !== 200) return;
  const point = detail.body.race.categories.find(({ isPrimaryCategory }) => isPrimaryCategory)!.coursePoints![0];
  deepEqual(Object.keys(point).sort(), [
    "cutoffAt", "displayOrder", "distanceKm", "name", "pointId", "services", "type",
  ]);
  const serialized = JSON.stringify(detail.body.race.categories);
  equal(serialized.includes("governance"), false);
  equal(serialized.includes("evidenceLocator"), false);
  equal(serialized.includes("confidence"), false);
});

test("First5 public Race Facts and Race Guide remain available", () => {
  const list = createPublicRaceListResult(canonical);
  equal(list.status, 200);
  if (list.status !== 200) return;
  equal(list.body.races.length, expectedPublicEditionIds.length);
  for (const race of list.body.races) {
    ok(race.name && race.raceDate && race.locationDisplay);
    const detail = createPublicRaceDetailResult(canonical, race.editionId);
    equal(detail.status, 200);
    if (detail.status === 200) ok(detail.body.race.raceGuide);
  }
});
