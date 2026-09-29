import { createHash, randomUUID } from "node:crypto";

import type {
  FactExtractionErrorCode,
  FactExtractionProvider,
  FactExtractionProviderResult,
  FactExtractionUsage,
  OfficialDocumentSnapshot,
  OfficialFactCandidate,
  OfficialIngestionStatus,
  OfficialSourceIngestionState,
  OfficialSourceIngestionStateEntry,
  RealExtractionCandidateReview,
  RealExtractionRejectedCandidate,
  RealExtractionReport,
  RealExtractionSourceReport,
} from "../../types/officialSourceIngestion.ts";
import type {
  PendingChange,
  PendingChangeStore,
  RaceFieldChange,
  RaceGraphSnapshot,
  RaceGraphSnapshotRecord,
  RaceSourceRegistry,
  RaceSourceRegistrySource,
} from "../../types/raceUpdate.ts";
import { checkEditionDocumentIdentity } from "./identity.ts";
import {
  RACE_FACT_PROCESSING_VERSION,
  shouldExtractDocument,
  transitionFetchFailureState,
  transitionIngestionState,
} from "./ingestionState.ts";
import { fetchOfficialDocument } from "./officialDocument.ts";
import { evaluateRaceUpdateCore } from "./pipeline.ts";
import { FactExtractionProviderError } from "./qwenProvider.ts";
import { evaluateFreshnessSourceEligibility, findRegistrySource } from "./sourceRegistry.ts";
import { validateOfficialFactCandidate } from "./validation.ts";

export const REAL_EXTRACTION_TARGETS = [
  {
    editionId: "beijing-marathon-2026",
    sourceIds: ["beijing-marathon-official-registration-guidelines-2026"],
  },
  {
    editionId: "xiamen-marathon-2027",
    sourceIds: ["xiamen-marathon-aims-2027", "xiamen-marathon-china-marathon-2027"],
  },
] as const;

export type RealExtractionTarget = {
  editionId: string;
  sourceIds: readonly string[];
};

type AcceptedSource = {
  report: RealExtractionSourceReport;
  result: FactExtractionProviderResult;
  source: RaceSourceRegistrySource;
  candidates: OfficialFactCandidate[];
  previous: OfficialSourceIngestionStateEntry | null;
  document: OfficialDocumentSnapshot;
  checkedAt: string;
};

export type RealExtractionPendingRequirement = {
  editionId: string;
  sourceId: string;
  changeIds: string[];
};

export type PreparedRealExtractionRun = {
  report: RealExtractionReport;
  nextState: OfficialSourceIngestionState;
  pendingStore: PendingChangeStore;
  pendingRequirements: RealExtractionPendingRequirement[];
  createdPendingChangeIds: string[];
  changes: RaceFieldChange[];
};

