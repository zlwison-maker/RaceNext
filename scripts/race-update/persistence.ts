import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import type {
  NoKeyDryRunArtifact,
  OfficialSourceIngestionState,
  RealExtractionArtifact,
} from "../../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceGraphSnapshot } from "../../types/raceUpdate.ts";
import { assertRaceGraphSnapshot } from "./validation.ts";

export const CANONICAL_PATH = "data/canonical/race-graph-v1.json";
export const PENDING_CHANGE_PATH = "data/pending/race-update-pending.json";
export const OFFICIAL_INGESTION_STATE_PATH = "data/sources/official-source-ingestion-state.json";
export const NO_KEY_DRY_RUN_ARTIFACT_PATH = "artifacts/race-update/phase2-no-key-dry-run.json";
export const REAL_EXTRACTION_ARTIFACT_PATH = "artifacts/race-update/phase3-real-extraction.json";

export const RACE_PERSISTENCE_ALLOWLIST = [
  CANONICAL_PATH,
  PENDING_CHANGE_PATH,
  OFFICIAL_INGESTION_STATE_PATH,
  NO_KEY_DRY_RUN_ARTIFACT_PATH,
  REAL_EXTRACTION_ARTIFACT_PATH,
] as const;

type AtomicFileOperations = {
  writeFile: typeof writeFile;
  rename: typeof rename;
  unlink: typeof unlink;
};

