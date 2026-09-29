import type {
  FactExtractionProvider,
  FactExtractionProviderResult,
  OfficialFactExtractionRequest,
  OfficialSourceIngestionState,
  RaceDailyCheckReport,
} from "../../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceFieldChange, RaceGraphSnapshot } from "../../types/raceUpdate.ts";
import { FactExtractionProviderError } from "./qwenProvider.ts";

export const PRODUCTION_SECRET_NAMES = [
  "FACT_EXTRACTION_PROVIDER",
  "FACT_EXTRACTION_API_KEY",
  "FACT_EXTRACTION_MODEL",
  "FACT_EXTRACTION_BASE_URL",
] as const;

export const DATA_ONLY_PR_ALLOWLIST = [
  "data/canonical/race-graph-v1.json",
  "data/pending/race-update-pending.json",
  "data/sources/official-source-ingestion-state.json",
] as const;

export type MeaningfulDataChange = {
  meaningful: boolean;
  volatileOnly: boolean;
  reasons: Array<"canonical" | "pending" | "durable_state">;
};

export type SanitizedRaceUpdateReport = {
  schemaVersion: "race-update-report-v1";
  run: {
    runId: string;
    trigger: "workflow_dispatch";
    startedAt: string;
    finishedAt: string;
    autoApplyLowRisk: boolean;
  };
  health: {
    editionsChecked: number;
    healthy: number;
    partial: number;
    failed: number;
    sourceGap: number;
    editions: Array<{
      editionId: string;
      health: string;
      sourcesChecked: number;
      sourcesFailed: number;
    }>;
  };
  sources: {
    checked: number;
    fetched: number;
    failed: number;
    failures: Array<{
      editionId: string;
      sourceId: string;
      stage: string;
      retryable: boolean;
    }>;
  };
  model: {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  candidates: { accepted: number; rejected: number };
  newPending: Array<{
    changeId: string;
    editionId: string;
    categoryId: string | null;
    field: string;
    risk: string;
    conflict: boolean;
  }>;
  conflicts: Array<{ changeId: string; editionId: string; categoryId: string | null; field: string }>;
  lowRiskCanonicalUpdates: Array<{ changeId: string; editionId: string; field: string }>;
  sourceGaps: Array<{ editionId: string; neededSourceTypes: string[] }>;
  meaningfulDiff: MeaningfulDataChange;
};

export function assertProductionSecrets(environment: Readonly<Record<string, string | undefined>>): void {
  const missing = PRODUCTION_SECRET_NAMES.filter((name) => !(environment[name] ?? "").trim());
  if (missing.length > 0) {
    throw new Error(`PRODUCTION_SECRET_MISSING:${missing.join(",")}`);
  }
}

export function parseAutoApplyLowRisk(value: string | undefined): boolean {
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  throw new Error("auto_apply_low_risk must be true or false.");
}

export function assertDataOnlyPaths(paths: readonly string[]): void {
  const allowed = new Set<string>(DATA_ONLY_PR_ALLOWLIST);
  const unexpected = paths
    .map((path) => path.trim().replace(/^\.\//, ""))
    .filter(Boolean)
    .filter((path) => !allowed.has(path));
  if (unexpected.length > 0) throw new Error(`UNEXPECTED_DATA_DIFF:${unexpected.join(",")}`);
}

export function classifyMeaningfulDataChange(input: {
  canonicalBefore: RaceGraphSnapshot;
  canonicalAfter: RaceGraphSnapshot;
  pendingBefore: PendingChangeStore;
  pendingAfter: PendingChangeStore;
  stateBefore: OfficialSourceIngestionState;
  stateAfter: OfficialSourceIngestionState;
}): MeaningfulDataChange {
  const reasons: MeaningfulDataChange["reasons"] = [];
  if (!sameJson(input.canonicalBefore, input.canonicalAfter)) reasons.push("canonical");
  if (!sameJson(input.pendingBefore, input.pendingAfter)) reasons.push("pending");
  if (!sameJson(durableState(input.stateBefore), durableState(input.stateAfter))) reasons.push("durable_state");
  const stateChanged = !sameJson(input.stateBefore, input.stateAfter);
  return {
    meaningful: reasons.length > 0,
    volatileOnly: reasons.length === 0 && stateChanged,
    reasons,
  };
}

export function buildSanitizedRaceUpdateReport(input: {
  report: RaceDailyCheckReport;
  autoApplyLowRisk: boolean;
  appliedChanges: RaceFieldChange[];
  meaningfulDiff: MeaningfulDataChange;
}): SanitizedRaceUpdateReport {
  const { report } = input;
  return {
    schemaVersion: "race-update-report-v1",
    run: {
      runId: report.runId,
      trigger: "workflow_dispatch",
      startedAt: report.startedAt,
      finishedAt: report.finishedAt,
      autoApplyLowRisk: input.autoApplyLowRisk,
    },
    health: {
      editionsChecked: report.summary.editionsChecked,
      healthy: report.editions.filter(({ health }) => health === "HEALTHY").length,
      partial: report.editions.filter(({ health }) => health === "PARTIAL").length,
      failed: report.editions.filter(({ health }) => health === "FAILED").length,
      sourceGap: report.editions.filter(({ sourceGap }) => sourceGap.length > 0).length,
      editions: report.editions.map((edition) => ({
        editionId: edition.editionId,
        health: edition.health,
        sourcesChecked: edition.eligibleSources,
        sourcesFailed: edition.failedSources,
      })),
    },
    sources: {
      checked: report.summary.sourcesChecked,
      fetched: report.summary.sourcesFetched,
      failed: report.summary.sourcesFailed,
      failures: report.sourceFailures.map(({ editionId, sourceId, stage, retryable }) => ({
        editionId,
        sourceId,
        stage,
        retryable,
      })),
    },
    model: {
      calls: report.summary.modelCalls,
      inputTokens: report.summary.inputTokens,
      outputTokens: report.summary.outputTokens,
      totalTokens: report.summary.totalTokens,
    },
    candidates: { accepted: report.summary.accepted, rejected: report.summary.rejected },
    newPending: report.newPending.map((change) => ({
      changeId: change.changeId,
      editionId: change.editionId,
      categoryId: change.categoryId,
      field: change.field,
      risk: change.risk,
      conflict: change.conflict === true,
    })),
    conflicts: report.conflicts.map((change) => ({
      changeId: change.changeId,
      editionId: change.editionId,
      categoryId: change.categoryId,
      field: change.field,
    })),
    lowRiskCanonicalUpdates: input.appliedChanges.map(({ changeId, editionId, field }) => ({
      changeId,
      editionId,
      field,
    })),
    sourceGaps: report.sourceGaps,
    meaningfulDiff: input.meaningfulDiff,
  };
}

export function buildDataPrBody(report: SanitizedRaceUpdateReport, artifactName: string): string {
  const health = report.health;
  return [
    "## Race Data Update",
    "",
    `- Run ID: ${report.run.runId}`,
    `- 12-Race health: ${health.healthy} healthy / ${health.partial} partial / ${health.failed} failed / ${health.sourceGap} source gap`,
    `- Sources checked: ${report.sources.checked}`,
    `- Sources failed: ${report.sources.failed}`,
    `- Model calls: ${report.model.calls}`,
    `- New Pending: ${report.newPending.length}`,
    `- Low Risk Canonical changes: ${report.lowRiskCanonicalUpdates.length}`,
    `- Conflicts: ${report.conflicts.length}`,
    `- Source gaps: ${report.sourceGaps.length}`,
    `- Report artifact: ${artifactName}`,
    "",
    "This is a data-only proposal. Human review and merge are required; no production deployment is performed.",
  ].join("\n");
}

export function assertSanitizedText(input: {
  text: string;
  environment: Readonly<Record<string, string | undefined>>;
  scanMarkers?: boolean;
}): void {
  const prohibitedMarkers = ["authorization", ".env.local", "rawprovider", "raw_response", "rawrequest"];
  const folded = input.text.toLocaleLowerCase();
  if (input.scanMarkers !== false && prohibitedMarkers.some((marker) => folded.includes(marker))) {
    throw new Error("SECRET_SCAN_FAILED:prohibited_marker");
  }
  for (const name of ["FACT_EXTRACTION_API_KEY", "FACT_EXTRACTION_BASE_URL"] as const) {
    const secret = (input.environment[name] ?? "").trim();
    if (secret && input.text.includes(secret)) throw new Error(`SECRET_SCAN_FAILED:${name}`);
  }
}

export function withRetryingFactExtractionProvider(
  provider: FactExtractionProvider,
  options: { maxAttempts?: number; wait?: (attempt: number) => Promise<void> } = {},
): FactExtractionProvider {
  const maxAttempts = options.maxAttempts ?? 2;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) {
    throw new Error("Provider retry maxAttempts must be between 1 and 3.");
  }
  const wait = options.wait ?? (async (attempt) => {
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  });
  return {
    id: provider.id,
    configured: provider.configured,
    model: provider.model,
    promptVersion: provider.promptVersion,
    async extract(request: OfficialFactExtractionRequest): Promise<FactExtractionProviderResult> {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          return await provider.extract(request);
        } catch (error) {
          const retryable = error instanceof FactExtractionProviderError
            && ["rate_limited", "provider_server_error", "timeout"].includes(error.code);
          if (!retryable || attempt === maxAttempts) throw error;
          await wait(attempt);
        }
      }
      throw new Error("Provider retry loop exhausted unexpectedly.");
    },
  };
}

function durableState(state: OfficialSourceIngestionState): unknown {
  return {
    schemaVersion: state.schemaVersion,
    sources: state.sources.map((entry) => ({
      sourceId: entry.sourceId,
      editionId: entry.editionId,
      lastObservedContentHash: entry.lastObservedContentHash,
      lastSuccessfulExtractionHash: entry.lastSuccessfulExtractionHash,
      lastSuccessfulProvider: entry.lastSuccessfulProvider ?? null,
      lastSuccessfulModel: entry.lastSuccessfulModel ?? null,
      lastSuccessfulPromptVersion: entry.lastSuccessfulPromptVersion ?? null,
      lastSuccessfulProcessingVersion: entry.lastSuccessfulProcessingVersion ?? null,
      lastExtractionMethod: entry.lastExtractionMethod,
      lastFetchStatus: entry.lastFetchStatus,
      lastExtractionStatus: entry.lastExtractionStatus,
    })),
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