export async function runRealExtractionDryRun(input: {
  snapshot: RaceGraphSnapshot;
  registry: RaceSourceRegistry;
  state: OfficialSourceIngestionState;
  pendingStore?: PendingChangeStore;
  provider: FactExtractionProvider;
  targets?: readonly RealExtractionTarget[];
  forceExtract?: boolean;
  autoApplyLowRisk?: boolean;
  now?: () => string;
  fetcher?: typeof fetch;
}): Promise<PreparedRealExtractionRun> {
  if (!input.provider.configured) throw new Error("Fact extraction provider is not configured.");

  const now = input.now ?? (() => new Date().toISOString());
  const startedAt = now();
  const targets = input.targets ?? REAL_EXTRACTION_TARGETS;
  const state = structuredClone(input.state);
  const reports: RealExtractionSourceReport[] = [];
  const acceptedSources: AcceptedSource[] = [];

  for (const target of targets) {
    const record = input.snapshot.records.find(({ edition }) => edition.editionId === target.editionId);
    if (!record) throw new Error(`Real extraction target Edition is missing: ${target.editionId}`);

    for (const sourceId of target.sourceIds) {
      const checkedAt = now();
      const source = findRegistrySource(input.registry, target.editionId, sourceId);
      if (!source) throw new Error(`Real extraction source is missing from Registry: ${target.editionId}/${sourceId}`);
      const eligibility = evaluateFreshnessSourceEligibility({
        registryEditionId: target.editionId,
        targetEditionId: target.editionId,
        source,
      });
      if (!eligibility.eligible) throw new Error(`Real extraction source is not eligible: ${sourceId}`);

      const previous = findState(state, target.editionId, sourceId);
      let fetched = await fetchOfficialDocument({
        source,
        editionId: target.editionId,
        fetchedAt: checkedAt,
        fetcher: input.fetcher,
      });
      if (!fetched.ok && isRetryableFetchFailure(fetched.status, fetched.detail)) {
        fetched = await fetchOfficialDocument({
          source,
          editionId: target.editionId,
          fetchedAt: checkedAt,
          fetcher: input.fetcher,
        });
      }
      if (!fetched.ok) {
        upsertState(state, transitionFetchFailureState({
          previous,
          sourceId,
          editionId: target.editionId,
          checkedAt,
          status: toFetchState(fetched.status),
        }));
        reports.push(baseReport({
          targetEditionId: target.editionId,
          source,
          provider: input.provider,
          fetchedAt: checkedAt,
          fetchStatus: fetched.status,
          extractionStatus: fetched.status,
          requestStatus: "failed",
          providerErrorCode: null,
          failureStage: "fetch",
          failureReason: fetched.detail,
          retryable: isRetryableFetchFailure(fetched.status, fetched.detail),
        }));
        continue;
      }

      const document = fetched.document;
      const identity = checkEditionDocumentIdentity({ record, source, document });
      if (identity.status !== "matched") {
        const extractionStatus = identity.status === "uncertain" ? "identity_uncertain" : "identity_mismatch";
        upsertState(state, transitionIngestionState({ previous, document, outcome: extractionStatus, checkedAt }));
        reports.push({
          ...baseReport({
            targetEditionId: target.editionId,
            source,
            provider: input.provider,
            fetchedAt: checkedAt,
            fetchStatus: "success",
            extractionStatus,
            requestStatus: "skipped",
            providerErrorCode: null,
            contentHash: document.contentHash,
            failureStage: "identity",
            failureReason: identity.evidence.join(", "),
            retryable: false,
          }),
          identity,
        });
        continue;
      }

      if (!input.forceExtract && !shouldExtractDocument(previous, document.contentHash, {
        provider: input.provider.id,
        model: input.provider.model,
        promptVersion: input.provider.promptVersion,
      })) {
        upsertState(state, transitionIngestionState({ previous, document, outcome: "unchanged", checkedAt }));
        reports.push({
          ...baseReport({
            targetEditionId: target.editionId,
            source,
            provider: input.provider,
            fetchedAt: checkedAt,
            fetchStatus: "success",
            extractionStatus: "unchanged",
            requestStatus: "skipped",
            providerErrorCode: null,
            contentHash: document.contentHash,
          }),
          identity,
        });
        continue;
      }

      let result: FactExtractionProviderResult;
      try {
        result = await input.provider.extract({
          contractVersion: "official-fact-extraction-v1",
          document,
          editionContext: {
            eventId: record.event.eventId,
            canonicalName: record.event.canonicalName,
            aliases: record.event.aliases,
            editionId: record.edition.editionId,
            editionYear: record.edition.editionYear,
            timezone: record.edition.timezone ?? null,
            categories: record.categories.map((category) => ({
              categoryId: category.categoryId,
              categoryName: category.categoryName,
              shortName: category.shortName ?? null,
            })),
          },
        });
      } catch (error) {
        const providerError = error instanceof FactExtractionProviderError ? error : null;
        upsertState(state, transitionIngestionState({ previous, document, outcome: "extraction_error", checkedAt }));
        reports.push({
          ...baseReport({
            targetEditionId: target.editionId,
            source,
            provider: input.provider,
            fetchedAt: checkedAt,
            fetchStatus: "success",
            extractionStatus: "extraction_error",
            requestStatus: "failed",
            providerErrorCode: providerError?.code ?? "unexpected_provider_payload",
            contentHash: document.contentHash,
            failureStage: "provider",
            failureReason: providerError?.message ?? "Fact extraction provider failed.",
            retryable: providerError ? isRetryableProviderFailure(providerError.code) : false,
          }),
          identity,
        });
        continue;
      }

      const validation = validateExtractedCandidates({
        document,
        candidates: result.output.facts,
        snapshot: input.snapshot,
        registry: input.registry,
      });
      const allReturnedCandidatesInvalid = result.output.facts.length > 0 && validation.accepted.length === 0;
      const extractionStatus: OfficialIngestionStatus = allReturnedCandidatesInvalid ? "validation_error" : "success";
      if (allReturnedCandidatesInvalid) {
        upsertState(state, transitionIngestionState({ previous, document, outcome: "validation_error", checkedAt }));
      }

      const report: RealExtractionSourceReport = {
        ...baseReport({
          targetEditionId: target.editionId,
          source,
          provider: input.provider,
          fetchedAt: checkedAt,
          fetchStatus: "success",
          extractionStatus,
          requestStatus: allReturnedCandidatesInvalid ? "failed" : "success",
          providerErrorCode: null,
          contentHash: document.contentHash,
          failureStage: allReturnedCandidatesInvalid ? "validation" : null,
          failureReason: allReturnedCandidatesInvalid ? "Every returned candidate failed deterministic validation." : null,
          retryable: allReturnedCandidatesInvalid ? false : null,
        }),
        identity,
        provider: result.provider,
        model: result.model,
        protocol: result.protocol,
        reasoningMode: result.reasoningMode,
        structuredOutputMode: result.structuredOutputMode,
        promptVersion: result.promptVersion,
        latencyMs: result.latencyMs,
        usage: result.usage,
        rawCandidateCount: result.output.facts.length,
        validationAcceptedCount: validation.accepted.length,
        validationRejectedCount: validation.rejected.length,
        rejectedCandidates: validation.rejected,
      };
      reports.push(report);
      if (!allReturnedCandidatesInvalid) {
        acceptedSources.push({ report, result, source, candidates: validation.accepted, previous, document, checkedAt });
      }
    }
  }

  const acceptedCandidates = acceptedSources.flatMap(({ candidates }) => candidates);
  const semanticReviewCandidates = new Set(acceptedCandidates.filter((candidate) => (
    isLocationSemanticReview(input.snapshot, candidate)
  )));
  const detectedAt = now();
  const core = evaluateRaceUpdateCore({
    snapshot: input.snapshot,
    registry: input.registry,
    candidates: acceptedCandidates.filter((candidate) => !semanticReviewCandidates.has(candidate)),
    detectedAt,
    applyLowRisk: false,
  });
  if (core.appliedChangeIds.length > 0) throw new Error("Phase 3 dry run attempted to apply a Canonical change.");

  const candidatePlans = acceptedSources.flatMap((acceptedSource) => acceptedSource.candidates.map((candidate) => ({
    acceptedSource,
    candidate,
    review: buildCandidateReview({
      candidate,
      source: acceptedSource.source,
      providerResult: acceptedSource.result,
      core,
      semanticReview: semanticReviewCandidates.has(candidate),
      snapshot: input.snapshot,
      autoApplyLowRisk: input.autoApplyLowRisk === true,
    }),
    pending: null as PendingChange | null,
  })));
  for (const change of core.changes) {
    const contributors = candidatePlans.filter(({ candidate, review }) => review.action === "pending" && sameTarget(candidate, change));
    if (contributors.length === 0) continue;
    const primary = [...contributors].sort(comparePendingAuthority)[0];
    const pending = buildDurablePendingChange({
      change,
      primaryCandidate: primary.candidate,
      providerResult: primary.acceptedSource.result,
      createdAt: detectedAt,
    });
    for (const contributor of contributors) contributor.pending = pending;
  }
  const incomingPending = [...new Map(candidatePlans
    .flatMap(({ pending }) => pending ? [[pending.changeId, pending] as const] : [])).values()];
  const existingPendingStore = input.pendingStore ?? { schemaVersion: "race-update-pending-v1", changes: [] };
  const pendingStore = mergeDurablePendingChanges(existingPendingStore, incomingPending);
  const existingIds = new Set(existingPendingStore.changes.map(({ changeId }) => changeId));
  const resolvedPending = new Map(incomingPending.map((pending) => {
    const durable = findDurablePendingChange(pendingStore, pending);
    if (!durable) throw new Error(`Prepared Pending Store is missing required change: ${pending.changeId}`);
    return [pending.changeId, durable] as const;
  }));
  const createdPendingChangeIds = [...new Set([...resolvedPending.values()]
    .map(({ changeId }) => changeId)
    .filter((changeId) => !existingIds.has(changeId)))];
  const pendingRequirements: RealExtractionPendingRequirement[] = [];

  for (const acceptedSource of acceptedSources) {
    const plans = candidatePlans.filter((plan) => plan.acceptedSource === acceptedSource);
    acceptedSource.report.candidates = plans.map(({ review, pending }) => {
      if (!pending) return review;
      const durable = resolvedPending.get(pending.changeId);
      if (!durable) throw new Error(`Prepared Pending Store is missing required change: ${pending.changeId}`);
      return { ...review, changeId: durable.changeId, pendingStatus: durable.status };
    });
    const changeIds = acceptedSource.report.candidates.flatMap(({ changeId }) => changeId ? [changeId] : []);
    pendingRequirements.push({
      editionId: acceptedSource.report.editionId,
      sourceId: acceptedSource.report.sourceId,
      changeIds,
    });
    upsertState(state, transitionIngestionState({
      previous: acceptedSource.previous,
      document: acceptedSource.document,
      outcome: "success",
      checkedAt: acceptedSource.checkedAt,
      successfulExtraction: {
        provider: acceptedSource.result.provider,
        model: acceptedSource.result.model,
        promptVersion: acceptedSource.result.promptVersion,
        processingVersion: RACE_FACT_PROCESSING_VERSION,
      },
    }));
  }

  const report: RealExtractionReport = {
    schemaVersion: "race-real-extraction-v1",
    runId: randomUUID(),
    startedAt,
    finishedAt: now(),
    dryRun: true,
    processingVersion: RACE_FACT_PROCESSING_VERSION,
    editions: targets.map(({ editionId }) => editionId),
    sources: reports,
    summary: summarize(reports),
  };
  return {
    report,
    nextState: state,
    pendingStore,
    pendingRequirements,
    createdPendingChangeIds,
    changes: core.changes,
  };
}

