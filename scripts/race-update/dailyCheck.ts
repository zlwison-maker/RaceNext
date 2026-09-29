import type {
  FactExtractionProvider,
  OfficialSourceIngestionState,
  RaceDailyCheckReport,
  RaceDailyEditionCoverage,
} from "../../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceGraphSnapshot, RaceSourceRegistry } from "../../types/raceUpdate.ts";
import { runRealExtractionDryRun, type PreparedRealExtractionRun, type RealExtractionTarget } from "./realExtraction.ts";
import { activeFreshnessSources } from "./sourceRegistry.ts";

export type PreparedRaceDailyCheck = {
  prepared: PreparedRealExtractionRun;
  report: RaceDailyCheckReport;
};

export function buildRaceDailyCheckTargets(
  snapshot: RaceGraphSnapshot,
  registry: RaceSourceRegistry,
): RealExtractionTarget[] {
  return snapshot.records.map(({ edition }) => ({
    editionId: edition.editionId,
    sourceIds: activeFreshnessSources(registry, edition.editionId).map(({ sourceId }) => sourceId),
  }));
}

export async function runRaceDailyCheck(input: {
  snapshot: RaceGraphSnapshot;
  registry: RaceSourceRegistry;
  state: OfficialSourceIngestionState;
  pendingStore: PendingChangeStore;
  provider: FactExtractionProvider;
  now?: () => string;
  fetcher?: typeof fetch;
  autoApplyLowRisk?: boolean;
}): Promise<PreparedRaceDailyCheck> {
  const targets = buildRaceDailyCheckTargets(input.snapshot, input.registry);
  const prepared = await runRealExtractionDryRun({
    ...input,
    targets,
    forceExtract: false,
    autoApplyLowRisk: input.autoApplyLowRisk,
  });
  const report = buildRaceDailyCheckReport({
    snapshot: input.snapshot,
    registry: input.registry,
    prepared,
  });
  return { prepared, report };
}

export function buildRaceDailyCheckReport(input: {
  snapshot: RaceGraphSnapshot;
  registry: RaceSourceRegistry;
  prepared: PreparedRealExtractionRun;
}): RaceDailyCheckReport {
  const extraction = input.prepared.report;
  const editions = input.snapshot.records.map(({ edition }) => buildEditionCoverage({
    editionId: edition.editionId,
    registry: input.registry,
    prepared: input.prepared,
  }));
  const sourceFailures = extraction.sources.flatMap((source) => (
    source.failureStage && source.failureReason
      ? [{
        editionId: source.editionId,
        sourceId: source.sourceId,
        stage: source.failureStage,
        reason: source.failureReason,
        retryable: source.retryable ?? false,
      }]
      : []
  ));
  const pendingReviews = extraction.sources.flatMap(({ candidates }) => candidates)
    .filter((candidate) => candidate.action === "pending" && candidate.changeId !== null);
  const requiredIds = new Set(input.prepared.pendingRequirements.flatMap(({ changeIds }) => changeIds));
  const createdIds = new Set(input.prepared.createdPendingChangeIds);
  const conflictIds = new Set(pendingReviews.filter(({ diff }) => diff === "CONFLICT").flatMap(({ changeId }) => (
    changeId ? [changeId] : []
  )));
  const newPending = input.prepared.pendingStore.changes.filter(({ changeId }) => createdIds.has(changeId));
  const conflicts = input.prepared.pendingStore.changes.filter(({ changeId }) => conflictIds.has(changeId));
  const semanticReviews = extraction.sources.flatMap(({ candidates }) => candidates)
    .filter(({ action }) => action === "semantic_review");

  return {
    schemaVersion: "race-daily-check-v1",
    runId: extraction.runId,
    startedAt: extraction.startedAt,
    finishedAt: extraction.finishedAt,
    mode: "safe_baseline",
    editions,
    sourceFailures,
    newPending,
    conflicts,
    semanticReviews,
    sourceGaps: editions
      .filter(({ sourceGap }) => sourceGap.length > 0)
      .map(({ editionId, sourceGap }) => ({ editionId, neededSourceTypes: sourceGap })),
    extraction,
    summary: {
      editionsChecked: editions.length,
      sourcesChecked: extraction.sources.length,
      sourcesFetched: extraction.sources.filter(({ fetchStatus }) => fetchStatus === "success").length,
      sourcesFailed: sourceFailures.length,
      sourcesIdentityRejected: extraction.sources.filter(({ identity }) => identity?.status === "rejected").length,
      sourcesIdentityUncertain: extraction.sources.filter(({ identity }) => identity?.status === "uncertain").length,
      sourcesUnchanged: extraction.sources.filter(({ extractionStatus }) => extractionStatus === "unchanged").length,
      sourcesExtracted: extraction.sources.filter(({ requestStatus, extractionStatus }) => (
        requestStatus === "success" && extractionStatus === "success"
      )).length,
      modelCalls: extraction.summary.modelCalls,
      inputTokens: extraction.summary.inputTokens,
      outputTokens: extraction.summary.outputTokens,
      totalTokens: extraction.summary.totalTokens,
      candidates: extraction.summary.candidateCount,
      accepted: extraction.summary.validationAcceptedCount,
      rejected: extraction.summary.validationRejectedCount,
      changes: requiredIds.size,
      pendingCreated: newPending.length,
      pendingDeduped: Math.max(0, requiredIds.size - newPending.length),
      semanticReviews: semanticReviews.length,
      canonicalWrites: 0,
    },
  };
}

