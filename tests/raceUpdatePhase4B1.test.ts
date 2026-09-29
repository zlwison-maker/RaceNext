import { deepEqual, equal, match, ok, rejects, throws } from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { evaluateRaceUpdateCore } from "../scripts/race-update/pipeline.ts";
import { runRealExtractionDryRun } from "../scripts/race-update/realExtraction.ts";
import {
  assertDataOnlyPaths,
  assertPhase4B1AutoApplyDisabled,
  assertProductionSecrets,
  assertSanitizedText,
  buildDataPrBody,
  classifyMeaningfulDataChange,
  DATA_ONLY_PR_ALLOWLIST,
  parseAutoApplyLowRisk,
  type SanitizedRaceUpdateReport,
  withRetryingFactExtractionProvider,
} from "../scripts/race-update/productionWorkflow.ts";
import { FactExtractionProviderError } from "../scripts/race-update/qwenProvider.ts";
import { loadRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import type {
  FactExtractionProvider,
  FactExtractionProviderResult,
  OfficialFactExtractionRequest,
  OfficialFactCandidate,
  OfficialSourceIngestionState,
} from "../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceGraphSnapshot } from "../types/raceUpdate.ts";

const workflow = await readFile(new URL("../.github/workflows/race-data-update.yml", import.meta.url), "utf8");
const canonical = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as RaceGraphSnapshot;
const registry = await loadRaceSourceRegistry();

test("Phase 4B-1 workflow is manual-only, serialized, least-privilege, and hard-disables auto apply", () => {
  match(workflow, /^\s{2}workflow_dispatch:/m);
  equal(/^\s{2}schedule:/m.test(workflow), false);
  equal(/cron:/i.test(workflow), false);
  equal(workflow.includes("auto_apply_low_risk:"), false);
  match(workflow, /npm run race:check:production -- --auto-apply-low-risk=false/);
  equal(workflow.includes("inputs.auto_apply_low_risk"), false);
  match(workflow, /permissions:\n\s{2}contents: write\n\s{2}pull-requests: write/);
  match(workflow, /concurrency:\n\s{2}group: race-data-update\n\s{2}cancel-in-progress: false/);
  equal(/write-all/.test(workflow), false);
  equal(/git push origin main/.test(workflow), false);
  equal(workflow.includes("race-source-registry.json"), false);
  match(workflow, /automation\/race-data-update-\$\{GITHUB_RUN_ID\}/);
});

test("production secret contract fails closed without printing secret values", () => {
  throws(() => assertProductionSecrets({}), /PRODUCTION_SECRET_MISSING/);
  throws(() => assertProductionSecrets({
    FACT_EXTRACTION_PROVIDER: "aliyun",
    FACT_EXTRACTION_API_KEY: "key",
    FACT_EXTRACTION_MODEL: "model",
  }), /FACT_EXTRACTION_BASE_URL/);
  assertProductionSecrets({
    FACT_EXTRACTION_PROVIDER: "aliyun",
    FACT_EXTRACTION_API_KEY: "key",
    FACT_EXTRACTION_MODEL: "model",
    FACT_EXTRACTION_BASE_URL: "https:\/\/provider.example",
  });
  equal(parseAutoApplyLowRisk(undefined), false);
  equal(parseAutoApplyLowRisk("false"), false);
  equal(parseAutoApplyLowRisk("true"), true);
  throws(() => parseAutoApplyLowRisk("yes"), /true or false/);
  assertPhase4B1AutoApplyDisabled(false);
  throws(() => assertPhase4B1AutoApplyDisabled(true), /AUTO_APPLY_DISABLED_IN_PHASE_4B1/);
});

test("data-only whitelist blocks Source Registry and every code or workflow path", () => {
  assertDataOnlyPaths(DATA_ONLY_PR_ALLOWLIST);
  throws(() => assertDataOnlyPaths(["data/sources/race-source-registry.json"]), /UNEXPECTED_DATA_DIFF/);
  throws(() => assertDataOnlyPaths(["scripts/race-update/pipeline.ts"]), /UNEXPECTED_DATA_DIFF/);
  throws(() => assertDataOnlyPaths([".github/workflows/race-data-update.yml"]), /UNEXPECTED_DATA_DIFF/);
});

test("operational fetch and extraction status transitions never create a PR", () => {
  const transitions: Array<{
    beforeFetch: "success" | "fetch_error";
    afterFetch: "success" | "fetch_error";
    beforeExtraction: "success" | "unchanged";
    afterExtraction: "success" | "unchanged";
  }> = [
    { beforeFetch: "success", afterFetch: "fetch_error", beforeExtraction: "success", afterExtraction: "success" },
    { beforeFetch: "fetch_error", afterFetch: "success", beforeExtraction: "success", afterExtraction: "success" },
    { beforeFetch: "success", afterFetch: "success", beforeExtraction: "success", afterExtraction: "unchanged" },
  ];
  for (const transition of transitions) {
    const before = stateFixture();
    before.sources[0].lastFetchStatus = transition.beforeFetch;
    before.sources[0].lastExtractionStatus = transition.beforeExtraction;
    const after = structuredClone(before);
    after.sources[0].lastFetchStatus = transition.afterFetch;
    after.sources[0].lastExtractionStatus = transition.afterExtraction;
    deepEqual(changePlan({ stateBefore: before, stateAfter: after }), {
      meaningful: false,
      volatileOnly: true,
      reasons: [],
    });
  }
});

test("operational timestamps and extraction method alone do not create a PR", () => {
  const before = stateFixture();
  const after = structuredClone(before);
  after.sources[0].lastCheckedAt = "2026-09-30T00:00:00Z";
  after.sources[0].lastSuccessfulExtractionAt = "2026-09-30T00:00:00Z";
  after.sources[0].lastExtractionMethod = "plain_text";
  deepEqual(changePlan({ stateBefore: before, stateAfter: after }), {
    meaningful: false,
    volatileOnly: true,
    reasons: [],
  });
});

test("observed hash, successful hash, and processing version each create a PR", () => {
  const stateBefore = stateFixture();
  for (const mutate of [
    (state: OfficialSourceIngestionState) => { state.sources[0].lastObservedContentHash = "b".repeat(64); },
    (state: OfficialSourceIngestionState) => { state.sources[0].lastSuccessfulExtractionHash = "b".repeat(64); },
    (state: OfficialSourceIngestionState) => { state.sources[0].lastSuccessfulProcessingVersion = "processing-v2"; },
  ]) {
    const stateAfter = structuredClone(stateBefore);
    mutate(stateAfter);
    deepEqual(changePlan({ stateBefore, stateAfter }), {
      meaningful: true,
      volatileOnly: false,
      reasons: ["durable_state"],
    });
  }
});

test("Pending and Canonical changes each create a PR", () => {
  const pendingAfter = emptyPending();
  pendingAfter.changes.push({ changeId: "fixture" } as never);
  deepEqual(changePlan({ pendingAfter }).reasons, ["pending"]);

  const canonicalAfter = structuredClone(canonical);
  canonicalAfter.generatedAt = "2026-09-30T00:00:00Z";
  deepEqual(changePlan({ canonicalAfter }).reasons, ["canonical"]);
});

test("auto apply can update only policy-approved low-risk fields while high-impact remains unapplied", () => {
  const source = registry.editions.find(({ editionId }) => editionId === "beijing-marathon-2026")!
    .sources.find(({ sourceId }) => sourceId === "beijing-marathon-official-registration-guidelines-2026")!;
  const common: Omit<OfficialFactCandidate, "field" | "candidateValue"> = {
    eventId: "beijing-marathon",
    editionId: "beijing-marathon-2026",
    categoryId: null,
    entityType: "Edition",
    sourceId: source.sourceId,
    sourceUrl: source.url,
    evidenceText: "Registration closed and race date 2026-10-19.",
    evidenceLocator: "fixture",
    confidence: 0.95,
    fetchedAt: "2026-09-29T00:00:00Z",
    contentHash: "c".repeat(64),
    extractionMethod: "fixture",
  };
  const low = evaluateRaceUpdateCore({
    snapshot: canonical,
    registry,
    candidates: [{ ...common, field: "registrationStatus", candidateValue: "registration_closed" }],
    detectedAt: "2026-09-29T00:00:01Z",
    applyLowRisk: true,
  });
  equal(low.appliedChangeIds.length, 1);
  equal(low.snapshot.records.find(({ edition }) => edition.editionId === common.editionId)!.edition.registrationStatus, "registration_closed");

  const high = evaluateRaceUpdateCore({
    snapshot: canonical,
    registry,
    candidates: [{ ...common, field: "raceDate", candidateValue: "2026-10-19" }],
    detectedAt: "2026-09-29T00:00:01Z",
    applyLowRisk: true,
  });
  equal(high.appliedChangeIds.length, 0);
  equal(high.changes[0].risk, "high_impact");
  equal(high.changes[0].action, "pending_review");
  equal(high.snapshot.records.find(({ edition }) => edition.editionId === common.editionId)!.edition.raceDate, "2026-10-18");
});

test("production extraction mode keeps default changes Pending and excludes eligible low-risk apply from Pending", async () => {
  const editionId = "beijing-marathon-2026";
  const source = registry.editions.find((entry) => entry.editionId === editionId)!
    .sources.find(({ sourceId }) => sourceId === "beijing-marathon-official-registration-guidelines-2026")!;
  const fetcher = (async () => new Response(
    "<html><title>2026 Beijing Marathon</title><body>2026 Beijing Marathon. Registration is closed.</body></html>",
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  )) as typeof fetch;
  const extractionProvider = providerFixture(async (request: OfficialFactExtractionRequest): Promise<FactExtractionProviderResult> => ({
    ...providerResult(),
    output: {
      contractVersion: "official-fact-extraction-v1",
      facts: [{
        eventId: "beijing-marathon",
        editionId,
        categoryId: null,
        entityType: "Edition",
        field: "registrationStatus",
        candidateValue: "registration_closed",
        sourceId: request.document.sourceId,
        sourceUrl: request.document.url,
        evidenceText: "2026 Beijing Marathon. Registration is closed.",
        evidenceLocator: "body",
        confidence: 0.95,
        fetchedAt: request.document.fetchedAt,
        contentHash: request.document.contentHash,
        extractionMethod: "fixture",
      }],
    },
  }));
  const common = {
    snapshot: canonical,
    registry,
    state: { schemaVersion: "official-source-ingestion-state-v1" as const, sources: [] },
    pendingStore: emptyPending(),
    provider: extractionProvider,
    targets: [{ editionId, sourceIds: [source.sourceId] }],
    now: () => "2026-09-29T00:00:00Z",
    fetcher,
  };
  const safe = await runRealExtractionDryRun(common);
  equal(safe.report.sources[0].candidates[0].action, "pending");
  equal(safe.pendingStore.changes.length, 1);

  const enabled = await runRealExtractionDryRun({ ...common, autoApplyLowRisk: true });
  equal(enabled.report.sources[0].candidates[0].action, "auto_apply");
  equal(enabled.pendingStore.changes.length, 0);
  equal(enabled.changes[0].action, "auto_apply");
});

test("provider retries only bounded transient failures", async () => {
  let attempts = 0;
  const transient = providerFixture(async () => {
    attempts += 1;
    if (attempts === 1) throw new FactExtractionProviderError("rate_limited", "retry");
    return providerResult();
  });
  await withRetryingFactExtractionProvider(transient, { maxAttempts: 2, wait: async () => undefined }).extract({} as never);
  equal(attempts, 2);

  attempts = 0;
  const invalid = providerFixture(async () => {
    attempts += 1;
    throw new FactExtractionProviderError("schema_mismatch", "do not retry");
  });
  await rejects(withRetryingFactExtractionProvider(invalid, { maxAttempts: 3, wait: async () => undefined }).extract({} as never), /do not retry/);
  equal(attempts, 1);
});

test("PR metadata is minimal and secret scan rejects credentials and raw payload markers", () => {
  const report = reportFixture();
  const body = buildDataPrBody(report, "race-update-report-123");
  match(body, /Run ID: 123/);
  match(body, /New Pending: 1/);
  equal(body.includes("evidenceText"), false);
  equal(body.includes("sourceUrl"), false);
  assertSanitizedText({
    text: body,
    environment: { FACT_EXTRACTION_API_KEY: "top-secret", FACT_EXTRACTION_BASE_URL: "https:\/\/secret.example" },
  });
  throws(() => assertSanitizedText({
    text: "top-secret",
    environment: { FACT_EXTRACTION_API_KEY: "top-secret" },
  }), /SECRET_SCAN_FAILED/);
  throws(() => assertSanitizedText({ text: "Authorization: Bearer redacted", environment: {} }), /SECRET_SCAN_FAILED/);
});

function emptyPending(): PendingChangeStore {
  return { schemaVersion: "race-update-pending-v1", changes: [] };
}

function stateFixture(): OfficialSourceIngestionState {
  return {
    schemaVersion: "official-source-ingestion-state-v1",
    sources: [{
      sourceId: "source",
      editionId: "edition",
      lastObservedContentHash: "a".repeat(64),
      lastSuccessfulExtractionHash: "a".repeat(64),
      lastSuccessfulProvider: "provider",
      lastSuccessfulModel: "model",
      lastSuccessfulPromptVersion: "prompt",
      lastSuccessfulProcessingVersion: "processing",
      lastSuccessfulExtractionAt: "2026-09-29T00:00:00Z",
      lastExtractionMethod: "html_text",
      lastCheckedAt: "2026-09-29T00:00:00Z",
      lastFetchStatus: "success",
      lastExtractionStatus: "success",
    }],
  };
}

function changePlan(input: {
  canonicalAfter?: RaceGraphSnapshot;
  pendingAfter?: PendingChangeStore;
  stateBefore?: OfficialSourceIngestionState;
  stateAfter?: OfficialSourceIngestionState;
}) {
  const stateBefore = input.stateBefore ?? stateFixture();
  return classifyMeaningfulDataChange({
    canonicalBefore: canonical,
    canonicalAfter: input.canonicalAfter ?? structuredClone(canonical),
    pendingBefore: emptyPending(),
    pendingAfter: input.pendingAfter ?? emptyPending(),
    stateBefore,
    stateAfter: input.stateAfter ?? structuredClone(stateBefore),
  });
}

function providerFixture(extract: FactExtractionProvider["extract"]): FactExtractionProvider {
  return { id: "provider", configured: true, model: "model", promptVersion: "prompt", extract };
}

function providerResult() {
  return {
    output: { contractVersion: "official-fact-extraction-v1" as const, facts: [] },
    provider: "provider",
    model: "model",
    protocol: "openai-compatible-chat-completions" as const,
    reasoningMode: "none" as const,
    structuredOutputMode: "strict_json_schema" as const,
    promptVersion: "prompt",
    latencyMs: 1,
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
  };
}

function reportFixture(): SanitizedRaceUpdateReport {
  return {
    schemaVersion: "race-update-report-v1",
    run: { runId: "123", trigger: "workflow_dispatch", startedAt: "start", finishedAt: "finish", autoApplyLowRisk: false },
    health: { editionsChecked: 12, healthy: 11, partial: 1, failed: 0, sourceGap: 0, editions: [] },
    sources: { checked: 20, fetched: 19, failed: 1, failures: [] },
    model: { calls: 2, inputTokens: 10, outputTokens: 2, totalTokens: 12 },
    candidates: { accepted: 1, rejected: 0 },
    newPending: [{ changeId: "change", editionId: "edition", categoryId: null, field: "raceDate", risk: "high_impact", conflict: false }],
    conflicts: [],
    lowRiskCanonicalUpdates: [],
    sourceGaps: [],
    meaningfulDiff: { meaningful: true, volatileOnly: false, reasons: ["pending"] },
  };
}
