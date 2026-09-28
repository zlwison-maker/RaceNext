import { createEditionId, validateEventId } from "../../lib/raceGraphIds.ts";
import type { OfficialFactCandidate, OfficialFactEntityType, OfficialFactField } from "../../types/officialSourceIngestion.ts";
import type {
  RaceGraphSnapshot,
  RaceSourceRegistry,
  RegistrationTransition,
  ValidationError,
} from "../../types/raceUpdate.ts";
import { fieldBelongsToEntity } from "./officialFacts.ts";
import { evaluateFreshnessSourceEligibility, findRegistrySource } from "./sourceRegistry.ts";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const CONTENT_HASH_PATTERN = /^[a-f0-9]{64}$/;
const REGISTRATION_STATUSES = new Set([
  "upcoming",
  "registration_not_announced",
  "registration_open",
  "lottery",
  "waiting_list",
  "registration_closed",
  "race_finished",
  "cancelled",
  "unknown",
]);

export function validateOfficialFactCandidate(
  snapshot: RaceGraphSnapshot,
  registry: RaceSourceRegistry,
  candidate: OfficialFactCandidate,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const add = (field: string, message: string) => errors.push({
    eventId: candidate.eventId || null,
    editionId: candidate.editionId || null,
    categoryId: candidate.categoryId,
    field,
    message,
    sourceId: candidate.sourceId || null,
    sourceUrl: candidate.sourceUrl || null,
  });

  const record = snapshot.records.find(({ edition }) => edition.editionId === candidate.editionId);
  if (!record) {
    add("editionId", "Unknown Edition; structural identity cannot be created by a fact candidate.");
  } else {
    if (record.event.eventId !== candidate.eventId || record.edition.eventId !== candidate.eventId) {
      add("eventId", "Candidate Event identity does not match the target Edition.");
    }
    if (candidate.entityType === "Category") {
      if (!candidate.categoryId) add("categoryId", "Category candidate requires categoryId.");
      else if (!record.categories.some(({ categoryId }) => categoryId === candidate.categoryId)) {
        add("categoryId", "Unknown Category; structural identity cannot be created by a fact candidate.");
      }
    } else if (candidate.categoryId !== null) {
      add("categoryId", "Edition candidate must not carry categoryId.");
    }
  }

  if (!fieldBelongsToEntity(candidate.entityType, candidate.field)) {
    add("field", `${candidate.field} is not supported for ${candidate.entityType}.`);
  }

  const source = findRegistrySource(registry, candidate.editionId, candidate.sourceId);
  if (!source) {
    add("sourceId", "Source is not registered for the target Edition.");
  } else {
    const eligibility = evaluateFreshnessSourceEligibility({
      registryEditionId: candidate.editionId,
      targetEditionId: candidate.editionId,
      source,
    });
    if (!eligibility.eligible) add("sourceId", eligibility.reason);
    if (source.url !== candidate.sourceUrl) add("sourceUrl", "Candidate source URL does not match the registered URL.");
  }

  for (const message of validateFieldValue(candidate.entityType, candidate.field, candidate.candidateValue)) {
    add(candidate.field, message);
  }

  if (!candidate.evidenceText.trim()) add("evidenceText", "Evidence text is required.");
  if (!candidate.evidenceLocator.trim()) add("evidenceLocator", "Evidence locator is required.");
  if (!candidate.extractionMethod.trim()) add("extractionMethod", "Extraction method is required.");
  if (!CONTENT_HASH_PATTERN.test(candidate.contentHash)) add("contentHash", "contentHash must be a SHA-256 hex digest.");
  if (!isIsoDateTime(candidate.fetchedAt)) add("fetchedAt", "fetchedAt must be a timezone-aware ISO DateTime.");
  if (!Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
    add("confidence", "confidence must be a finite number between 0 and 1.");
  }

  return errors;
}

export function validateFieldValue(
  entityType: OfficialFactEntityType,
  field: OfficialFactField,
  value: unknown,
): string[] {
  if (value === undefined || value === null) return ["Candidate value is missing; absence is not a deletion instruction."];
  if (!fieldBelongsToEntity(entityType, field)) return [`Unsupported ${entityType} field.`];

  if (field === "registrationStatus") {
    return typeof value === "string" && REGISTRATION_STATUSES.has(value)
      ? []
      : ["registrationStatus is not a current RaceNext enum value."];
  }
  if (field === "raceDate" || field === "endDate") {
    return typeof value === "string" && isCalendarDate(value) ? [] : [`${field} must be a valid YYYY-MM-DD date.`];
  }
  if (field === "registrationOpenDate" || field === "registrationCloseDate" || field === "startAt") {
    return typeof value === "string" && isDateOrZonedDateTime(value)
      ? []
      : [`${field} must be a valid date-only value or timezone-aware ISO DateTime.`];
  }
  if (field === "startTimes") return validateStartTimes(value);
  if (field === "registrationUrl") {
    return typeof value === "string" && isHttpUrl(value) ? [] : ["registrationUrl must be an HTTP(S) URL."];
  }
  if (field === "startLocation" || field === "finishLocation") {
    return typeof value === "string" && value.trim().length > 0 ? [] : [`${field} must be a non-empty string.`];
  }
  if (field === "distanceKm" || field === "cutoffTimeHours") {
    return typeof value === "number" && Number.isFinite(value) && value > 0
      ? []
      : [`${field} must be a finite number greater than 0.`];
  }
  if (field === "elevationGain" || field === "elevationLoss") {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
      ? []
      : [`${field} must be a finite number greater than or equal to 0.`];
  }
  return ["Unsupported fact field."];
}

