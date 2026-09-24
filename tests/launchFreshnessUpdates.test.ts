import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createPublicRaceDetailResult, createPublicRaceListResult } from "../lib/raceGraphPublic.ts";
import type { Category, Edition, Event } from "../types/event.ts";

type RaceGraphSnapshot = {
  schemaVersion: "race-graph-v1";
  generatedAt: string;
  records: Array<{ event: Event; edition: Edition; categories: Category[] }>;
};

type SourceRegistry = {
  editions: Array<{
    editionId: string;
    sources: Array<{
      sourceId: string;
      url: string;
      tier: string;
      sourceType: string;
      status: string;
      isPrimary: boolean;
    }>;
  }>;
};

const canonical = JSON.parse(
  readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8"),
) as RaceGraphSnapshot;

const registry = JSON.parse(
  readFileSync(new URL("../data/sources/race-source-registry.json", import.meta.url), "utf8"),
) as SourceRegistry;

const record = (editionId: string) => canonical.records.find(({ edition }) => edition.editionId === editionId)!;
const source = (editionId: string, sourceId: string) => registry.editions
  .find((entry) => entry.editionId === editionId)!
  .sources.find((entry) => entry.sourceId === sourceId)!;

test("approved launch registration facts are stored at their source precision", () => {
  const expected = new Map([
    ["beijing-marathon-2026", ["lottery", "2026-09-17T10:00:00+08:00", "2026-09-22T18:00:00+08:00", "https://beijing-registration.mararun.com/?lang=en"]],
    ["xiamen-marathon-2027", ["registration_open", "2026-09-23T10:00:00+08:00", "2026-10-14T18:00:00+08:00", "https://www.xmim.org/"]],
    ["chongqing-marathon-2027", ["registration_closed", "2026-09-02", "2026-09-13", "https://www.cqmarathon.com/"]],
    ["xian-marathon-2026", ["registration_closed", "2026-08-04T11:00:00+08:00", "2026-08-20T17:00:00+08:00", "https://xi-ma.com/"]],
    ["shanghai-marathon-2026", ["registration_closed", "2026-04-29T15:00:00+08:00", "2026-05-29T12:00:00+08:00", "https://static.shang-ma.com/web/index.html"]],
    ["chengdu-marathon-2026", ["registration_closed", "2026-06-10T10:00:00+08:00", "2026-06-24T18:00:00+08:00", "https://chengdumarathon.cn/"]],
    ["guangzhou-marathon-2026", ["lottery", "2026-09-02T10:00:00+08:00", "2026-09-11T18:00:00+08:00", "https://www.guangzhou-marathon.com/"]],
    ["tsaigu-kuocang-2026", ["registration_closed", "2026-06-20T10:00:00+08:00", "2026-06-26T10:00:00+08:00", null]],
    ["shenzhen-100-2026", ["registration_closed", "2026-08-18T15:00:00+08:00", null, "https://www.letoursports.com/events?mid=72298"]],
    ["hk100-2027", ["unknown", null, null, "https://hk100ultra.com/zh-hant/entry/"]],
    ["kailas-gongga-100-2026", ["registration_closed", "2026-06-30T10:00:00+08:00", "2026-07-20T10:00:00+08:00", "https://reg.zuicool.com/en/33836"]],
  ] as const);

  for (const [editionId, values] of expected) {
    const edition = record(editionId).edition;
    deepEqual(
      [edition.registrationStatus, edition.registrationOpenDate ?? null, edition.registrationCloseDate ?? null, edition.registrationUrl ?? null],
      values,
      editionId,
    );
  }

  const ninghai = record("ninghai-ultra-trail-2026").edition;
  deepEqual(
    [ninghai.registrationStatus, ninghai.registrationOpenDate ?? null, ninghai.registrationCloseDate ?? null, ninghai.registrationUrl ?? null],
    ["registration_closed", null, null, null],
  );
});
test("approved start facts are exposed without inventing incomplete waves", () => {
  const beijing = record("beijing-marathon-2026");
  equal(beijing.categories[0].startAt, "2026-10-18T07:30:00+08:00");
  equal(beijing.categories[0].startTimes ?? null, null);

  const xiamen = record("xiamen-marathon-2027");
  equal(xiamen.categories[0].startAt, "2027-01-10T07:00:00+08:00");
  equal(xiamen.categories[0].startTimes ?? null, null);

  const xian = record("xian-marathon-2026");
  deepEqual(xian.categories.map(({ startAt }) => startAt), [
    "2026-10-18T07:30:00+08:00",
    "2026-10-18T07:30:00+08:00",
  ]);
  ok(xian.categories.every(({ startTimes }) => (startTimes ?? null) === null));

  const shanghai = record("shanghai-marathon-2026");
  equal(shanghai.categories.length, 1);
  equal(shanghai.categories.some(({ categoryName }) => /wheelchair/i.test(categoryName)), false);
  equal(shanghai.categories[0].startTimes ?? null, null);
});

test("new official Registry sources are edition-scoped and non-primary", () => {
  deepEqual(source("beijing-marathon-2026", "beijing-marathon-official-registration-guidelines-2026"), {
    sourceId: "beijing-marathon-official-registration-guidelines-2026",
    url: "https://en.beijing-marathon.com/registration-guidelines.html",
    domain: "en.beijing-marathon.com",
    tier: "primary_official",
    sourceType: "registration_notice",
    status: "active",
    isPrimary: false,
    notes: "Official 2026 registration guidelines supporting the registration window, lottery stage, race date and 07:30 start.",
  });
  equal(source("beijing-marathon-2026", "beijing-marathon-official-registration-portal-2026").sourceType, "registration_platform");
  equal(source("ninghai-ultra-trail-2026", "ninghai100-official-home-2026").tier, "primary_official");
  equal(source("hk100-2027", "hk100-official-entry-2027").url, "https://hk100ultra.com/zh-hant/entry/");
});

test("public list and priority details expose approved launch values", () => {
  const list = createPublicRaceListResult(canonical);
  equal(list.status, 200);
  if (list.status !== 200) return;
  equal(list.body.races.length, 12);

  const expected = new Map([
    ["beijing-marathon-2026", ["lottery", "https://beijing-registration.mararun.com/?lang=en", "2026-10-18T07:30:00+08:00"]],
    ["xiamen-marathon-2027", ["registration_open", "https://www.xmim.org/", "2027-01-10T07:00:00+08:00"]],
    ["chongqing-marathon-2027", ["registration_closed", "https://www.cqmarathon.com/", "2027-01-10T08:00:00+08:00"]],
    ["ninghai-ultra-trail-2026", ["registration_closed", null, "2026-11-14T06:00:00+08:00"]],
    ["xian-marathon-2026", ["registration_closed", "https://xi-ma.com/", "2026-10-18T07:30:00+08:00"]],
  ] as const);

  for (const [editionId, values] of expected) {
    const detail = createPublicRaceDetailResult(canonical, editionId);
    equal(detail.status, 200, editionId);
    if (detail.status !== 200) continue;
    const primary = detail.body.race.categories.find(({ isPrimaryCategory }) => isPrimaryCategory)!;
    deepEqual([detail.body.race.registrationStatus, detail.body.race.registrationUrl, primary.startAt], values, editionId);
  }
});
