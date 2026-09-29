import type {
  OfficialDocumentSnapshot,
  OfficialIngestionStatus,
  OfficialSourceIngestionStateEntry,
} from "../../types/officialSourceIngestion.ts";

export const RACE_FACT_PROCESSING_VERSION = "race-fact-processing-v4";

const POST_OBSERVATION_STATUSES = new Set<OfficialIngestionStatus>([
  "success",
  "unchanged",
  "identity_mismatch",
  "identity_uncertain",
  "fact_extraction_provider_unconfigured",
  "extraction_error",
  "validation_error",
]);

export function shouldExtractDocument(
  state: OfficialSourceIngestionStateEntry | null,
  currentContentHash: string,
  extractionIdentity?: { provider: string; model: string; promptVersion: string },
): boolean {
  if (state?.lastSuccessfulExtractionHash !== currentContentHash) return true;
  if (!extractionIdentity) return false;
  return state.lastSuccessfulProvider !== extractionIdentity.provider
    || state.lastSuccessfulModel !== extractionIdentity.model
    || state.lastSuccessfulPromptVersion !== extractionIdentity.promptVersion
    || state.lastSuccessfulProcessingVersion !== RACE_FACT_PROCESSING_VERSION;
}

/**
 * Records a successful fetch+normalization independently from extraction.
 * Failed/unconfigured extraction must not advance lastSuccessfulExtractionHash.
 * Callers may persist an outcome of success only after every accepted Change is durable.
 */
export function transitionIngestionState(input: {
  previous: OfficialSourceIngestionStateEntry | null;
  document: OfficialDocumentSnapshot;
  outcome: OfficialIngestionStatus;
  checkedAt?: string;
  successfulExtraction?: { provider: string; model: string; promptVersion: string; processingVersion?: string };
}): OfficialSourceIngestionStateEntry {
  const { previous, document, outcome } = input;
  if (!POST_OBSERVATION_STATUSES.has(outcome)) {
    throw new Error(`${outcome} is not a post-observation extraction outcome.`);
  }
  if (previous && (previous.sourceId !== document.sourceId || previous.editionId !== document.editionId)) {
    throw new Error("Ingestion state identity does not match the observed document.");
  }
  if (outcome === "unchanged" && shouldExtractDocument(previous, document.contentHash)) {
    throw new Error("Content can be unchanged only against lastSuccessfulExtractionHash.");
  }

  return {
    sourceId: document.sourceId,
    editionId: document.editionId,
    lastObservedContentHash: document.contentHash,
    lastSuccessfulExtractionHash: outcome === "success"
      ? document.contentHash
      : previous?.lastSuccessfulExtractionHash ?? null,
    lastSuccessfulProvider: outcome === "success"
      ? input.successfulExtraction?.provider ?? previous?.lastSuccessfulProvider ?? null
      : previous?.lastSuccessfulProvider ?? null,
    lastSuccessfulModel: outcome === "success"
      ? input.successfulExtraction?.model ?? previous?.lastSuccessfulModel ?? null
      : previous?.lastSuccessfulModel ?? null,
    lastSuccessfulPromptVersion: outcome === "success"
      ? input.successfulExtraction?.promptVersion ?? previous?.lastSuccessfulPromptVersion ?? null
      : previous?.lastSuccessfulPromptVersion ?? null,
    lastSuccessfulProcessingVersion: outcome === "success"
      ? input.successfulExtraction?.processingVersion ?? RACE_FACT_PROCESSING_VERSION
      : previous?.lastSuccessfulProcessingVersion ?? null,
    lastSuccessfulExtractionAt: outcome === "success"
      ? input.checkedAt ?? document.fetchedAt
      : previous?.lastSuccessfulExtractionAt ?? null,
    lastExtractionMethod: document.extractionMethod,
    lastCheckedAt: input.checkedAt ?? document.fetchedAt,
    lastFetchStatus: "success",
    lastExtractionStatus: outcome === "success"
      || outcome === "unchanged"
      || outcome === "identity_mismatch"
      || outcome === "identity_uncertain"
      || outcome === "fact_extraction_provider_unconfigured"
      || outcome === "extraction_error"
      || outcome === "validation_error"
      ? outcome
      : "not_attempted",
  };
}

export function transitionFetchFailureState(input: {
  previous: OfficialSourceIngestionStateEntry | null;
  sourceId: string;
  editionId: string;
  checkedAt: string;
  status: "fetch_error" | "parse_error" | "unsupported_content_type" | "unsupported_scanned_pdf";
}): OfficialSourceIngestionStateEntry {
  if (input.previous && (
    input.previous.sourceId !== input.sourceId || input.previous.editionId !== input.editionId
  )) {
    throw new Error("Ingestion state identity does not match the failed source.");
  }
  return {
    sourceId: input.sourceId,
    editionId: input.editionId,
    lastObservedContentHash: input.previous?.lastObservedContentHash ?? null,
    lastSuccessfulExtractionHash: input.previous?.lastSuccessfulExtractionHash ?? null,
    lastSuccessfulProvider: input.previous?.lastSuccessfulProvider ?? null,
    lastSuccessfulModel: input.previous?.lastSuccessfulModel ?? null,
    lastSuccessfulPromptVersion: input.previous?.lastSuccessfulPromptVersion ?? null,
    lastSuccessfulProcessingVersion: input.previous?.lastSuccessfulProcessingVersion ?? null,
    lastSuccessfulExtractionAt: input.previous?.lastSuccessfulExtractionAt ?? null,
    lastExtractionMethod: input.previous?.lastExtractionMethod ?? null,
    lastCheckedAt: input.checkedAt,
    lastFetchStatus: input.status,
    lastExtractionStatus: "not_attempted",
  };
}