export function validateExtractedCandidates(input: {
  document: OfficialDocumentSnapshot;
  candidates: OfficialFactCandidate[];
  snapshot: RaceGraphSnapshot;
  registry: RaceSourceRegistry;
}): { accepted: OfficialFactCandidate[]; rejected: RealExtractionRejectedCandidate[] } {
  const accepted: OfficialFactCandidate[] = [];
  const rejected: RealExtractionRejectedCandidate[] = [];

  for (const candidate of input.candidates) {
    const evidence = verifyEvidence(input.document, candidate);
    const valueEvidenceError = validateCandidateValueEvidence(input.document, evidence.candidate);
    const record = input.snapshot.records.find(({ edition }) => edition.editionId === candidate.editionId);
    const source = findRegistrySource(input.registry, candidate.editionId, candidate.sourceId);
    const precisionErrors = evidence.error || !record || !source
      ? []
      : validateCandidatePrecisionEvidence({
        document: input.document,
        candidate: evidence.candidate,
        record,
        source,
      });
    const deterministicErrors = validateOfficialFactCandidate(input.snapshot, input.registry, candidate);
    const reasons = [
      evidence.error,
      valueEvidenceError,
      ...precisionErrors,
      ...deterministicErrors.map(({ field, message }) => `${field}: ${message}`),
    ]
      .filter((reason): reason is string => Boolean(reason));
    if (reasons.length > 0) {
      rejected.push({
        eventId: candidate.eventId,
        sourceId: candidate.sourceId,
        editionId: candidate.editionId,
        categoryId: candidate.categoryId,
        entityType: candidate.entityType,
        field: candidate.field,
        candidateValue: candidate.candidateValue,
        evidenceText: candidate.evidenceText,
        evidenceLocator: candidate.evidenceLocator,
        confidence: candidate.confidence,
        action: "rejected",
        reason: reasons.join("; "),
      });
      continue;
    }
    accepted.push(evidence.candidate);
  }
  return { accepted, rejected };
}

export function validateCandidatePrecisionEvidence(input: {
  document: OfficialDocumentSnapshot;
  candidate: OfficialFactCandidate;
  record: RaceGraphSnapshotRecord;
  source: RaceSourceRegistrySource;
}): string[] {
  const errors: string[] = [];
  const context = evidenceContext(input.document, input.candidate.evidenceText);
  const evidenceCategoryMatches = matchedCategoryIds(input.candidate.evidenceText, input.record);
  const contextCategoryMatches = matchedCategoryIds(context, input.record);
  const sourceCategoryMatches = matchedCategoryIds(`${input.source.sourceId} ${input.source.url}`, input.record);
  const semanticLocation = isLocationSemanticCandidate(input.record, input.candidate);

  if (input.candidate.entityType === "Edition") {
    const explicitEvidenceCategoryMatches = explicitCategoryIds(input.candidate.evidenceText, input.record);
    const explicitContextCategoryMatches = explicitCategoryIds(context, input.record);
    const categoryScopedSource = input.source.sourceType === "category_page" || sourceCategoryMatches.length === 1;
    const categoryScopedDate = (input.candidate.field === "raceDate" || input.candidate.field === "endDate")
      && (categoryScopedSource
        || explicitEvidenceCategoryMatches.length > 0
        || (explicitContextCategoryMatches.length > 0 && !hasExplicitEditionWindow(input.candidate.evidenceText, input.record)));
    if (categoryScopedSource || categoryScopedDate || explicitEvidenceCategoryMatches.length > 0) {
      errors.push("ambiguous_entity_scope: Category-specific evidence cannot be promoted to an Edition fact.");
    }
  } else if (input.record.categories.length > 1 && !semanticLocation) {
    const resolvedCategoryMatches = evidenceCategoryMatches.length > 0
      ? evidenceCategoryMatches
      : sourceCategoryMatches.length === 1
        ? sourceCategoryMatches
        : contextCategoryMatches;
    if (resolvedCategoryMatches.length !== 1 || resolvedCategoryMatches[0] !== input.candidate.categoryId) {
      errors.push("ambiguous_entity_scope: Evidence does not map uniquely to the declared Category.");
    }
  }

  const temporalError = validateTemporalContext(input.candidate, input.record, context);
  if (temporalError) errors.push(temporalError);

  if (["distanceKm", "elevationGain", "elevationLoss", "cutoffTimeHours"].includes(input.candidate.field)
    && typeof input.candidate.candidateValue === "number"
    && isNonExactNumericEvidence(input.candidate.evidenceText, input.candidate.candidateValue)) {
    errors.push("non_exact_numeric_evidence: Approximate, bounded, or ranged evidence cannot populate an exact numeric field.");
  }
  return errors;
}

