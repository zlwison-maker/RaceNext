import type {
  OfficialDocumentSnapshot,
  OfficialIngestionStatus,
  OfficialSourceIngestionStateEntry,
} from "../../types/officialSourceIngestion.ts";

const POST_OBSERVATION_STATUSES = new Set<OfficialIngestionStatus>([
  "success",
  "unchanged",
  "fact_extraction_provider_unconfigured",
  "extraction_error",
  "validation_error",
]);

export function shouldExtractDocument(
  state: OfficialSourceIngestionStateEntry | null,
  currentContentHash: string,
): boolean {
  return state?.lastSuccessfulExtractionHash !== currentContentHash;
}

/**
 * Records a successful fetch+normalization independently from extraction.
 * Failed/unconfigured extraction must not advance lastSuccessfulExtractionHash.
 */
export function transitionIngestionState(input: {
  previous: OfficialSourceIngestionStateEntry | null;
  document: OfficialDocumentSnapshot;
  outcome: OfficialIngestionStatus;
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
    lastExtractionMethod: document.extractionMethod,
    lastStatus: outcome,
  };
}
