import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { NoKeyDryRunArtifact, OfficialSourceIngestionState } from "../../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshot } from "../../types/raceUpdate.ts";
import { runNoKeyDryRunPass } from "./noKeyDryRun.ts";
import {
  assertNoKeyDryRunArtifact,
  assertOfficialIngestionState,
  CANONICAL_PATH,
  NO_KEY_DRY_RUN_ARTIFACT_PATH,
  OFFICIAL_INGESTION_STATE_PATH,
  writeJsonAtomicValidated,
} from "./persistence.ts";
import { loadRaceSourceRegistry, RACE_SOURCE_REGISTRY_PATH } from "./sourceRegistry.ts";
import { assertRaceGraphSnapshot } from "./validation.ts";

const repeatArg = process.argv.slice(2).find((argument) => argument.startsWith("--repeat="));
const repeat = repeatArg ? Number(repeatArg.slice("--repeat=".length)) : 1;
if (!Number.isInteger(repeat) || repeat < 1 || repeat > 2) {
  throw new Error("--repeat must be 1 or 2.");
}

const canonicalBefore = await readFile(CANONICAL_PATH);
const registryBefore = await readFile(RACE_SOURCE_REGISTRY_PATH);
const snapshot = JSON.parse(canonicalBefore.toString("utf8")) as unknown;
assertRaceGraphSnapshot(snapshot);
const registry = await loadRaceSourceRegistry();
let state = await readState();
const reports = [];

for (let pass = 1; pass <= repeat; pass += 1) {
  const result = await runNoKeyDryRunPass({ snapshot, registry, state, pass });
  state = result.state;
  reports.push(result.report);
}

const artifact: NoKeyDryRunArtifact = {
  schemaVersion: "race-no-key-dry-run-artifact-v1",
  generatedAt: new Date().toISOString(),
  reports,
};
await writeJsonAtomicValidated({
  path: OFFICIAL_INGESTION_STATE_PATH,
  value: state,
  validate: assertOfficialIngestionState,
});
await writeJsonAtomicValidated({
  path: NO_KEY_DRY_RUN_ARTIFACT_PATH,
  value: artifact,
  validate: assertNoKeyDryRunArtifact,
});

const canonicalAfter = await readFile(CANONICAL_PATH);
const registryAfter = await readFile(RACE_SOURCE_REGISTRY_PATH);
if (!canonicalBefore.equals(canonicalAfter)) throw new Error("No-key dry run modified formal Canonical.");
if (!registryBefore.equals(registryAfter)) throw new Error("No-key dry run modified formal Source Registry.");

for (const report of reports) {
  console.log(`No-Key Dry Run pass ${report.pass}`);
  for (const source of report.sources) {
    console.log(`${source.editionId}/${source.sourceId}: ${source.fetchStatus}/${source.identity?.status ?? "not_checked"}/${source.extractionStatus}`);
    if (source.finalUrl) console.log(`  final=${source.finalUrl}`);
    if (source.contentHash) console.log(`  hash=${source.contentHash}`);
    if (source.errors.length > 0) console.log(`  errors=${source.errors.join(";")}`);
  }
  console.log(JSON.stringify(report.summary));
}
console.log(`canonical_sha256=${sha256(canonicalAfter)}`);
console.log(`registry_sha256=${sha256(registryAfter)}`);
console.log(`artifact=${NO_KEY_DRY_RUN_ARTIFACT_PATH}`);

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
