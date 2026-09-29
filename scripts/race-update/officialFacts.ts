import type {
  OfficialFactCandidate,
  OfficialFactEntityType,
  OfficialFactField,
} from "../../types/officialSourceIngestion.ts";

const EDITION_FIELDS = new Set<OfficialFactField>([
  "registrationStatus",
  "registrationOpenDate",
  "registrationCloseDate",
  "registrationUrl",
  "raceDate",
  "endDate",
]);

const CATEGORY_FIELDS = new Set<OfficialFactField>([
  "startAt",
  "startTimes",
  "startLocation",
  "finishLocation",
  "distanceKm",
  "elevationGain",
  "elevationLoss",
  "cutoffTimeHours",
]);

/**
 * Performs format-only normalization. It never invents a missing candidate,
 * derives startTimes from startAt, or derives elevationLoss from another fact.
 */
export function normalizeOfficialFactCandidate(
  candidate: OfficialFactCandidate,
): OfficialFactCandidate | null {
  if (candidate.candidateValue === undefined || candidate.candidateValue === null) return null;

  return {
    ...candidate,
    eventId: candidate.eventId.trim(),
    editionId: candidate.editionId.trim(),
    categoryId: candidate.categoryId?.trim() ?? null,
    candidateValue: normalizeCandidateValue(candidate.field, candidate.candidateValue),
    sourceId: candidate.sourceId.trim(),
    sourceUrl: candidate.sourceUrl.trim(),
    evidenceText: candidate.evidenceText.trim(),
    evidenceLocator: candidate.evidenceLocator.trim(),
    fetchedAt: candidate.fetchedAt.trim(),
    contentHash: candidate.contentHash.trim().toLowerCase(),
    extractionMethod: candidate.extractionMethod.trim(),
  };
}

export function fieldBelongsToEntity(entityType: OfficialFactEntityType, field: OfficialFactField): boolean {
  return entityType === "Edition" ? EDITION_FIELDS.has(field) : CATEGORY_FIELDS.has(field);
}

export function isSupportedFactField(value: string): value is OfficialFactField {
  return EDITION_FIELDS.has(value as OfficialFactField) || CATEGORY_FIELDS.has(value as OfficialFactField);
}

function normalizeCandidateValue(field: OfficialFactField, value: unknown): unknown {
  if (field === "startTimes") {
    return Array.isArray(value)
      ? value.map((entry) => typeof entry === "string" ? entry.trim() : entry)
      : value;
  }
  if (typeof value === "string") return value.trim();
  return value;
}
