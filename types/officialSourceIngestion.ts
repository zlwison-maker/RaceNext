import type { Category, Edition } from "./event.ts";
import type { PendingChange, PendingChangeStatus } from "./raceUpdate.ts";

export type OfficialDocumentContentType = "text/html" | "text/plain" | "application/pdf";
export type DocumentExtractionMethod = "html_text" | "plain_text" | "pdf_text";

export type OfficialDocumentSnapshot = {
  sourceId: string;
  editionId: string;
  url: string;
  title: string;
  contentType: OfficialDocumentContentType;
  httpStatus: number;
  charset: string | null;
  responseBytes: number;
  fetchedAt: string;
  text: string;
  links: string[];
  contentHash: string;
  extractionMethod: DocumentExtractionMethod;
};

export type OfficialIngestionStatus =
  | "success"
  | "unchanged"
  | "fetch_error"
  | "parse_error"
  | "unsupported_content_type"
  | "unsupported_scanned_pdf"
  | "identity_mismatch"
  | "identity_uncertain"
  | "fact_extraction_provider_unconfigured"
  | "extraction_error"
  | "validation_error";

export type OfficialFactEntityType = "Edition" | "Category";

export type OfficialEditionField = keyof Pick<
  Edition,
  | "registrationStatus"
  | "registrationOpenDate"
  | "registrationCloseDate"
  | "registrationUrl"
  | "raceDate"
  | "endDate"
>;

export type OfficialCategoryField = keyof Pick<
  Category,
  | "startAt"
  | "startTimes"
  | "startLocation"
  | "finishLocation"
  | "distanceKm"
  | "elevationGain"
  | "elevationLoss"
  | "cutoffTimeHours"
>;

export type OfficialFactField = OfficialEditionField | OfficialCategoryField;

export type FactEvidence = {
  sourceId: string;
  sourceUrl: string;
  evidenceText: string;
  evidenceLocator: string;
  confidence: number;
  fetchedAt: string;
  contentHash: string;
  extractionMethod: string;
};

/** One candidate represents one asserted field. Missing output is never a deletion request. */
export type OfficialFactCandidate = FactEvidence & {
  eventId: string;
  editionId: string;
  categoryId: string | null;
  entityType: OfficialFactEntityType;
  field: OfficialFactField;
  candidateValue: unknown;
};

/** Provider-facing shape only. Phase 1 deliberately ships no provider implementation. */
export type OfficialFactExtractionOutput = {
  contractVersion: "official-fact-extraction-v1";
  facts: OfficialFactCandidate[];
};

export type FactExtractionUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type FactExtractionProviderResult = {
  output: OfficialFactExtractionOutput;
  provider: string;
  model: string;
  protocol: "openai-compatible-chat-completions";
  reasoningMode: "none";
  structuredOutputMode: "strict_json_schema";
  promptVersion: string;
  latencyMs: number;
  usage: FactExtractionUsage;
};

export type OfficialFactExtractionRequest = {
  contractVersion: "official-fact-extraction-v1";
  document: OfficialDocumentSnapshot;
  editionContext: {
    eventId: string;
    canonicalName: string;
    aliases: string[];
    editionId: string;
    editionYear: number;
    timezone: string | null;
    categories: Array<{
      categoryId: string;
      categoryName: string;
      shortName: string | null;
    }>;
  };
};

export interface FactExtractionProvider {
  readonly id: string;
  readonly configured: boolean;
  readonly model: string;
  readonly promptVersion: string;
  extract(request: OfficialFactExtractionRequest): Promise<FactExtractionProviderResult>;
}

export type FactExtractionErrorCode =
  | "provider_unconfigured"
  | "auth_error"
  | "forbidden"
  | "rate_limited"
  | "provider_server_error"
  | "timeout"
  | "network_error"
  | "invalid_json"
  | "schema_mismatch"
  | "empty_response"
  | "refusal"
  | "content_filtered"
  | "unexpected_provider_payload";

