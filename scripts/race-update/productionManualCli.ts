import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";

import type { OfficialSourceIngestionState } from "../../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceGraphSnapshot } from "../../types/raceUpdate.ts";
import { applySafeChanges } from "./apply.ts";
import { runRaceDailyCheck } from "./dailyCheck.ts";
import {
  assertOfficialIngestionState,
  assertPendingChangeStore,
  CANONICAL_PATH,
  OFFICIAL_INGESTION_STATE_PATH,
  PENDING_CHANGE_PATH,
  persistRaceGraphSnapshotAtomic,
} from "./persistence.ts";
import { loadPendingChangeStore } from "./pendingStore.ts";
import type { ContinuityPlan } from "./productionPrContinuity.ts";
import {
  assertProductionSecrets,
  assertPhase4B1AutoApplyDisabled,
  assertSanitizedText,
  buildDataPrBody,
  buildSanitizedRaceUpdateReport,
  buildVerificationSummary,
  classifyMeaningfulDataChange,
  parseAutoApplyLowRisk,
  withRetryingFactExtractionProvider,
} from "./productionWorkflow.ts";
import { loadQwenProviderFromEnvironment } from "./qwenProvider.ts";
import { persistPreparedRealExtraction } from "./realExtractionDurability.ts";
import { loadRaceSourceRegistry, RACE_SOURCE_REGISTRY_PATH } from "./sourceRegistry.ts";
import { assertRaceGraphSnapshot } from "./validation.ts";

const REPORT_PATH = "artifacts/race-update/race-update-report.json";
const PR_BODY_PATH = "artifacts/race-update/race-update-pr-body.md";
const autoApplyLowRisk = parseArguments(process.argv.slice(2));
assertPhase4B1AutoApplyDisabled(autoApplyLowRisk);

// This validation deliberately happens before source fetch or model invocation.
assertProductionSecrets(process.env);

const canonicalBeforeBytes = await readFile(CANONICAL_PATH);
const registryBeforeBytes = await readFile(RACE_SOURCE_REGISTRY_PATH);
const canonicalBefore = JSON.parse(canonicalBeforeBytes.toString("utf8")) as unknown;
assertRaceGraphSnapshot(canonicalBefore);
const pendingBefore = await loadPendingChangeStore();
const stateBefore = await loadState();
const registry = await loadRaceSourceRegistry();
const provider = withRetryingFactExtractionProvider(loadQwenProviderFromEnvironment());

console.log("PROVIDER_CONFIGURED=yes");
console.log(`MODEL=${provider.model}`);
console.log(`AUTO_APPLY_LOW_RISK=${autoApplyLowRisk ? "on" : "off"}`);

const result = await runRaceDailyCheck({
  snapshot: canonicalBefore as RaceGraphSnapshot,
  registry,
  state: stateBefore,
  pendingStore: pendingBefore,
  provider,
  autoApplyLowRisk,
});
if (result.report.summary.editionsChecked !== 12) {
  throw new Error(`TWELVE_RACE_ORCHESTRATION_REQUIRED:${result.report.summary.editionsChecked}`);
}

const eligibleChanges = autoApplyLowRisk
  ? result.prepared.changes.filter(({ action }) => action === "auto_apply")
  : [];
const applied = applySafeChanges({
  snapshot: canonicalBefore as RaceGraphSnapshot,
  changes: eligibleChanges,
  registry,
  appliedAt: result.report.finishedAt,
});

if (applied.appliedChangeIds.length > 0) {
  await persistRaceGraphSnapshotAtomic({
    path: CANONICAL_PATH,
    snapshot: applied.snapshot,
    allowedPaths: [CANONICAL_PATH],
  });
}
await persistPreparedRealExtraction({ prepared: result.prepared });

const [canonicalAfter, pendingAfter, stateAfter, registryAfterBytes] = await Promise.all([
  readJson(CANONICAL_PATH, assertRaceGraphSnapshot),
  readJson(PENDING_CHANGE_PATH, assertPendingChangeStore),
  readJson(OFFICIAL_INGESTION_STATE_PATH, assertOfficialIngestionState),
  readFile(RACE_SOURCE_REGISTRY_PATH),
]);
if (!registryBeforeBytes.equals(registryAfterBytes)) {
  throw new Error("SOURCE_REGISTRY_AUTOMATION_FORBIDDEN");
}

