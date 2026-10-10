import { deepEqual, equal, match, ok } from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { evaluateVerificationAlerts } from "../scripts/race-update/verificationAlerts.ts";
import { buildVerificationSummary, buildSanitizedRaceUpdateReport, assertSanitizedText } from "../scripts/race-update/productionWorkflow.ts";
import { buildRaceDailyCheckReport } from "../scripts/race-update/dailyCheck.ts";
import { loadRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import type {
  RealExtractionCandidateReview,
  RealExtractionReport,
  RealExtractionSourceReport,
} from "../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshot } from "../types/raceUpdate.ts";

const original = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as RaceGraphSnapshot;
const registry = await loadRaceSourceRegistry();
const NOW = "2026-10-10T08:00:00.000Z";

test("historical Beijing and Guangzhou lottery states trigger review without changing Canonical", () => {
  const snapshot = structuredClone(original);
  const beijing = snapshot.records.find(({ edition }) => edition.editionId === "beijing-marathon-2026")!;
  const guangzhou = snapshot.records.find(({ edition }) => edition.editionId === "guangzhou-marathon-2026")!;
  beijing.edition.registrationStatus = "lottery";
  guangzhou.edition.registrationStatus = "lottery";
  equal(beijing.edition.registrationStatus, "lottery");
  equal(guangzhou.edition.registrationStatus, "lottery");
  const before = JSON.stringify(snapshot);
  const result = evaluateVerificationAlerts({
    snapshot, registry,
    extraction: extraction([
      source("beijing-marathon-2026", "beijing-marathon-official-registration-guidelines-2026", "primary_official", "unchanged"),
      source("guangzhou-marathon-2026", "guangzhou-sports-bureau-2026-announcement", "primary_official", "unchanged"),
    ]),
  });
  for (const editionId of ["beijing-marathon-2026", "guangzhou-marathon-2026"]) {
    const alert = result.verificationAlerts.find((item) => item.editionId === editionId
      && item.reasonCode === "REGISTRATION_LIFECYCLE_REVIEW");
    ok(alert);
    equal(alert.severity, "HIGH");
    deepEqual(alert.affectedFields, ["registrationStatus"]);
    match(alert.missingEvidence, /official statement/);
  }
  equal(JSON.stringify(snapshot), before);
});

test("HK100 ten failed official pages and successful auxiliary page produce one aggregated HIGH official alert", () => {
  const snapshot = structuredClone(original);
  const hk100 = snapshot.records.find(({ edition }) => edition.editionId === "hk100-2027")!;
  hk100.edition.registrationStatus = "unknown";
  equal(hk100.edition.registrationStatus, "unknown");
  const official = registry.editions.find(({ editionId }) => editionId === "hk100-2027")!.sources
    .filter(({ tier }) => tier === "primary_official");
  equal(official.length, 10);
  const sources = [
    ...official.map(({ sourceId }) => source("hk100-2027", sourceId, "primary_official", "fetch_error")),
    source("hk100-2027", "hk100-finishers-2027", "trusted_structured", "unchanged"),
  ];
  const result = evaluateVerificationAlerts({ snapshot, registry, extraction: extraction(sources) });
  const officialAlert = result.verificationAlerts.filter((item) => item.editionId === "hk100-2027"
    && item.reasonCode === "OFFICIAL_SOURCE_UNAVAILABLE");
  equal(officialAlert.length, 1);
  equal(officialAlert[0].severity, "HIGH");
  equal(officialAlert[0].sourceIds.length, 10);
  match(officialAlert[0].triggerReason, /0\/10/);
  const status = result.criticalFactVerification.find((item) => item.editionId === "hk100-2027"
    && item.field === "registrationStatus")!;
  equal(status.officialSourcesEffectivelyProcessed, 0);
  equal(status.status, "UNKNOWN");
  deepEqual(status.directOfficialEvidenceSourceIds, []);
});

test("official identity uncertainty creates a review signal without accepting the page's facts", () => {
  const result = evaluateVerificationAlerts({
    snapshot: original, registry,
    extraction: extraction([
      source("xiamen-marathon-2027", "xiamen-marathon-official-home", "primary_official", "identity_uncertain"),
      source("xiamen-marathon-2027", "xiamen-marathon-aims-2027", "trusted_structured", "unchanged"),
    ]),
  });
  ok(result.verificationAlerts.some((item) => item.editionId === "xiamen-marathon-2027"
    && item.reasonCode === "EDITION_IDENTITY_UNCERTAIN" && item.severity === "REVIEW"));
  equal(result.criticalFactVerification.find((item) => item.editionId === "xiamen-marathon-2027"
    && item.field === "raceDate")!.status, "NOT_VERIFIED_THIS_RUN");
});

test("missing official registration is distinct from official processing failure", () => {
  const noOfficialRegistry = structuredClone(registry);
  const xiamen = noOfficialRegistry.editions.find(({ editionId }) => editionId === "xiamen-marathon-2027")!;
  xiamen.sources = xiamen.sources.filter(({ tier }) => tier !== "primary_official");
  const result = evaluateVerificationAlerts({ snapshot: original, registry: noOfficialRegistry, extraction: extraction([]) });
  ok(result.verificationAlerts.some((item) => item.editionId === "xiamen-marathon-2027"
    && item.reasonCode === "OFFICIAL_SOURCE_NOT_REGISTERED" && item.severity === "HIGH"));
  equal(result.verificationAlerts.some((item) => item.editionId === "xiamen-marathon-2027"
    && item.reasonCode === "OFFICIAL_SOURCE_UNAVAILABLE"), false);
});

test("trusted-source no-change candidate cannot verify an official critical fact", () => {
  const snapshot = structuredClone(original);
  snapshot.records.find(({ edition }) => edition.editionId === "beijing-marathon-2026")!.edition.registrationStatus = "lottery";
  const trusted = source("beijing-marathon-2026", "beijing-marathon-aims-2026", "trusted_structured", "success");
  trusted.candidates = [noChangeRegistration("beijing-marathon-2026", trusted.sourceId, "lottery")];
  const result = evaluateVerificationAlerts({ snapshot, registry, extraction: extraction([trusted]) });
  equal(result.criticalFactVerification.find((item) => item.editionId === "beijing-marathon-2026"
    && item.field === "registrationStatus")!.status, "NOT_VERIFIED_THIS_RUN");
  ok(result.verificationAlerts.some((item) => item.editionId === "beijing-marathon-2026"
    && item.reasonCode === "REGISTRATION_LIFECYCLE_REVIEW"));
});

test("direct current official no-change evidence after the deadline suppresses only the lifecycle alert", () => {
  const snapshot = structuredClone(original);
  snapshot.records.find(({ edition }) => edition.editionId === "beijing-marathon-2026")!.edition.registrationStatus = "lottery";
  const confirmed = source("beijing-marathon-2026", "beijing-marathon-official-registration-guidelines-2026",
    "primary_official", "success");
  confirmed.candidates = [noChangeRegistration("beijing-marathon-2026", confirmed.sourceId, "lottery")];
  const result = evaluateVerificationAlerts({ snapshot, registry, extraction: extraction([confirmed]) });
  equal(result.verificationAlerts.some((item) => item.editionId === "beijing-marathon-2026"
    && item.reasonCode === "REGISTRATION_LIFECYCLE_REVIEW"), false);
  const status = result.criticalFactVerification.find((item) => item.editionId === "beijing-marathon-2026"
    && item.field === "registrationStatus")!;
  equal(status.status, "VERIFIED_THIS_RUN");
  deepEqual(status.directOfficialEvidenceSourceIds, [confirmed.sourceId]);
  equal(result.criticalFactVerification.find((item) => item.editionId === "beijing-marathon-2026"
    && item.field === "raceDate")!.status, "NOT_VERIFIED_THIS_RUN");
});

test("no-change verification rejects missing evidence, wrong identity, wrong scope and mismatched values", () => {
  const base = source("beijing-marathon-2026", "beijing-marathon-official-registration-guidelines-2026",
    "primary_official", "success");
  base.candidates = [noChangeRegistration("beijing-marathon-2026", base.sourceId, "registration_closed")];
  const mutations: Array<[string, (sourceReport: RealExtractionSourceReport) => void]> = [
    ["empty evidence", (report) => { report.candidates[0].evidenceText = ""; }],
    ["empty locator", (report) => { report.candidates[0].evidenceLocator = ""; }],
    ["wrong Event", (report) => { report.candidates[0].eventId = "other-event"; }],
    ["wrong Edition", (report) => { report.candidates[0].editionId = "other-edition"; }],
    ["wrong Category scope", (report) => { report.candidates[0].categoryId = "other-category"; }],
    ["wrong field", (report) => { report.candidates[0].field = "registrationOpenDate"; }],
    ["wrong source URL", (report) => { report.candidates[0].sourceUrl = "https://example.test/wrong"; }],
    ["downgraded source tier", (report) => { report.sourceTier = "trusted_structured"; }],
    ["wrong candidate value", (report) => { report.candidates[0].candidateValue = "lottery"; }],
    ["wrong current value", (report) => { report.candidates[0].currentValue = "lottery"; }],
    ["not an unchanged diff", (report) => { report.candidates[0].diff = "CHANGED"; }],
    ["uncertain source identity", (report) => { report.identity!.status = "uncertain"; }],
  ];
  for (const [label, mutate] of mutations) {
    const report = structuredClone(base);
    mutate(report);
    const result = evaluateVerificationAlerts({ snapshot: original, registry, extraction: extraction([report]) });
    equal(result.criticalFactVerification.find((item) => item.editionId === "beijing-marathon-2026"
      && item.field === "registrationStatus")!.status, "NOT_VERIFIED_THIS_RUN", label);
  }
});

test("Hash unchanged and fetch success without field evidence never verify a field", () => {
  for (const extractionStatus of ["unchanged", "success"] as const) {
    const official = source("beijing-marathon-2026", "beijing-marathon-official-registration-guidelines-2026",
      "primary_official", extractionStatus);
    const result = evaluateVerificationAlerts({ snapshot: original, registry, extraction: extraction([official]) });
    equal(result.criticalFactVerification.find((item) => item.editionId === "beijing-marathon-2026"
      && item.field === "registrationStatus")!.status, "NOT_VERIFIED_THIS_RUN");
  }
});

test("closed status without a new lifecycle risk has no repeated lifecycle alert or HIGH; lottery before its boundary is not closed", () => {
  const official = source("beijing-marathon-2026", "beijing-marathon-official-registration-guidelines-2026",
    "primary_official", "unchanged");
  const closed = evaluateVerificationAlerts({ snapshot: original, registry, extraction: extraction([official]) });
  equal(closed.verificationAlerts.some((item) => item.editionId === "beijing-marathon-2026"
    && item.reasonCode === "REGISTRATION_LIFECYCLE_REVIEW"), false);
  equal(closed.verificationAlerts.some((item) => item.editionId === "beijing-marathon-2026"
    && item.severity === "HIGH"), false);

  const snapshot = structuredClone(original);
  const edition = snapshot.records.find(({ edition }) => edition.editionId === "beijing-marathon-2026")!.edition;
  edition.registrationStatus = "lottery";
  edition.registrationCloseDate = "2026-10-20";
  edition.lotteryResultDate = null;
  edition.raceDate = "2026-11-18";
  const before = JSON.stringify(snapshot);
  const beforeBoundary = evaluateVerificationAlerts({ snapshot, registry, extraction: extraction([official]) });
  equal(beforeBoundary.verificationAlerts.some((item) => item.editionId === edition.editionId
    && item.reasonCode === "REGISTRATION_LIFECYCLE_REVIEW"), false);
  equal(edition.registrationStatus, "lottery");
  equal(JSON.stringify(snapshot), before);
});

test("date-only boundaries wait until the whole local day ends; historical editions do not alert forever", () => {
  const snapshot = structuredClone(original);
  const xiamen = snapshot.records.find(({ edition }) => edition.editionId === "xiamen-marathon-2027")!;
  xiamen.edition.registrationCloseDate = "2026-10-10";
  const today = evaluateVerificationAlerts({ snapshot, registry, extraction: extraction([], NOW) });
  equal(today.verificationAlerts.some((item) => item.editionId === xiamen.edition.editionId
    && item.reasonCode === "REGISTRATION_LIFECYCLE_REVIEW"), false);
  const tomorrow = evaluateVerificationAlerts({ snapshot, registry, extraction: extraction([], "2026-10-11T08:00:00.000Z") });
  ok(tomorrow.verificationAlerts.some((item) => item.editionId === xiamen.edition.editionId
    && item.reasonCode === "REGISTRATION_LIFECYCLE_REVIEW"));
  xiamen.edition.endDate = "2026-09-01";
  const historical = evaluateVerificationAlerts({ snapshot, registry, extraction: extraction([], NOW) });
  equal(historical.verificationAlerts.some((item) => item.editionId === xiamen.edition.editionId), false);
});

test("missing timezone does not turn a date-only deadline into a guessed instant", () => {
  const snapshot = structuredClone(original);
  const edition = snapshot.records.find(({ edition }) => edition.editionId === "xiamen-marathon-2027")!.edition;
  edition.timezone = null;
  edition.registrationCloseDate = "2026-10-09";
  const result = evaluateVerificationAlerts({ snapshot, registry, extraction: extraction([], NOW) });
  equal(result.verificationAlerts.some((item) => item.editionId === edition.editionId
    && item.reasonCode === "REGISTRATION_LIFECYCLE_REVIEW"), false);
});

test("imminent race with no recorded lifecycle boundary still asks for registration review", () => {
  const snapshot = structuredClone(original);
  const edition = snapshot.records.find(({ edition }) => edition.editionId === "xiamen-marathon-2027")!.edition;
  edition.raceDate = "2026-10-20";
  edition.registrationCloseDate = null;
  edition.lotteryResultDate = null;
  const result = evaluateVerificationAlerts({ snapshot, registry, extraction: extraction([], NOW) });
  ok(result.verificationAlerts.some((item) => item.editionId === edition.editionId
    && item.reasonCode === "REGISTRATION_LIFECYCLE_REVIEW"));
});

test("same run input is deterministic, alert IDs aggregate by Edition/type/scope and no Pending is created", () => {
  const reports = extraction([
    source("hk100-2027", "hk100-official-home", "primary_official", "fetch_error"),
    source("hk100-2027", "hk100-official-home", "primary_official", "fetch_error"),
  ]);
  const input = { snapshot: original, registry, extraction: reports };
  const first = evaluateVerificationAlerts(input);
  const second = evaluateVerificationAlerts(input);
  deepEqual(first, second);
  equal(new Set(first.verificationAlerts.map(({ alertId }) => alertId)).size, first.verificationAlerts.length);
  equal(reports.sources.every(({ candidates }) => candidates.length === 0), true);
  const nextRun = structuredClone(reports);
  nextRun.runId = "fixture-run-next";
  const repeated = evaluateVerificationAlerts({ snapshot: original, registry, extraction: nextRun });
  deepEqual(repeated.verificationAlerts, first.verificationAlerts);
});

test("daily report, sanitized artifact and Actions summary agree on counts and remain secret-free", () => {
  const sources = [
    source("hk100-2027", "hk100-official-home", "primary_official", "fetch_error"),
    source("hk100-2027", "hk100-finishers-2027", "trusted_structured", "unchanged"),
  ];
  const real = extraction(sources);
  const report = buildRaceDailyCheckReport({
    snapshot: original,
    registry,
    prepared: {
      report: real,
      nextState: { schemaVersion: "official-source-ingestion-state-v1", sources: [] },
      pendingStore: { schemaVersion: "race-update-pending-v1", changes: [] },
      pendingRequirements: [],
      createdPendingChangeIds: [],
      changes: [],
    } as Parameters<typeof buildRaceDailyCheckReport>[0]["prepared"],
  });
  const sanitized = buildSanitizedRaceUpdateReport({
    report, autoApplyLowRisk: false, appliedChanges: [],
    meaningfulDiff: { meaningful: false, volatileOnly: false, reasons: [] },
  });
  const summary = buildVerificationSummary(sanitized);
  equal(sanitized.verification.alertCount, report.verificationAlerts.length);
  equal(sanitized.verification.highCount + sanitized.verification.reviewCount, sanitized.verification.alertCount);
  match(summary, new RegExp(`Verification Alerts: ${sanitized.verification.alertCount}`));
  match(summary, /hk100-2027/);
  match(summary, /Human review:/);
  assertSanitizedText({ text: JSON.stringify(sanitized), environment: { FACT_EXTRACTION_API_KEY: "test-secret-123" } });
  assertSanitizedText({ text: summary, environment: { FACT_EXTRACTION_API_KEY: "test-secret-123" } });
});

function extraction(sources: RealExtractionSourceReport[], finishedAt = NOW): RealExtractionReport {
  return {
    schemaVersion: "race-real-extraction-v1", runId: "fixture-run", startedAt: finishedAt, finishedAt,
    dryRun: true, processingVersion: "test", editions: original.records.map(({ edition }) => edition.editionId),
    sources,
    summary: {
      sourcesChecked: sources.length, sourcesSucceeded: sources.filter(({ extractionStatus }) => ["success", "unchanged"].includes(extractionStatus)).length,
      sourcesFailed: sources.filter(({ extractionStatus }) => !["success", "unchanged"].includes(extractionStatus)).length,
      modelCalls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, candidateCount: 0,
      validationAcceptedCount: 0, validationRejectedCount: 0, pendingCount: 0, canonicalWrites: 0,
    },
  };
}

function source(
  editionId: string, sourceId: string, sourceTier: string,
  extractionStatus: "success" | "unchanged" | "fetch_error" | "identity_uncertain",
): RealExtractionSourceReport {
  const fetched = extractionStatus !== "fetch_error";
  return {
    editionId, sourceId, sourceUrl: `https://example.test/${sourceId}`, sourceTier,
    fetchStatus: fetched ? "success" : "fetch_error",
    identity: extractionStatus === "identity_uncertain" ? {
      status: "uncertain", eventIdentityMatched: true, editionYearMatched: false, domainMatched: true, evidence: [],
    } : fetched ? {
      status: "matched", eventIdentityMatched: true, editionYearMatched: true, domainMatched: true, evidence: [],
    } : null,
    extractionStatus,
    provider: "fixture", model: "fixture", protocol: "openai-compatible-chat-completions",
    reasoningMode: "none", structuredOutputMode: "strict_json_schema", promptVersion: "fixture",
    processingVersion: "fixture", requestStatus: extractionStatus === "success" ? "success" : "skipped",
    providerErrorCode: null,
    failureStage: extractionStatus === "fetch_error" ? "fetch" : extractionStatus === "identity_uncertain" ? "identity" : null,
    failureReason: extractionStatus === "fetch_error" ? "fetch failed" : extractionStatus === "identity_uncertain" ? "year uncertain" : null,
    retryable: false, contentHash: fetched ? "a".repeat(64) : null, fetchedAt: NOW, latencyMs: null,
    usage: { inputTokens: null, outputTokens: null, totalTokens: null }, rawCandidateCount: 0,
    validationAcceptedCount: 0, validationRejectedCount: 0, candidates: [], rejectedCandidates: [], canonicalWritten: false,
  };
}

function noChangeRegistration(editionId: string, sourceId: string, value: string): RealExtractionCandidateReview {
  return {
    eventId: "beijing-marathon", editionId, categoryId: null, entityType: "Edition",
    field: "registrationStatus", candidateValue: value, sourceId, sourceUrl: `https://example.test/${sourceId}`,
    sourceTier: "primary_official", authority: "authoritative",
    evidenceText: value === "lottery" ? "The lottery is ongoing." : "Registration is closed.",
    evidenceLocator: "text", confidence: 1, currentValue: value, diff: "UNCHANGED", risk: null,
    action: "no_change", changeId: null, pendingStatus: null, reason: "Candidate matches Canonical.",
    provider: "fixture", model: "fixture", promptVersion: "fixture",
  };
}
