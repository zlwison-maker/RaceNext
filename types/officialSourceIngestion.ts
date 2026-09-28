import type { Category, Edition } from "./event.ts";

export type OfficialDocumentContentType = "text/html" | "text/plain" | "application/pdf";
export type DocumentExtractionMethod = "html_text" | "plain_text" | "pdf_text";

export type OfficialDocumentSnapshot = {
  sourceId: string;
  editionId: string;
  url: string;
  title: string;
  contentType: OfficialDocumentContentType;
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
  extract(request: OfficialFactExtractionRequest): Promise<OfficialFactExtractionOutput>;
}

export type OfficialSourceIngestionStateEntry = {
  sourceId: string;
  editionId: string;
  /** Latest content successfully fetched and normalized, even when extraction later fails. */
  lastObservedContentHash: string | null;
  /** Latest content that completed valid extraction. This alone controls unchanged skipping. */
  lastSuccessfulExtractionHash: string | null;
  lastExtractionMethod: DocumentExtractionMethod | null;
  lastStatus: OfficialIngestionStatus;
};

export type OfficialSourceIngestionState = {
  schemaVersion: "official-source-ingestion-state-v1";
  sources: OfficialSourceIngestionStateEntry[];
};