function buildEditionCoverage(input: {
  editionId: string;
  registry: RaceSourceRegistry;
  prepared: PreparedRealExtractionRun;
}): RaceDailyEditionCoverage {
  const eligible = activeFreshnessSources(input.registry, input.editionId);
  const reports = input.prepared.report.sources.filter(({ editionId }) => editionId === input.editionId);
  const successfulSourceIds = new Set(reports.filter(({ extractionStatus }) => (
    extractionStatus === "success" || extractionStatus === "unchanged"
  )).map(({ sourceId }) => sourceId));
  const successfulSources = successfulSourceIds.size;
  const officialSourcesSuccessful = eligible.filter(({ sourceId, tier }) => (
    tier === "primary_official" && successfulSourceIds.has(sourceId)
  )).length;
  const trustedSourcesSuccessful = eligible.filter(({ sourceId, tier }) => (
    tier !== "primary_official" && successfulSourceIds.has(sourceId)
  )).length;
  const failedSources = reports.length - successfulSources;
  const states = input.prepared.nextState.sources.filter(({ editionId, sourceId }) => (
    editionId === input.editionId && eligible.some((source) => source.sourceId === sourceId)
  ));
  const tier1Count = eligible.filter(({ tier }) => tier === "primary_official").length;
  const sourceGap = eligible.length === 0
    ? ["event_home", "registration_notice", "regulations"]
    : tier1Count === 0
      ? ["primary_official:event_home|registration_notice|regulations"]
      : successfulSources === 0
        ? [...new Set(eligible.filter(({ tier }) => tier === "primary_official").map(({ sourceType }) => sourceType))]
      : [];
  const health = eligible.length === 0
    ? "NO_VALID_SOURCE" as const
    : successfulSources === 0
      ? "FAILED" as const
      : failedSources > 0
        ? "PARTIAL" as const
        : "HEALTHY" as const;

  return {
    editionId: input.editionId,
    eligibleSources: eligible.length,
    successfulSources,
    officialSourcesSuccessful,
    trustedSourcesSuccessful,
    failedSources,
    tier1Count,
    tier2Count: eligible.length - tier1Count,
    lastCheckedAt: latest(states.map(({ lastCheckedAt }) => lastCheckedAt)),
    lastSuccessfulExtractionAt: latest(states.flatMap(({ lastSuccessfulExtractionAt }) => (
      lastSuccessfulExtractionAt ? [lastSuccessfulExtractionAt] : []
    ))),
    health,
    sourceGap,
  };
}

function latest(values: string[]): string | null {
  return values.length > 0 ? [...values].sort().at(-1) ?? null : null;
}
