import { deepEqual, equal, match, ok, throws } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { createCategoryId, createEditionId, normalizeStableCategoryKey } from "../lib/raceGraphIds.ts";
import { applySafeChanges } from "../scripts/race-update/apply.ts";
import { diffRaceFactCandidates } from "../scripts/race-update/diff.ts";
import { shouldExtractDocument, transitionIngestionState } from "../scripts/race-update/ingestionState.ts";
import { normalizeOfficialFactCandidate } from "../scripts/race-update/officialFacts.ts";
import { evaluateRaceUpdateCore } from "../scripts/race-update/pipeline.ts";
import { classifyRaceFieldDiff, classifyStructuralChange } from "../scripts/race-update/riskPolicy.ts";
import {
  evaluateFreshnessSourceEligibility,
  loadRaceSourceRegistry,
} from "../scripts/race-update/sourceRegistry.ts";
import {
  assertRaceGraphSnapshot,
  validateFieldValue,
  validateOfficialFactCandidate,
  validateStartTimes,
} from "../scripts/race-update/validation.ts";
import type { OfficialDocumentSnapshot, OfficialFactCandidate } from "../types/officialSourceIngestion.ts";
import type { RaceFieldTarget, RaceGraphSnapshot } from "../types/raceUpdate.ts";

const canonicalBytes = readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url));
const canonical = JSON.parse(canonicalBytes.toString("utf8")) as RaceGraphSnapshot;
const registry = await loadRaceSourceRegistry(fileURLToPath(new URL("../data/sources/race-source-registry.json", import.meta.url)));

const BEIJING_SOURCE_ID = "beijing-marathon-official-registration-guidelines-2026";
const BEIJING_SOURCE_URL = "https://en.beijing-marathon.com/registration-guidelines.html";
const HK100_SOURCE_ID = "hk100-official-hk100-category-2027";
const HK100_SOURCE_URL = "https://hk100ultra.com/zh-hant/hk100/";

function candidate(overrides: Partial<OfficialFactCandidate> = {}): OfficialFactCandidate {
  return {
    eventId: "beijing-marathon",
    editionId: "beijing-marathon-2026",
    categoryId: null,
    entityType: "Edition",
    field: "registrationStatus",
    candidateValue: "registration_closed",
    sourceId: BEIJING_SOURCE_ID,
    sourceUrl: BEIJING_SOURCE_URL,
    evidenceText: "Registration and lottery process is closed.",
    evidenceLocator: "Registration guidelines > Schedule",
    confidence: 0.95,
    fetchedAt: "2026-09-28T10:00:00+08:00",
    contentHash: "a".repeat(64),
    extractionMethod: "fixture",
    ...overrides,
  };
}

function categoryCandidate(overrides: Partial<OfficialFactCandidate> = {}): OfficialFactCandidate {
  return candidate({
    eventId: "hk100",
    editionId: "hk100-2027",
    categoryId: "hk100-2027-hk100-100k",
    entityType: "Category",
    field: "elevationLoss",
    candidateValue: 4200,
    sourceId: HK100_SOURCE_ID,
    sourceUrl: HK100_SOURCE_URL,
    evidenceText: "Elevation loss 4200 m.",
    evidenceLocator: "HK100 facts table",
    ...overrides,
  });
}

test("stable identity helpers are format-stable and leave the formal 12/26 IDs intact", () => {
  equal(canonical.records.length, 12);
  equal(canonical.records.flatMap(({ categories }) => categories).length, 26);
  for (const { event, edition, categories } of canonical.records) {
    equal(createEditionId(event.eventId, edition.editionYear), edition.editionId);
    ok(categories.every(({ categoryId }) => categoryId.startsWith(`${edition.editionId}-`)));
  }
  equal(normalizeStableCategoryKey(" UTNH  100 "), "utnh-100");
  equal(normalizeStableCategoryKey("UTNH_100"), "utnh-100");
  equal(createCategoryId("ninghai-ultra-trail-2026", "UTNH 100"), "ninghai-ultra-trail-2026-utnh-100");
  throws(() => createCategoryId("ninghai-ultra-trail-2026", "1"), /semantic code/);
  assertRaceGraphSnapshot(canonical);
});

