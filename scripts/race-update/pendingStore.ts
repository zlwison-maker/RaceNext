import { readFile } from "node:fs/promises";

import { evaluatePrePublishFactGate } from "../../lib/prePublishFactGate.ts";
import type { PendingChange, PendingChangeStatus, PendingChangeStore, RaceFieldChange, RaceGraphSnapshot, RaceSourceRegistry } from "../../types/raceUpdate.ts";
import { applySafeChanges } from "./apply.ts";
import {
  assertPendingChangeStore,
  CANONICAL_PATH,
  PENDING_CHANGE_PATH,
  persistPendingChangeStoreAtomic,
  persistRaceGraphSnapshotAtomic,
} from "./persistence.ts";
import { loadRaceSourceRegistry, RACE_SOURCE_REGISTRY_PATH } from "./sourceRegistry.ts";
import { assertRaceGraphSnapshot } from "./validation.ts";

export function listPendingChanges(
  store: PendingChangeStore,
  status: PendingChangeStatus | "all" = "pending",
): PendingChange[] {
  return store.changes
    .filter((change) => status === "all" || change.status === status)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.changeId.localeCompare(right.changeId));
}

export function approvePendingChange(input: {
  store: PendingChangeStore;
  changeId: string;
  reviewedAt: string;
}): PendingChangeStore {
  return updatePending(input.store, input.changeId, (change) => {
    if (change.status !== "pending") throw invalidTransition(change, "approved");
    change.status = "approved";
    change.reviewedAt = input.reviewedAt;
    change.reviewReason = null;
  });
}

export function rejectPendingChange(input: {
  store: PendingChangeStore;
  changeId: string;
  reviewedAt: string;
  reason: string;
}): PendingChangeStore {
  if (!input.reason.trim()) throw new Error("Reject requires a non-empty review reason.");
  return updatePending(input.store, input.changeId, (change) => {
    if (change.status !== "pending") throw invalidTransition(change, "rejected");
    change.status = "rejected";
    change.reviewedAt = input.reviewedAt;
    change.reviewReason = input.reason.trim();
  });
}

export function applyApprovedPendingChange(input: {
  store: PendingChangeStore;
  snapshot: RaceGraphSnapshot;
  registry: RaceSourceRegistry;
  changeId: string;
  appliedAt: string;
}): { store: PendingChangeStore; snapshot: RaceGraphSnapshot; change: PendingChange } {
  const pending = input.store.changes.find(({ changeId }) => changeId === input.changeId);
  if (!pending) throw new Error(`Pending change not found: ${input.changeId}`);
  if (pending.status !== "approved") throw invalidTransition(pending, "applied");
  if (pending.risk === "structural") throw new Error(`STRUCTURAL_PENDING_BLOCKED:${pending.changeId}`);

  const change = pendingToFieldChange(pending);
  const applied = applySafeChanges({
    snapshot: input.snapshot,
    changes: [change],
    registry: input.registry,
    appliedAt: input.appliedAt,
    allowReviewed: true,
  });
  const updatedRecord = applied.snapshot.records.find(({ edition }) => edition.editionId === pending.editionId);
  const registryEntry = input.registry.editions.find(({ editionId }) => editionId === pending.editionId);
  if (!updatedRecord || !evaluatePrePublishFactGate(updatedRecord, registryEntry).publishable) {
    throw new Error(`PUBLIC_GATE_BLOCKED:${pending.changeId}`);
  }

  const store = updatePending(input.store, pending.changeId, (entry) => {
    entry.status = "applied";
    entry.appliedAt = input.appliedAt;
  });
  return { store, snapshot: applied.snapshot, change: store.changes.find(({ changeId }) => changeId === pending.changeId)! };
}

export async function runPendingCommand(input: {
  action: "list" | "approve" | "reject" | "apply";
  changeId?: string;
  status?: PendingChangeStatus | "all";
  reason?: string;
  now?: string;
  paths?: { pending: string; canonical: string; registry: string };
}): Promise<PendingChange[]> {
  const paths = input.paths ?? {
    pending: PENDING_CHANGE_PATH,
    canonical: CANONICAL_PATH,
    registry: RACE_SOURCE_REGISTRY_PATH,
  };
  const store = await loadPendingChangeStore(paths.pending);
  if (input.action === "list") return listPendingChanges(store, input.status ?? "pending");
  if (!input.changeId) throw new Error(`${input.action} requires --id=<changeId>.`);
  const now = input.now ?? new Date().toISOString();

  if (input.action === "approve") {
    const next = approvePendingChange({ store, changeId: input.changeId, reviewedAt: now });
    await persistPendingChangeStoreAtomic({ path: paths.pending, store: next, allowedPaths: [paths.pending] });
    return [next.changes.find(({ changeId }) => changeId === input.changeId)!];
  }
  if (input.action === "reject") {
    const next = rejectPendingChange({
      store,
      changeId: input.changeId,
      reviewedAt: now,
      reason: input.reason ?? "",
    });
    await persistPendingChangeStoreAtomic({ path: paths.pending, store: next, allowedPaths: [paths.pending] });
    return [next.changes.find(({ changeId }) => changeId === input.changeId)!];
  }

  const rawSnapshot = JSON.parse(await readFile(paths.canonical, "utf8")) as unknown;
  assertRaceGraphSnapshot(rawSnapshot);
  const registry = await loadRaceSourceRegistry(paths.registry);
  const applied = applyApprovedPendingChange({
    store,
    snapshot: rawSnapshot,
    registry,
    changeId: input.changeId,
    appliedAt: now,
  });
  await persistRaceGraphSnapshotAtomic({
    path: paths.canonical,
    snapshot: applied.snapshot,
    allowedPaths: [paths.canonical],
  });
  try {
    await persistPendingChangeStoreAtomic({
      path: paths.pending,
      store: applied.store,
      allowedPaths: [paths.pending],
    });
  } catch (error) {
    await persistRaceGraphSnapshotAtomic({
      path: paths.canonical,
      snapshot: rawSnapshot,
      allowedPaths: [paths.canonical],
    });
    throw error;
  }
  return [applied.change];
}

export async function loadPendingChangeStore(path = PENDING_CHANGE_PATH): Promise<PendingChangeStore> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as unknown;
    assertPendingChangeStore(value);
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schemaVersion: "race-update-pending-v1", changes: [] };
    }
    throw error;
  }
}

function pendingToFieldChange(pending: PendingChange): RaceFieldChange {
  return {
    changeId: pending.changeId,
    eventId: pending.eventId,
    editionId: pending.editionId,
    categoryId: pending.categoryId,
    entityType: pending.entityType,
    field: pending.field,
    oldValue: pending.currentValue,
    newValue: pending.candidateValue,
    sourceIds: pending.evidence.map(({ sourceId }) => sourceId),
    sourceUrls: pending.evidence.map(({ sourceUrl }) => sourceUrl),
    detectedAt: pending.createdAt,
    risk: pending.risk,
    action: "pending_review",
    reason: pending.reason,
    evidence: pending.evidence,
  };
}

function updatePending(
  store: PendingChangeStore,
  changeId: string,
  update: (change: PendingChange) => void,
): PendingChangeStore {
  const next = structuredClone(store);
  const change = next.changes.find((entry) => entry.changeId === changeId);
  if (!change) throw new Error(`Pending change not found: ${changeId}`);
  update(change);
  assertPendingChangeStore(next);
  return next;
}

function invalidTransition(change: PendingChange, target: PendingChangeStatus): Error {
  return new Error(`Invalid pending transition ${change.status} -> ${target}: ${change.changeId}`);
}