export function validateCandidateValueEvidence(
  document: OfficialDocumentSnapshot,
  candidate: OfficialFactCandidate,
): string | null {
  const evidence = candidate.evidenceText.trim();
  const value = candidate.candidateValue;
  if (candidate.field === "registrationUrl") {
    if (typeof value !== "string" || (!document.text.includes(value) && !document.links.includes(value))) {
      return "registrationUrl must occur exactly in the current document text or extracted links.";
    }
    if (!/(?:register|registration|entry|报名|报项)/i.test(evidence)) {
      return "registrationUrl requires explicit registration context in its evidence text.";
    }
  }
  if (candidate.field === "registrationStatus") {
    if (typeof value !== "string" || !registrationStatusEvidenceMatches(value, evidence)) {
      return "registrationStatus requires an explicit current-status statement and cannot be derived from a registration window.";
    }
  }
  if (candidate.field === "startLocation" || candidate.field === "finishLocation") {
    if (typeof value !== "string" || !containsFolded(evidence, value)) {
      return `${candidate.field} must occur directly in its evidence text.`;
    }
    const labelPattern = candidate.field === "startLocation"
      ? /(?:start|starting line|起点|出发点|开跑|鸣枪)/i
      : /(?:finish|finish line|终点|完赛)/i;
    if (!labelPattern.test(evidence)) {
      return `${candidate.field} requires explicit ${candidate.field === "startLocation" ? "start" : "finish"} semantics in its evidence text.`;
    }
  }
  if (["distanceKm", "elevationGain", "elevationLoss", "cutoffTimeHours"].includes(candidate.field)) {
    if (typeof value !== "number" || !numericEvidenceContains(evidence, value)) {
      return `${candidate.field} numeric value must occur directly in its evidence text.`;
    }
  }
  if (candidate.field === "endDate" && !/(?:end(?:ing)?\s+date|ends?\s+on|through|until|date\s+range|结束日期|结束时间|至\s*\d)/i.test(evidence)) {
    return "endDate requires explicit end-date or date-range evidence and cannot be copied from raceDate.";
  }
  if ((candidate.field === "registrationOpenDate"
      || candidate.field === "registrationCloseDate"
      || candidate.field === "startAt")
    && typeof value === "string") {
    if (value.includes("T")) {
      const time = value.slice(11, 16);
      if (!timeEvidenceContains(evidence, time)) return `${candidate.field} datetime precision is not present in its evidence text.`;
    } else if (/\b\d{1,2}:\d{2}\b/.test(evidence)) {
      return `${candidate.field} lost an explicit source time and must preserve source precision.`;
    }
  }
  if (candidate.field === "startTimes" && Array.isArray(value)) {
    if (value.length < 2) return "startTimes requires at least two explicit ordered start times; use startAt for one time.";
    const missingTime = value.find((entry) => typeof entry !== "string" || !timeEvidenceContains(evidence, entry.slice(11, 16)));
    if (missingTime !== undefined) return "Every startTimes time must occur directly in its evidence text.";
  }
  return null;
}

export function verifyEvidence(
  document: OfficialDocumentSnapshot,
  candidate: OfficialFactCandidate,
): { candidate: OfficialFactCandidate; error: string | null } {
  if (candidate.sourceId !== document.sourceId
    || candidate.sourceUrl !== document.url
    || candidate.fetchedAt !== document.fetchedAt
    || candidate.contentHash !== document.contentHash) {
    return { candidate, error: "Evidence metadata does not match the current fetched document." };
  }
  const evidenceText = candidate.evidenceText.trim();
  if (!evidenceText) return { candidate, error: "Evidence text is empty." };
  const offset = document.text.indexOf(evidenceText);
  if (offset < 0) return { candidate, error: "Evidence text was not found verbatim in the current document snapshot." };
  const modelLocator = candidate.evidenceLocator.trim();
  return {
    candidate: {
      ...candidate,
      evidenceText,
      evidenceLocator: `text:${offset}-${offset + evidenceText.length}${modelLocator ? `; ${modelLocator}` : ""}`,
    },
    error: null,
  };
}