test("current Registry source types are all explicitly classified for freshness", () => {
  const excludedTypes = new Set([
    "government_context",
    "media_report",
    "previous_edition_media",
    "previous_edition_report",
    "specialist_media",
  ]);
  for (const entry of registry.editions) {
    for (const source of entry.sources) {
      const decision = evaluateFreshnessSourceEligibility({
        registryEditionId: entry.editionId,
        targetEditionId: entry.editionId,
        source,
      });
      equal(decision.eligible, !excludedTypes.has(source.sourceType), `${entry.editionId}:${source.sourceId}`);
    }
  }

  const partner = registry.editions.flatMap(({ sources }) => sources)
    .find(({ sourceType }) => sourceType === "official_partner_announcement")!;
  const partnerDecision = evaluateFreshnessSourceEligibility({
    registryEditionId: "shenzhen-100-2026",
    targetEditionId: "shenzhen-100-2026",
    source: partner,
  });
  equal(partnerDecision.eligible, true);
  equal(partnerDecision.autoApplyEligible, false);

  const inactive = { ...registry.editions[0].sources[0], status: "unavailable" as const };
  equal(evaluateFreshnessSourceEligibility({
    registryEditionId: registry.editions[0].editionId,
    targetEditionId: registry.editions[0].editionId,
    source: inactive,
  }).eligible, false);
  equal(evaluateFreshnessSourceEligibility({
    registryEditionId: registry.editions[0].editionId,
    targetEditionId: "wrong-edition-2026",
    source: registry.editions[0].sources[0],
  }).eligible, false);
});

test("startTimes normalization preserves official order and rejects duplicates or invalid values", () => {
  const values = ["2027-01-23T06:00:00+08:00", "2027-01-23T06:30:00+08:00"];
  const normalized = normalizeOfficialFactCandidate(categoryCandidate({ field: "startTimes", candidateValue: values }));
  deepEqual(normalized?.candidateValue, values);
  deepEqual(validateStartTimes(values), []);
  ok(validateStartTimes([values[0], values[0]]).some((message) => /unique/.test(message)));
  ok(validateStartTimes(["2027-01-23T06:00:00"]).some((message) => /timezone-aware/.test(message)));
  ok(validateStartTimes([]).some((message) => /non-empty/.test(message)));
});

test("startTimes diff is ordered and remains high-impact", () => {
  const first = categoryCandidate({
    field: "startTimes",
    candidateValue: ["2027-01-23T06:00:00+08:00", "2027-01-23T06:30:00+08:00"],
  });
  const second = categoryCandidate({
    field: "startTimes",
    candidateValue: ["2027-01-23T06:30:00+08:00", "2027-01-23T06:00:00+08:00"],
  });
  const snapshot = structuredClone(canonical);
  snapshot.records.find(({ edition }) => edition.editionId === "hk100-2027")!
    .categories.find(({ categoryId }) => categoryId === first.categoryId)!.startTimes = first.candidateValue as string[];
  const [diff] = diffRaceFactCandidates({ snapshot, candidates: [second] });
  equal(diff.status, "CHANGED");
  deepEqual(diff.oldValue, first.candidateValue);
  deepEqual(diff.newValue, second.candidateValue);
  deepEqual(classifyRaceFieldDiff(diff, { autoApplyEligible: true, confidence: 1 }), {
    risk: "high_impact",
    action: "pending_review",
    reason: "High-impact race fact cannot be auto-applied in V1.",
  });
});

test("elevationLoss accepts finite non-negative values and is independent from elevationGain", () => {
  deepEqual(validateFieldValue("Category", "elevationLoss", 0), []);
  deepEqual(validateFieldValue("Category", "elevationLoss", 4200), []);
  ok(validateFieldValue("Category", "elevationLoss", -1).length > 0);
  ok(validateFieldValue("Category", "elevationLoss", Number.NaN).length > 0);
  ok(validateFieldValue("Category", "elevationLoss", Number.POSITIVE_INFINITY).length > 0);

  const normalized = normalizeOfficialFactCandidate(categoryCandidate({ candidateValue: 4200 }));
  equal(normalized?.candidateValue, 4200);
  equal(Object.hasOwn(normalized ?? {}, "elevationGain"), false);
  const result = evaluateRaceUpdateCore({
    snapshot: canonical,
    registry,
    candidates: [normalized!],
    detectedAt: "2026-09-28T10:05:00+08:00",
  });
  equal(result.changes[0].risk, "high_impact");
  equal(result.changes[0].action, "pending_review");
});

