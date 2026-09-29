import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type {
  OfficialSourceIngestionState,
  RaceDailyCheckArtifact,
} from "../../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshot } from "../../types/raceUpdate.ts";
import { runRaceDailyCheck } from "./dailyCheck.ts";
import {
  assertOfficialIngestionState,
  assertRaceDailyCheckArtifact,
  CANONICAL_PATH,
  DAILY_CHECK_ARTIFACT_PATH,
  OFFICIAL_INGESTION_STATE_PATH,
  PENDING_CHANGE_PATH,
  writeJsonAtomicValidated,
} from "./persistence.ts";
import { loadPendingChangeStore } from "./pendingStore.ts";
import { loadQwenProviderFromEnvironment } from "./qwenProvider.ts";
import { persistPreparedRealExtraction } from "./realExtractionDurability.ts";
import { loadRaceSourceRegistry, RACE_SOURCE_REGISTRY_PATH } from "./sourceRegistry.ts";
import { assertRaceGraphSnapshot } from "./validation.ts";

if (process.argv.length > 2) throw new Error("Phase 4A baseline does not accept CLI arguments.");

const canonicalBefore = await readFile(CANONICAL_PATH);
const registryBefore = await readFile(RACE_SOURCE_REGISTRY_PATH);
const snapshot = JSON.parse(canonicalBefore.toString("utf8")) as unknown;
assertRaceGraphSnapshot(snapshot);
const registry = await loadRaceSourceRegistry();
const state = await readState();
const pendingStore = await loadPendingChangeStore();
const provider = loadQwenProviderFromEnvironment();

const result = await runRaceDailyCheck({
  snapshot: snapshot as RaceGraphSnapshot,
  registry,
  state,
  pendingStore,
  provider,
});
const artifact: RaceDailyCheckArtifact = {
  schemaVersion: "race-daily-check-artifact-v1",
  generatedAt: new Date().toISOString(),
  report: result.report,
};

await persistPreparedRealExtraction({
  prepared: result.prepared,
  pendingPath: PENDING_CHANGE_PATH,
  statePath: OFFICIAL_INGESTION_STATE_PATH,
});
await writeJsonAtomicValidated({
  path: DAILY_CHECK_ARTIFACT_PATH,
  value: artifact,
  validate: assertRaceDailyCheckArtifact,
});

const canonicalAfter = await readFile(CANONICAL_PATH);
const registryAfter = await readFile(RACE_SOURCE_REGISTRY_PATH);
if (!canonicalBefore.equals(canonicalAfter)) throw new Error("Phase 4A modified formal Canonical.");
if (!registryBefore.equals(registryAfter)) throw new Error("Phase 4A modified formal Source Registry.");

console.log("Phase 4A 12-Race Daily Check (SAFE BASELINE)");
for (const edition of result.report.editions) {
  console.log([
    edition.editionId,
    `eligible=${edition.eligibleSources}`,
    `success=${edition.successfulSources}`,
    `failed=${edition.failedSources}`,
    `tier1=${edition.tier1Count}`,
    `tier2=${edition.tier2Count}`,
    `health=${edition.health}`,
  ].join(" "));
}
for (const failure of result.report.sourceFailures) {
  console.log(`failure ${failure.editionId}/${failure.sourceId} stage=${failure.stage} retryable=${failure.retryable} reason=${failure.reason}`);
}
for (const pending of result.report.newPending) {
  const source = registry.editions
    .find(({ editionId }) => editionId === pending.editionId)
    ?.sources.find(({ sourceId }) => sourceId === pending.sourceId);
  const candidate = pending.conflict
    ? `CONFLICT ${JSON.stringify(pending.candidateOptions?.map(({ value }) => value) ?? [])}`
    : JSON.stringify(pending.candidateValue);
  console.log(`pending ${pending.editionId}/${pending.categoryId ?? "edition"}/${pending.field} current=${JSON.stringify(pending.currentValue)} candidate=${candidate} source=${pending.sourceId} tier=${source?.tier ?? "unknown"} risk=${pending.risk}`);
}
for (const review of result.report.semanticReviews) {
  console.log(`semantic_review ${review.editionId}/${review.categoryId ?? "edition"}/${review.field} current=${JSON.stringify(review.currentValue)} candidate=${JSON.stringify(review.candidateValue)} reason=${review.reason}`);
}
console.log(JSON.stringify(result.report.summary));
console.log(`canonical_sha256=${sha256(canonicalAfter)}`);
console.log(`registry_sha256=${sha256(registryAfter)}`);
console.log(`artifact=${DAILY_CHECK_ARTIFACT_PATH}`);

async function readState(): Promise<OfficialSourceIngestionState> {
  try {
    const value = JSON.parse(await readFile(OFFICIAL_INGESTION_STATE_PATH, "utf8")) as unknown;
    assertOfficialIngestionState(value);
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schemaVersion: "official-source-ingestion-state-v1", sources: [] };
    }
    throw error;
  }
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
