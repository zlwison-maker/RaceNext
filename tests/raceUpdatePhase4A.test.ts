import { deepEqual, equal, ok } from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { buildRaceDailyCheckTargets, runRaceDailyCheck } from "../scripts/race-update/dailyCheck.ts";
import { checkEditionDocumentIdentity } from "../scripts/race-update/identity.ts";
import { isNinghaiOfficialJsonSource } from "../scripts/race-update/ninghaiOfficialJson.ts";
import { extractDocumentSnapshot } from "../scripts/race-update/officialDocument.ts";
import { buildSanitizedRaceUpdateReport } from "../scripts/race-update/productionWorkflow.ts";
import { RACE_FACT_EXTRACTION_PROMPT_VERSION } from "../scripts/race-update/qwenProvider.ts";
import {
  activeFreshnessSources,
  evaluateFreshnessSourceEligibility,
  loadRaceSourceRegistry,
} from "../scripts/race-update/sourceRegistry.ts";
import type {
  FactExtractionProvider,
  FactExtractionProviderResult,
  OfficialFactExtractionRequest,
  OfficialSourceIngestionState,
} from "../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceGraphSnapshot, RaceSourceRegistry } from "../types/raceUpdate.ts";
import { groupDetails } from "./fixtures/ninghaiOfficialResponses.ts";

const canonicalSnapshot = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as RaceGraphSnapshot;
function snapshotWithNinghaiLocations(location: string | null): RaceGraphSnapshot {
  const fixture = structuredClone(canonicalSnapshot);
  const record = fixture.records.find(({ edition }) => edition.editionId === "ninghai-ultra-trail-2026")!;
  const categoryIds = new Set(groupDetails.map(({ name }) => `${record.edition.editionId}-${name.toLowerCase()}`));
  const categories = record.categories.filter(({ categoryId }) => categoryIds.has(categoryId));
  equal(categories.length, 3);
  for (const category of categories) {
    category.startLocation = location;
    category.finishLocation = location;
  }
  return fixture;
}
const snapshot = snapshotWithNinghaiLocations(null);
// Keep this all-source fixture before the confirmed Gongga end day; lifecycle exclusion is tested separately.
const FIXTURE_START = "2026-09-24T10:00:00+08:00";
const registry = await loadRaceSourceRegistry();
const emptyState = (): OfficialSourceIngestionState => ({ schemaVersion: "official-source-ingestion-state-v1", sources: [] });
const emptyPending = (): PendingChangeStore => ({ schemaVersion: "race-update-pending-v1", changes: [] });

test("Phase 4A derives all Edition targets and active freshness sources without a second hardcoded race list", () => {
  const targets = buildRaceDailyCheckTargets(snapshot, registry, FIXTURE_START);
  equal(targets.length, snapshot.records.length);
  deepEqual(
    targets.map(({ editionId }) => editionId),
    snapshot.records.map(({ edition }) => edition.editionId),
  );
  for (const target of targets) {
    deepEqual(
      target.sourceIds,
      activeFreshnessSources(registry, target.editionId).map(({ sourceId }) => sourceId),
    );
  }
});

test("Shenzhen Registry keeps stable source identities while using validated HTTPS official pages", () => {
  const editionId = "shenzhen-100-2026";
  const edition = registry.editions.find((candidate) => candidate.editionId === editionId);
  ok(edition);

  const eventHome = edition.sources.find(({ sourceId }) => sourceId === "letour-shenzhen100-2026-overview");
  deepEqual(eventHome, {
    sourceId: "letour-shenzhen100-2026-overview",
    url: "https://www.letoursports.net/kailas-fuga-shenzhen100",
    domain: "www.letoursports.net",
    tier: "primary_official",
    sourceType: "event_home",
    status: "active",
    isPrimary: true,
    notes: "Organizer official Edition home for the 2026 Shenzhen 100 event window and all Categories.",
  });

  const categoryPage = edition.sources.find(({ sourceId }) => sourceId === "letour-shenzhen100-2026-original");
  deepEqual(categoryPage, {
    sourceId: "letour-shenzhen100-2026-original",
    url: "https://www.letoursports.net/torx-china",
    domain: "www.letoursports.net",
    tier: "primary_official",
    sourceType: "category_page",
    status: "active",
    isPrimary: false,
    notes: "Organizer official TORX CHN100 Category page for the 2026 Shenzhen 100 edition.",
  });

  for (const source of [eventHome, categoryPage]) {
    ok(source);
    equal(new URL(source.url).protocol, "https:");
    equal(new URL(source.url).hostname, source.domain);
    equal(evaluateFreshnessSourceEligibility({
      registryEditionId: editionId,
      targetEditionId: editionId,
      source,
    }).eligible, true);
  }
  equal(edition.sources.some(({ url }) => url.includes("id=887684&mid=75256")), false);
});