test("deterministic validation enforces evidence, source, identity, dates and unknown Category", () => {
  deepEqual(validateOfficialFactCandidate(canonical, registry, candidate()), []);
  ok(validateOfficialFactCandidate(canonical, registry, candidate({ evidenceText: "" })).some(({ field }) => field === "evidenceText"));
  ok(validateOfficialFactCandidate(canonical, registry, candidate({ confidence: 2 })).some(({ field }) => field === "confidence"));
  ok(validateOfficialFactCandidate(canonical, registry, candidate({ sourceUrl: "https://example.com" })).some(({ field }) => field === "sourceUrl"));
  ok(validateOfficialFactCandidate(canonical, registry, categoryCandidate({ categoryId: "hk100-2027-unknown" })).some(({ field }) => field === "categoryId"));
  ok(validateOfficialFactCandidate(canonical, registry, categoryCandidate({ field: "startAt", candidateValue: "2027-01-23T06:00:00" })).some(({ field }) => field === "startAt"));
});

test("multiple eligible sources disagreeing produces CONFLICT rather than last-write-wins", () => {
  const secondSource = registry.editions.find(({ editionId }) => editionId === "beijing-marathon-2026")!
    .sources.find(({ sourceId }) => sourceId === "beijing-marathon-official-registration-portal-2026")!;
  const result = evaluateRaceUpdateCore({
    snapshot: canonical,
    registry,
    candidates: [
      candidate({ candidateValue: "registration_closed" }),
      candidate({
        candidateValue: "registration_open",
        sourceId: secondSource.sourceId,
        sourceUrl: secondSource.url,
      }),
    ],
    detectedAt: "2026-09-28T10:10:00+08:00",
  });
  equal(result.diffs[0].status, "CONFLICT");
  equal(result.diffs[0].newValue, null);
  equal(result.diffs[0].conflict, true);
  deepEqual(result.diffs[0].candidateOptions.map(({ value }) => value), ["registration_closed", "registration_open"]);
  equal(result.changes[0].risk, "low");
  equal(result.changes[0].action, "needs_review");
  equal(result.changes[0].reason, "source_value_conflict");
  equal(result.changes[0].applyBlocked, true);
  equal(result.changes[0].evidence.length, 2);
});

test("new Category identity and deletion intent are structural, never auto-applied", () => {
  const result = evaluateRaceUpdateCore({
    snapshot: canonical,
    registry,
    candidates: [categoryCandidate({ categoryId: "hk100-2027-new-identity" })],
    detectedAt: "2026-09-28T10:10:30+08:00",
  });
  equal(result.validationErrors.some(({ field }) => field === "categoryId"), true);
  equal(result.diffs[0].status, "MISSING");
  equal(result.changes[0].risk, "structural");
  equal(result.changes[0].action, "needs_review");
  deepEqual(classifyStructuralChange("category_deletion"), {
    risk: "structural",
    action: "needs_review",
    reason: "Structural change (category_deletion) requires explicit review.",
  });
});

test("a missing candidate is NO_CANDIDATE and never becomes deletion", () => {
  const target: RaceFieldTarget = {
    eventId: "beijing-marathon",
    editionId: "beijing-marathon-2026",
    categoryId: null,
    entityType: "Edition",
    field: "registrationUrl",
  };
  const [diff] = diffRaceFactCandidates({ snapshot: canonical, candidates: [], expectedTargets: [target] });
  equal(diff.status, "NO_CANDIDATE");
  equal(diff.newValue, null);
  const result = evaluateRaceUpdateCore({
    snapshot: canonical,
    registry,
    candidates: [candidate({ field: "registrationUrl", candidateValue: null })],
    expectedTargets: [target],
    detectedAt: "2026-09-28T10:11:00+08:00",
  });
  equal(result.diffs[0].status, "NO_CANDIDATE");
  equal(result.changes.length, 0);
});

