import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { OfficialSourceIngestionState, RealExtractionArtifact } from "../../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshot } from "../../types/raceUpdate.ts";
import {
  assertOfficialIngestionState,
  assertRealExtractionArtifact,
  CANONICAL_PATH,
  OFFICIAL_INGESTION_STATE_PATH,
  REAL_EXTRACTION_ARTIFACT_PATH,
  writeJsonAtomicValidated,
} from "./persistence.ts";
import { loadQwenProviderFromEnvironment } from "./qwenProvider.ts";
import { runRealExtractionDryRun } from "./realExtraction.ts";
import { loadRaceSourceRegistry, RACE_SOURCE_REGISTRY_PATH } from "./sourceRegistry.ts";
import { assertRaceGraphSnapshot } from "./validation.ts";

const canonicalBefore = await readFile(CANONICAL_PATH);
const registryBefore = await readFile(RACE_SOURCE_REGISTRY_PATH);
const snapshot = JSON.parse(canonicalBefore.toString("utf8")) as unknown;
assertRaceGraphSnapshot(snapshot);
const registry = await loadRaceSourceRegistry();
const state = await readState();
const provider = loadQwenProviderFromEnvironment();

const result = await runRealExtractionDryRun({
  snapshot: snapshot as RaceGraphSnapshot,
  registry,
  state,
  provider,
});
const artifact: RealExtractionArtifact = {
  schemaVersion: "race-real-extraction-artifact-v1",
  generatedAt: new Date().toISOString(),
  report: result.report,
};

await writeJsonAtomicValidated({
  path: OFFICIAL_INGESTION_STATE_PATH,
  value: result.state,
  validate: assertOfficialIngestionState,
});
await writeJsonAtomicValidated({
  path: REAL_EXTRACTION_ARTIFACT_PATH,
  value: artifact,
  validate: assertRealExtractionArtifact,
});

const canonicalAfter = await readFile(CANONICAL_PATH);
const registryAfter = await readFile(RACE_SOURCE_REGISTRY_PATH);
if (!canonicalBefore.equals(canonicalAfter)) throw new Error("Real extraction dry run modified formal Canonical.");
if (!registryBefore.equals(registryAfter)) throw new Error("Real extraction dry run modified formal Source Registry.");

console.log("Phase 3 Real Model Extraction (DRY RUN)");
for (const source of result.report.sources) {
  console.log(`${source.editionId}/${source.sourceId}: ${source.fetchStatus}/${source.identity?.status ?? "not_checked"}/${source.extractionStatus}`);
  console.log(`  provider=${source.provider} model=${source.model} reasoning=${source.reasoningMode} structured=${source.structuredOutputMode}`);
  console.log(`  usage=input:${source.usage.inputTokens ?? "unavailable"} output:${source.usage.outputTokens ?? "unavailable"} latency_ms:${source.latencyMs ?? "unavailable"}`);
  for (const candidate of source.candidates) {
    console.log(`  candidate=${candidate.entityType}.${candidate.field} value=${JSON.stringify(candidate.candidateValue)} diff=${candidate.diff} risk=${candidate.risk ?? "none"} action=${candidate.action}`);
    console.log(`    evidence=${candidate.evidenceText}`);
  }
  for (const rejected of source.rejectedCandidates) {
    console.log(`  rejected=${rejected.entityType}.${rejected.field} value=${JSON.stringify(rejected.candidateValue)} action=${rejected.action}`);
    console.log(`    evidence=${rejected.evidenceText}`);
    console.log(`    reason=${rejected.reason}`);
  }
  if (source.providerErrorCode) console.log(`  provider_error=${source.providerErrorCode}`);
}
console.log(JSON.stringify(result.report.summary));
console.log(`canonical_sha256=${sha256(canonicalAfter)}`);
console.log(`registry_sha256=${sha256(registryAfter)}`);
console.log(`artifact=${REAL_EXTRACTION_ARTIFACT_PATH}`);

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
