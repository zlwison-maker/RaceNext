import { readFile } from "node:fs/promises";

import type {
  FreshnessSourceEligibility,
  RaceSourceRegistry,
  RaceSourceRegistryEntry,
  RaceSourceRegistrySource,
  RaceSourceTier,
  RaceSourceType,
} from "../../types/raceUpdate.ts";

export const RACE_SOURCE_REGISTRY_PATH = "data/sources/race-source-registry.json";

const SOURCE_TIERS = new Set<RaceSourceTier>([
  "primary_official",
  "trusted_structured",
  "trusted_secondary",
]);

const SOURCE_TYPES = new Set<RaceSourceType>([
  "event_home",
  "notice",
  "regulations",
  "registration_notice",
  "registration_platform",
  "category_page",
  "official_calendar",
  "calendar",
  "certification_platform",
  "event_directory",
  "official_partner_announcement",
  "structured_connector",
  "government_context",
  "media_report",
  "previous_edition_media",
  "previous_edition_report",
  "specialist_media",
]);

const EXCLUDED_FACT_SOURCE_TYPES = new Set<RaceSourceType>([
  "government_context",
  "media_report",
  "previous_edition_media",
  "previous_edition_report",
  "specialist_media",
]);

const PRIMARY_OFFICIAL_DOCUMENT_TYPES = new Set<RaceSourceType>([
  "event_home",
  "notice",
  "regulations",
  "registration_notice",
  "registration_platform",
  "category_page",
  "official_calendar",
]);

const TRUSTED_DOCUMENT_TYPES = new Set<RaceSourceType>([
  "calendar",
  "certification_platform",
  "event_directory",
  "registration_platform",
]);

export async function loadRaceSourceRegistry(path = RACE_SOURCE_REGISTRY_PATH): Promise<RaceSourceRegistry> {
  const registry = JSON.parse(await readFile(path, "utf8")) as unknown;
  assertRaceSourceRegistry(registry);
  return registry;
}

export function assertRaceSourceRegistry(value: unknown): asserts value is RaceSourceRegistry {
  if (!isObject(value) || value.schemaVersion !== "race-source-registry-v1" || !Array.isArray(value.editions)) {
    throw new Error("Invalid race source registry schema.");
  }

  const editionIds = new Set<string>();
  const sourceIds = new Set<string>();
  for (const rawEntry of value.editions) {
    if (!isObject(rawEntry) || !isNonEmptyString(rawEntry.editionId) || !Array.isArray(rawEntry.sources)) {
      throw new Error("Invalid source registry edition entry.");
    }
    if (editionIds.has(rawEntry.editionId)) throw new Error(`Duplicate source registry editionId: ${rawEntry.editionId}`);
    editionIds.add(rawEntry.editionId);

    for (const rawSource of rawEntry.sources) {
      assertRegistrySource(rawSource, rawEntry.editionId);
      const key = `${rawEntry.editionId}:${rawSource.sourceId}`;
      if (sourceIds.has(key)) throw new Error(`Duplicate registry source: ${key}`);
      sourceIds.add(key);
    }
  }
}

export function findEditionSources(
  registry: RaceSourceRegistry,
  editionId: string,
): RaceSourceRegistryEntry | undefined {
  return registry.editions.find((entry) => entry.editionId === editionId);
}

export function findRegistrySource(
  registry: RaceSourceRegistry,
  editionId: string,
  sourceId: string,
): RaceSourceRegistrySource | undefined {
  return findEditionSources(registry, editionId)?.sources.find((source) => source.sourceId === sourceId);
}

export function evaluateFreshnessSourceEligibility(input: {
  registryEditionId: string;
  targetEditionId: string;
  source: RaceSourceRegistrySource;
}): FreshnessSourceEligibility {
  const { registryEditionId, targetEditionId, source } = input;
  if (registryEditionId !== targetEditionId) {
    return excluded("Source registry edition identity does not match the target edition.");
  }
  if (source.status !== "active") {
    return excluded("Only active sources are freshness eligible.");
  }
  if (EXCLUDED_FACT_SOURCE_TYPES.has(source.sourceType)) {
    return excluded(`${source.sourceType} is context-only and excluded from automatic fact extraction.`);
  }
  if (source.tier === "primary_official" && PRIMARY_OFFICIAL_DOCUMENT_TYPES.has(source.sourceType)) {
    return {
      eligible: true,
      autoApplyEligible: true,
      mode: "official_document",
      reason: "Active edition-scoped primary official document source.",
    };
  }
  if (source.tier === "trusted_structured" && source.sourceType === "structured_connector") {
    return {
      eligible: true,
      autoApplyEligible: false,
      mode: "structured_connector",
      reason: "Active edition-scoped trusted connector is eligible for extraction and cross-check only.",
    };
  }
  if (source.tier === "trusted_structured" && TRUSTED_DOCUMENT_TYPES.has(source.sourceType)) {
    return {
      eligible: true,
      autoApplyEligible: false,
      mode: "trusted_document",
      reason: "Trusted source is eligible for extraction and cross-check but is not field-authoritative by tier alone.",
    };
  }
  if (source.tier === "trusted_secondary" && source.sourceType === "official_partner_announcement") {
    return {
      eligible: true,
      autoApplyEligible: false,
      mode: "trusted_document",
      reason: "Official partner announcement is extractable but cannot auto-apply facts.",
    };
  }
  return excluded(`The ${source.tier}/${source.sourceType} combination is not freshness eligible.`);
}

export function activeFreshnessSources(
  registry: RaceSourceRegistry,
  editionId: string,
): RaceSourceRegistrySource[] {
  const entry = findEditionSources(registry, editionId);
  return (entry?.sources ?? []).filter((source) => evaluateFreshnessSourceEligibility({
    registryEditionId: entry!.editionId,
    targetEditionId: editionId,
    source,
  }).eligible);
}

export function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function assertRegistrySource(value: unknown, editionId: string): asserts value is RaceSourceRegistrySource {
  if (!isObject(value)
    || !isNonEmptyString(value.sourceId)
    || !isNonEmptyString(value.url)
    || !isNonEmptyString(value.domain)
    || !SOURCE_TIERS.has(value.tier as RaceSourceTier)
    || !SOURCE_TYPES.has(value.sourceType as RaceSourceType)
    || !["active", "unavailable", "pending_review"].includes(String(value.status))
    || typeof value.isPrimary !== "boolean"
    || !(value.notes === null || typeof value.notes === "string")) {
    throw new Error(`Invalid registry source in ${editionId}.`);
  }

  const parsed = new URL(value.url);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error(`Registry source must use HTTP(S): ${value.sourceId}`);
  if (normalizeDomain(parsed.hostname) !== normalizeDomain(value.domain)) {
    throw new Error(`Registry domain does not match URL for ${editionId}:${value.sourceId}.`);
  }
  if (value.isPrimary && value.tier !== "primary_official") {
    throw new Error(`Only a primary official source may set isPrimary for ${editionId}:${value.sourceId}.`);
  }
}

function excluded(reason: string): FreshnessSourceEligibility {
  return { eligible: false, autoApplyEligible: false, mode: "excluded", reason };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
