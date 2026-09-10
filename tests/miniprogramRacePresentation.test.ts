import { deepEqual, equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createPublicRaceListResult } from "../lib/raceGraphPublic.ts";
import { formatRaceMeta, sortUpcomingRaces } from "../miniprogram/utils/racePresentation.ts";
import type { RaceListItem } from "../types/publicRaceGraph.ts";

const canonical = JSON.parse(
  readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8"),
) as unknown;
const publicRaceResult = createPublicRaceListResult(canonical);
if (publicRaceResult.status !== 200) throw new Error("Public Race Graph is unavailable for tests");
const first5 = publicRaceResult.body.races;

const getRace = (editionId: string): RaceListItem => {
  const race = first5.find((item) => item.editionId === editionId);
  if (!race) throw new Error(`Missing test race: ${editionId}`);
  return race;
};

test("homepage keeps current and future races ordered by raceDate, with unknown dates last", () => {
  const unknownDate = { ...getRace("xiamen-marathon-2027"), editionId: "unknown-date", raceDate: null };
  const pastRace = {
    ...getRace("shanghai-marathon-2026"),
    editionId: "past-race",
    raceDate: "2026-01-01",
    endDate: "2026-01-02",
  };

  deepEqual(
    sortUpcomingRaces([unknownDate, ...first5.slice().reverse(), pastRace], "2026-09-10")
      .map(({ editionId }) => editionId),
    [
      "kailas-gongga-100-2026",
      "beijing-marathon-2026",
      "shanghai-marathon-2026",
      "xiamen-marathon-2027",
      "hk100-2027",
      "unknown-date",
    ],
  );
});

test("single-day race includes full date, weekday, province and city", () => {
  equal(formatRaceMeta(getRace("xiamen-marathon-2027")), "2027.01.10 周日 · 福建 · 厦门市");
});

test("multi-day race uses a compact range without weekdays", () => {
  equal(formatRaceMeta(getRace("kailas-gongga-100-2026")), "2026.09.25–09.27 · 四川 · 甘孜州");
});

test("municipalities do not repeat province and city", () => {
  equal(formatRaceMeta(getRace("beijing-marathon-2026")), "2026.10.18 周日 · 北京市");
  equal(formatRaceMeta(getRace("shanghai-marathon-2026")), "2026.12.06 周日 · 上海市");
});

test("Hong Kong uses a natural special-region label and known district", () => {
  equal(formatRaceMeta(getRace("hk100-2027")), "2027.01.21–01.24 · 中国香港 · 西贡");
});

test("weekday calculation stays stable across runtime timezones", () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ["Pacific/Kiritimati", "UTC", "America/Los_Angeles"]) {
      process.env.TZ = timezone;
      equal(formatRaceMeta(getRace("xiamen-marathon-2027")), "2027.01.10 周日 · 福建 · 厦门市");
      equal(formatRaceMeta(getRace("beijing-marathon-2026")), "2026.10.18 周日 · 北京市");
      equal(formatRaceMeta(getRace("shanghai-marathon-2026")), "2026.12.06 周日 · 上海市");
    }
  } finally {
    process.env.TZ = originalTimezone;
  }
});

test("unknown raceDate uses a stable fallback", () => {
  const race = { ...getRace("xiamen-marathon-2027"), raceDate: null, endDate: null };
  equal(formatRaceMeta(race), "日期待公布 · 福建 · 厦门市");
});