test("normal low-risk registration transition can apply while reverse transition remains pending", () => {
  const normalSnapshot = structuredClone(canonical);
  normalSnapshot.records.find(({ edition }) => edition.editionId === "beijing-marathon-2026")!.edition.registrationStatus = "unknown";
  const normal = evaluateRaceUpdateCore({
    snapshot: normalSnapshot,
    registry,
    candidates: [candidate({ candidateValue: "registration_open" })],
    detectedAt: "2026-09-28T10:12:00+08:00",
    applyLowRisk: true,
  });
  equal(normal.changes[0].risk, "low");
  equal(normal.changes[0].action, "auto_apply");
  equal(normal.appliedChangeIds.length, 1);
  equal(normal.snapshot.records.find(({ edition }) => edition.editionId === "beijing-marathon-2026")!.edition.registrationStatus, "registration_open");

  const reverseSnapshot = structuredClone(canonical);
  reverseSnapshot.records.find(({ edition }) => edition.editionId === "beijing-marathon-2026")!.edition.registrationStatus = "registration_closed";
  const reverse = evaluateRaceUpdateCore({
    snapshot: reverseSnapshot,
    registry,
    candidates: [candidate({ candidateValue: "registration_open" })],
    detectedAt: "2026-09-28T10:13:00+08:00",
  });
  equal(reverse.changes[0].action, "pending_review");
  match(reverse.changes[0].reason, /reverse/);
});

test("apply rejects stale oldValue and any high-impact direct application", () => {
  const evaluation = evaluateRaceUpdateCore({
    snapshot: canonical,
    registry,
    candidates: [candidate({ candidateValue: "registration_closed" })],
    detectedAt: "2026-09-28T10:14:00+08:00",
  });
  const low = evaluation.changes[0];
  const stale = structuredClone(canonical);
  stale.records.find(({ edition }) => edition.editionId === low.editionId)!.edition.registrationStatus = "registration_open";
  throws(() => applySafeChanges({ snapshot: stale, changes: [low], registry, appliedAt: "2026-09-28T10:15:00+08:00" }), /Stale oldValue/);

  const high = evaluateRaceUpdateCore({
    snapshot: canonical,
    registry,
    candidates: [categoryCandidate()],
    detectedAt: "2026-09-28T10:16:00+08:00",
  }).changes[0];
  throws(() => applySafeChanges({ snapshot: canonical, changes: [high], registry, appliedAt: "2026-09-28T10:17:00+08:00" }), /not eligible for this apply boundary/);
});

test("content hash state distinguishes observed content from successful extraction", () => {
  const document = documentSnapshot("b".repeat(64));
  const unconfigured = transitionIngestionState({ previous: null, document, outcome: "fact_extraction_provider_unconfigured" });
  equal(unconfigured.lastObservedContentHash, document.contentHash);
  equal(unconfigured.lastSuccessfulExtractionHash, null);
  equal(shouldExtractDocument(unconfigured, document.contentHash), true);

  const failed = transitionIngestionState({ previous: unconfigured, document, outcome: "extraction_error" });
  equal(failed.lastSuccessfulExtractionHash, null);
  equal(shouldExtractDocument(failed, document.contentHash), true);

  const successful = transitionIngestionState({ previous: failed, document, outcome: "success" });
  equal(successful.lastSuccessfulExtractionHash, document.contentHash);
  equal(shouldExtractDocument(successful, document.contentHash), false);
  const unchanged = transitionIngestionState({ previous: successful, document, outcome: "unchanged" });
  equal(unchanged.lastExtractionStatus, "unchanged");

  const changedDocument = documentSnapshot("c".repeat(64));
  const invalid = transitionIngestionState({ previous: successful, document: changedDocument, outcome: "validation_error" });
  equal(invalid.lastObservedContentHash, changedDocument.contentHash);
  equal(invalid.lastSuccessfulExtractionHash, document.contentHash);
  equal(shouldExtractDocument(invalid, changedDocument.contentHash), true);
  throws(() => transitionIngestionState({ previous: successful, document: changedDocument, outcome: "unchanged" }), /lastSuccessfulExtractionHash/);
});

test("formal Canonical remains byte-for-byte unchanged by fixture evaluation", () => {
  evaluateRaceUpdateCore({
    snapshot: canonical,
    registry,
    candidates: [candidate(), categoryCandidate()],
    detectedAt: "2026-09-28T10:18:00+08:00",
  });
  deepEqual(readFileSync(new URL("../data/canonical/race-graph-v1.json", import.meta.url)), canonicalBytes);
});

function documentSnapshot(contentHash: string): OfficialDocumentSnapshot {
  return {
    sourceId: BEIJING_SOURCE_ID,
    editionId: "beijing-marathon-2026",
    url: BEIJING_SOURCE_URL,
    title: "Fixture",
    contentType: "text/html",
    httpStatus: 200,
    charset: "utf-8",
    responseBytes: 7,
    fetchedAt: "2026-09-28T10:00:00+08:00",
    text: "fixture",
    links: [],
    contentHash,
    extractionMethod: "html_text",
  };
}
