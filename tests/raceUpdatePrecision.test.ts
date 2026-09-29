import { deepEqual, equal, match, ok, throws } from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { applySafeChanges } from "../scripts/race-update/apply.ts";
import { diffRaceFactCandidates } from "../scripts/race-update/diff.ts";
import {
  RACE_FACT_PROCESSING_VERSION,
  shouldExtractDocument,
  transitionIngestionState,
} from "../scripts/race-update/ingestionState.ts";
import { approvePendingChange } from "../scripts/race-update/pendingStore.ts";
import { assertPendingChangeStore } from "../scripts/race-update/persistence.ts";
import {
  isLocationSemanticReview,
  validateCandidatePrecisionEvidence,
} from "../scripts/race-update/realExtraction.ts";
import { classifyRaceFieldDiff } from "../scripts/race-update/riskPolicy.ts";
import { loadRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import type {
  OfficialDocumentSnapshot,
  OfficialFactCandidate,
} from "../types/officialSourceIngestion.ts";
import type {
  PendingChange,
  RaceFieldChange,
  RaceGraphSnapshot,
  RaceGraphSnapshotRecord,
  RaceSourceRegistrySource,
} from "../types/raceUpdate.ts";

const snapshot = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as RaceGraphSnapshot;
const registry = await loadRaceSourceRegistry();

test("Category evidence cannot be promoted to Edition dates and ambiguous Category scope is rejected", () => {
  const record = recordFor("hk100-2027");
  const source = sourceFor("hk100-2027", "hk100-official-the-half-2027");
  const categoryId = "hk100-2027-the-half-53k";
  const evidenceText = "The Half starts on 22 January 2027.";
  const document = documentFor(source, record, evidenceText);

  const promoted = factFor(record, source, {
    entityType: "Edition",
    categoryId: null,
    field: "raceDate",
    candidateValue: "2027-01-22",
    evidenceText,
  });
  match(precisionErrors(document, record, source, promoted).join(";"), /ambiguous_entity_scope/);

  const scoped = factFor(record, source, {
    entityType: "Category",
    categoryId,
    field: "startAt",
    candidateValue: "2027-01-22T06:30:00+08:00",
    evidenceText,
  });
  deepEqual(precisionErrors(document, record, source, scoped), []);

  const ambiguousText = "The race starts on 22 January 2027.";
  const ambiguousDocument = documentFor(source, record, ambiguousText);
  const ambiguous = { ...scoped, evidenceText: ambiguousText };
  match(precisionErrors(ambiguousDocument, record, source, ambiguous).join(";"), /ambiguous_entity_scope/);
});

test("explicit Edition windows survive nearby Category text and nested Category names resolve to the most specific match", () => {
  const tsaigu = recordFor("tsaigu-kuocang-2026");
  const tsaiguSource = sourceFor(tsaigu.edition.editionId, "tsaigu-2026-rules");
  const editionEvidence = "第十一届柴古唐斯括苍越野赛定于2026年10月30日至11月1日在浙江省临海市举办。";
  const editionDocument = documentFor(tsaiguSource, tsaigu, `${editionEvidence} 105K 50K 25K`);
  const editionCandidate = factFor(tsaigu, tsaiguSource, {
    field: "raceDate",
    candidateValue: "2026-10-30",
    evidenceText: editionEvidence,
  });
  deepEqual(precisionErrors(editionDocument, tsaigu, tsaiguSource, editionCandidate), []);

  const xian = recordFor("xian-marathon-2026");
  const xianSource = sourceFor(xian.edition.editionId, "xian-marathon-2026-official-site");
  const halfEvidence = "半程马拉松终点设于西安国际会展中心";
  const halfCandidate = factFor(xian, xianSource, {
    entityType: "Category",
    categoryId: "xian-marathon-2026-half-marathon",
    field: "finishLocation",
    candidateValue: "西安国际会展中心",
    evidenceText: halfEvidence,
  });
  deepEqual(precisionErrors(documentFor(xianSource, xian, halfEvidence), xian, xianSource, halfCandidate), []);
});

test("an exactly Category-scoped registered source can resolve otherwise label-free evidence", () => {
  const ninghai = recordFor("ninghai-ultra-trail-2026");
  const source = sourceFor(ninghai.edition.editionId, "itra-ninghai-cnh60-2026");
  const evidenceText = "Distance: 59.13";
  const candidate = factFor(ninghai, source, {
    entityType: "Category",
    categoryId: "ninghai-ultra-trail-2026-cnh-60",
    field: "distanceKm",
    candidateValue: 59.13,
    evidenceText,
  });
  deepEqual(precisionErrors(documentFor(source, ninghai, evidenceText), ninghai, source, candidate), []);

  const promotedUrl = factFor(ninghai, source, {
    field: "registrationUrl",
    candidateValue: source.url,
    evidenceText: `Registration: ${source.url}`,
  });
  match(precisionErrors(documentFor(source, ninghai, promotedUrl.evidenceText), ninghai, source, promotedUrl).join(";"), /ambiguous_entity_scope/);
});

test("temporal context rejects another Edition and permits prior-year registration tied to the target Edition", () => {
  const tsaigu = recordFor("tsaigu-kuocang-2026");
  const tsaiguSource = sourceFor("tsaigu-kuocang-2026", "tsaigu-2026-rules");
  const oldEvidence = "2025赛事报名时间：2025年6月20日至6月26日。";
  const oldCandidate = factFor(tsaigu, tsaiguSource, {
    field: "registrationOpenDate",
    candidateValue: "2025-06-20",
    evidenceText: oldEvidence,
  });
  match(precisionErrors(documentFor(tsaiguSource, tsaigu, oldEvidence), tsaigu, tsaiguSource, oldCandidate).join(";"), /evidence_edition_mismatch/);

  const xiamen = recordFor("xiamen-marathon-2027");
  const xiamenSource = sourceFor("xiamen-marathon-2027", "xiamen-marathon-official-home");
  const validEvidence = "2027 Xiamen Marathon registration opens on 17 September 2026.";
  const validCandidate = factFor(xiamen, xiamenSource, {
    field: "registrationOpenDate",
    candidateValue: "2026-09-17",
    evidenceText: validEvidence,
  });
  deepEqual(precisionErrors(documentFor(xiamenSource, xiamen, validEvidence), xiamen, xiamenSource, validCandidate), []);
});

test("approximate, bounded and ranged numeric evidence is rejected while exact numeric evidence remains valid", () => {
  const record = recordFor("hk100-2027");
  const source = sourceFor("hk100-2027", "hk100-official-hk100-category-2027");
  const categoryId = "hk100-2027-hk100-100k";
  for (const evidenceText of ["HK100 累计爬升约 2200 米", "HK100 累计爬升超过 2200 米", "HK100 elevation gain around 2200 m", "HK100 elevation gain 2200–2300 m"]) {
    const candidate = factFor(record, source, {
      entityType: "Category",
      categoryId,
      field: "elevationGain",
      candidateValue: 2200,
      evidenceText,
    });
    match(precisionErrors(documentFor(source, record, evidenceText), record, source, candidate).join(";"), /non_exact_numeric_evidence/);
  }

  for (const [field, value, evidenceText] of [["elevationGain", 2200, "HK100 elevation gain 2200 m"], ["distanceKm", 59.13, "HK100 distance 59.13 km"]] as const) {
    const candidate = factFor(record, source, {
      entityType: "Category",
      categoryId,
      field,
      candidateValue: value,
      evidenceText,
    });
    deepEqual(precisionErrors(documentFor(source, record, evidenceText), record, source, candidate), []);
  }
});

test("scalar disagreements remain field-risk conflicts with structured options and never array candidates", () => {
  const record = recordFor("ninghai-ultra-trail-2026");
  const categoryId = "ninghai-ultra-trail-2026-cnh-60";
  const firstSource = sourceFor(record.edition.editionId, "ninghai100-official-home-2026");
  const secondSource = sourceFor(record.edition.editionId, "itra-ninghai-cnh60-2026");
  const candidates = [
    factFor(record, firstSource, { entityType: "Category", categoryId, field: "distanceKm", candidateValue: 60, evidenceText: "CNH-60 distance 60 km" }),
    factFor(record, secondSource, { entityType: "Category", categoryId, field: "distanceKm", candidateValue: 59.13, evidenceText: "CNH-60 distance 59.13 km" }),
  ];
  const [diff] = diffRaceFactCandidates({ snapshot, candidates });
  equal(diff.status, "CONFLICT");
  equal(diff.oldValue, 60);
  equal(diff.newValue, null);
  equal(Array.isArray(diff.newValue), false);
  deepEqual(diff.candidateOptions.map(({ value }) => value), [59.13, 60]);
  deepEqual(classifyRaceFieldDiff(diff, { autoApplyEligible: true, confidence: 1 }), {
    risk: "high_impact",
    action: "needs_review",
    reason: "source_value_conflict",
  });

  const beijing = recordFor("beijing-marathon-2026");
  const urlCandidates = [
    factFor(beijing, sourceFor(beijing.edition.editionId, "beijing-marathon-official-registration-guidelines-2026"), {
      field: "registrationUrl",
      candidateValue: "https://example.test/a",
      evidenceText: "Registration https://example.test/a",
    }),
    factFor(beijing, sourceFor(beijing.edition.editionId, "beijing-marathon-official-registration-portal-2026"), {
      field: "registrationUrl",
      candidateValue: "https://example.test/b",
      evidenceText: "Registration https://example.test/b",
    }),
  ];
  const [urlDiff] = diffRaceFactCandidates({ snapshot, candidates: urlCandidates });
  equal(urlDiff.status, "CONFLICT");
  equal(urlDiff.newValue, null);
  equal(classifyRaceFieldDiff(urlDiff, { autoApplyEligible: true, confidence: 1 }).risk, "low");
});

test("conflict Pending omits a selected value and is blocked from approve and apply", () => {
  const record = recordFor("ninghai-ultra-trail-2026");
  const source = sourceFor(record.edition.editionId, "ninghai100-official-home-2026");
  const candidate = factFor(record, source, {
    entityType: "Category",
    categoryId: "ninghai-ultra-trail-2026-cnh-60",
    field: "distanceKm",
    candidateValue: 60,
    evidenceText: "CNH-60 distance 60 km",
  });
  const evidence = evidenceFor(candidate);
  const pending: PendingChange = {
    changeId: "conflict-test",
    eventId: candidate.eventId,
    editionId: candidate.editionId,
    categoryId: candidate.categoryId,
    entityType: candidate.entityType,
    field: candidate.field,
    currentValue: 60,
    sourceId: source.sourceId,
    sourceUrl: source.url,
    evidenceText: candidate.evidenceText,
    evidenceLocator: candidate.evidenceLocator,
    confidence: candidate.confidence,
    fetchedAt: candidate.fetchedAt,
    contentHash: candidate.contentHash,
    extractionMethod: candidate.extractionMethod,
    provider: "fixture",
    model: "fixture",
    promptVersion: "fixture",
    evidence: [evidence],
    risk: "high_impact",
    reason: "source_value_conflict",
    conflict: true,
    candidateOptions: [
      { value: 60, sourceIds: [source.sourceId], evidence: [evidence] },
      { value: 59.13, sourceIds: [source.sourceId], evidence: [evidence] },
    ],
    applyBlocked: true,
    status: "pending",
    createdAt: "2026-09-29T10:00:00+08:00",
    reviewedAt: null,
    reviewReason: null,
    appliedAt: null,
  };
  const store = { schemaVersion: "race-update-pending-v1" as const, changes: [pending] };
  assertPendingChangeStore(store);
  equal(Object.hasOwn(pending, "candidateValue"), false);
  throws(() => approvePendingChange({ store, changeId: pending.changeId, reviewedAt: "2026-09-29T10:10:00+08:00" }), /CONFLICT_REVIEW_SELECTION_REQUIRED/);

  const blockedChange: RaceFieldChange = {
    changeId: pending.changeId,
    eventId: pending.eventId,
    editionId: pending.editionId,
    categoryId: pending.categoryId,
    entityType: pending.entityType,
    field: pending.field,
    oldValue: pending.currentValue,
    newValue: 59.13,
    sourceIds: [source.sourceId],
    sourceUrls: [source.url],
    detectedAt: pending.createdAt,
    risk: pending.risk,
    action: "pending_review",
    reason: pending.reason,
    evidence: [evidence],
    conflict: true,
    candidateOptions: pending.candidateOptions!,
    applyBlocked: true,
  };
  throws(() => applySafeChanges({ snapshot, changes: [blockedChange], registry, appliedAt: pending.createdAt, allowReviewed: true }), /CONFLICT_REVIEW_APPLY_BLOCKED/);
});

test("descriptive location expansion is report-only semantic review while null to location remains a real change", () => {
  const xian = recordFor("xian-marathon-2026");
  const xianSource = sourceFor(xian.edition.editionId, "xian-marathon-2026-official-site");
  const xianCategory = xian.categories[0];
  const expansion = factFor(xian, xianSource, {
    entityType: "Category",
    categoryId: xianCategory.categoryId,
    field: "startLocation",
    candidateValue: `西安标志性地标${xianCategory.startLocation}`,
    evidenceText: `起点：西安标志性地标${xianCategory.startLocation}`,
  });
  equal(isLocationSemanticReview(snapshot, expansion), true);

  const beijing = recordFor("beijing-marathon-2026");
  const beijingSource = sourceFor(beijing.edition.editionId, "beijing-marathon-official-registration-guidelines-2026");
  const newLocation = factFor(beijing, beijingSource, {
    entityType: "Category",
    categoryId: beijing.categories[0].categoryId,
    field: "startLocation",
    candidateValue: "天安门广场",
    evidenceText: "起点：天安门广场",
  });
  equal(isLocationSemanticReview(snapshot, newLocation), false);
  equal(diffRaceFactCandidates({ snapshot, candidates: [newLocation] })[0].status, "CHANGED");
});

test("processingVersion participates in the unchanged skip identity", () => {
  const record = recordFor("beijing-marathon-2026");
  const source = sourceFor(record.edition.editionId, "beijing-marathon-official-registration-guidelines-2026");
  const document = documentFor(source, record, "2026 Beijing Marathon registration lottery");
  const identity = { provider: "fixture", model: "fixture", promptVersion: "fixture" };
  const current = transitionIngestionState({ previous: null, document, outcome: "success", successfulExtraction: identity });
  equal(current.lastSuccessfulProcessingVersion, RACE_FACT_PROCESSING_VERSION);
  equal(shouldExtractDocument(current, document.contentHash, identity), false);
  const legacy = { ...current, lastSuccessfulProcessingVersion: "race-fact-processing-v0" };
  equal(shouldExtractDocument(legacy, document.contentHash, identity), true);
});

function recordFor(editionId: string): RaceGraphSnapshotRecord {
  return snapshot.records.find(({ edition }) => edition.editionId === editionId)!;
}

function sourceFor(editionId: string, sourceId: string): RaceSourceRegistrySource {
  return registry.editions.find((entry) => entry.editionId === editionId)!.sources.find((source) => source.sourceId === sourceId)!;
}

function documentFor(source: RaceSourceRegistrySource, record: RaceGraphSnapshotRecord, text: string): OfficialDocumentSnapshot {
  return {
    sourceId: source.sourceId,
    editionId: record.edition.editionId,
    url: source.url,
    title: "Precision fixture",
    contentType: "text/html",
    httpStatus: 200,
    charset: "utf-8",
    responseBytes: text.length,
    fetchedAt: "2026-09-29T10:00:00+08:00",
    text,
    links: [],
    contentHash: "a".repeat(64),
    extractionMethod: "html_text",
  };
}

function factFor(
  record: RaceGraphSnapshotRecord,
  source: RaceSourceRegistrySource,
  overrides: Partial<OfficialFactCandidate>,
): OfficialFactCandidate {
  return {
    eventId: record.event.eventId,
    editionId: record.edition.editionId,
    categoryId: null,
    entityType: "Edition",
    field: "registrationStatus",
    candidateValue: "unknown",
    sourceId: source.sourceId,
    sourceUrl: source.url,
    evidenceText: "unknown",
    evidenceLocator: "fixture",
    confidence: 0.95,
    fetchedAt: "2026-09-29T10:00:00+08:00",
    contentHash: "a".repeat(64),
    extractionMethod: "fixture",
    ...overrides,
  };
}

function precisionErrors(
  document: OfficialDocumentSnapshot,
  record: RaceGraphSnapshotRecord,
  source: RaceSourceRegistrySource,
  candidate: OfficialFactCandidate,
): string[] {
  return validateCandidatePrecisionEvidence({ document, record, source, candidate });
}

function evidenceFor(candidate: OfficialFactCandidate) {
  const { sourceId, sourceUrl, evidenceText, evidenceLocator, confidence, fetchedAt, contentHash, extractionMethod } = candidate;
  return { sourceId, sourceUrl, evidenceText, evidenceLocator, confidence, fetchedAt, contentHash, extractionMethod };
}
