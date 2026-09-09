import {
  PUBLIC_RACE_GRAPH_SCHEMA_VERSION,
  type PublicRaceCategory,
  type PublicRaceDetail,
  type PublicRaceDetailResponse,
  type PublicRaceErrorResponse,
  type PublicRaceListResponse,
  type PublicRaceLocation,
} from "../types/publicRaceGraph.ts";

type CanonicalGovernance = {
  verified?: boolean | null;
  verificationStatus?: string | null;
  internalFlags?: string[] | null;
};

type CanonicalEvent = {
  eventId: string;
  eventType: PublicRaceDetail["raceType"];
  lifecycleStatus: string;
  updatedAt: string;
  governance: CanonicalGovernance;
};

type CanonicalEdition = {
  editionId: string;
  eventId: string;
  editionName: string;
  raceDate?: string | null;
  endDate?: string | null;
  coverImage?: string | null;
  primaryCategoryId?: string | null;
  country: string;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  venue?: string | null;
  registrationStatus: PublicRaceDetail["registrationStatus"];
  registrationUrl?: string | null;
  lifecycleStatus: string;
  updatedAt: string;
  governance: CanonicalGovernance;
};

type CanonicalCategory = {
  categoryId: string;
  editionId: string;
  categoryName: string;
  shortName?: string | null;
  distanceKm: number | null;
  elevationGain?: number | null;
  cutoffTimeHours?: number | null;
  startAt?: string | null;
  startLocation?: string | null;
  finishLocation?: string | null;
  registrationUrl?: string | null;
  displayOrder: number;
  updatedAt: string;
  governance: CanonicalGovernance;
};

type CanonicalRecord = {
  event: CanonicalEvent;
  edition: CanonicalEdition;
  categories: CanonicalCategory[];
};

type CanonicalSnapshot = {
  schemaVersion: "race-graph-v1";
  generatedAt: string;
  records: CanonicalRecord[];
};

type PublicResult<T> = { status: 200; body: T } | { status: 404 | 500; body: PublicRaceErrorResponse };

const INTERNAL_NON_PRODUCTION_FLAGS = new Set([
  "foundation_fixture",
  "test_only",
  "non_production_fixture",
  "not_production_data",
  "do_not_publish",
]);

export function createPublicRaceListResult(input: unknown): PublicResult<PublicRaceListResponse> {
  try {
    const snapshot = parseCanonicalSnapshot(input);
    return {
      status: 200,
      body: {
        schemaVersion: PUBLIC_RACE_GRAPH_SCHEMA_VERSION,
        dataUpdatedAt: getDataUpdatedAt(snapshot),
        races: snapshot.records
          .filter(isEditionPublishable)
          .map(toPublicRaceDetail)
          .map(({ categories: _categories, ...race }) => race)
          .sort(compareRaceListItems),
      },
    };
  } catch {
    return canonicalUnavailable();
  }
}

export function createPublicRaceDetailResult(
  input: unknown,
  editionId: string,
): PublicResult<PublicRaceDetailResponse> {
  try {
    const snapshot = parseCanonicalSnapshot(input);
    const record = snapshot.records.find(
      (candidate) => candidate.edition.editionId === editionId && isEditionPublishable(candidate),
    );

    if (!record) {
      return {
        status: 404,
        body: {
          schemaVersion: PUBLIC_RACE_GRAPH_SCHEMA_VERSION,
          error: { code: "race_not_found", message: "Race edition not found." },
        },
      };
    }

    return {
      status: 200,
      body: {
        schemaVersion: PUBLIC_RACE_GRAPH_SCHEMA_VERSION,
        dataUpdatedAt: getDataUpdatedAt(snapshot),
        race: toPublicRaceDetail(record),
      },
    };
  } catch {
    return canonicalUnavailable();
  }
}

export function isEditionPublishable(record: CanonicalRecord): boolean {
  const { event, edition, categories } = record;
  if (!event || !edition || !Array.isArray(categories)) return false;
  if (!isNonEmptyString(event.eventId) || !isNonEmptyString(edition.editionId)) return false;
  if (edition.eventId !== event.eventId || !isNonEmptyString(edition.editionName)) return false;
  if (event.lifecycleStatus !== "active" || edition.lifecycleStatus !== "active") return false;
  if (!isValidDateOnly(edition.raceDate)) return false;
  if (edition.endDate !== null && edition.endDate !== undefined) {
    if (!isValidDateOnly(edition.endDate) || edition.endDate < edition.raceDate) return false;
  }
  if (!isGovernancePublishable(event.governance) || !isGovernancePublishable(edition.governance)) return false;

  const publicCategories = categories.filter((category) => isCategoryPublishable(category, edition.editionId));
  if (edition.primaryCategoryId && !publicCategories.some(({ categoryId }) => categoryId === edition.primaryCategoryId)) {
    return false;
  }

  return true;
}

export function formatLocationDisplay(location: PublicRaceLocation): string {
  const candidates = [location.province, location.city, location.district].filter(isNonEmptyString);
  const segments: string[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeAdministrativeName(candidate);
    if (!segments.some((segment) => normalizeAdministrativeName(segment) === normalized)) segments.push(candidate);
  }

  const venue = stripLeadingLocationParts(location.venue, [location.country, ...segments]);
  if (venue && !segments.some((segment) => normalizeAdministrativeName(segment) === normalizeAdministrativeName(venue))) {
    segments.push(venue);
  }

  if (segments.length === 0 && isNonEmptyString(location.country)) return location.country;
  return segments.join(" · ");
}