test("HK100 trusted fallback sources are identity-matched cross-check-only event directories", async () => {
  const editionId = "hk100-2027";
  const record = snapshot.records.find(({ edition }) => edition.editionId === editionId)!;
  const entry = registry.editions.find((candidate) => candidate.editionId === editionId)!;
  const sources = ["hk100-finishers-2027", "hk100-hkjogging-2027"].map((sourceId) => {
    const source = entry.sources.find((candidate) => candidate.sourceId === sourceId);
    ok(source);
    return source;
  });

  for (const source of sources) {
    equal(source.tier, "trusted_structured");
    equal(source.sourceType, "event_directory");
    equal(source.status, "active");
    equal(source.isPrimary, false);
    deepEqual(evaluateFreshnessSourceEligibility({
      registryEditionId: editionId,
      targetEditionId: editionId,
      source,
    }), {
      eligible: true,
      autoApplyEligible: false,
      mode: "trusted_document",
      reason: "Trusted source is eligible for extraction and cross-check but is not field-authoritative by tier alone.",
    });

    const extracted = await extractDocumentSnapshot({
      sourceId: source.sourceId,
      editionId,
      url: source.url,
      contentType: "text/html",
      body: new TextEncoder().encode("<html><title>HK100: Hong Kong 100 Ultra Trail Race Series 2027</title></html>"),
      fetchedAt: "2026-09-29T00:00:00Z",
    });
    ok(extracted.ok);
    deepEqual(checkEditionDocumentIdentity({ record, source, document: extracted.document }), {
      status: "matched",
      eventIdentityMatched: true,
      editionYearMatched: true,
      domainMatched: true,
      evidence: ["event_name_or_alias_matched", "edition_year_matched", "approved_domain_matched"],
    });
  }
});