function buildCandidateReview(input: {
  candidate: OfficialFactCandidate;
  source: RaceSourceRegistrySource;
  providerResult: FactExtractionProviderResult;
  core: ReturnType<typeof evaluateRaceUpdateCore>;
  semanticReview: boolean;
  snapshot: RaceGraphSnapshot;
  autoApplyLowRisk: boolean;
}): RealExtractionCandidateReview {
  const eligibility = evaluateFreshnessSourceEligibility({
    registryEditionId: input.candidate.editionId,
    targetEditionId: input.candidate.editionId,
    source: input.source,
  });
  if (input.semanticReview) {
    return {
      eventId: input.candidate.eventId,
      editionId: input.candidate.editionId,
      categoryId: input.candidate.categoryId,
      entityType: input.candidate.entityType,
      field: input.candidate.field,
      candidateValue: input.candidate.candidateValue,
      sourceId: input.candidate.sourceId,
      sourceUrl: input.candidate.sourceUrl,
      sourceTier: input.source.tier,
      authority: eligibility.autoApplyEligible ? "authoritative" : "cross_check_only",
      evidenceText: input.candidate.evidenceText,
      evidenceLocator: input.candidate.evidenceLocator,
      confidence: input.candidate.confidence,
      currentValue: currentFactValue(input.snapshot, input.candidate),
      diff: "SEMANTIC_REVIEW",
      risk: null,
      action: "semantic_review",
      changeId: null,
      pendingStatus: null,
      reason: "semantic_expansion_or_contraction",
      provider: input.providerResult.provider,
      model: input.providerResult.model,
      promptVersion: input.providerResult.promptVersion,
    };
  }
  const diff = input.core.diffs.find((entry) => sameTarget(entry, input.candidate));
  if (!diff || diff.status === "NO_CANDIDATE") throw new Error(`Missing diff for extracted candidate: ${input.candidate.field}`);
  const change = input.core.changes.find((entry) => sameTarget(entry, input.candidate));
  const unchanged = diff.status === "UNCHANGED";
  const autoApply = !unchanged && input.autoApplyLowRisk && change?.action === "auto_apply";
  return {
    eventId: input.candidate.eventId,
    editionId: input.candidate.editionId,
    categoryId: input.candidate.categoryId,
    entityType: input.candidate.entityType,
    field: input.candidate.field,
    candidateValue: input.candidate.candidateValue,
    sourceId: input.candidate.sourceId,
    sourceUrl: input.candidate.sourceUrl,
    sourceTier: input.source.tier,
    authority: eligibility.autoApplyEligible ? "authoritative" : "cross_check_only",
    evidenceText: input.candidate.evidenceText,
    evidenceLocator: input.candidate.evidenceLocator,
    confidence: input.candidate.confidence,
    currentValue: diff.oldValue,
    diff: diff.status,
    risk: unchanged ? null : change?.risk ?? "structural",
    action: unchanged ? "no_change" : autoApply ? "auto_apply" : "pending",
    changeId: null,
    pendingStatus: null,
    reason: unchanged
      ? "Candidate matches the current Canonical value."
      : autoApply
        ? `${change.reason} Eligible for working-copy Canonical apply; human PR merge remains required.`
        : `${change?.reason ?? "Candidate requires review."} Safe validation mode requires durable human review.`,
    provider: input.providerResult.provider,
    model: input.providerResult.model,
    promptVersion: input.providerResult.promptVersion,
  };
}

export function isLocationSemanticReview(
  snapshot: RaceGraphSnapshot,
  candidate: OfficialFactCandidate,
): boolean {
  const record = snapshot.records.find(({ edition }) => edition.editionId === candidate.editionId);
  return record ? isLocationSemanticCandidate(record, candidate) : false;
}

function isLocationSemanticCandidate(
  record: RaceGraphSnapshotRecord,
  candidate: OfficialFactCandidate,
): boolean {
  if (candidate.field !== "startLocation" && candidate.field !== "finishLocation") return false;
  if (typeof candidate.candidateValue !== "string") return false;
  const entity = candidate.entityType === "Edition"
    ? record.edition
    : record.categories.find(({ categoryId }) => categoryId === candidate.categoryId);
  const current = entity ? (entity as unknown as Record<string, unknown>)[candidate.field] ?? null : null;
  if (typeof current !== "string" || !current.trim()) return false;
  const normalizedCurrent = normalizeLocation(current);
  const normalizedCandidate = normalizeLocation(candidate.candidateValue);
  if (!normalizedCurrent || !normalizedCandidate || normalizedCurrent === normalizedCandidate) return false;
  if (/(?:→|->|至|到|及|和|\/)/.test(candidate.candidateValue)) return false;
  const shorter = Math.min(normalizedCurrent.length, normalizedCandidate.length);
  const longer = Math.max(normalizedCurrent.length, normalizedCandidate.length);
  return shorter / longer >= 0.5
    && (normalizedCandidate.includes(normalizedCurrent) || normalizedCurrent.includes(normalizedCandidate));
}

function currentFactValue(snapshot: RaceGraphSnapshot, candidate: OfficialFactCandidate): unknown {
  const record = snapshot.records.find(({ edition }) => edition.editionId === candidate.editionId);
  if (!record) return null;
  const entity = candidate.entityType === "Edition"
    ? record.edition
    : record.categories.find(({ categoryId }) => categoryId === candidate.categoryId);
  return entity ? (entity as unknown as Record<string, unknown>)[candidate.field] ?? null : null;
}