export function formatDateDisplay(raceDate: string, endDate: string | null): string {
  const start = parseDateParts(raceDate);
  const end = endDate ? parseDateParts(endDate) : null;
  if (!start || (endDate && !end)) return raceDate;
  if (!end || raceDate === endDate) return `${start.month}月${start.day}日`;
  if (start.year === end.year && start.month === end.month) return `${start.month}月${start.day}–${end.day}日`;
  if (start.year === end.year) return `${start.month}月${start.day}日–${end.month}月${end.day}日`;
  return `${start.year}年${start.month}月${start.day}日–${end.year}年${end.month}月${end.day}日`;
}

function parseCanonicalSnapshot(input: unknown): CanonicalSnapshot {
  if (!isObject(input) || input.schemaVersion !== "race-graph-v1" || !isNonEmptyString(input.generatedAt)) {
    throw new Error("invalid_canonical_snapshot");
  }
  if (!Array.isArray(input.records) || !input.records.every(isRaceGraphRecordShape)) {
    throw new Error("invalid_canonical_records");
  }
  return input as CanonicalSnapshot;
}

function isRaceGraphRecordShape(value: unknown): value is CanonicalRecord {
  return isObject(value) && isObject(value.event) && isObject(value.edition) && Array.isArray(value.categories);
}

function toPublicRaceDetail(record: CanonicalRecord): PublicRaceDetail {
  const { event, edition } = record;
  const location: PublicRaceLocation = {
    country: edition.country,
    province: edition.province ?? null,
    city: edition.city ?? null,
    district: edition.district ?? null,
    venue: edition.venue ?? null,
  };

  return {
    editionId: edition.editionId,
    eventId: event.eventId,
    slug: edition.editionId,
    name: edition.editionName,
    raceType: event.eventType,
    raceDate: edition.raceDate as string,
    endDate: edition.endDate ?? null,
    dateDisplay: formatDateDisplay(edition.raceDate as string, edition.endDate ?? null),
    location,
    locationDisplay: formatLocationDisplay(location),
    coverImage: edition.coverImage ?? null,
    registrationStatus: edition.registrationStatus,
    registrationUrl: edition.registrationUrl ?? null,
    categories: record.categories
      .filter((category) => isCategoryPublishable(category, edition.editionId))
      .sort((left, right) => left.displayOrder - right.displayOrder || left.categoryId.localeCompare(right.categoryId))
      .map((category) => toPublicCategory(category, edition.primaryCategoryId ?? null)),
  };
}

function toPublicCategory(category: CanonicalCategory, primaryCategoryId: string | null): PublicRaceCategory {
  return {
    categoryId: category.categoryId,
    name: category.categoryName,
    shortName: category.shortName ?? null,
    distanceKm: category.distanceKm,
    elevationGain: category.elevationGain ?? null,
    cutoffTimeHours: category.cutoffTimeHours ?? null,
    startAt: category.startAt ?? null,
    startLocation: category.startLocation ?? null,
    finishLocation: category.finishLocation ?? null,
    registrationUrl: category.registrationUrl ?? null,
    displayOrder: category.displayOrder,
    isPrimaryCategory: category.categoryId === primaryCategoryId,
  };
}

function isCategoryPublishable(category: CanonicalCategory, editionId: string): boolean {
  return Boolean(
    category
      && isNonEmptyString(category.categoryId)
      && category.editionId === editionId
      && isNonEmptyString(category.categoryName)
      && Number.isFinite(category.displayOrder)
      && isGovernancePublishable(category.governance),
  );
}

function isGovernancePublishable(governance: CanonicalGovernance): boolean {
  if (!governance || governance.verified !== true) return false;
  if (governance.verificationStatus !== "verified" && governance.verificationStatus !== "auto_verified") return false;
  return !(governance.internalFlags ?? []).some((flag) => INTERNAL_NON_PRODUCTION_FLAGS.has(flag));
}

function getDataUpdatedAt(snapshot: CanonicalSnapshot): string {
  const timestamps = [snapshot.generatedAt];
  for (const { event, edition, categories } of snapshot.records) {
    timestamps.push(event.updatedAt, edition.updatedAt, ...categories.map(({ updatedAt }) => updatedAt));
  }
  return timestamps.filter(isNonEmptyString).sort().at(-1) ?? snapshot.generatedAt;
}

function compareRaceListItems(
  left: PublicRaceDetail | Omit<PublicRaceDetail, "categories">,
  right: PublicRaceDetail | Omit<PublicRaceDetail, "categories">,
): number {
  return left.raceDate.localeCompare(right.raceDate) || left.editionId.localeCompare(right.editionId);
}

function canonicalUnavailable(): PublicResult<never> {
  return {
    status: 500,
    body: {
      schemaVersion: PUBLIC_RACE_GRAPH_SCHEMA_VERSION,
      error: { code: "canonical_unavailable", message: "Race data is temporarily unavailable." },
    },
  };
}

function isValidDateOnly(value: unknown): value is string {
  const parts = typeof value === "string" ? parseDateParts(value) : null;
  if (!parts) return false;
  const parsed = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return parsed.getUTCFullYear() === parts.year
    && parsed.getUTCMonth() === parts.month - 1
    && parsed.getUTCDate() === parts.day;
}

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function stripLeadingLocationParts(value: string | null, parts: Array<string | null>): string | null {
  if (!isNonEmptyString(value)) return null;
  let result = value.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const part of parts.filter(isNonEmptyString).sort((left, right) => right.length - left.length)) {
      if (result.startsWith(part)) {
        result = result.slice(part.length).trim().replace(/^[·,，、/\s-]+/, "");
        changed = true;
      }
    }
  }
  return result || null;
}

function normalizeAdministrativeName(value: string): string {
  return value.trim().replace(/(?:特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|省|市|地区|自治州|州|区|县)$/u, "");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
