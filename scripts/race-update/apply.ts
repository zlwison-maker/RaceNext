import type { FieldSource, SourceRecord } from "../../types/event.ts";
import type { RaceFieldChange, RaceGraphSnapshot, RaceSourceRegistry } from "../../types/raceUpdate.ts";
import { sameFactValue } from "./diff.ts";
import { evaluateFreshnessSourceEligibility, findRegistrySource } from "./sourceRegistry.ts";
import { assertRaceGraphSnapshot, validateFieldValue, validateOfficialFactCandidate } from "./validation.ts";

export function applySafeChanges(input: {
  snapshot: RaceGraphSnapshot;
  changes: RaceFieldChange[];
  registry: RaceSourceRegistry;
  appliedAt: string;
  allowReviewed?: boolean;
}): { snapshot: RaceGraphSnapshot; appliedChangeIds: string[] } {
  assertRaceGraphSnapshot(input.snapshot);
  const next = structuredClone(input.snapshot);
  const appliedChangeIds: string[] = [];

  for (const change of input.changes) {
    assertApplyableChange(next, input.registry, change, input.allowReviewed === true);
    const record = next.records.find(({ edition }) => edition.editionId === change.editionId)!;
    const entity = change.entityType === "Edition"
      ? record.edition
      : record.categories.find(({ categoryId }) => categoryId === change.categoryId)!;
    (entity as unknown as Record<string, unknown>)[change.field] = structuredClone(change.newValue);
    entity.updatedAt = input.appliedAt;
    entity.governance.lastUpdatedAt = input.appliedAt;
    entity.governance.lastCrawledAt = input.appliedAt;
    updateGovernance(entity.governance.fieldSources, entity.governance.sources, change, input.appliedAt);
    appliedChangeIds.push(change.changeId);
  }

  if (appliedChangeIds.length > 0) next.generatedAt = input.appliedAt;
  assertRaceGraphSnapshot(next);
  return { snapshot: next, appliedChangeIds };
}

function assertApplyableChange(
  snapshot: RaceGraphSnapshot,
  registry: RaceSourceRegistry,
  change: RaceFieldChange,
  allowReviewed: boolean,
): void {
  const normalAutoApply = change.risk === "low" && change.action === "auto_apply";
  const reviewedApply = allowReviewed
    && (change.risk === "low" || change.risk === "high_impact")
    && change.action === "pending_review";
  if (!normalAutoApply && !reviewedApply) {
    throw new Error(`Change is not eligible for this apply boundary: ${change.changeId}`);
  }
  if (change.entityType !== "Edition" && !allowReviewed) {
    throw new Error(`Phase 1 auto-apply policy does not allow ${change.entityType} changes.`);
  }
  if (validateFieldValue(change.entityType, change.field, change.newValue).length > 0) {
    throw new Error(`Change failed current field validation: ${change.changeId}`);
  }
  if (change.sourceIds.length === 0
    || change.sourceIds.length !== change.sourceUrls.length
    || change.sourceIds.length !== change.evidence.length) {
    throw new Error(`Change source evidence is incomplete: ${change.changeId}`);
  }

  for (let index = 0; index < change.sourceIds.length; index += 1) {
    const evidence = change.evidence[index];
    if (evidence.sourceId !== change.sourceIds[index] || evidence.sourceUrl !== change.sourceUrls[index]) {
      throw new Error(`Change evidence identity is inconsistent: ${change.changeId}`);
    }
    const evidenceErrors = validateOfficialFactCandidate(snapshot, registry, {
      eventId: change.eventId,
      editionId: change.editionId,
      categoryId: change.categoryId,
      entityType: change.entityType,
      field: change.field,
      candidateValue: change.newValue,
      ...evidence,
    });
    if (evidenceErrors.length > 0) {
      throw new Error(`Change evidence failed deterministic validation: ${change.changeId}`);
    }
    const source = findRegistrySource(registry, change.editionId, change.sourceIds[index]);
    if (!source || source.url !== change.sourceUrls[index]) {
      throw new Error(`Change source is stale or unregistered: ${change.sourceIds[index]}`);
    }
    const eligibility = evaluateFreshnessSourceEligibility({
      registryEditionId: change.editionId,
      targetEditionId: change.editionId,
      source,
    });
    if (!eligibility.eligible || (!allowReviewed && !eligibility.autoApplyEligible)) {
      throw new Error(`Change source is not apply eligible: ${source.sourceId}`);
    }
  }

  const record = snapshot.records.find(({ event, edition }) => (
    event.eventId === change.eventId && edition.editionId === change.editionId && edition.eventId === change.eventId
  ));
  if (!record) throw new Error(`Change target identity is missing: ${change.editionId}`);
  const entity = change.entityType === "Edition"
    ? record.edition
    : record.categories.find(({ categoryId }) => categoryId === change.categoryId);
  if (!entity) throw new Error(`Change Category identity is missing: ${change.categoryId}`);
  const currentValue = (entity as unknown as Record<string, unknown>)[change.field] ?? null;
  if (!sameFactValue(currentValue, change.oldValue)) {
    throw new Error(`Stale oldValue blocks apply: ${change.changeId}`);
  }
}

function updateGovernance(
  fieldSources: Record<string, FieldSource>,
  sources: SourceRecord[],
  change: RaceFieldChange,
  appliedAt: string,
): void {
  fieldSources[change.field] = {
    field: change.field,
    sourceType: "official",
    sourceName: change.sourceIds.join(","),
    confidence: Math.min(...change.evidence.map(({ confidence }) => confidence)),
    updatedAt: appliedAt,
  };

  for (const evidence of change.evidence) {
    const existing = sources.find(({ sourceRecordId }) => sourceRecordId === evidence.sourceId);
    if (existing) {
      existing.crawledAt = evidence.fetchedAt;
      existing.confidence = evidence.confidence;
      continue;
    }
    sources.push({
      sourceType: "official",
      sourceName: evidence.sourceId,
      sourceUrl: evidence.sourceUrl,
      sourceRecordId: evidence.sourceId,
      crawledAt: evidence.fetchedAt,
      confidence: evidence.confidence,
      rawData: {
        evidenceText: evidence.evidenceText,
        evidenceLocator: evidence.evidenceLocator,
        contentHash: evidence.contentHash,
        extractionMethod: evidence.extractionMethod,
      },
    });
  }
}