test("Phase 4A checks all eligible model/JSON sources and unchanged hashes produce no extraction or duplicate Pending", async (t) => {
  const protectedPaths = ["data/canonical/race-graph-v1.json", "data/pending/race-update-pending.json",
    "data/sources/race-source-registry.json", "data/sources/official-source-ingestion-state.json"];
  const protectedBefore = await Promise.all(protectedPaths.map((path) => readFile(new URL(`../${path}`, import.meta.url))));
  const canonicalBefore = structuredClone(snapshot);
  const providerCalls: string[] = [];
  const eligibleSources = snapshot.records.flatMap(({ edition }) => (
    activeFreshnessSources(registry, edition.editionId).map((source) => ({ editionId: edition.editionId, source }))
  ));
  const jsonSources = eligibleSources.filter(({ editionId, source }) => isNinghaiOfficialJsonSource(source, editionId));
  const modelSources = eligibleSources.filter(({ editionId, source }) => !isNinghaiOfficialJsonSource(source, editionId));
  const sourceKey = ({ editionId, sourceId }: { editionId: string; sourceId: string }) => `${editionId}/${sourceId}`;
  const first = await runRaceDailyCheck({
    snapshot,
    registry,
    state: emptyState(),
    pendingStore: emptyPending(),
    provider: fixtureProvider((request) => { providerCalls.push(sourceKey(request.document)); }),
    now: clockIso(),
    fetcher: allRaceFetcher(registry),
    autoApplyLowRisk: false,
  });
  const eligibleCount = eligibleSources.length;
  const modelRequiredCount = modelSources.length;
  equal(first.report.summary.editionsChecked, snapshot.records.length);
  equal(first.report.summary.sourcesChecked, eligibleCount);
  equal(first.report.summary.modelCalls, modelRequiredCount);
  equal(providerCalls.length, modelRequiredCount);
  deepEqual([...providerCalls].sort(), modelSources.map(({ editionId, source }) => sourceKey({ editionId, sourceId: source.sourceId })).sort());
  ok(first.report.editions.every(({ health }) => health === "HEALTHY"));
  equal(first.report.summary.canonicalWrites, 0);

  const jsonReports = first.report.extraction.sources.filter(({ protocol }) => protocol === "deterministic-json");
  const modelReports = first.report.extraction.sources.filter(({ protocol }) => protocol === "openai-compatible-chat-completions");
  equal(modelReports.length, modelRequiredCount);
  ok(modelReports.every(({ extractionStatus, requestStatus, reasoningMode, structuredOutputMode }) => (
    extractionStatus === "success" && requestStatus === "success" && reasoningMode === "none" && structuredOutputMode === "strict_json_schema"
  )));
  equal(jsonSources.length, 3);
  equal(jsonReports.length, jsonSources.length);
  deepEqual(jsonReports.map(({ sourceId }) => sourceId).sort(),
    groupDetails.map(({ id }) => `ninghai100-official-category-${id}-2026`).sort());
  for (const source of jsonReports) {
    equal(source.fetchStatus, "success");
    equal(source.identity?.status, "matched");
    equal(source.extractionStatus, "success");
    equal(source.requestStatus, "success");
    equal(source.provider, "official-json-deterministic");
    equal(source.model, "none");
    equal(providerCalls.filter((key) => key === sourceKey(source)).length, 0);
    deepEqual(source.usage, { inputTokens: null, outputTokens: null, totalTokens: null });
    const group = groupDetails.find(({ id }) => source.sourceId === `ninghai100-official-category-${id}-2026`)!;
    const categoryId = `ninghai-ultra-trail-2026-${group.name.toLowerCase()}`;
    deepEqual(source.candidates.map(({ field }) => field), ["elevationGain", "startLocation", "finishLocation"]);
    ok(source.candidates.every((candidate) => candidate.categoryId === categoryId && candidate.action !== "auto_apply"));
  }
  const ninghaiPending = first.prepared.pendingStore.changes.filter(({ editionId }) => editionId === "ninghai-ultra-trail-2026");
  equal(ninghaiPending.length, jsonReports.length * 2);
  equal(new Set(ninghaiPending.map(({ changeId }) => changeId)).size, ninghaiPending.length);
  for (const source of jsonReports) {
    const locations = ninghaiPending.filter(({ sourceId }) => sourceId === source.sourceId);
    deepEqual(locations.map(({ field }) => field).sort(), ["finishLocation", "startLocation"]);
    ok(locations.every(({ candidateValue, currentValue, status, risk, reviewedAt, appliedAt }) => (
      candidateValue === "西门城楼" && currentValue === null && status === "pending" && risk === "high_impact"
        && reviewedAt === null && appliedAt === null
    )));
  }
  ok(!first.report.extraction.sources.flatMap(({ candidates }) => candidates).some(({ field }) => field === "distanceKm"));
  deepEqual(snapshot.records.find(({ edition }) => edition.editionId === "ninghai-ultra-trail-2026")!.categories.map(({ distanceKm }) => distanceKm), [100, 60, 25]);

  providerCalls.length = 0;
  const second = await runRaceDailyCheck({
    snapshot,
    registry,
    state: first.prepared.nextState,
    pendingStore: first.prepared.pendingStore,
    provider: fixtureProvider((request) => { providerCalls.push(sourceKey(request.document)); }),
    now: clockIso(),
    fetcher: allRaceFetcher(registry),
    autoApplyLowRisk: false,
  });
  equal(second.report.summary.modelCalls, 0);
  equal(second.report.summary.sourcesUnchanged, eligibleCount);
  equal(providerCalls.length, 0);
  ok(second.report.extraction.sources.every(({ extractionStatus, requestStatus, candidates }) => (
    extractionStatus === "unchanged" && requestStatus === "skipped" && candidates.length === 0
  )));
  equal(second.prepared.createdPendingChangeIds.length, 0);
  equal(second.report.newPending.length, 0);
  deepEqual(second.prepared.pendingStore, first.prepared.pendingStore);
  equal(second.report.summary.canonicalWrites, 0);
  t.diagnostic(`sources_checked=${first.report.summary.sourcesChecked} model_calls=${first.report.summary.modelCalls} JSON_sources=${jsonReports.length} JSON_model_calls=0 simulated_Ninghai_pending=${ninghaiPending.length} second_model_calls=${second.report.summary.modelCalls} second_new_pending=${second.prepared.createdPendingChangeIds.length}`);
  deepEqual(snapshot, canonicalBefore);
  deepEqual(await Promise.all(protectedPaths.map((path) => readFile(new URL(`../${path}`, import.meta.url)))), protectedBefore);
});

