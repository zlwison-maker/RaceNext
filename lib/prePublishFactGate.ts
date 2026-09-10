import type { Category, Edition, Event, PrePublishFactGate, SourceRecord } from "../types/event.ts";

export type PrePublishRaceGraphRecord = {
  event: Event;
  edition: Edition;
  categories: Category[];
};

export type PrePublishSourceRegistryEntry = {
  editionId: string;
  sources: Array<{ sourceId: string; status: string }>;
};

export type PrePublishFactGateIssue =
  | "event_identity_invalid"
  | "edition_identity_invalid"
  | "requested_official_edition_conflict"
  | "canonical_official_edition_conflict"
  | "race_date_missing_before_source_check"
  | "race_date_invalid"
  | "race_date_evidence_missing"
  | "race_date_evidence_mismatch"
  | "location_missing"
  | "primary_category_missing"
  | "primary_category_date_invalid"
  | "primary_category_date_evidence_mismatch"
  | "primary_source_missing"
  | "secondary_source_missing"
  | "latest_official_source_missing"
  | "latest_official_edition_evidence_mismatch"
  | "registry_source_missing"
  | "conflict_status_mismatch"
  | "publishable_status_mismatch";

export type PrePublishFactGateResult = {
  raceBrand: string;
  requestedEdition: number | null;
  latestOfficialEdition: number | null;
  canonicalEdition: number;
  raceDate: string | null;
  primarySource: string | null;
  secondarySource: string | null;
  conflict: boolean;
  publishable: boolean;
  issues: PrePublishFactGateIssue[];
};

export function evaluatePrePublishFactGate(
  record: PrePublishRaceGraphRecord,
  registryEntry?: PrePublishSourceRegistryEntry,
): PrePublishFactGateResult {
  const { event, edition, categories } = record;
  const gate = edition.governance.publicationGate ?? null;
  const issues: PrePublishFactGateIssue[] = [];

  if (!event.eventId || edition.eventId !== event.eventId) issues.push("event_identity_invalid");
  if (!edition.editionId || edition.editionId !== `${event.eventId}-${edition.editionYear}`) {
    issues.push("edition_identity_invalid");
  }

  if (!gate) {
    issues.push(
      "latest_official_source_missing",
      "primary_source_missing",
      "race_date_missing_before_source_check",
      "conflict_status_mismatch",
      "publishable_status_mismatch",
    );
    return result(record, null, issues);
  }

  if (gate.requestedEditionYear !== gate.latestRelevantOfficialEditionYear) {
    issues.push("requested_official_edition_conflict");
  }
  if (edition.editionYear !== gate.latestRelevantOfficialEditionYear) {
    issues.push("canonical_official_edition_conflict");
  }

  const expectedConflict = gate.requestedEditionYear !== gate.latestRelevantOfficialEditionYear
    || edition.editionYear !== gate.latestRelevantOfficialEditionYear;
  if ((gate.conflictStatus === "needs_review") !== expectedConflict) issues.push("conflict_status_mismatch");

  const sourceIds = new Set(edition.governance.sources.map(({ sourceRecordId }) => sourceRecordId).filter(isString));
  if (!sourceIds.has(gate.primarySourceRecordId)) issues.push("primary_source_missing");
  if (!sourceIds.has(gate.latestOfficialEditionSourceRecordId)) issues.push("latest_official_source_missing");
  if (gate.secondarySourceRecordId && !sourceIds.has(gate.secondarySourceRecordId)) issues.push("secondary_source_missing");

  const latestOfficialSource = edition.governance.sources.find(
    ({ sourceRecordId }) => sourceRecordId === gate.latestOfficialEditionSourceRecordId,
  );
  if (latestOfficialSource?.rawData?.latestRelevantOfficialEditionYear !== gate.latestRelevantOfficialEditionYear) {
    issues.push("latest_official_edition_evidence_mismatch");
  }

  if (registryEntry) {
    const activeRegistryIds = new Set(
      registryEntry.sources.filter(({ status }) => status === "active").map(({ sourceId }) => sourceId),
    );
    for (const sourceId of [
      gate.primarySourceRecordId,
      gate.secondarySourceRecordId,
      gate.latestOfficialEditionSourceRecordId,
      ...gate.raceDateSourceRecordIds,
    ].filter(isString)) {
      if (!activeRegistryIds.has(sourceId)) issues.push("registry_source_missing");
    }
  }

  const raceDate = edition.raceDate ?? null;
  if (!raceDate && gate.dateEvidenceStatus !== "exhausted_no_reliable_date") {
    issues.push("race_date_missing_before_source_check");
  }
  if (raceDate && !isDateOnly(raceDate)) issues.push("race_date_invalid");
  if (raceDate && gate.dateEvidenceStatus !== "verified") issues.push("race_date_evidence_missing");

  if (raceDate) {
    const evidenceSources = edition.governance.sources.filter(({ sourceRecordId }) =>
      sourceRecordId ? gate.raceDateSourceRecordIds.includes(sourceRecordId) : false,
    );
    if (evidenceSources.length === 0) {
      issues.push("race_date_evidence_missing");
    } else if (!evidenceSources.every((source) => sourceSupportsEditionDate(source, raceDate, edition.endDate ?? null))) {
      issues.push("race_date_evidence_mismatch");
    }
  }

  if (!edition.city && !edition.venue) issues.push("location_missing");
  const primaryCategory = edition.primaryCategoryId
    ? categories.find(({ categoryId }) => categoryId === edition.primaryCategoryId)
    : undefined;
  if (!primaryCategory) {
    issues.push("primary_category_missing");
  } else if (primaryCategory.startAt) {
    const categoryDate = primaryCategory.startAt.slice(0, 10);
    if (!isDateOnly(categoryDate)) {
      issues.push("primary_category_date_invalid");
    } else if (!primaryCategory.governance.sources.some(({ rawData }) => rawData?.raceDate === categoryDate)) {
      issues.push("primary_category_date_evidence_mismatch");
    }
  }

  const derivedPublishable = issues.length === 0 && gate.conflictStatus === "none";
  if (gate.publishable !== derivedPublishable) issues.push("publishable_status_mismatch");
  return result(record, gate, issues);
}

function result(
  record: PrePublishRaceGraphRecord,
  gate: PrePublishFactGate | null,
  issues: PrePublishFactGateIssue[],
): PrePublishFactGateResult {
  const uniqueIssues = [...new Set(issues)];
  return {
    raceBrand: record.event.canonicalName,
    requestedEdition: gate?.requestedEditionYear ?? null,
    latestOfficialEdition: gate?.latestRelevantOfficialEditionYear ?? null,
    canonicalEdition: record.edition.editionYear,
    raceDate: record.edition.raceDate ?? null,
    primarySource: gate?.primarySourceRecordId ?? null,
    secondarySource: gate?.secondarySourceRecordId ?? null,
    conflict: uniqueIssues.some((issue) => issue.includes("conflict")),
    publishable: uniqueIssues.length === 0 && gate?.publishable === true,
    issues: uniqueIssues,
  };
}

function sourceSupportsEditionDate(source: SourceRecord, raceDate: string, endDate: string | null): boolean {
  const raw = source.rawData;
  if (!raw || raw.raceDate !== raceDate) return false;
  return endDate === null || raw.endDate === endDate;
}

function isDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}
