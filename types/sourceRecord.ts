import type { SourceId, SourceType } from "./sourceGovernance.ts";

export type DataQuality = "high" | "medium" | "low" | "unknown";

export type SourceRecord = {
  sourceId: Extract<SourceId, "runchina" | "zuicool">;
  sourceName: string;
  sourceType: SourceType;
  sourceUrl: string;
  rawId: string;
  fetchedAt: string;
  rawData: Record<string, unknown>;
  extractedFields: Record<string, unknown>;
  dataQuality: DataQuality;
  warnings: string[];
};

export type ConnectorSummary = {
  sourceId: SourceRecord["sourceId"];
  sourceName: string;
  startedAt: string;
  finishedAt: string;
  listCount: number;
  detailCount: number;
  registrationPageCount?: number;
  recordsCount: number;
  warnings: string[];
  stoppedReason?: string | null;
};

export type ConnectorOutput = {
  pipelineVersion: "connector-poc-v1";
  summary: ConnectorSummary;
  records: SourceRecord[];
};

export type NormalizedConnectorRecord = {
  id: string;
  originalName: string | null;
  canonicalNameCandidate: string;
  normalizedName: string;
  sourceIds: SourceRecord["sourceId"][];
  sourceUrl: string;
  rawId: string;
  sourceId: SourceRecord["sourceId"];
  editionYear: number | null;
  raceDate: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  venue: string | null;
  registrationStatus: string | null;
  registrationUrl: string | null;
  coverImage?: string | null;
  categories: Array<{
    categoryName: string | null;
    distanceKm: number | null;
    elevationGain: number | null;
    cutoffTime: string | null;
    registrationFee: number | null;
    categoryRegistrationUrl?: string | null;
  }>;
  fieldSources: Record<string, SourceRecord["sourceId"]>;
  missingFields: string[];
  confidence: number;
  rawData: Record<string, unknown>;
};

export type MergedConnectorRecord = {
  id: string;
  normalizedName: string;
  originalNames: string[];
  editionYear: number | null;
  raceDate: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  venue: string | null;
  registrationStatus: string | null;
  registrationUrl: string | null;
  coverImage?: string | null;
  categories: NormalizedConnectorRecord["categories"];
  sourceIds: SourceRecord["sourceId"][];
  sources: Array<{
    sourceId: SourceRecord["sourceId"];
    rawId: string;
    sourceUrl: string;
  }>;
  fieldSources: Record<string, SourceRecord["sourceId"] | "merged" | "conflict">;
  conflicts: Array<{
    field: string;
    values: Record<string, unknown>;
    reason: string;
  }>;
  mergeTrace: Array<{
    field: string;
    selectedSource: SourceRecord["sourceId"] | "merged" | "none";
    reason: string;
  }>;
  missingFields: string[];
  confidence: number;
};