export type OfficialSourceIngestionStateEntry = {
  sourceId: string;
  editionId: string;
  /** Latest content successfully fetched and normalized, even when extraction later fails. */
  lastObservedContentHash: string | null;
  /** Latest content that completed extraction and durably recorded every accepted change. */
  lastSuccessfulExtractionHash: string | null;
  /** Optional extraction identity; Phase 3 uses it to re-run unchanged content after prompt/model changes. */
  lastSuccessfulProvider?: string | null;
  lastSuccessfulModel?: string | null;
  lastSuccessfulPromptVersion?: string | null;
  lastSuccessfulProcessingVersion?: string | null;
  lastSuccessfulExtractionAt?: string | null;
  lastExtractionMethod: DocumentExtractionMethod | null;
  lastCheckedAt: string;
  lastFetchStatus: "success" | "fetch_error" | "parse_error" | "unsupported_content_type" | "unsupported_scanned_pdf";
  lastExtractionStatus:
    | "not_attempted"
    | "unchanged"
    | "identity_mismatch"
    | "identity_uncertain"
    | "fact_extraction_provider_unconfigured"
    | "extraction_error"
    | "validation_error"
    | "success";
};

export type OfficialSourceIngestionState = {
  schemaVersion: "official-source-ingestion-state-v1";
  sources: OfficialSourceIngestionStateEntry[];
};

export type EditionIdentityResult = {
  status: "matched" | "uncertain" | "rejected";
  eventIdentityMatched: boolean;
  editionYearMatched: boolean;
  domainMatched: boolean;
  evidence: string[];
};

export type NoKeyDryRunSourceReport = {
  editionId: string;
  sourceId: string;
  sourceUrl: string;
  eligibility: {
    eligible: boolean;
    autoApplyEligible: boolean;
    mode: string;
    reason: string;
  };
  fetchStatus: OfficialIngestionStatus;
  httpStatus: number | null;
  finalUrl: string | null;
  contentType: OfficialDocumentContentType | null;
  charset: string | null;
  responseBytes: number;
  fetchedAt: string;
  contentHash: string | null;
  documentTextLength: number;
  documentSample: string | null;
  identity: EditionIdentityResult | null;
  providerStatus: "unconfigured";
  extractionStatus: OfficialIngestionStatus;
  extractionRequired: boolean;
  observedComparison: "first_observation" | "changed" | "unchanged" | "not_observed";
  candidateCount: 0;
  changeCount: 0;
  pendingCount: 0;
  canonicalWritten: false;
  errors: string[];
  warnings: string[];
};

export type NoKeyDryRunReport = {
  schemaVersion: "race-no-key-dry-run-v1";
  runId: string;
  pass: number;
  startedAt: string;
  finishedAt: string;
  editions: string[];
  sources: NoKeyDryRunSourceReport[];
  summary: {
    sources_checked: number;
    sources_succeeded: number;
    sources_failed: number;
    documents_changed: number;
    documents_unchanged: number;
    model_calls: 0;
    fact_candidates: 0;
    changes: 0;
    pending_facts: 0;
    canonical_writes: 0;
  };
};

export type NoKeyDryRunArtifact = {
  schemaVersion: "race-no-key-dry-run-artifact-v1";
  generatedAt: string;
  reports: NoKeyDryRunReport[];
};

export type RealExtractionCandidateReview = {
  eventId: string;
  editionId: string;
  categoryId: string | null;
  entityType: OfficialFactEntityType;
  field: OfficialFactField;
  candidateValue: unknown;
  sourceId: string;
  sourceUrl: string;
  sourceTier: string;
  authority: "authoritative" | "cross_check_only";
  evidenceText: string;
  evidenceLocator: string;
  confidence: number;
  currentValue: unknown;
  diff: "UNCHANGED" | "CHANGED" | "CONFLICT" | "MISSING" | "SEMANTIC_REVIEW";
  risk: "low" | "high_impact" | "structural" | null;
  action: "no_change" | "pending" | "auto_apply" | "semantic_review";
  changeId: string | null;
  pendingStatus: PendingChangeStatus | null;
  reason: string;
  provider: string;
  model: string;
  promptVersion: string;
};

