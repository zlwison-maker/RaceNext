import { deepEqual, equal, ok } from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { buildRaceDailyCheckTargets, runRaceDailyCheck } from "../scripts/race-update/dailyCheck.ts";
import { RACE_FACT_EXTRACTION_PROMPT_VERSION } from "../scripts/race-update/qwenProvider.ts";
import { activeFreshnessSources, loadRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import type {
  FactExtractionProvider,
  FactExtractionProviderResult,
  OfficialFactExtractionRequest,
  OfficialSourceIngestionState,
} from "../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceGraphSnapshot, RaceSourceRegistry } from "../types/raceUpdate.ts";

const snapshot = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as RaceGraphSnapshot;
const registry = await loadRaceSourceRegistry();
const emptyState = (): OfficialSourceIngestionState => ({ schemaVersion: "official-source-ingestion-state-v1", sources: [] });
const emptyPending = (): PendingChangeStore => ({ schemaVersion: "race-update-pending-v1", changes: [] });

test("Phase 4A derives all Edition targets and active freshness sources without a second hardcoded race list", () => {
  const targets = buildRaceDailyCheckTargets(snapshot, registry);
  equal(targets.length, snapshot.records.length);
  equal(targets.length, 12);
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

test("Phase 4A checks all eligible sources and unchanged hashes make zero model calls", async () => {
  let providerCalls = 0;
  const first = await runRaceDailyCheck({
    snapshot,
    registry,
    state: emptyState(),
    pendingStore: emptyPending(),
    provider: fixtureProvider(() => { providerCalls += 1; }),
    now: clockIso(),
    fetcher: allRaceFetcher(registry),
  });
  const eligibleCount = snapshot.records.reduce((sum, { edition }) => (
    sum + activeFreshnessSources(registry, edition.editionId).length
  ), 0);
  equal(first.report.summary.editionsChecked, 12);
  equal(first.report.summary.sourcesChecked, eligibleCount);
  equal(first.report.summary.modelCalls, eligibleCount);
  equal(providerCalls, eligibleCount);
  ok(first.report.editions.every(({ health }) => health === "HEALTHY"));
  equal(first.report.summary.canonicalWrites, 0);

  providerCalls = 0;
  const second = await runRaceDailyCheck({
    snapshot,
    registry,
    state: first.prepared.nextState,
    pendingStore: first.prepared.pendingStore,
    provider: fixtureProvider(() => { providerCalls += 1; }),
    now: clockIso(),
    fetcher: allRaceFetcher(registry),
  });
  equal(second.report.summary.modelCalls, 0);
  equal(second.report.summary.sourcesUnchanged, eligibleCount);
  equal(providerCalls, 0);
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

function fixtureProvider(onExtract?: () => void): FactExtractionProvider {
  return {
    id: "aliyun-model-studio",
    configured: true,
    model: "qwen3.8-flash",
    promptVersion: RACE_FACT_EXTRACTION_PROMPT_VERSION,
    async extract(_request: OfficialFactExtractionRequest): Promise<FactExtractionProviderResult> {
      onExtract?.();
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
    [source.url, { editionId: entry.editionId, sourceId: source.sourceId }] as const
  ))));
  return (async (input: string | URL | Request) => {
    const url = requestUrl(input);
    const identity = byUrl.get(url);
    if (!identity) return new Response("missing fixture", { status: 404, headers: { "content-type": "text/plain" } });
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

function requestUrl(input: string | URL | Request): string {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

function clockIso(): () => string {
  let tick = 0;
  return () => `2026-09-29T10:${String(tick++).padStart(2, "0")}:00+08:00`;
}
