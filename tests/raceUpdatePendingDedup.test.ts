import { deepEqual, equal, ok } from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  findDurablePendingChange,
  mergeDurablePendingChanges,
  validateExtractedCandidates,
} from "../scripts/race-update/realExtraction.ts";
import type { OfficialDocumentSnapshot, OfficialFactCandidate } from "../types/officialSourceIngestion.ts";
import type { PendingChange, PendingChangeStore, RaceGraphSnapshot, RaceSourceRegistry } from "../types/raceUpdate.ts";

const historical = JSON.parse(await readFile(new URL("../data/pending/race-update-pending.json", import.meta.url), "utf8")) as PendingChangeStore;
const snapshot = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as RaceGraphSnapshot;
const registry = JSON.parse(await readFile(new URL("../data/sources/race-source-registry.json", import.meta.url), "utf8")) as RaceSourceRegistry;

function prior(changeId: string): PendingChange {
  const change = historical.changes.find((item) => item.changeId === changeId);
  ok(change, `Missing historical review fixture ${changeId}`);
  return structuredClone(change);
}

function drift(change: PendingChange, changeId: string, evidenceText = change.evidenceText): PendingChange {
  const contentHash = "f".repeat(64);
  const evidenceLocator = "text:999-1042; reformatted documentLinks[0]";
  return {
    ...structuredClone(change), changeId, contentHash, evidenceText, evidenceLocator,
    fetchedAt: "2026-10-10T05:45:00.000Z", status: "pending", reviewedAt: null,
    reviewReason: null, appliedAt: null,
    evidence: change.evidence.map((evidence) => ({
      ...evidence, contentHash, evidenceText, evidenceLocator, fetchedAt: "2026-10-10T05:45:00.000Z",
    })),
  };
}

function store(...changes: PendingChange[]): PendingChangeStore {
  return { schemaVersion: "race-update-pending-v1", changes };
}

test("Xiamen historical same-source startLocation survives content-hash drift without another Pending", () => {
  const existing = store(
    prior("chg-a028496658a542cd1bc9399a"),
    prior("chg-faa8b5cd4b2a7d5712313968"),
    prior("chg-d035c423bbaa8dc5e36bf68f"),
  );
  const incoming = drift(existing.changes[0], "chg-a3dba0230d05304eaa67fbf4");
  const merged = mergeDurablePendingChanges(existing, [incoming]);
  deepEqual(merged, existing);
  equal(findDurablePendingChange(merged, incoming)?.changeId, existing.changes[0].changeId);
});

test("Gongga rejected indirect registration URL remains rejected after refetch", () => {
  const rejected = prior("chg-257b4d54ebe122c9ada861ab");
  const incoming = drift(rejected, "chg-bfafde77e82452d6b69f517d");
  const merged = mergeDurablePendingChanges(store(rejected), [incoming]);
  deepEqual(merged, store(rejected));
  equal(findDurablePendingChange(merged, incoming)?.status, "rejected");
  equal(merged.changes[0].reviewReason, rejected.reviewReason);
});

test("Ninghai rejected pre-registration dates survive hash and locator drift", () => {
  for (const [oldId, newId] of [
    ["chg-5b7c30035de9d72ce82bb43e", "chg-f0d9c72c16432bb1a1b93f4f"],
    ["chg-d010f4671b77efcbebb24c6e", "chg-9f1459f54adad866ec58c62e"],
  ]) {
    const rejected = prior(oldId);
    const incoming = drift(rejected, newId, ` ${rejected.evidenceText} `);
    const merged = mergeDurablePendingChanges(store(rejected), [incoming]);
    deepEqual(merged, store(rejected));
    equal(findDurablePendingChange(merged, incoming)?.changeId, oldId);
  }
});

test("continuing a PR that already contains a duplicate does not create a third Gongga review", () => {
  const rejected = prior("chg-257b4d54ebe122c9ada861ab");
  const prDuplicate = drift(rejected, "chg-bfafde77e82452d6b69f517d");
  const inherited = store(rejected, prDuplicate);
  const nextRun = drift(rejected, "chg-next-run-different-hash");
  const merged = mergeDurablePendingChanges(inherited, [nextRun]);
  deepEqual(merged, inherited);
  equal(findDurablePendingChange(merged, nextRun)?.changeId, rejected.changeId);
});