export type RealExtractionRejectedCandidate = {
  eventId: string;
  sourceId: string;
  editionId: string;
  categoryId: string | null;
  entityType: OfficialFactEntityType;
  field: string;
  candidateValue: unknown;
  evidenceText: string;
  evidenceLocator: string;
  confidence: number;
  action: "rejected";
  reason: string;
};

export type RealExtractionSourceReport = {
  editionId: string;
  sourceId: string;
  sourceUrl: string;
  sourceTier: string;
  fetchStatus: OfficialIngestionStatus;
  identity: EditionIdentityResult | null;
  extractionStatus: OfficialIngestionStatus;
  provider: string;
  model: string;
  protocol: "openai-compatible-chat-completions";
  reasoningMode: "none";
  structuredOutputMode: "strict_json_schema";
  promptVersion: string;
  processingVersion: string;
  requestStatus: "success" | "skipped" | "failed";
  providerErrorCode: FactExtractionErrorCode | null;
  failureStage: "fetch" | "identity" | "provider" | "validation" | null;
  failureReason: string | null;
  retryable: boolean | null;
  contentHash: string | null;
  fetchedAt: string;
  latencyMs: number | null;
  usage: FactExtractionUsage;
  rawCandidateCount: number;
  validationAcceptedCount: number;
  validationRejectedCount: number;
  candidates: RealExtractionCandidateReview[];
  rejectedCandidates: RealExtractionRejectedCandidate[];
  canonicalWritten: false;
};

export type RealExtractionReport = {
  schemaVersion: "race-real-extraction-v1";
  runId: string;
  startedAt: string;
  finishedAt: string;
  dryRun: true;
  processingVersion: string;
  editions: string[];
  sources: RealExtractionSourceReport[];
  summary: {
    sourcesChecked: number;
    sourcesSucceeded: number;
    sourcesFailed: number;
    modelCalls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    candidateCount: number;
    validationAcceptedCount: number;
    validationRejectedCount: number;
    pendingCount: number;
    canonicalWrites: 0;
  };
};

export type RealExtractionArtifact = {
  schemaVersion: "race-real-extraction-artifact-v1";
  generatedAt: string;
  report: RealExtractionReport;
};

export type RaceDailyCheckHealth = "HEALTHY" | "PARTIAL" | "NO_VALID_SOURCE" | "FAILED";

export type RaceDailySourceFailure = {
  editionId: string;
  sourceId: string;
  stage: "fetch" | "identity" | "provider" | "validation";
  reason: string;
  retryable: boolean;
};

export type RaceDailyEditionCoverage = {
  editionId: string;
  eligibleSources: number;
  successfulSources: number;
  officialSourcesSuccessful: number;
  trustedSourcesSuccessful: number;
  failedSources: number;
  tier1Count: number;
  tier2Count: number;
  lastCheckedAt: string | null;
  lastSuccessfulExtractionAt: string | null;
  health: RaceDailyCheckHealth;
  sourceGap: string[];
};

export type RaceDailyCheckReport = {
  schemaVersion: "race-daily-check-v1";
  runId: string;
  startedAt: string;
  finishedAt: string;
  mode: "safe_baseline";
  editions: RaceDailyEditionCoverage[];
  sourceFailures: RaceDailySourceFailure[];
  newPending: PendingChange[];
  conflicts: PendingChange[];
  semanticReviews: RealExtractionCandidateReview[];
  sourceGaps: Array<{ editionId: string; neededSourceTypes: string[] }>;
  extraction: RealExtractionReport;
  summary: {
    editionsChecked: number;
    sourcesChecked: number;
    sourcesFetched: number;
    sourcesFailed: number;
    sourcesIdentityRejected: number;
    sourcesIdentityUncertain: number;
    sourcesUnchanged: number;
    sourcesExtracted: number;
    modelCalls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    candidates: number;
    accepted: number;
    rejected: number;
    changes: number;
    pendingCreated: number;
    pendingDeduped: number;
    semanticReviews: number;
    canonicalWrites: 0;
  };
};

export type RaceDailyCheckArtifact = {
  schemaVersion: "race-daily-check-artifact-v1";
  generatedAt: string;
  report: RaceDailyCheckReport;
};
