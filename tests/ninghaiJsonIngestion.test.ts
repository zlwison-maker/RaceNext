import { deepEqual, equal, match, ok, rejects } from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { fetchOfficialDocument } from "../scripts/race-update/officialDocument.ts";
import { runRealExtractionDryRun } from "../scripts/race-update/realExtraction.ts";
import { loadRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import { distanceEvidenceSemantic, validateOfficialFactCandidate } from "../scripts/race-update/validation.ts";
import type { FactExtractionProvider, OfficialFactCandidate, OfficialSourceIngestionState } from "../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceGraphSnapshot, RaceSourceRegistrySource } from "../types/raceUpdate.ts";
import { groupDetails } from "./fixtures/ninghaiOfficialResponses.ts";

const editionId = "ninghai-ultra-trail-2026";
const fetchedAt = "2026-10-13T12:00:00.000Z";
const protectedPaths = ["data/canonical/race-graph-v1.json", "data/pending/race-update-pending.json",
  "data/sources/race-source-registry.json", "data/sources/official-source-ingestion-state.json"];
const state = (): OfficialSourceIngestionState => ({ schemaVersion: "official-source-ingestion-state-v1", sources: [] });
const pending = (): PendingChangeStore => ({ schemaVersion: "race-update-pending-v1", changes: [] });
const source = (id: number): RaceSourceRegistrySource => ({
  sourceId: `ninghai100-official-category-${id}-2026`,
  url: `https://ninghai100.com/app-api/race/group/get?id=${id}`,
  domain: "ninghai100.com", tier: "primary_official", sourceType: "category_page",
  status: "active", isPrimary: false, notes: "SIMULATED_APPROVED_SOURCE — tests only",
});
const json = (id: number, override: Record<string, unknown> = {}) => JSON.stringify({ code: 0,
  data: { ...groupDetails.find((group) => group.id === id), ...override } });
const response = (body: string, status = 200, contentType = "application/json") =>
  new Response(body, { status, headers: { "content-type": contentType } });
const replay = (overrides: Record<number, string> = {}) => (async (url: string | URL | Request) => {
  const id = Number(new URL(String(url)).searchParams.get("id"));
  return response(overrides[id] ?? json(id));
}) as typeof fetch;
const unconfiguredProvider: FactExtractionProvider = {
  id: "unconfigured", configured: false, model: "none", promptVersion: "none",
  async extract() { throw new Error("Model must not be called for validated official JSON."); },
};

async function fixture() {
  const snapshot = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as RaceGraphSnapshot;
  const registry = await loadRaceSourceRegistry();
  registry.editions.find((entry) => entry.editionId === editionId)!.sources.push(...[6, 5, 4].map(source));
  return { snapshot, registry };
}

test("SIMULATED_APPROVED_SOURCE: 3 official JSON details traverse Evidence, Diff, Risk and Pending without model or writes", async () => {
  const before = await Promise.all(protectedPaths.map(async (path) => createHash("sha256").update(await readFile(path)).digest("hex")));
  const { snapshot, registry } = await fixture();
  const original = structuredClone(snapshot);
  const input = { snapshot, registry, state: state(), pendingStore: pending(), provider: unconfiguredProvider,
    targets: [{ editionId, sourceIds: [source(6).sourceId, source(5).sourceId, source(4).sourceId] }],
    fetcher: replay(), now: () => fetchedAt };
  const first = await runRealExtractionDryRun(input);
  const second = await runRealExtractionDryRun({ ...input, state: first.nextState, pendingStore: first.pendingStore });
  equal(first.report.summary.sourcesSucceeded, 3);
  equal(first.report.summary.modelCalls, 0);
  equal(first.report.summary.candidateCount, 9);
  equal(first.report.summary.pendingCount, 6);
  equal(first.createdPendingChangeIds.length, 6);
  equal(first.pendingStore.changes.length, 6);
  equal(second.createdPendingChangeIds.length, 0);
  equal(second.pendingStore.changes.length, 6);
  ok(second.report.sources.every((item) => item.extractionStatus === "unchanged"));
  ok(first.report.sources.every((item) => item.protocol === "deterministic-json"));
  const all = first.report.sources.flatMap((item) => item.candidates);
  ok(all.every((item) => item.field !== "distanceKm"));
  equal(all.filter((item) => item.field === "elevationGain" && item.action === "no_change").length, 3);
  const places = all.filter((item) => item.field === "startLocation" || item.field === "finishLocation");
  equal(places.length, 6);
  equal(new Set(places.map((item) => `${item.categoryId}/${item.field}`)).size, 6);
  ok(places.every((item) => item.candidateValue === "西门城楼" && item.currentValue === null
    && item.diff === "CHANGED" && item.action === "pending" && item.risk === "high_impact"
    && item.evidenceLocator.startsWith("text:") && item.evidenceLocator.includes("data.")));
  ok(first.pendingStore.changes.every((item) => item.status === "pending" && item.entityType === "Category"));
  deepEqual(snapshot, original);
  const after = await Promise.all(protectedPaths.map(async (path) => createHash("sha256").update(await readFile(path)).digest("hex")));
  deepEqual(after, before);
});

test("JSON fetch rejects unapproved source, cross-domain redirect, HTTP error, malformed and changed envelopes", async () => {
  const valid = source(6);
  const fetchOne = (candidate: RaceSourceRegistrySource, fetcher: typeof fetch) => fetchOfficialDocument({
    source: candidate, editionId, fetchedAt, fetcher,
  });
  equal((await fetchOne({ ...valid, status: "pending_review" }, replay())).ok, false);
  equal((await fetchOne({ ...valid, url: "http://127.0.0.1/app-api/race/group/get?id=6", domain: "127.0.0.1" }, replay())).ok, false);
  equal((await fetchOne(valid, (async () => new Response(null, { status: 302, headers: { location: "https://other.example/path" } })) as typeof fetch)).ok, false);
  equal((await fetchOne(valid, (async () => response("error", 500)) as typeof fetch)).ok, false);
  equal((await fetchOne(valid, (async () => response("{bad")) as typeof fetch)).ok, false);
  equal((await fetchOne(valid, (async () => response(JSON.stringify({ code: 0 }))) as typeof fetch)).ok, false);
  equal((await fetchOne(valid, (async () => response(json(6, { id: 5 }))) as typeof fetch)).ok, false);
  equal((await fetchOne(valid, (async () => response(json(6, { startPoint: 12 }))) as typeof fetch)).ok, false);
  equal((await fetchOne(valid, (async () => response(json(6), 200, "text/html")) as typeof fetch)).ok, false);
  equal((await fetchOne(valid, (async () => response("x".repeat(5_000_001))) as typeof fetch)).ok, false);
  const aborted = await fetchOne(valid, (async () => { const error = new Error("aborted"); error.name = "AbortError"; throw error; }) as typeof fetch);
  ok(!aborted.ok && aborted.detail.includes("timed out"));
});

test("2025 or ambiguous linked GPX identity cannot enter the fact chain", async () => {
  const { snapshot, registry } = await fixture();
  for (const filename of ["UTNH-100_2025宁海越野挑战赛.gpx", "UTNH-100_宁海越野挑战赛.gpx"]) {
    const result = await runRealExtractionDryRun({ snapshot, registry, state: state(), pendingStore: pending(),
      provider: unconfiguredProvider, targets: [{ editionId, sourceIds: [source(6).sourceId] }],
      fetcher: replay({ 6: json(6, { buttons: [{ linkUrl: `https://qiongjing.oss-cn-shanghai.aliyuncs.com/${filename}` }] }) }),
      now: () => fetchedAt });
    equal(result.report.summary.candidateCount, 0);
    equal(result.pendingStore.changes.length, 0);
    ok(["identity_mismatch", "identity_uncertain"].includes(result.report.sources[0].extractionStatus));
  }
});

test("unregistered source cannot run, and missing direct location evidence never becomes a Pending fact", async () => {
  const { snapshot, registry } = await fixture();
  const target = { editionId, sourceIds: [source(6).sourceId] };
  const unapproved = structuredClone(registry);
  unapproved.editions.find((entry) => entry.editionId === editionId)!.sources =
    unapproved.editions.find((entry) => entry.editionId === editionId)!.sources.filter((item) => item.sourceId !== source(6).sourceId);
  await rejects(runRealExtractionDryRun({ snapshot, registry: unapproved, state: state(), provider: unconfiguredProvider,
    targets: [target], fetcher: replay(), now: () => fetchedAt }), /source is missing from Registry|provider is not configured/i);
  const result = await runRealExtractionDryRun({ snapshot, registry, state: state(), pendingStore: pending(),
    provider: unconfiguredProvider, targets: [target], now: () => fetchedAt,
    fetcher: replay({ 6: json(6, { startPoint: null, endPoint: null }) }) });
  equal(result.report.summary.candidateCount, 1);
  equal(result.pendingStore.changes.length, 0);
  equal(result.report.sources[0].candidates[0].field, "elevationGain");
});

test("distance semantic gate separates actual course length, ambiguity and genuine nominal category facts", async () => {
  const { snapshot, registry } = await fixture();
  const record = snapshot.records.find((item) => item.edition.editionId === editionId)!;
  const category = record.categories.find((item) => item.categoryName === "UTNH-100")!;
  const base: OfficialFactCandidate = {
    eventId: record.event.eventId, editionId, categoryId: category.categoryId, entityType: "Category", field: "distanceKm",
    candidateValue: 100.6, sourceId: source(6).sourceId, sourceUrl: source(6).url,
    evidenceText: "UTNH-100 赛道实际距离 100.6 km", evidenceLocator: "data.distance",
    confidence: 1, fetchedAt, contentHash: "a".repeat(64), extractionMethod: "structured_json",
  };
  equal(distanceEvidenceSemantic(base), "actual_course");
  ok(validateOfficialFactCandidate(snapshot, registry, base).some((item) => item.field === "distanceKm"));
  equal(distanceEvidenceSemantic({ ...base, evidenceText: "UTNH-100 distance 100.6 km" }), "unknown");
  ok(validateOfficialFactCandidate(snapshot, registry, { ...base, evidenceText: "UTNH-100 distance 100.6 km" }).length > 0);
  const official = { ...base, candidateValue: 105, evidenceText: "官方组别距离 105 km" };
  equal(distanceEvidenceSemantic(official), "official_category");
  deepEqual(validateOfficialFactCandidate(snapshot, registry, official), []);
  const beijing = snapshot.records.find((item) => item.edition.editionId === "beijing-marathon-2026")!;
  const officialSource = (await loadRaceSourceRegistry()).editions.find((item) => item.editionId === beijing.edition.editionId)!.sources.find((item) => item.status === "active")!;
  const marathon = { ...base, eventId: beijing.event.eventId, editionId: beijing.edition.editionId,
    categoryId: beijing.categories[0].categoryId, sourceId: officialSource.sourceId, sourceUrl: officialSource.url,
    candidateValue: 42.195, evidenceText: "官方马拉松组别距离 42.195 km" };
  deepEqual(validateOfficialFactCandidate(snapshot, await loadRaceSourceRegistry(), marathon), []);
});