test("Phase 4A isolates one source failure and marks only its Edition PARTIAL", async () => {
  const failedEditionId = "shanghai-marathon-2026";
  const failedSource = activeFreshnessSources(registry, failedEditionId)[0];
  const stableFetcher = allRaceFetcher(registry);
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = requestUrl(input);
    if (url === failedSource.url) {
      return new Response("temporary", { status: 503, headers: { "content-type": "text/plain" } });
    }
    return stableFetcher(input, init);
  }) as typeof fetch;
  const result = await runRaceDailyCheck({
    snapshot,
    registry,
    state: emptyState(),
    pendingStore: emptyPending(),
    provider: fixtureProvider(),
    now: clockIso(),
    fetcher,
  });
  equal(result.report.editions.find(({ editionId }) => editionId === failedEditionId)?.health, "PARTIAL");
  ok(result.report.editions.filter(({ editionId }) => editionId !== failedEditionId).every(({ health }) => health === "HEALTHY"));
  equal(result.report.sourceFailures.length, 1);
  deepEqual(result.report.sourceFailures[0], {
    editionId: failedEditionId,
    sourceId: failedSource.sourceId,
    stage: "fetch",
    reason: "HTTP 503",
    retryable: true,
  });
});

test("accepted Ninghai Canonical locations produce no duplicate Pending on initial or unchanged checks", async () => {
  const filled = snapshotWithNinghaiLocations("西门城楼");
  const before = structuredClone(filled);
  const first = await runRaceDailyCheck({
    snapshot: filled, registry, state: emptyState(), pendingStore: emptyPending(), provider: fixtureProvider(),
    now: clockIso(), fetcher: allRaceFetcher(registry), autoApplyLowRisk: false,
  });
  const jsonReports = first.report.extraction.sources.filter(({ protocol }) => protocol === "deterministic-json");
  equal(jsonReports.length, 3);
  ok(jsonReports.every(({ extractionStatus, identity }) => extractionStatus === "success" && identity?.status === "matched"));
  const locations = jsonReports.flatMap(({ candidates }) => candidates)
    .filter(({ field }) => field === "startLocation" || field === "finishLocation");
  equal(locations.length, 6);
  const verifiedLocations=first.report.criticalFactVerification.filter(({editionId,field})=>editionId==="ninghai-ultra-trail-2026" && ["startLocation","finishLocation"].includes(field));
  equal(verifiedLocations.length,6);
  ok(verifiedLocations.every(({status,directOfficialEvidenceSourceIds})=>status==="VERIFIED_THIS_RUN" && directOfficialEvidenceSourceIds.length===1));
  ok(locations.every(({ currentValue, candidateValue, diff, action, changeId, pendingStatus }) => (
    currentValue === "西门城楼" && candidateValue === currentValue && diff === "UNCHANGED" && action === "no_change"
      && changeId === null && pendingStatus === null
  )));
  ok(!jsonReports.flatMap(({ candidates }) => candidates).some(({ field }) => field === "distanceKm"));
  equal(first.prepared.createdPendingChangeIds.length, 0);
  equal(first.prepared.pendingStore.changes.length, 0);
  equal(first.report.summary.canonicalWrites, 0);
  const second = await runRaceDailyCheck({
    snapshot: filled, registry, state: first.prepared.nextState, pendingStore: first.prepared.pendingStore,
    provider: fixtureProvider(), now: clockIso(), fetcher: allRaceFetcher(registry), autoApplyLowRisk: false,
  });
  equal(second.report.summary.modelCalls, 0);
  equal(second.prepared.createdPendingChangeIds.length, 0);
  deepEqual(second.prepared.pendingStore, first.prepared.pendingStore);
  equal(second.report.summary.canonicalWrites, 0);
  deepEqual(filled, before);
  deepEqual(canonicalSnapshot, JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")));
});

test("Phase 4A reports NO_VALID_SOURCE and a Tier 1 gap without inventing sources", async () => {
  const editionId = "chengdu-marathon-2026";
  const noSourceRegistry = structuredClone(registry);
  const entry = noSourceRegistry.editions.find((candidate) => candidate.editionId === editionId)!;
  for (const source of entry.sources) source.status = "unavailable";
  const result = await runRaceDailyCheck({
    snapshot,
    registry: noSourceRegistry,
    state: emptyState(),
    pendingStore: emptyPending(),
    provider: fixtureProvider(),
    now: clockIso(),
    fetcher: allRaceFetcher(noSourceRegistry),
  });
  const coverage = result.report.editions.find((candidate) => candidate.editionId === editionId)!;
  equal(coverage.health, "NO_VALID_SOURCE");
  equal(coverage.eligibleSources, 0);
  deepEqual(coverage.sourceGap, ["event_home", "registration_notice", "regulations"]);
});

test("Phase 4A reports a reachable-source gap when every eligible source for one Edition fails", async () => {
  const editionId = "shenzhen-100-2026";
  const failedUrls = new Set(activeFreshnessSources(registry, editionId).map(({ url }) => url));
  const stableFetcher = allRaceFetcher(registry);
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => (
    failedUrls.has(requestUrl(input))
      ? new Response("temporary", { status: 503, headers: { "content-type": "text/plain" } })
      : stableFetcher(input, init)
  )) as typeof fetch;
  const result = await runRaceDailyCheck({
    snapshot,
    registry,
    state: emptyState(),
    pendingStore: emptyPending(),
    provider: fixtureProvider(),
    now: clockIso(),
    fetcher,
  });
  const coverage = result.report.editions.find((candidate) => candidate.editionId === editionId)!;
  equal(coverage.health, "FAILED");
  deepEqual(coverage.sourceGap, ["event_home", "regulations", "category_page"]);
});

