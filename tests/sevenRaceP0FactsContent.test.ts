import { deepEqual, equal, ok } from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { batch20261020RaceGuides } from "../data/race-guides/batch-20261020.ts";
import { createPublicRaceDetailResult, createPublicRaceListResult } from "../lib/raceGraphPublic.ts";
import { evaluatePrePublishFactGate } from "../lib/prePublishFactGate.ts";
import { activeFreshnessSources, assertRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import { assertRaceGraphSnapshot } from "../scripts/race-update/validation.ts";
import type { RaceGraphSnapshot, RaceSourceRegistry } from "../types/raceUpdate.ts";

const graph = JSON.parse(readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as RaceGraphSnapshot;
const registry = JSON.parse(readFileSync(new URL("../data/sources/race-source-registry.json", import.meta.url), "utf8")) as RaceSourceRegistry;
const get = (id: string) => graph.records.find(r => r.edition.editionId === id)!;
const targets = ["guangzhou-100-2027", "nanjing-marathon-2026", "shaoxing-marathon-2026", "shenzhen-marathon-2026", "fuzhou-marathon-2026", "hengqin-marathon-2026", "panda-shudao-shan-2027"];

test("28 natural Chinese headlines leave every other approved Guide property byte-for-byte equivalent", () => {
  const masked = structuredClone(batch20261020RaceGuides) as Record<string, Record<string, {title?: string}>>;
  for (const guide of Object.values(masked)) {
    for (const key of ["impression", "viewpoint", "evidence", "suitability"]) {
      const title = guide[key].title!;
      ok(/[\u4e00-\u9fff]/.test(title));
      equal(/Opening|Judgment|Core Experiences|Runner Fit|×\s*3|｜/.test(title), false);
      ok(title.endsWith("？"));
      delete guide[key].title;
    }
  }
  equal(createHash("sha256").update(JSON.stringify(masked)).digest("hex"), "2ff730d4bb265122e897716fb201b0ed131bb7cde00fc7c8b6653fc530d6cc47");
});

test("registration audit distinguishes prepayment entry, completed ordinary/waitlist phases and unresolved payment states", () => {
  deepEqual(targets.map(id => get(id).edition.registrationStatus), ["registration_open", "registration_closed", "registration_closed", "unknown", "unknown", "unknown", "registration_open"]);
  const nj = get(targets[1]).edition, sx = get(targets[2]).edition;
  deepEqual([nj.registrationOpenDate, nj.registrationCloseDate], ["2026-07-28T10:00:00+08:00", "2026-08-28T17:00:00+08:00"]);
  deepEqual([sx.registrationOpenDate, sx.registrationCloseDate], ["2026-08-26T10:00:00+08:00", "2026-09-06T17:00:00+08:00"]);
  for (const id of [targets[0], targets[1], targets[2], targets[6]]) {
    const e = get(id).edition;
    equal(e.governance.fieldSources.registrationStatus.sourceType, "official");
    const proof = e.governance.sources.find(s => s.rawData?.registrationStatus === e.registrationStatus)!;
    ok(proof); equal(proof.rawData?.editionYear, e.editionYear);
    equal(proof.rawData?.asOf ?? (proof.rawData?.qaEvidence20261020 as Record<string, unknown>)?.asOf, "2026-10-20");
  }
  const payment = get(targets[3]).edition.governance.sources.find(s => s.sourceRecordId === "shenzhen-marathon-result-2026")!;
  equal(payment.rawData?.registrationStage, "lottery_result_payment");
  deepEqual([payment.rawData?.paymentOpenAt, payment.rawData?.paymentCloseAt], ["2026-10-16T10:00:00+08:00", "2026-10-22T17:00:00+08:00"]);
  equal(payment.rawData?.publishedAt, "2026-10-16 10:53:23");
  ok(String(get(targets[4]).edition.governance.reviewNotes).includes("second draw conditional"));
  ok(String(get(targets[5]).edition.governance.reviewNotes).includes("waitlist"));
  deepEqual([nj.registrationUrl, sx.registrationUrl, get(targets[3]).edition.registrationUrl, get(targets[5]).edition.registrationUrl], [
    "https://www.nj-marathon.cn/page/EA63XdLj8P5wjJqwoMrx.html", "http://www.sxym.org.cn/b/jiYrMv/entry.html",
    "https://shenzhen-registration.mararun.com/personal.html?lang=cn", "https://hq-registration.mararun.com",
  ]);
  equal(get(targets[0]).edition.registrationUrl, null); equal(get(targets[4]).edition.registrationUrl, null);
  const panda = get(targets[6]).edition;
  equal(panda.registrationOpenDate, null); equal(panda.registrationCloseDate, null);
  const card = panda.governance.sources.find(s => s.sourceRecordId === "panda-shudao-shan-official-list-2027")!;
  equal((card.rawData?.qaEvidence20261020 as Record<string, unknown>).rulesWindowOriginal, "10月3日10:00至11月5日10:00");
});

test("Fuzhou nominal distances have scoped secondary evidence and never acquire official provenance", () => {
  const fz = get(targets[4]);
  deepEqual(fz.categories.map(c => c.distanceKm), [42.195, 21.0975]);
  deepEqual([fz.edition.registrationOpenDate, fz.edition.registrationCloseDate], ["2026-09-10T20:00:00+08:00", "2026-09-19T17:00:00+08:00"]);
  for (const c of fz.categories) {
    const field = c.governance.fieldSources.distanceKm; equal(field.sourceType, "media");
    const proof = c.governance.sources.find(s => s.sourceName === field.sourceName)!;
    equal(proof.rawData?.categoryId, c.categoryId); equal(proof.rawData?.distanceKm, c.distanceKm);
    equal(proof.rawData?.directOfficialVerification, false); equal(proof.rawData?.editionYear, 2026);
    ok(String(proof.rawData?.distanceSemantic).includes("nominal"));
    ok(String(proof.rawData?.contentHash).match(/^[a-f0-9]{64}$/));
    equal(c.startAt, null); equal(c.startTimes, null); equal(c.cutoffTimeHours, null);
  }
  const source = registry.editions.find(e => e.editionId === targets[4])!.sources.find(s => s.sourceId === "fuzhou-marathon-registration-reprint-2026")!;
  equal(source.tier, "trusted_secondary"); equal(source.sourceType, "media_report");
  ok(!activeFreshnessSources(registry, targets[4]).some(s => s.sourceId === source.sourceId));
});

test("five Guangzhou endpoint pairs come from their own maps; cutoff conflict and actual distance are isolated", () => {
  const gz = get(targets[0]);
  deepEqual(gz.categories.map(c => c.distanceKm), [100, 55, 30, 10, 10]);
  const hashes = new Set<string>();
  for (const c of gz.categories) {
    equal(c.startLocation, "广州体育馆"); equal(c.finishLocation, "广州体育馆"); equal(c.coursePoints, null);
    const proof = c.governance.sources[0].rawData?.qaEvidence20261020 as Record<string, unknown>;
    equal(proof.categoryId, c.categoryId); equal(proof.status, 200);
    ok(String(proof.evidenceLocator).includes("S/F")); hashes.add(String(proof.sha256));
    ok(!c.governance.missingFields.includes("startLocation") && !c.governance.missingFields.includes("finishLocation"));
  }
  equal(hashes.size, 5);
  equal(gz.categories[1].cutoffTimeHours, null); equal(gz.categories[1].governance.verificationStatus, "pending");
});

test("cutoff image and dynamic JSON gaps are filled without inferring unpublished multi-category waves", () => {
  for (const id of [targets[1], targets[3]]) {
    const c = get(id).categories[0]; equal(c.cutoffTimeHours, 6);
    equal(c.governance.fieldSources.cutoffTimeHours.sourceType, "official");
    ok(c.governance.sources.some(s => s.rawData?.cutoffTimeHours === 6));
    ok(!c.governance.missingFields.includes("cutoffTimeHours"));
  }
  deepEqual(get(targets[1]).categories[0].startTimes?.map(t => t.slice(11, 16)), ["07:30", "07:45", "08:00"]);
  for (const id of [targets[2], targets[4], targets[5]]) for (const c of get(id).categories) {
    equal(c.startAt, null); equal(c.startTimes, null);
  }
});

test("19-race list and all seven details preserve facts, hotels, Guides, team semantics and Strategy/CP boundaries", () => {
  assertRaceGraphSnapshot(graph); assertRaceSourceRegistry(registry);
  const list = createPublicRaceListResult(graph); equal(list.status, 200);
  if (list.status === 200) equal(list.body.races.length, 19);
  for (const id of targets) {
    equal(evaluatePrePublishFactGate(get(id), registry.editions.find(e => e.editionId === id)).publishable, true);
    const detail = createPublicRaceDetailResult(graph, id); equal(detail.status, 200);
    if (detail.status === 200) {
      ok(detail.body.race.raceGuide); equal(detail.body.race.accommodationRecommendations.length, 5);
      equal(detail.body.race.registrationStatus, get(id).edition.registrationStatus);
      equal(detail.body.race.raceStrategy, null);
    }
  }
  const panda = get(targets[6]); equal(panda.categories[2].shortName, "85K³（团队赛）");
  ok(panda.categories.every(c => c.coursePoints === null));
  const fz = createPublicRaceDetailResult(graph, targets[4]);
  if (fz.status === 200) deepEqual(fz.body.race.categories.map(c => c.distanceKm), [42.195, 21.0975]);
});