export async function writeJsonAtomicValidated<T>(input: {
  path: string;
  value: T;
  validate: (value: unknown) => void;
  allowedPaths?: readonly string[];
  operations?: Partial<AtomicFileOperations>;
}): Promise<void> {
  const allowedPaths = input.allowedPaths ?? RACE_PERSISTENCE_ALLOWLIST;
  assertAllowedPersistencePath(input.path, allowedPaths);
  input.validate(input.value);

  const target = resolve(input.path);
  const directory = dirname(target);
  await mkdir(directory, { recursive: true });
  const temporary = resolve(directory, `.${basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  const operations: AtomicFileOperations = {
    writeFile: input.operations?.writeFile ?? writeFile,
    rename: input.operations?.rename ?? rename,
    unlink: input.operations?.unlink ?? unlink,
  };

  try {
    await operations.writeFile(temporary, `${JSON.stringify(input.value, null, 2)}\n`, "utf8");
    const staged = JSON.parse(await readFile(temporary, "utf8")) as unknown;
    input.validate(staged);
    await operations.rename(temporary, target);
  } catch (error) {
    await operations.unlink(temporary).catch(() => undefined);
    throw error;
  }
}

export async function persistRaceGraphSnapshotAtomic(input: {
  path: string;
  snapshot: RaceGraphSnapshot;
  allowedPaths?: readonly string[];
  operations?: Partial<AtomicFileOperations>;
}): Promise<void> {
  return writeJsonAtomicValidated({
    path: input.path,
    value: input.snapshot,
    validate: assertRaceGraphSnapshot,
    allowedPaths: input.allowedPaths,
    operations: input.operations,
  });
}

export async function persistPendingChangeStoreAtomic(input: {
  path?: string;
  store: PendingChangeStore;
  allowedPaths?: readonly string[];
  operations?: Partial<AtomicFileOperations>;
}): Promise<void> {
  const path = input.path ?? PENDING_CHANGE_PATH;
  return writeJsonAtomicValidated({
    path,
    value: input.store,
    validate: assertPendingChangeStore,
    allowedPaths: input.allowedPaths,
    operations: input.operations,
  });
}

export function assertOfficialIngestionState(value: unknown): asserts value is OfficialSourceIngestionState {
  if (!isObject(value) || value.schemaVersion !== "official-source-ingestion-state-v1" || !Array.isArray(value.sources)) {
    throw new Error("Invalid official source ingestion state envelope.");
  }
  const identities = new Set<string>();
  for (const entry of value.sources) {
    if (!isObject(entry)
      || typeof entry.sourceId !== "string"
      || typeof entry.editionId !== "string"
      || !(entry.lastObservedContentHash === null || isHash(entry.lastObservedContentHash))
      || !(entry.lastSuccessfulExtractionHash === null || isHash(entry.lastSuccessfulExtractionHash))
      || !isOptionalNullableString(entry.lastSuccessfulProvider)
      || !isOptionalNullableString(entry.lastSuccessfulModel)
      || !isOptionalNullableString(entry.lastSuccessfulPromptVersion)
      || !isDateTime(entry.lastCheckedAt)
      || !["success", "fetch_error", "parse_error", "unsupported_content_type", "unsupported_scanned_pdf"].includes(String(entry.lastFetchStatus))
      || !["not_attempted", "unchanged", "identity_mismatch", "identity_uncertain", "fact_extraction_provider_unconfigured", "extraction_error", "validation_error", "success"].includes(String(entry.lastExtractionStatus))) {
      throw new Error("Invalid official source ingestion state entry.");
    }
    const key = `${entry.editionId}:${entry.sourceId}`;
    if (identities.has(key)) throw new Error(`Duplicate ingestion state identity: ${key}`);
    identities.add(key);
  }
}

export function assertPendingChangeStore(value: unknown): asserts value is PendingChangeStore {
  if (!isObject(value) || value.schemaVersion !== "race-update-pending-v1" || !Array.isArray(value.changes)) {
    throw new Error("Invalid Pending Change Store envelope.");
  }
  const ids = new Set<string>();
  for (const change of value.changes) {
    if (!isObject(change)
      || typeof change.changeId !== "string"
      || typeof change.eventId !== "string"
      || typeof change.editionId !== "string"
      || !(change.categoryId === null || typeof change.categoryId === "string")
      || !["Edition", "Category"].includes(String(change.entityType))
      || typeof change.field !== "string"
      || typeof change.sourceId !== "string"
      || typeof change.sourceUrl !== "string"
      || typeof change.evidenceText !== "string"
      || typeof change.evidenceLocator !== "string"
      || !Number.isFinite(change.confidence)
      || Number(change.confidence) < 0
      || Number(change.confidence) > 1
      || !isDateTime(change.fetchedAt)
      || !isHash(change.contentHash)
      || typeof change.extractionMethod !== "string"
      || !isOptionalNullableString(change.provider)
      || !isOptionalNullableString(change.model)
      || !isOptionalNullableString(change.promptVersion)
      || typeof change.reason !== "string"
      || !["low", "high_impact", "structural"].includes(String(change.risk))
      || !["pending", "approved", "rejected", "applied"].includes(String(change.status))
      || !isDateTime(change.createdAt)
      || !(change.reviewedAt === null || isDateTime(change.reviewedAt))
      || !(change.reviewReason === null || typeof change.reviewReason === "string")
      || !(change.appliedAt === null || isDateTime(change.appliedAt))
      || !Array.isArray(change.evidence)
      || change.evidence.length === 0) {
      throw new Error("Invalid Pending Change Store entry.");
    }
    if ((change.status === "approved" || change.status === "rejected" || change.status === "applied")
      && change.reviewedAt === null) {
      throw new Error(`Reviewed pending state requires reviewedAt: ${change.changeId}`);
    }
    if (change.status === "rejected" && !(typeof change.reviewReason === "string" && change.reviewReason.trim())) {
      throw new Error(`Rejected pending state requires reviewReason: ${change.changeId}`);
    }
    if (change.status === "applied" && change.appliedAt === null) {
      throw new Error(`Applied pending state requires appliedAt: ${change.changeId}`);
    }
    if (ids.has(change.changeId)) throw new Error(`Duplicate pending changeId: ${change.changeId}`);
    ids.add(change.changeId);
  }
}

export function assertNoKeyDryRunArtifact(value: unknown): asserts value is NoKeyDryRunArtifact {
  if (!isObject(value)
    || value.schemaVersion !== "race-no-key-dry-run-artifact-v1"
    || typeof value.generatedAt !== "string"
    || !Array.isArray(value.reports)
    || value.reports.some((report) => !isObject(report)
      || report.schemaVersion !== "race-no-key-dry-run-v1"
      || !Array.isArray(report.sources)
      || !isObject(report.summary)
      || report.summary.model_calls !== 0
      || report.summary.canonical_writes !== 0)) {
    throw new Error("Invalid no-key dry-run artifact.");
  }
}

export function assertRealExtractionArtifact(value: unknown): asserts value is RealExtractionArtifact {
  if (!isObject(value)
    || value.schemaVersion !== "race-real-extraction-artifact-v1"
    || typeof value.generatedAt !== "string"
    || !isObject(value.report)
    || value.report.schemaVersion !== "race-real-extraction-v1"
    || value.report.dryRun !== true
    || !Array.isArray(value.report.sources)
    || !isObject(value.report.summary)
    || value.report.summary.canonicalWrites !== 0
    || value.report.sources.some((source) => !isObject(source)
      || source.canonicalWritten !== false
      || source.reasoningMode !== "none"
      || source.structuredOutputMode !== "strict_json_schema"
      || !Array.isArray(source.candidates)
      || !Array.isArray(source.rejectedCandidates))) {
    throw new Error("Invalid real extraction artifact.");
  }
}

export function assertAllowedPersistencePath(path: string, allowedPaths: readonly string[]): void {
  const target = resolve(path);
  if (!allowedPaths.some((allowed) => resolve(allowed) === target)) {
    throw new Error(`Race persistence rejected non-allowlisted path: ${path}`);
  }
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
