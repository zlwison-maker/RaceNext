import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import type { OfficialSourceIngestionState } from "../../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshot } from "../../types/raceUpdate.ts";
import { assertRaceGraphSnapshot } from "./validation.ts";

export const CANONICAL_PATH = "data/canonical/race-graph-v1.json";
export const PENDING_CHANGE_PATH = "data/pending/race-update-pending.json";
export const OFFICIAL_INGESTION_STATE_PATH = "data/sources/official-source-ingestion-state.json";

export const RACE_PERSISTENCE_ALLOWLIST = [
  CANONICAL_PATH,
  PENDING_CHANGE_PATH,
  OFFICIAL_INGESTION_STATE_PATH,
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
      || !(entry.lastSuccessfulExtractionHash === null || isHash(entry.lastSuccessfulExtractionHash))) {
      throw new Error("Invalid official source ingestion state entry.");
    }
    const key = `${entry.editionId}:${entry.sourceId}`;
    if (identities.has(key)) throw new Error(`Duplicate ingestion state identity: ${key}`);
    identities.add(key);
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
