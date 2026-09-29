import type { OfficialSourceIngestionState } from "../../types/officialSourceIngestion.ts";
import type { PendingChangeStore } from "../../types/raceUpdate.ts";
import {
  assertOfficialIngestionState,
  assertPendingChangeStore,
  OFFICIAL_INGESTION_STATE_PATH,
  PENDING_CHANGE_PATH,
  persistPendingChangeStoreAtomic,
  writeJsonAtomicValidated,
} from "./persistence.ts";
import { loadPendingChangeStore } from "./pendingStore.ts";
import type { PreparedRealExtractionRun } from "./realExtraction.ts";

type DurabilityOperations = {
  persistPending: (store: PendingChangeStore) => Promise<void>;
  reloadPending: () => Promise<PendingChangeStore>;
  persistState: (state: OfficialSourceIngestionState) => Promise<void>;
};

export async function persistPreparedRealExtraction(input: {
  prepared: PreparedRealExtractionRun;
  pendingPath?: string;
  statePath?: string;
  operations?: Partial<DurabilityOperations>;
}): Promise<{ pendingStore: PendingChangeStore; state: OfficialSourceIngestionState }> {
  const pendingPath = input.pendingPath ?? PENDING_CHANGE_PATH;
  const statePath = input.statePath ?? OFFICIAL_INGESTION_STATE_PATH;
  const operations: DurabilityOperations = {
    persistPending: input.operations?.persistPending ?? (async (store) => persistPendingChangeStoreAtomic({
      path: pendingPath,
      store,
      allowedPaths: [pendingPath],
    })),
    reloadPending: input.operations?.reloadPending ?? (async () => loadPendingChangeStore(pendingPath)),
    persistState: input.operations?.persistState ?? (async (state) => writeJsonAtomicValidated({
      path: statePath,
      value: state,
      validate: assertOfficialIngestionState,
      allowedPaths: [statePath],
    })),
  };

  const requiredChangeIds = [...new Set(input.prepared.pendingRequirements.flatMap(({ changeIds }) => changeIds))];
  let durablePending = input.prepared.pendingStore;
  if (requiredChangeIds.length > 0) {
    await operations.persistPending(input.prepared.pendingStore);
    durablePending = await operations.reloadPending();
    assertPendingChangeStore(durablePending);
    const durableIds = new Set(durablePending.changes.map(({ changeId }) => changeId));
    const missing = requiredChangeIds.filter((changeId) => !durableIds.has(changeId));
    if (missing.length > 0) {
      throw new Error(`Pending durability verification failed: ${missing.join(", ")}`);
    }
  }

  // Successful extraction hashes are committed only after every required Change is durable.
  await operations.persistState(input.prepared.nextState);
  return { pendingStore: durablePending, state: input.prepared.nextState };
}
