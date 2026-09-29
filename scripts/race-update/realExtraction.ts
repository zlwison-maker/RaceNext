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
  RaceGraphSnapshot,
  RaceSourceRegistry,
  RaceSourceRegistrySource,
} from "../../types/raceUpdate.ts";
import { checkEditionDocumentIdentity } from "./identity.ts";
import { shouldExtractDocument, transitionFetchFailureState, transitionIngestionState } from "./ingestionState.ts";
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
};

export async function runRealExtractionDryRun(input: {
  snapshot: RaceGraphSnapshot;
  registry: RaceSourceRegistry;
  state: OfficialSourceIngestionState;
  pendingStore?: PendingChangeStore;
  provider: FactExtractionProvider;
  forceExtract?: boolean;
  now?: () => string;
  fetcher?: typeof fetch;
}): Promise<PreparedRealExtractionRun> {
  if (!input.provider.configured) throw new Error("Fact extraction provider is not configured.");

  const now = input.now ?? (() => new Date().toISOString());
  const startedAt = now();
  const state = structuredClone(input.state);
  const reports: RealExtractionSourceReport[] = [];
  const acceptedSources: AcceptedSource[] = [];

  for (const target of REAL_EXTRACTION_TARGETS) {
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
      if (!fetched.ok && fetched.status === "fetch_error") {
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
  const detectedAt = now();
  const core = evaluateRaceUpdateCore({
    snapshot: input.snapshot,
    registry: input.registry,
    candidates: acceptedCandidates,
    detectedAt,
    applyLowRisk: false,
  });
  if (core.appliedChangeIds.length > 0) throw new Error("Phase 3 dry run attempted to apply a Canonical change.");

  const planned = acceptedSources.map((acceptedSource) => ({
    acceptedSource,
    reviews: acceptedSource.candidates.map((candidate) => {
      const review = buildCandidateReview({
        candidate,
        source: acceptedSource.source,
        providerResult: acceptedSource.result,
        core,
      });
      const pending = review.action === "pending"
        ? buildDurablePendingChange({ candidate, review, providerResult: acceptedSource.result, createdAt: detectedAt })
        : null;
      return { review, pending };
    }),
  }));
  const incomingPending = planned.flatMap(({ reviews }) => reviews.flatMap(({ pending }) => pending ? [pending] : []));
  const existingPendingStore = input.pendingStore ?? { schemaVersion: "race-update-pending-v1", changes: [] };
  const pendingStore = mergeDurablePendingChanges(existingPendingStore, incomingPending);
  const existingIds = new Set(existingPendingStore.changes.map(({ changeId }) => changeId));
  const createdPendingChangeIds = incomingPending
    .map(({ changeId }) => changeId)
    .filter((changeId, index, all) => !existingIds.has(changeId) && all.indexOf(changeId) === index);
  const pendingRequirements: RealExtractionPendingRequirement[] = [];

  for (const { acceptedSource, reviews } of planned) {
    acceptedSource.report.candidates = reviews.map(({ review, pending }) => {
      if (!pending) return review;
      const durable = pendingStore.changes.find(({ changeId }) => changeId === pending.changeId);
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
      },
    }));
  }

  const report: RealExtractionReport = {
    schemaVersion: "race-real-extraction-v1",
    runId: randomUUID(),
    startedAt,
    finishedAt: now(),
    dryRun: true,
    editions: ["beijing-marathon-2026", "xiamen-marathon-2027"],
    sources: reports,
    summary: summarize(reports),
  };
  return {
    report,
    nextState: state,
    pendingStore,
    pendingRequirements,
    createdPendingChangeIds,
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
    const deterministicErrors = validateOfficialFactCandidate(input.snapshot, input.registry, candidate);
    const reasons = [evidence.error, valueEvidenceError, ...deterministicErrors.map(({ field, message }) => `${field}: ${message}`)]
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
}): RealExtractionCandidateReview {
  const diff = input.core.diffs.find((entry) => sameTarget(entry, input.candidate));
  if (!diff || diff.status === "NO_CANDIDATE") throw new Error(`Missing diff for extracted candidate: ${input.candidate.field}`);
  const change = input.core.changes.find((entry) => sameTarget(entry, input.candidate));
  const eligibility = evaluateFreshnessSourceEligibility({
    registryEditionId: input.candidate.editionId,
    targetEditionId: input.candidate.editionId,
    source: input.source,
  });
  const unchanged = diff.status === "UNCHANGED";
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
    action: unchanged ? "no_change" : "pending",
    changeId: null,
    pendingStatus: null,
    reason: unchanged
      ? "Candidate matches the current Canonical value."
      : `${change?.reason ?? "Candidate requires review."} Phase 3 requires durable human review and forbids auto-apply.`,
    provider: input.providerResult.provider,
    model: input.providerResult.model,
    promptVersion: input.providerResult.promptVersion,
  };
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
    const durable = byId.get(change.changeId);
    if (durable) {
      if (durableIdentity(durable) !== durableIdentity(change)) {
        throw new Error(`Pending changeId collision: ${change.changeId}`);
      }
      continue;
    }
    next.changes.push(structuredClone(change));
    byId.set(change.changeId, change);
  }
  return next;
}

function buildDurablePendingChange(input: {
  candidate: OfficialFactCandidate;
  review: RealExtractionCandidateReview;
  providerResult: FactExtractionProviderResult;
  createdAt: string;
}): PendingChange {
  if (input.review.risk === null || input.review.action !== "pending") {
    throw new Error(`Cannot persist unchanged extraction candidate: ${input.review.field}`);
  }
  const evidence = {
    sourceId: input.candidate.sourceId,
    sourceUrl: input.candidate.sourceUrl,
    evidenceText: input.candidate.evidenceText,
    evidenceLocator: input.candidate.evidenceLocator,
    confidence: input.candidate.confidence,
    fetchedAt: input.candidate.fetchedAt,
    contentHash: input.candidate.contentHash,
    extractionMethod: input.candidate.extractionMethod,
  };
  return {
    changeId: createRealExtractionChangeId(input.candidate),
    eventId: input.candidate.eventId,
    editionId: input.candidate.editionId,
    categoryId: input.candidate.categoryId,
    entityType: input.candidate.entityType,
    field: input.candidate.field,
    currentValue: input.review.currentValue,
    candidateValue: input.candidate.candidateValue,
    sourceId: input.candidate.sourceId,
    sourceUrl: input.candidate.sourceUrl,
    evidenceText: input.candidate.evidenceText,
    evidenceLocator: input.candidate.evidenceLocator,
    confidence: input.candidate.confidence,
    fetchedAt: input.candidate.fetchedAt,
    contentHash: input.candidate.contentHash,
    extractionMethod: input.candidate.extractionMethod,
    provider: input.providerResult.provider,
    model: input.providerResult.model,
    promptVersion: input.providerResult.promptVersion,
    evidence: [evidence],
    risk: input.review.risk,
    reason: input.review.reason,
    status: "pending",
    createdAt: input.createdAt,
    reviewedAt: null,
    reviewReason: null,
    appliedAt: null,
  };
}

function durableIdentity(change: PendingChange): string {
  return [
    change.editionId,
    change.categoryId ?? "edition",
    change.field,
    change.sourceId,
    change.contentHash,
    stableJson(change.candidateValue),
  ].join("|");
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
    requestStatus: input.requestStatus,
    providerErrorCode: input.providerErrorCode,
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