test("HK100 is PARTIAL with zero official success when trusted watch sources succeed", async () => {
  const editionId = "hk100-2027";
  const result = await runRaceDailyCheck({
    snapshot,
    registry,
    state: emptyState(),
    pendingStore: emptyPending(),
    provider: fixtureProvider(),
    now: clockIso(),
    fetcher: hk100BlockedFetcher({ trustedSourcesSucceed: true }),
  });
  const coverage = result.report.editions.find((candidate) => candidate.editionId === editionId)!;
  equal(coverage.tier1Count, 10);
  equal(coverage.tier2Count, 2);
  equal(coverage.officialSourcesSuccessful, 0);
  equal(coverage.trustedSourcesSuccessful, 2);
  equal(coverage.successfulSources, 2);
  equal(coverage.failedSources, 10);
  equal(coverage.health, "PARTIAL");

  const sanitized = buildSanitizedRaceUpdateReport({
    report: result.report,
    autoApplyLowRisk: false,
    appliedChanges: [],
    meaningfulDiff: { meaningful: false, volatileOnly: true, reasons: [] },
  });
  const reported = sanitized.health.editions.find((candidate) => candidate.editionId === editionId)!;
  equal(reported.officialSourcesSuccessful, 0);
  equal(reported.trustedSourcesSuccessful, 2);
});

test("HK100 remains FAILED when official and trusted watch sources all fail", async () => {
  const editionId = "hk100-2027";
  const result = await runRaceDailyCheck({
    snapshot,
    registry,
    state: emptyState(),
    pendingStore: emptyPending(),
    provider: fixtureProvider(),
    now: clockIso(),
    fetcher: hk100BlockedFetcher({ trustedSourcesSucceed: false }),
  });
  const coverage = result.report.editions.find((candidate) => candidate.editionId === editionId)!;
  equal(coverage.officialSourcesSuccessful, 0);
  equal(coverage.trustedSourcesSuccessful, 0);
  equal(coverage.successfulSources, 0);
  equal(coverage.failedSources, 12);
  equal(coverage.health, "FAILED");
});

