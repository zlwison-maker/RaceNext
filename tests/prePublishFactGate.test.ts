import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { FIRST5_MVP_EVENTS } from "../data/events/first5-events.ts";
import {
  evaluatePrePublishFactGate,
  type PrePublishRaceGraphRecord,
  type PrePublishSourceRegistryEntry,
} from "../lib/prePublishFactGate.ts";
import { createPublicRaceDetailResult, createPublicRaceListResult } from "../lib/raceGraphPublic.ts";

type RaceGraphSnapshot = {
  schemaVersion: "race-graph-v1";
  generatedAt: string;
  records: PrePublishRaceGraphRecord[];
};

type RaceSourceRegistry = {
  schemaVersion: "race-source-registry-v1";
  editions: PrePublishSourceRegistryEntry[];
};

const canonical = JSON.parse(
  readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8"),
) as RaceGraphSnapshot;
const registry = JSON.parse(
  readFileSync(new URL("../data/sources/race-source-registry.json", import.meta.url), "utf8"),
) as RaceSourceRegistry;

const record = (eventId: string) => canonical.records.find(({ event }) => event.eventId === eventId)!;
const registryEntry = (editionId: string) => registry.editions.find((entry) => entry.editionId === editionId)!;

test("HK100 active Canonical and product target are 2027, with no active 2026 Edition", () => {
  equal(FIRST5_MVP_EVENTS.find(({ base }) => base.eventId === "hk100")?.base.eventYear, 2027);
  equal(canonical.records.some(({ edition }) => edition.editionId === "hk100-2026"), false);
  equal(record("hk100").edition.editionId, "hk100-2027");
});

test("HK100 Public API exposes 2027 and keeps event window separate from the 100K date", () => {
  const result = createPublicRaceDetailResult(canonical, "hk100-2027");
  equal(result.status, 200);
  if (result.status !== 200) return;
  equal(result.body.race.raceDate, "2027-01-21");
  equal(result.body.race.endDate, "2027-01-24");
  equal(result.body.race.categories.find(({ isPrimaryCategory }) => isPrimaryCategory)?.startAt, "2027-01-23");
});

test("Beijing Marathon 2026 date has matching AIMS and World Athletics evidence", () => {
  const target = record("beijing-marathon");
  equal(target.edition.raceDate, "2026-10-18");
  const gate = evaluatePrePublishFactGate(target, registryEntry(target.edition.editionId));
  equal(gate.publishable, true);
  deepEqual(gate.issues, []);
  equal(target.edition.governance.publicationGate?.raceDateSourceRecordIds.length, 2);
});

test("Xiamen Marathon 2027 date has matching AIMS and reviewed cross-source evidence", () => {
  const target = record("xiamen-marathon");
  equal(target.edition.raceDate, "2027-01-10");
  const gate = evaluatePrePublishFactGate(target, registryEntry(target.edition.editionId));
  equal(gate.publishable, true);
  deepEqual(gate.issues, []);
  equal(target.edition.governance.publicationGate?.raceDateSourceRecordIds.length, 2);
});

test("product requested Edition cannot become active Canonical when official latest Edition conflicts", () => {
  const target = structuredClone(record("hk100"));
  target.edition.governance.publicationGate!.requestedEditionYear = 2026;
  const gate = evaluatePrePublishFactGate(target);
  equal(gate.publishable, false);
  equal(gate.conflict, true);
  ok(gate.issues.includes("requested_official_edition_conflict"));
});

test("raceDate cannot be null before source checks or differ from its evidence", () => {
  const missing = structuredClone(record("beijing-marathon"));
  missing.edition.raceDate = null;
  missing.edition.governance.publicationGate!.dateEvidenceStatus = "pending_review";
  ok(evaluatePrePublishFactGate(missing).issues.includes("race_date_missing_before_source_check"));

  const guessed = structuredClone(record("beijing-marathon"));
  guessed.edition.raceDate = "2026-10-19";
  ok(evaluatePrePublishFactGate(guessed).issues.includes("race_date_evidence_mismatch"));
});

test("First5 Public API returns exactly the five reviewed Editions", () => {
  const result = createPublicRaceListResult(canonical);
  equal(result.status, 200);
  if (result.status !== 200) return;
  deepEqual(new Set(result.body.races.map(({ editionId }) => editionId)), new Set([
    "shanghai-marathon-2026",
    "beijing-marathon-2026",
    "xiamen-marathon-2027",
    "hk100-2027",
    "kailas-gongga-100-2026",
  ]));
});

test("every First5 Public DTO keeps both Cover and Hero image relations", () => {
  const result = createPublicRaceListResult(canonical);
  equal(result.status, 200);
  if (result.status !== 200) return;
  equal(result.body.races.length, 5);
  ok(result.body.races.every(({ coverImage, heroImage }) => Boolean(coverImage) && Boolean(heroImage)));
});