function normalizeLocation(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function createRealExtractionChangeId(input: Pick<
  OfficialFactCandidate,
  "editionId" | "categoryId" | "field" | "sourceId" | "contentHash" | "candidateValue"
>): string {
  const identity = [
    input.editionId,
    input.categoryId ?? "edition",
    input.field,
    input.sourceId,
    input.contentHash,
    stableJson(input.candidateValue),
  ].join("|");
  return `chg-${createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;
}

export function mergeDurablePendingChanges(
  existing: PendingChangeStore,
  incoming: PendingChange[],
): PendingChangeStore {
  const next = structuredClone(existing);
  const byId = new Map(next.changes.map((change) => [change.changeId, change]));
  for (const change of incoming) {
    const durable = byId.get(change.changeId) ?? next.changes.find((candidate) => sameCrossSourceFact(candidate, change));
    if (durable) {
      if (durable.changeId === change.changeId && durableIdentity(durable) !== durableIdentity(change)) {
        throw new Error(`Pending changeId collision: ${change.changeId}`);
      }
      if (durable.status === "pending") mergeEvidence(durable, change);
      continue;
    }
    next.changes.push(structuredClone(change));
    byId.set(change.changeId, change);
  }
  return next;
}

export function findDurablePendingChange(store: PendingChangeStore, incoming: PendingChange): PendingChange | undefined {
  return store.changes.find(({ changeId }) => changeId === incoming.changeId)
    ?? store.changes.find((candidate) => sameCrossSourceFact(candidate, incoming));
}

function buildDurablePendingChange(input: {
  change: RaceFieldChange;
  primaryCandidate: OfficialFactCandidate;
  providerResult: FactExtractionProviderResult;
  createdAt: string;
}): PendingChange {
  const changeIdentity = { ...input.primaryCandidate, candidateValue: input.change.newValue };
  const changeId = input.change.conflict
    ? createConflictChangeId(input.change)
    : createRealExtractionChangeId(changeIdentity);
  return {
    changeId,
    eventId: input.change.eventId,
    editionId: input.change.editionId,
    categoryId: input.change.categoryId,
    entityType: input.change.entityType,
    field: input.change.field,
    currentValue: input.change.oldValue,
    ...(input.change.conflict ? {} : { candidateValue: input.change.newValue }),
    sourceId: input.primaryCandidate.sourceId,
    sourceUrl: input.primaryCandidate.sourceUrl,
    evidenceText: input.primaryCandidate.evidenceText,
    evidenceLocator: input.primaryCandidate.evidenceLocator,
    confidence: Math.min(...input.change.evidence.map(({ confidence }) => confidence)),
    fetchedAt: input.primaryCandidate.fetchedAt,
    contentHash: input.primaryCandidate.contentHash,
    extractionMethod: input.primaryCandidate.extractionMethod,
    provider: input.providerResult.provider,
    model: input.providerResult.model,
    promptVersion: input.providerResult.promptVersion,
    evidence: input.change.evidence,
    conflict: input.change.conflict,
    candidateOptions: input.change.candidateOptions,
    applyBlocked: input.change.applyBlocked,
    risk: input.change.risk,
    reason: `${input.change.reason} Phase 3/4 safe baseline requires durable human review and forbids auto-apply.`,
    status: "pending",
    createdAt: input.createdAt,
    reviewedAt: null,
    reviewReason: null,
    appliedAt: null,
  };
}

function comparePendingAuthority(
  left: { acceptedSource: AcceptedSource },
  right: { acceptedSource: AcceptedSource },
): number {
  const rank = (source: RaceSourceRegistrySource): number => {
    if (source.isPrimary) return 0;
    if (source.tier === "primary_official") return 1;
    if (source.tier === "trusted_structured") return 2;
    return 3;
  };
  return rank(left.acceptedSource.source) - rank(right.acceptedSource.source)
    || left.acceptedSource.source.sourceId.localeCompare(right.acceptedSource.source.sourceId);
}

function sameCrossSourceFact(left: PendingChange, right: PendingChange): boolean {
  return !left.conflict
    && !right.conflict
    && left.sourceId !== right.sourceId
    && sameTarget(left, right)
    && stableJson(left.currentValue) === stableJson(right.currentValue)
    && stableJson(left.candidateValue) === stableJson(right.candidateValue);
}

function mergeEvidence(target: PendingChange, incoming: PendingChange): void {
  const evidenceKeys = new Set(target.evidence.map(evidenceIdentity));
  for (const evidence of incoming.evidence) {
    const key = evidenceIdentity(evidence);
    if (!evidenceKeys.has(key)) {
      target.evidence.push(structuredClone(evidence));
      evidenceKeys.add(key);
    }
  }
}

function evidenceIdentity(evidence: PendingChange["evidence"][number]): string {
  return [evidence.sourceId, evidence.contentHash, evidence.evidenceLocator, stableJson(evidence.evidenceText)].join("|");
}

function durableIdentity(change: PendingChange): string {
  return [
    change.editionId,
    change.categoryId ?? "edition",
    change.field,
    change.sourceId,
    change.contentHash,
    stableJson(change.conflict ? change.candidateOptions : change.candidateValue),
  ].join("|");
}

function createConflictChangeId(change: RaceFieldChange): string {
  const identity = [
    change.eventId,
    change.editionId,
    change.categoryId ?? "edition",
    change.entityType,
    change.field,
    stableJson(change.candidateOptions.map(({ value, sourceIds }) => ({ value, sourceIds }))),
  ].join("|");
  return `chg-${createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function baseReport(input: {
  targetEditionId: string;
  source: RaceSourceRegistrySource;
  provider: FactExtractionProvider;
  fetchedAt: string;
  fetchStatus: OfficialIngestionStatus;
  extractionStatus: OfficialIngestionStatus;
  requestStatus: "success" | "skipped" | "failed";
  providerErrorCode: FactExtractionErrorCode | null;
  failureStage?: RealExtractionSourceReport["failureStage"];
  failureReason?: string | null;
  retryable?: boolean | null;
  contentHash?: string | null;
}): RealExtractionSourceReport {
  return {
    editionId: input.targetEditionId,
    sourceId: input.source.sourceId,
    sourceUrl: input.source.url,
    sourceTier: input.source.tier,
    fetchStatus: input.fetchStatus,
    identity: null,
    extractionStatus: input.extractionStatus,
    provider: input.provider.id,
    model: input.provider.model,
    protocol: "openai-compatible-chat-completions",
    reasoningMode: "none",
    structuredOutputMode: "strict_json_schema",
    promptVersion: input.provider.promptVersion,
    processingVersion: RACE_FACT_PROCESSING_VERSION,
    requestStatus: input.requestStatus,
    providerErrorCode: input.providerErrorCode,
    failureStage: input.failureStage ?? null,
    failureReason: input.failureReason ?? null,
    retryable: input.retryable ?? null,
    contentHash: input.contentHash ?? null,
    fetchedAt: input.fetchedAt,
    latencyMs: null,
    usage: emptyUsage(),
    rawCandidateCount: 0,
    validationAcceptedCount: 0,
    validationRejectedCount: 0,
    candidates: [],
    rejectedCandidates: [],
    canonicalWritten: false,
  };
}

function summarize(reports: RealExtractionSourceReport[]): RealExtractionReport["summary"] {
  const successful = reports.filter(({ extractionStatus }) => extractionStatus === "success" || extractionStatus === "unchanged");
  const modelCalls = reports.filter(({ requestStatus }) => requestStatus === "success" || requestStatus === "failed")
    .filter(({ extractionStatus }) => !["fetch_error", "parse_error", "identity_mismatch", "identity_uncertain"].includes(extractionStatus));
  return {
    sourcesChecked: reports.length,
    sourcesSucceeded: successful.length,
    sourcesFailed: reports.length - successful.length,
    modelCalls: modelCalls.length,
    inputTokens: sumUsage(reports, "inputTokens"),
    outputTokens: sumUsage(reports, "outputTokens"),
    totalTokens: sumUsage(reports, "totalTokens"),
    candidateCount: reports.reduce((sum, report) => sum + report.rawCandidateCount, 0),
    validationAcceptedCount: reports.reduce((sum, report) => sum + report.validationAcceptedCount, 0),
    validationRejectedCount: reports.reduce((sum, report) => sum + report.validationRejectedCount, 0),
    pendingCount: reports.flatMap(({ candidates }) => candidates).filter(({ action }) => action === "pending").length,
    canonicalWrites: 0,
  };
}

function sumUsage(reports: RealExtractionSourceReport[], field: keyof FactExtractionUsage): number {
  return reports.reduce((sum, report) => sum + (report.usage[field] ?? 0), 0);
}

function emptyUsage(): FactExtractionUsage {
  return { inputTokens: null, outputTokens: null, totalTokens: null };
}

function sameTarget(
  left: Pick<OfficialFactCandidate, "eventId" | "editionId" | "categoryId" | "entityType" | "field">,
  right: Pick<OfficialFactCandidate, "eventId" | "editionId" | "categoryId" | "entityType" | "field">,
): boolean {
  return left.eventId === right.eventId
    && left.editionId === right.editionId
    && left.categoryId === right.categoryId
    && left.entityType === right.entityType
    && left.field === right.field;
}

function containsFolded(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase().includes(needle.trim().toLocaleLowerCase());
}

function numericEvidenceContains(evidence: string, value: number): boolean {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9.])${escaped}(?=$|[^0-9.])`).test(evidence);
}

function timeEvidenceContains(evidence: string, hhmm: string): boolean {
  const [rawHour, rawMinute] = hhmm.split(":");
  const hour = Number(rawHour);
  if (!Number.isInteger(hour) || !/^\d{2}$/.test(rawMinute)) return false;
  return new RegExp(`(^|[^0-9])0?${hour}:${rawMinute}(?=$|[^0-9])`).test(evidence);
}

function registrationStatusEvidenceMatches(value: string, evidence: string): boolean {
  const patterns: Record<string, RegExp> = {
    upcoming: /(?:registration\s+has\s+not\s+started|registration\s+upcoming|报名尚未开始|报名未开始)/i,
    registration_not_announced: /(?:registration\s+not\s+announced|报名尚未公布|报名未公布)/i,
    registration_open: /(?:registration\s+is\s+open|registration\s+open\s+now|报名中|正在报名)/i,
    lottery: /(?:lottery|drawing\s+in\s+progress|抽签中|等待抽签)/i,
    waiting_list: /(?:waiting\s+list|waitlist|候补中|候补名单)/i,
    registration_closed: /(?:registration\s+is\s+closed|registration\s+has\s+closed|报名已结束|报名结束)/i,
    race_finished: /(?:race\s+finished|event\s+completed|赛事已结束|比赛已结束)/i,
    cancelled: /(?:race\s+cancelled|event\s+cancelled|赛事取消|比赛取消)/i,
    unknown: /(?:status\s+unknown|状态未知)/i,
  };
  return patterns[value]?.test(evidence) ?? false;
}

function evidenceContext(document: OfficialDocumentSnapshot, evidenceText: string, radius = 320): string {
  const offset = document.text.indexOf(evidenceText.trim());
  if (offset < 0) return evidenceText;
  return document.text.slice(Math.max(0, offset - radius), Math.min(document.text.length, offset + evidenceText.length + radius));
}

function matchedCategoryIds(value: string, record: RaceGraphSnapshotRecord): string[] {
  const normalized = normalizeScopeText(value);
  const matchedNames = selectMatchedNames(normalized, record.categories.flatMap((category) => (
    [category.categoryName, category.shortName]
      .filter((name): name is string => Boolean(name))
      .map(normalizeScopeText)
      .filter((name) => name.length >= 2)
  )));
  const matched = record.categories.filter((category) => {
    const categoryNames = [category.categoryName, category.shortName]
      .filter((name): name is string => Boolean(name))
      .map(normalizeScopeText);
    if (categoryNames.some((name) => matchedNames.has(name))) return true;
    if (!Number.isFinite(category.distanceKm)) return false;
    const distance = String(category.distanceKm).replace(/\.0+$/, "");
    const escaped = distance.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^0-9.])${escaped}\\s*(?:k|km|公里)(?=$|[^a-z0-9])`, "i").test(value);
  });
  return [...new Set(matched.map(({ categoryId }) => categoryId))];
}