const meaningfulDiff = classifyMeaningfulDataChange({
  canonicalBefore: canonicalBefore as RaceGraphSnapshot,
  canonicalAfter,
  pendingBefore,
  pendingAfter,
  stateBefore,
  stateAfter,
});
const appliedIds = new Set(applied.appliedChangeIds);
const report = buildSanitizedRaceUpdateReport({
  report: result.report,
  autoApplyLowRisk,
  appliedChanges: eligibleChanges.filter(({ changeId }) => appliedIds.has(changeId)),
  meaningfulDiff,
});
report.run.runId = process.env.GITHUB_RUN_ID?.trim() || report.run.runId;
const continuity = await loadContinuityContext();
report.continuity = {
  sourceMonitoringExecuted: true,
  canonicalBaselineSha: continuity?.mainSha ?? null,
  pendingStateBaseline: continuity?.mode === "continue" ? "open_data_pr" : "main",
  openPrNumber: continuity?.mode === "continue" ? continuity.pr.number : null,
  openPrHeadSha: continuity?.mode === "continue" ? continuity.pr.headSha : null,
  newPending: result.report.summary.pendingCreated,
  dedupedPending: result.report.summary.pendingDeduped,
  localPersistenceCompleted: true,
  prPersistence: meaningfulDiff.meaningful ? "awaiting_finish" : "not_applicable",
};
const artifactName = `race-update-report-${report.run.runId}`;
const prBody = buildDataPrBody(report, artifactName);
const verificationSummary = buildVerificationSummary(report);
assertSanitizedText({ text: JSON.stringify(report), environment: process.env });
assertSanitizedText({ text: prBody, environment: process.env });
assertSanitizedText({ text: verificationSummary, environment: process.env });

await mkdir("artifacts/race-update", { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(PR_BODY_PATH, `${prBody}\n`, "utf8");
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, verificationSummary, "utf8");
}
await writeGithubOutputs({
  meaningful_data_change: String(meaningfulDiff.meaningful),
  volatile_only: String(meaningfulDiff.volatileOnly),
  new_pending_count: String(result.report.summary.pendingCreated),
  deduped_pending_count: String(result.report.summary.pendingDeduped),
  report_path: REPORT_PATH,
  pr_body_path: PR_BODY_PATH,
  artifact_name: artifactName,
});

console.log(`RACE_HEALTH=${report.health.healthy}/${report.health.editionsChecked} healthy`);
console.log(`SOURCES_CHECKED=${report.sources.checked}`);
console.log(`SOURCES_FAILED=${report.sources.failed}`);
console.log(`OFFICIAL_SOURCES_EFFECTIVE=${report.verification.officialSourcesEffectivelyProcessed}`);
console.log(`VERIFICATION_ALERTS=${report.verification.alertCount} HIGH=${report.verification.highCount} REVIEW=${report.verification.reviewCount}`);
console.log(`MODEL_CALLS=${report.model.calls}`);
console.log(`NEW_PENDING=${report.newPending.length}`);
console.log(`DEDUPED_PENDING=${result.report.summary.pendingDeduped}`);
console.log(`LOW_RISK_CANONICAL_UPDATES=${report.lowRiskCanonicalUpdates.length}`);
console.log(`MEANINGFUL_DATA_CHANGE=${meaningfulDiff.meaningful ? "yes" : "no"}`);
console.log(`REPORT=${REPORT_PATH}`);

function parseArguments(args: string[]): boolean {
  if (args.length > 1) throw new Error("Production manual check accepts only auto_apply_low_risk.");
  const prefix = "--auto-apply-low-risk=";
  if (args.length === 0) return false;
  if (!args[0].startsWith(prefix)) throw new Error("Unknown production manual check argument.");
  return parseAutoApplyLowRisk(args[0].slice(prefix.length));
}

async function loadState(): Promise<OfficialSourceIngestionState> {
  try {
    return await readJson(OFFICIAL_INGESTION_STATE_PATH, assertOfficialIngestionState);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schemaVersion: "official-source-ingestion-state-v1", sources: [] };
    }
    throw error;
  }
}

async function loadContinuityContext(): Promise<ContinuityPlan | null> {
  try {
    return JSON.parse(await readFile("artifacts/race-update/continuity-context.json", "utf8")) as ContinuityPlan;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function readJson<T>(path: string, validate: (value: unknown) => asserts value is T): Promise<T> {
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  validate(value);
  return value;
}

async function writeGithubOutputs(outputs: Record<string, string>): Promise<void> {
  const path = process.env.GITHUB_OUTPUT;
  if (!path) return;
  await appendFile(path, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(""), "utf8");
}
