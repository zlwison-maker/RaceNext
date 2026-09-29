import { deepEqual, equal, match, ok, rejects, throws } from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { runNoKeyDryRunPass } from "../scripts/race-update/noKeyDryRun.ts";
import {
  applyApprovedPendingChange,
  approvePendingChange,
  listPendingChanges,
  rejectPendingChange,
  runPendingCommand,
} from "../scripts/race-update/pendingStore.ts";
import { evaluateFreshnessSourceEligibility, loadRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import type { OfficialSourceIngestionState } from "../types/officialSourceIngestion.ts";
import type { PendingChange, PendingChangeStore, RaceGraphSnapshot } from "../types/raceUpdate.ts";

const snapshot = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as RaceGraphSnapshot;
const registry = await loadRaceSourceRegistry();
const emptyState = (): OfficialSourceIngestionState => ({ schemaVersion: "official-source-ingestion-state-v1", sources: [] });
const temporaryDirectory = await mkdtemp(join(tmpdir(), "racenext-phase2-"));

after(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

test("no-key dry run checks only Beijing and Xiamen and never emits facts or writes Canonical", async () => {
  const first = await runNoKeyDryRunPass({
    snapshot,
    registry,
    state: emptyState(),
    pass: 1,
    now: clock(),
    fetcher: fixtureFetcher(),
  });
  equal(first.report.sources.length, 5);
  deepEqual(new Set(first.report.sources.map(({ editionId }) => editionId)), new Set([
    "beijing-marathon-2026",
    "xiamen-marathon-2027",
  ]));
  equal(first.report.summary.model_calls, 0);
  equal(first.report.summary.fact_candidates, 0);
  equal(first.report.summary.changes, 0);
  equal(first.report.summary.pending_facts, 0);
  equal(first.report.summary.canonical_writes, 0);
  ok(first.report.sources.every(({ providerStatus, candidateCount, changeCount, pendingCount, canonicalWritten }) => (
    providerStatus === "unconfigured"
    && candidateCount === 0
    && changeCount === 0
    && pendingCount === 0
    && canonicalWritten === false
  )));
  equal(first.report.sources.find(({ sourceId }) => sourceId === "xiamen-marathon-official-home")?.identity?.status, "uncertain");
  equal(first.report.sources.find(({ sourceId }) => sourceId === "xiamen-marathon-aims-2027")?.identity?.status, "matched");
});

test("second no-key pass stays extraction-required when only observed hash advanced", async () => {
  const first = await runNoKeyDryRunPass({ snapshot, registry, state: emptyState(), pass: 1, now: clock(), fetcher: fixtureFetcher() });
  const second = await runNoKeyDryRunPass({ snapshot, registry, state: first.state, pass: 2, now: clock(), fetcher: fixtureFetcher() });
  const matched = second.report.sources.filter(({ identity }) => identity?.status === "matched");
  ok(matched.length >= 2);
  ok(matched.every(({ observedComparison }) => observedComparison === "unchanged"));
  ok(matched.every(({ extractionRequired }) => extractionRequired));
  ok(matched.every(({ extractionStatus }) => extractionStatus === "fact_extraction_provider_unconfigured"));
  for (const entry of second.state.sources) {
    ok(entry.lastObservedContentHash);
    equal(entry.lastSuccessfulExtractionHash, null);
  }
});

test("one source-level fetch failure is reported without aborting the other sources", async () => {
  const result = await runNoKeyDryRunPass({
    snapshot,
    registry,
    state: emptyState(),
    pass: 1,
    now: clock(),
    fetcher: fixtureFetcher("beijing-registration.mararun.com"),
  });
  equal(result.report.sources.length, 5);
  equal(result.report.sources.find(({ sourceId }) => sourceId === "beijing-marathon-official-registration-portal-2026")?.fetchStatus, "fetch_error");
  ok(result.report.summary.sources_succeeded >= 2);
  ok(result.report.summary.sources_failed >= 1);
});

test("Tier 1 can auto-apply eligible low-risk facts while Tier 2 remains cross-check only", () => {
  const beijing = registry.editions.find(({ editionId }) => editionId === "beijing-marathon-2026")!;
  const official = beijing.sources.find(({ tier }) => tier === "primary_official")!;
  equal(evaluateFreshnessSourceEligibility({ registryEditionId: beijing.editionId, targetEditionId: beijing.editionId, source: official }).autoApplyEligible, true);
  const xiamen = registry.editions.find(({ editionId }) => editionId === "xiamen-marathon-2027")!;
  const trusted = xiamen.sources.find(({ tier }) => tier === "trusted_structured")!;
  const decision = evaluateFreshnessSourceEligibility({ registryEditionId: xiamen.editionId, targetEditionId: xiamen.editionId, source: trusted });
  equal(decision.eligible, true);
  equal(decision.autoApplyEligible, false);
});

test("Pending lifecycle keeps approve and apply separate and requires reject reason", () => {
  const store = pendingStore([pendingFixture()]);
  deepEqual(listPendingChanges(store).map(({ changeId }) => changeId), ["pending-registration"]);
  equal(listPendingChanges(store, "approved").length, 0);
  const approved = approvePendingChange({ store, changeId: "pending-registration", reviewedAt: "2026-09-28T12:00:00+08:00" });
  equal(approved.changes[0].status, "approved");
  equal(approved.changes[0].appliedAt, null);
  throws(() => approvePendingChange({ store: approved, changeId: "pending-registration", reviewedAt: "2026-09-28T12:01:00+08:00" }), /Invalid pending transition/);
  throws(() => rejectPendingChange({ store, changeId: "pending-registration", reviewedAt: "2026-09-28T12:00:00+08:00", reason: "" }), /non-empty/);
  const rejected = rejectPendingChange({ store, changeId: "pending-registration", reviewedAt: "2026-09-28T12:00:00+08:00", reason: "Evidence insufficient" });
  equal(rejected.changes[0].status, "rejected");
  equal(rejected.changes[0].reviewReason, "Evidence insufficient");
});

test("approved high-impact fixture can apply after all rechecks and becomes applied", () => {
  const high = pendingFixture({
    changeId: "pending-finish-location",
    eventId: "beijing-marathon",
    editionId: "beijing-marathon-2026",
    categoryId: "beijing-marathon-2026-marathon",
    entityType: "Category",
    field: "finishLocation",
    currentValue: snapshot.records.find(({ edition }) => edition.editionId === "beijing-marathon-2026")!.categories[0].finishLocation ?? null,
    candidateValue: "Fixture Finish",
    risk: "high_impact",
    status: "approved",
    reviewedAt: "2026-09-28T12:00:00+08:00",
  });
  const result = applyApprovedPendingChange({
    store: pendingStore([high]),
    snapshot,
    registry,
    changeId: high.changeId,
    appliedAt: "2026-09-28T12:05:00+08:00",
  });
  equal(result.change.status, "applied");
  equal(result.change.appliedAt, "2026-09-28T12:05:00+08:00");
  equal(result.snapshot.records.find(({ edition }) => edition.editionId === high.editionId)!.categories[0].finishLocation, "Fixture Finish");
});

test("Pending apply rejects invalid status, stale value, inactive source, identity mismatch, schema failure and Structural", () => {
  const pending = pendingFixture();
  throws(() => applyApprovedPendingChange({ store: pendingStore([pending]), snapshot, registry, changeId: pending.changeId, appliedAt: "2026-09-28T12:10:00+08:00" }), /pending -> applied/);
  for (const status of ["rejected", "applied"] as const) {
    const invalid = pendingFixture({ status });
    throws(() => applyApprovedPendingChange({ store: pendingStore([invalid]), snapshot, registry, changeId: invalid.changeId, appliedAt: "2026-09-28T12:10:00+08:00" }), new RegExp(`${status} -> applied`));
  }

  const approved = pendingFixture({ status: "approved", reviewedAt: "2026-09-28T12:00:00+08:00" });
  throws(() => applyApprovedPendingChange({
    store: pendingStore([{ ...approved, currentValue: "registration_open" }]), snapshot, registry, changeId: approved.changeId, appliedAt: "2026-09-28T12:10:00+08:00",
  }), /Stale oldValue/);

  const inactiveRegistry = structuredClone(registry);
  inactiveRegistry.editions.find(({ editionId }) => editionId === approved.editionId)!.sources
    .find(({ sourceId }) => sourceId === approved.sourceId)!.status = "unavailable";
  throws(() => applyApprovedPendingChange({ store: pendingStore([approved]), snapshot, registry: inactiveRegistry, changeId: approved.changeId, appliedAt: "2026-09-28T12:10:00+08:00" }), /deterministic validation|apply eligible/);

  const mismatch = { ...approved, eventId: "wrong-event" };
  throws(() => applyApprovedPendingChange({ store: pendingStore([mismatch]), snapshot, registry, changeId: mismatch.changeId, appliedAt: "2026-09-28T12:10:00+08:00" }), /deterministic validation|identity/);

  const invalidSchema = { ...approved, candidateValue: "not-a-registration-status" };
  throws(() => applyApprovedPendingChange({ store: pendingStore([invalidSchema]), snapshot, registry, changeId: invalidSchema.changeId, appliedAt: "2026-09-28T12:10:00+08:00" }), /field validation/);

  const structural = { ...approved, risk: "structural" as const };
  throws(() => applyApprovedPendingChange({ store: pendingStore([structural]), snapshot, registry, changeId: structural.changeId, appliedAt: "2026-09-28T12:10:00+08:00" }), /STRUCTURAL_PENDING_BLOCKED/);
});

test("Pending command core persists list, approve, reject and approved apply against fixture files", async () => {
  const canonicalPath = join(temporaryDirectory, "canonical.json");
  const registryPath = join(temporaryDirectory, "registry.json");
  const pendingPath = join(temporaryDirectory, "pending.json");
  const first = pendingFixture({ changeId: "cli-approve" });
  const second = pendingFixture({ changeId: "cli-reject" });
  await writeFile(canonicalPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  await writeFile(pendingPath, `${JSON.stringify(pendingStore([first, second]), null, 2)}\n`);
  const paths = { pending: pendingPath, canonical: canonicalPath, registry: registryPath };

  equal((await runPendingCommand({ action: "list", paths })).length, 2);
  equal((await runPendingCommand({ action: "approve", changeId: first.changeId, now: "2026-09-28T12:00:00+08:00", paths }))[0].status, "approved");
  equal((await runPendingCommand({ action: "reject", changeId: second.changeId, reason: "fixture reject", now: "2026-09-28T12:01:00+08:00", paths }))[0].status, "rejected");
  equal((await runPendingCommand({ action: "apply", changeId: first.changeId, now: "2026-09-28T12:02:00+08:00", paths }))[0].status, "applied");
  const stored = JSON.parse(await readFile(pendingPath, "utf8")) as PendingChangeStore;
  deepEqual(stored.changes.map(({ status }) => status), ["applied", "rejected"]);
  await rejects(runPendingCommand({ action: "apply", changeId: second.changeId, paths }), /rejected -> applied/);
});

function pendingFixture(overrides: Partial<PendingChange> = {}): PendingChange {
  const evidence = {
    sourceId: "beijing-marathon-official-registration-guidelines-2026",
    sourceUrl: "https://en.beijing-marathon.com/registration-guidelines.html",
    evidenceText: "Fixture evidence",
    evidenceLocator: "Fixture section",
    confidence: 0.95,
    fetchedAt: "2026-09-28T10:00:00+08:00",
    contentHash: "a".repeat(64),
    extractionMethod: "fixture",
  };
  return {
    changeId: "pending-registration",
    eventId: "beijing-marathon",
    editionId: "beijing-marathon-2026",
    categoryId: null,
    entityType: "Edition",
    field: "registrationStatus",
    currentValue: "lottery",
    candidateValue: "registration_closed",
    sourceId: evidence.sourceId,
    sourceUrl: evidence.sourceUrl,
    evidenceText: evidence.evidenceText,
    evidenceLocator: evidence.evidenceLocator,
    confidence: evidence.confidence,
    fetchedAt: evidence.fetchedAt,
    contentHash: evidence.contentHash,
    extractionMethod: evidence.extractionMethod,
    evidence: [evidence],
    risk: "low",
    reason: "Fixture pending review",
    status: "pending",
    createdAt: "2026-09-28T11:00:00+08:00",
    reviewedAt: null,
    reviewReason: null,
    appliedAt: null,
    ...overrides,
  };
}

function pendingStore(changes: PendingChange[]): PendingChangeStore {
  return { schemaVersion: "race-update-pending-v1", changes };
}

function fixtureFetcher(failingDomain?: string): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (failingDomain && url.includes(failingDomain)) return new Response("Forbidden", { status: 403, headers: { "content-type": "text/plain" } });
    const xiamen = url.includes("xmim.org") || url.includes("aims-worldrunning.org") || url.includes("chinamarathon.com");
    const isHome = url.includes("xmim.org");
    const text = xiamen
      ? `<html><title>厦门马拉松</title><body>厦门马拉松 ${isHome ? "官方网站" : "2027 Xiamen Marathon"}</body></html>`
      : "<html><title>Beijing Marathon Registration</title><body>2026 Beijing Marathon 北京马拉松</body></html>";
    return new Response(text, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }) as typeof fetch;
}

function clock(): () => string {
  let tick = 0;
  return () => `2026-09-28T10:${String(tick++).padStart(2, "0")}:00+08:00`;
}