function explicitCategoryIds(value: string, record: RaceGraphSnapshotRecord): string[] {
  const normalized = normalizeScopeText(value);
  const eventIdentities = [record.event.canonicalName, record.edition.editionName, ...record.event.aliases]
    .map(normalizeScopeText);
  const distinctiveNames = record.categories.flatMap((category) => (
    [category.categoryName, category.shortName]
      .filter((name): name is string => Boolean(name))
      .map(normalizeScopeText)
      .filter((name) => name.length >= 2 && !eventIdentities.some((identity) => identity.includes(name)))
  ));
  const matchedNames = selectMatchedNames(normalized, distinctiveNames);
  return record.categories.filter((category) => {
    const distinctiveNameMatched = [category.categoryName, category.shortName]
      .filter((name): name is string => Boolean(name))
      .map(normalizeScopeText)
      .filter((name) => name.length >= 2 && !eventIdentities.some((identity) => identity.includes(name)))
      .some((name) => matchedNames.has(name));
    if (distinctiveNameMatched) return true;
    const distance = String(category.distanceKm).replace(/\.0+$/, "");
    const escaped = distance.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^0-9.])${escaped}\\s*(?:k|km|公里)(?=$|[^a-z0-9])`, "i").test(value);
  }).map(({ categoryId }) => categoryId);
}

function selectMatchedNames(normalizedValue: string, names: string[]): Set<string> {
  const matched = [...new Set(names.filter((name) => normalizedValue.includes(name)))]
    .sort((left, right) => right.length - left.length || left.localeCompare(right));
  const selected = new Set<string>();
  let remaining = normalizedValue;
  for (const name of matched) {
    if (!remaining.includes(name)) continue;
    selected.add(name);
    remaining = remaining.split(name).join(" ");
  }
  return selected;
}

function normalizeScopeText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}.]+/gu, "");
}

function hasExplicitEditionWindow(evidence: string, record: RaceGraphSnapshotRecord): boolean {
  const normalized = normalizeScopeText(evidence);
  const identities = [record.event.canonicalName, record.edition.editionName, ...record.event.aliases]
    .map(normalizeScopeText)
    .filter((value) => value.length >= 3);
  const identityMatched = identities.some((identity) => normalized.includes(identity));
  const windowLanguage = /(?:赛事|比赛|event|race).{0,40}(?:举行|举办|held|take place|from|至|到)|(?:举行|举办|held|take place|from).{0,40}(?:赛事|比赛|event|race)|(?:定于|将于).{0,80}(?:举行|举办|开跑|至|到)/i.test(evidence);
  return identityMatched && windowLanguage;
}

function validateTemporalContext(
  candidate: OfficialFactCandidate,
  record: RaceGraphSnapshotRecord,
  context: string,
): string | null {
  const temporalFields = new Set([
    "raceDate",
    "endDate",
    "startAt",
    "startTimes",
    "registrationOpenDate",
    "registrationCloseDate",
  ]);
  if (!temporalFields.has(candidate.field)) return null;
  const values = Array.isArray(candidate.candidateValue) ? candidate.candidateValue : [candidate.candidateValue];
  const years = values.flatMap((value) => typeof value === "string" && /^\d{4}-/.test(value) ? [Number(value.slice(0, 4))] : []);
  if (years.length === 0) return null;
  const editionYear = record.edition.editionYear;
  const registration = candidate.field === "registrationOpenDate" || candidate.field === "registrationCloseDate";

  for (const year of years) {
    if (!registration && year !== editionYear) {
      return "evidence_edition_mismatch: Race execution date is outside the target Edition year without explicit cross-year evidence.";
    }
    if (registration && year !== editionYear) {
      const targetAssociation = new RegExp(`(?:${editionYear}.{0,100}(?:报名|registration)|(?:报名|registration).{0,100}${editionYear})`, "i").test(context);
      const otherEditionContext = new RegExp(`(?:${year}\\s*(?:年|届)?\\s*(?:赛事|比赛|edition|race)|(?:赛事|比赛|edition|race)\\s*(?:年份|year)?\\s*[:：-]?\\s*${year})`, "i").test(context);
      if (year !== editionYear - 1 || !targetAssociation || otherEditionContext) {
        return "evidence_edition_mismatch: Registration evidence is not explicitly associated with the target Edition.";
      }
    }
  }
  return null;
}

function isNonExactNumericEvidence(evidence: string, candidateValue: number): boolean {
  const numericToken = String(candidateValue);
  const foldedEvidence = evidence.replace(/,/g, "");
  const offsets: number[] = [];
  let offset = foldedEvidence.indexOf(numericToken);
  while (offset >= 0) {
    offsets.push(offset);
    offset = foldedEvidence.indexOf(numericToken, offset + numericToken.length);
  }
  if (offsets.length === 0) return false;

  const marker = /(?:约为?|大约|大概|左右|近|超过|超|至少|不低于|不少于|以上|以下|以内|余|约莫|\babout\b|\bapproximately\b|\baround\b|\broughly\b|\bmore\s+than\b|\bover\b|\bat\s+least\b|\bno\s+less\s+than\b|\bup\s+to\b|\bless\s+than\b|\bunder\b|[<>＞＜])/i;
  const range = /\d[\d.]*\s*(?:-|–|—|~|～|至|到)\s*\d[\d.]*/g;
  return offsets.some((valueOffset) => {
    const local = foldedEvidence.slice(Math.max(0, valueOffset - 28), Math.min(foldedEvidence.length, valueOffset + numericToken.length + 28));
    if (marker.test(local)) return true;
    return [...local.matchAll(range)].some(([expression]) => expression.includes(numericToken));
  });
}

function isRetryableProviderFailure(code: FactExtractionErrorCode): boolean {
  return code === "rate_limited"
    || code === "provider_server_error"
    || code === "timeout"
    || code === "network_error";
}

function isRetryableFetchFailure(status: OfficialIngestionStatus, detail: string): boolean {
  if (status !== "fetch_error") return false;
  return /(?:timed out|http 429|http 5\d\d|network|fetch failed|temporary)/i.test(detail);
}

function findState(
  state: OfficialSourceIngestionState,
  editionId: string,
  sourceId: string,
): OfficialSourceIngestionStateEntry | null {
  return state.sources.find((entry) => entry.editionId === editionId && entry.sourceId === sourceId) ?? null;
}

function upsertState(state: OfficialSourceIngestionState, entry: OfficialSourceIngestionStateEntry): void {
  const index = state.sources.findIndex((candidate) => (
    candidate.editionId === entry.editionId && candidate.sourceId === entry.sourceId
  ));
  if (index === -1) state.sources.push(entry);
  else state.sources[index] = entry;
}

function toFetchState(status: OfficialIngestionStatus): Exclude<OfficialSourceIngestionStateEntry["lastFetchStatus"], "success"> {
  if (status === "parse_error" || status === "unsupported_content_type" || status === "unsupported_scanned_pdf") return status;
  return "fetch_error";
}