export function validateStartTimes(value: unknown): string[] {
  if (!Array.isArray(value)) return ["startTimes must be an ordered array."];
  if (value.length === 0) return ["startTimes must be non-empty when present."];
  if (!value.every((entry) => typeof entry === "string" && isDateOrZonedDateTime(entry))) {
    return ["Every startTimes entry must be a valid date-only value or timezone-aware ISO DateTime."];
  }
  if (new Set(value).size !== value.length) return ["startTimes entries must be unique."];
  return [];
}

export function assertRaceGraphSnapshot(value: unknown): asserts value is RaceGraphSnapshot {
  if (!isObject(value)
    || value.schemaVersion !== "race-graph-v1"
    || typeof value.generatedAt !== "string"
    || !isDateOrZonedDateTime(value.generatedAt)
    || !Array.isArray(value.records)) {
    throw new Error("Invalid race graph snapshot envelope.");
  }

  const editionIds = new Set<string>();
  const categoryIds = new Set<string>();
  for (const rawRecord of value.records) {
    if (!isObject(rawRecord) || !isObject(rawRecord.event) || !isObject(rawRecord.edition) || !Array.isArray(rawRecord.categories)) {
      throw new Error("Invalid race graph record shape.");
    }
    const { event, edition } = rawRecord;
    if (typeof event.eventId !== "string" || typeof edition.editionId !== "string" || typeof edition.editionYear !== "number") {
      throw new Error("Race graph identity fields are missing.");
    }
    validateEventId(event.eventId);
    if (edition.editionId !== createEditionId(event.eventId, edition.editionYear) || edition.eventId !== event.eventId) {
      throw new Error(`Invalid Edition identity: ${edition.editionId}`);
    }
    if (editionIds.has(edition.editionId)) throw new Error("Duplicate Edition identity.");
    editionIds.add(edition.editionId);

    if (typeof edition.registrationStatus !== "string" || !REGISTRATION_STATUSES.has(edition.registrationStatus)) {
      throw new Error(`Invalid registrationStatus for ${edition.editionId}.`);
    }
    const editionChecks: Array<[OfficialFactField, unknown]> = [
      ["raceDate", edition.raceDate],
      ["endDate", edition.endDate],
      ["registrationOpenDate", edition.registrationOpenDate],
      ["registrationCloseDate", edition.registrationCloseDate],
      ["registrationUrl", edition.registrationUrl],
    ];
    for (const [field, candidate] of editionChecks) {
      if (candidate !== undefined && candidate !== null && validateFieldValue("Edition", field, candidate).length > 0) {
        throw new Error(`Invalid ${field} for ${edition.editionId}.`);
      }
    }

    for (const rawCategory of rawRecord.categories) {
      if (!isObject(rawCategory)
        || typeof rawCategory.categoryId !== "string"
        || rawCategory.editionId !== edition.editionId
        || typeof rawCategory.categoryName !== "string"
        || typeof rawCategory.displayOrder !== "number") {
        throw new Error(`Invalid Category shape under ${edition.editionId}.`);
      }
      if (categoryIds.has(rawCategory.categoryId)) throw new Error(`Duplicate Category identity: ${rawCategory.categoryId}`);
      categoryIds.add(rawCategory.categoryId);
      const categoryChecks: Array<[OfficialFactField, unknown]> = [
        ["startAt", rawCategory.startAt],
        ["startTimes", rawCategory.startTimes],
        ["startLocation", rawCategory.startLocation],
        ["finishLocation", rawCategory.finishLocation],
        ["distanceKm", rawCategory.distanceKm],
        ["elevationGain", rawCategory.elevationGain],
        ["elevationLoss", rawCategory.elevationLoss],
        ["cutoffTimeHours", rawCategory.cutoffTimeHours],
      ];
      for (const [field, candidate] of categoryChecks) {
        if (candidate !== undefined && candidate !== null && validateFieldValue("Category", field, candidate).length > 0) {
          throw new Error(`Invalid ${field} for ${rawCategory.categoryId}.`);
        }
      }
    }
  }
}

export function isAbnormalRegistrationTransition(transition: RegistrationTransition): boolean {
  if (transition.from === "registration_closed") {
    return ["registration_open", "lottery", "waiting_list"].includes(transition.to);
  }
  if (transition.from === "race_finished") return transition.to !== "race_finished";
  if (transition.from === "cancelled") return transition.to !== "cancelled";
  return false;
}

export function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isIsoDateTime(value: string): boolean {
  return ISO_DATETIME_WITH_ZONE.test(value) && isCalendarDate(value.slice(0, 10)) && !Number.isNaN(Date.parse(value));
}

export function isDateOrZonedDateTime(value: string): boolean {
  return isCalendarDate(value) || isIsoDateTime(value);
}

function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