test("Shenzhen remains PARTIAL and passes minimum health when the legacy TLS source alone fails", async () => {
  const editionId = "shenzhen-100-2026";
  const failedSourceId = "letour-shenzhen100-2026-rules-list";
  const failedSource = activeFreshnessSources(registry, editionId)
    .find(({ sourceId }) => sourceId === failedSourceId);
  ok(failedSource);
  const stableFetcher = allRaceFetcher(registry);
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    if (requestUrl(input) === failedSource.url) throw new TypeError("fetch failed");
    return stableFetcher(input, init);
  }) as typeof fetch;
  const result = await runRaceDailyCheck({
    snapshot,
    registry,
    state: emptyState(),
    pendingStore: emptyPending(),
    provider: fixtureProvider(),
    now: clockIso(),
    fetcher,
  });
  const coverage = result.report.editions.find((candidate) => candidate.editionId === editionId)!;
  equal(coverage.eligibleSources, 3);
  equal(coverage.successfulSources, 2);
  equal(coverage.failedSources, 1);
  equal(coverage.health, "PARTIAL");
  deepEqual(coverage.sourceGap, []);
  ok(result.report.editions.filter(({ editionId: candidate }) => candidate !== editionId)
    .every(({ health }) => health === "HEALTHY"));
  deepEqual(result.report.sourceFailures.filter(({ editionId: candidate }) => candidate === editionId), [{
    editionId,
    sourceId: failedSourceId,
    stage: "fetch",
    reason: "fetch failed",
    retryable: true,
  }]);
});

function fixtureProvider(onExtract?: (request: OfficialFactExtractionRequest) => void): FactExtractionProvider {
  return {
    id: "aliyun-model-studio",
    configured: true,
    model: "qwen3.8-flash",
    promptVersion: RACE_FACT_EXTRACTION_PROMPT_VERSION,
    async extract(request: OfficialFactExtractionRequest): Promise<FactExtractionProviderResult> {
      onExtract?.(request);
      return {
        output: { contractVersion: "official-fact-extraction-v1", facts: [] },
        provider: "aliyun-model-studio",
        model: "qwen3.8-flash",
        protocol: "openai-compatible-chat-completions",
        reasoningMode: "none",
        structuredOutputMode: "strict_json_schema",
        promptVersion: RACE_FACT_EXTRACTION_PROMPT_VERSION,
        latencyMs: 1,
        usage: { inputTokens: 10, outputTokens: 1, totalTokens: 11 },
      };
    },
  };
}

function allRaceFetcher(sourceRegistry: RaceSourceRegistry): typeof fetch {
  const byUrl = new Map(sourceRegistry.editions.flatMap((entry) => entry.sources.map((source) => (
    [source.url, { editionId: entry.editionId, source }] as const
  ))));
  return (async (input: string | URL | Request) => {
    const url = requestUrl(input);
    const identity = byUrl.get(url);
    if (!identity) return new Response("missing fixture", { status: 404, headers: { "content-type": "text/plain" } });
    if (isNinghaiOfficialJsonSource(identity.source, identity.editionId)) {
      const id = Number(new URL(url).searchParams.get("id"));
      const group = groupDetails.find((candidate) => candidate.id === id);
      ok(group, `Missing official JSON fixture for ${identity.source.sourceId}`);
      equal(identity.source.sourceId, `ninghai100-official-category-${id}-2026`);
      return Response.json({ code: 0, data: group });
    }
    const record = snapshot.records.find(({ edition }) => edition.editionId === identity.editionId)!;
    const identityText = [
      record.event.canonicalName,
      record.edition.editionName,
      ...record.event.aliases,
      String(record.edition.editionYear),
    ].join(" ");
    return new Response(`<html><title>${identityText}</title><body>${identityText}</body></html>`, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }) as typeof fetch;
}

function hk100BlockedFetcher(input: { trustedSourcesSucceed: boolean }): typeof fetch {
  const editionId = "hk100-2027";
  const stableFetcher = allRaceFetcher(registry);
  const sources = registry.editions.find((entry) => entry.editionId === editionId)!.sources;
  const byUrl = new Map(sources.map((source) => [source.url, source]));
  return (async (request: string | URL | Request, init?: RequestInit) => {
    const source = byUrl.get(requestUrl(request));
    if (!source) return stableFetcher(request, init);
    if (source.tier === "primary_official" || !input.trustedSourcesSucceed) {
      return new Response("Access Restricted", {
        status: 403,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return stableFetcher(request, init);
  }) as typeof fetch;
}

function requestUrl(input: string | URL | Request): string {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

function clockIso(): () => string {
  let tick = 0;
  // A growing Registry can make more than 60 clock calls; roll over real hours.
  const start = Date.parse(FIXTURE_START);
  return () => new Date(start + tick++ * 60_000).toISOString();
}