test("approved and applied decisions remain protected across non-factual formatting drift", () => {
  for (const status of ["approved", "applied"] as const) {
    const reviewed = prior("chg-257b4d54ebe122c9ada861ab");
    reviewed.status = status;
    if (status === "applied") reviewed.appliedAt = "2026-10-10T00:00:00Z";
    const incoming = drift(reviewed, `chg-${status}-drift`, reviewed.evidenceText.replaceAll(" ", ""));
    deepEqual(mergeDurablePendingChanges(store(reviewed), [incoming]), store(reviewed));
  }
});

test("new official global registration evidence validates and can create a new review candidate", () => {
  const rejected = prior("chg-5b7c30035de9d72ce82bb43e");
  const text = "2026宁海越野挑战赛：2026年4月8日10:00起，所有组别及所有报名渠道统一开放正式报名。";
  const sourceId = "ninghai100-official-home-2026";
  const sourceUrl = "https://ninghai100.com/";
  const document: OfficialDocumentSnapshot = {
    sourceId, editionId: rejected.editionId, url: sourceUrl, title: "Fixture only",
    contentType: "text/html", httpStatus: 200, charset: "utf-8", responseBytes: text.length,
    fetchedAt: "2026-10-10T05:45:00.000Z", text, links: [], contentHash: "e".repeat(64), extractionMethod: "html_text",
  };
  const candidate: OfficialFactCandidate = {
    eventId: rejected.eventId, editionId: rejected.editionId, categoryId: null,
    entityType: "Edition", field: "registrationOpenDate", candidateValue: rejected.candidateValue,
    sourceId, sourceUrl, evidenceText: text, evidenceLocator: "fixture",
    confidence: 0.95, fetchedAt: document.fetchedAt, contentHash: document.contentHash,
    extractionMethod: "fixture-qwen",
  };
  const validation = validateExtractedCandidates({ document, candidates: [candidate], snapshot, registry });
  equal(validation.rejected.length, 0);
  equal(validation.accepted.length, 1);
  const incoming = drift(rejected, "chg-new-material-official-evidence", text);
  incoming.sourceId = sourceId;
  incoming.sourceUrl = sourceUrl;
  const validated = validation.accepted[0];
  incoming.evidence = [{
    sourceId: validated.sourceId, sourceUrl: validated.sourceUrl,
    evidenceText: validated.evidenceText, evidenceLocator: validated.evidenceLocator,
    confidence: validated.confidence, fetchedAt: validated.fetchedAt,
    contentHash: validated.contentHash, extractionMethod: validated.extractionMethod,
  }];
  const merged = mergeDurablePendingChanges(store(rejected), [incoming]);
  equal(merged.changes.length, 2);
  equal(merged.changes[0].status, "rejected");
  equal(merged.changes[1].status, "pending");
});

test("same field and value do not cross Edition, Category, Event or source review boundaries", () => {
  const xiamen = prior("chg-a028496658a542cd1bc9399a");
  for (const changed of [
    { editionId: "xiamen-marathon-2028" },
    { categoryId: "xiamen-marathon-2027-half" },
    { eventId: "another-marathon" },
  ]) {
    const incoming = { ...drift(xiamen, "chg-other-target"), ...changed };
    equal(mergeDurablePendingChanges(store(xiamen), [incoming]).changes.length, 2);
  }
  const rejected = prior("chg-257b4d54ebe122c9ada861ab");
  const otherSource = drift(rejected, "chg-other-source");
  otherSource.sourceId = "new-official-source";
  otherSource.evidence = otherSource.evidence.map((evidence) => ({ ...evidence, sourceId: otherSource.sourceId }));
  equal(mergeDurablePendingChanges(store(rejected), [otherSource]).changes.length, 2);
});

test("existing Pending safely accumulates distinct evidence without duplicate entries or status changes", () => {
  const pending = prior("chg-a028496658a542cd1bc9399a");
  pending.evidence = [pending.evidence[0]];
  const additional = drift(pending, "chg-additional-evidence", "在厦门国际会展中心开跑");
  const merged = mergeDurablePendingChanges(store(pending), [additional, additional]);
  equal(merged.changes.length, 1);
  equal(merged.changes[0].status, "pending");
  equal(merged.changes[0].evidence.length, 2);
  deepEqual(merged.changes[0].evidence[0], pending.evidence[0]);
});
