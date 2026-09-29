import { createHash } from "node:crypto";

import type { FactEvidence, OfficialFactCandidate } from "../../types/officialSourceIngestion.ts";
import type {
  RaceFieldChange,
  RaceFieldDiff,
  RaceFieldTarget,
  RaceGraphSnapshot,
  RaceSourceRegistry,
  RaceUpdateCoreResult,
} from "../../types/raceUpdate.ts";
import { applySafeChanges } from "./apply.ts";
import { diffRaceFactCandidates } from "./diff.ts";
import { normalizeOfficialFactCandidate } from "./officialFacts.ts";
import { classifyRaceFieldDiff } from "./riskPolicy.ts";
import { evaluateFreshnessSourceEligibility, findRegistrySource } from "./sourceRegistry.ts";
import { validateOfficialFactCandidate } from "./validation.ts";

export function evaluateRaceUpdateCore(input: {
  snapshot: RaceGraphSnapshot;
  registry: RaceSourceRegistry;
  candidates: OfficialFactCandidate[];
  expectedTargets?: RaceFieldTarget[];
  detectedAt: string;
  applyLowRisk?: boolean;
}): RaceUpdateCoreResult {
  const normalized = input.candidates
    .map(normalizeOfficialFactCandidate)
    .filter((candidate): candidate is OfficialFactCandidate => candidate !== null);
  const validationResults = normalized.map((candidate) => ({
    candidate,
    errors: validateOfficialFactCandidate(input.snapshot, input.registry, candidate),
  }));
  const validationErrors = validationResults.flatMap(({ errors }) => errors);
  const validCandidates = validationResults.filter(({ errors }) => errors.length === 0).map(({ candidate }) => candidate);
  const structuralIdentityCandidates = validationResults
    .filter(({ errors }) => errors.length > 0 && errors.every(({ field }) => (
      field === "eventId" || field === "editionId" || field === "categoryId"
    )))
    .map(({ candidate }) => candidate);
  const diffs = diffRaceFactCandidates({
    snapshot: input.snapshot,
    candidates: [...validCandidates, ...structuralIdentityCandidates],
    expectedTargets: input.expectedTargets,
  });
  const changes = diffs
    .filter(({ status }) => status === "CHANGED" || status === "CONFLICT" || status === "MISSING")
    .map((diff) => buildChange(diff, input.registry, input.detectedAt));
  const pendingChanges = changes
    .filter(({ action }) => action !== "auto_apply")
    .map((change) => toPendingChange(change, input.detectedAt));

  if (!input.applyLowRisk) {
    return {
      snapshot: structuredClone(input.snapshot),
      diffs,
      changes,
      pendingChanges,
      validationErrors,
      appliedChangeIds: [],
    };
  }

  const applyResult = applySafeChanges({
    snapshot: input.snapshot,
    changes: changes.filter(({ action }) => action === "auto_apply"),
    registry: input.registry,
    appliedAt: input.detectedAt,
  });
  return {
    snapshot: applyResult.snapshot,
    diffs,
    changes,
    pendingChanges,
    validationErrors,
    appliedChangeIds: applyResult.appliedChangeIds,
  };
}

function toPendingChange(change: RaceFieldChange, createdAt: string) {
  const primaryEvidence = change.evidence[0];
  if (!primaryEvidence) throw new Error(`Pending change requires evidence: ${change.changeId}`);
  return {
    changeId: change.changeId,
    eventId: change.eventId,
    editionId: change.editionId,
    categoryId: change.categoryId,
    entityType: change.entityType,
    field: change.field,
    currentValue: change.oldValue,
    ...(change.conflict ? {} : { candidateValue: change.newValue }),
    sourceId: primaryEvidence.sourceId,
    sourceUrl: primaryEvidence.sourceUrl,
    evidenceText: primaryEvidence.evidenceText,
    evidenceLocator: primaryEvidence.evidenceLocator,
    confidence: primaryEvidence.confidence,
    fetchedAt: primaryEvidence.fetchedAt,
    contentHash: primaryEvidence.contentHash,
    extractionMethod: primaryEvidence.extractionMethod,
    evidence: change.evidence,
    conflict: change.conflict,
    candidateOptions: change.candidateOptions,
    applyBlocked: change.applyBlocked,
    risk: change.risk,
    reason: change.reason,
    status: "pending" as const,
    createdAt,
    reviewedAt: null,
    reviewReason: null,
    appliedAt: null,
  };
}

function buildChange(
  diff: RaceFieldDiff,
  registry: RaceSourceRegistry,
  detectedAt: string,
): RaceFieldChange {
  const orderedCandidates = [...diff.candidates].sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  const autoApplyEligible = orderedCandidates.length > 0 && orderedCandidates.every((candidate) => {
    const source = findRegistrySource(registry, candidate.editionId, candidate.sourceId);
    return source ? evaluateFreshnessSourceEligibility({
      registryEditionId: candidate.editionId,
      targetEditionId: candidate.editionId,
      source,
    }).autoApplyEligible : false;
  });
  const confidence = orderedCandidates.length > 0
    ? Math.min(...orderedCandidates.map(({ confidence: value }) => value))
    : 0;
  const classification = classifyRaceFieldDiff(diff, { autoApplyEligible, confidence });
  const evidence = orderedCandidates.map(toEvidence);
  const identity = [
    diff.eventId,
    diff.editionId,
    diff.categoryId ?? "edition",
    diff.entityType,
    diff.field,
    JSON.stringify(diff.conflict ? diff.candidateOptions.map(({ value }) => value) : diff.newValue),
    ...orderedCandidates.map(({ sourceId }) => sourceId),
  ].join("|");

  return {
    eventId: diff.eventId,
    editionId: diff.editionId,
    categoryId: diff.categoryId,
    entityType: diff.entityType,
    field: diff.field,
    changeId: `chg-${createHash("sha256").update(identity).digest("hex").slice(0, 16)}`,
    oldValue: diff.oldValue,
    newValue: diff.newValue,
    sourceIds: orderedCandidates.map(({ sourceId }) => sourceId),
    sourceUrls: orderedCandidates.map(({ sourceUrl }) => sourceUrl),
    detectedAt,
    ...classification,
    evidence,
    conflict: diff.conflict,
    candidateOptions: diff.candidateOptions,
    applyBlocked: diff.conflict,
  };
}

function toEvidence(candidate: OfficialFactCandidate): FactEvidence {
  return {
    sourceId: candidate.sourceId,
    sourceUrl: candidate.sourceUrl,
    evidenceText: candidate.evidenceText,
    evidenceLocator: candidate.evidenceLocator,
    confidence: candidate.confidence,
    fetchedAt: candidate.fetchedAt,
    contentHash: candidate.contentHash,
    extractionMethod: candidate.extractionMethod,
  };
}
