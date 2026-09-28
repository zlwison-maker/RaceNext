import { deepEqual, equal, rejects } from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import {
  assertAllowedPersistencePath,
  persistRaceGraphSnapshotAtomic,
} from "../scripts/race-update/persistence.ts";
import type { RaceGraphSnapshot } from "../types/raceUpdate.ts";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "racenext-pipeline-core-"));
const canonical = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8")) as RaceGraphSnapshot;

after(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

test("atomic persistence round-trips current startTimes and elevationLoss without deriving either", async () => {
  const target = join(temporaryDirectory, "race-graph.json");
  const fixture = structuredClone(canonical);
  const category = fixture.records.find(({ edition }) => edition.editionId === "hk100-2027")!.categories[0];
  category.startTimes = ["2027-01-21T08:00:00+08:00", "2027-01-21T08:30:00+08:00"];
  category.elevationGain = 1450;
  category.elevationLoss = 1380;
  await persistRaceGraphSnapshotAtomic({ path: target, snapshot: fixture, allowedPaths: [target] });
  const stored = JSON.parse(await readFile(target, "utf8")) as RaceGraphSnapshot;
  const storedCategory = stored.records.find(({ edition }) => edition.editionId === "hk100-2027")!.categories[0];
  deepEqual(storedCategory.startTimes, category.startTimes);
  equal(storedCategory.elevationGain, 1450);
  equal(storedCategory.elevationLoss, 1380);
});

test("schema failure occurs before replacement and preserves the target", async () => {
  const target = join(temporaryDirectory, "schema-failure.json");
  await writeFile(target, "original", "utf8");
  const invalid = structuredClone(canonical);
  invalid.records[0].categories[0].startTimes = [];
  await rejects(
    persistRaceGraphSnapshotAtomic({ path: target, snapshot: invalid, allowedPaths: [target] }),
    /Invalid startTimes/,
  );
  equal(await readFile(target, "utf8"), "original");
});

test("partial write failure cannot damage an existing target", async () => {
  const target = join(temporaryDirectory, "write-failure.json");
  await writeFile(target, "original", "utf8");
  const failingWrite = (async (path: Parameters<typeof writeFile>[0]) => {
    await writeFile(path, "{", "utf8");
    throw new Error("simulated write failure");
  }) as typeof writeFile;
  await rejects(
    persistRaceGraphSnapshotAtomic({
      path: target,
      snapshot: canonical,
      allowedPaths: [target],
      operations: { writeFile: failingWrite },
    }),
    /simulated write failure/,
  );
  equal(await readFile(target, "utf8"), "original");
});

test("rename failure leaves the existing target untouched", async () => {
  const target = join(temporaryDirectory, "rename-failure.json");
  await writeFile(target, "original", "utf8");
  const failingRename = (async () => {
    throw new Error("simulated rename failure");
  }) as typeof import("node:fs/promises").rename;
  await rejects(
    persistRaceGraphSnapshotAtomic({
      path: target,
      snapshot: canonical,
      allowedPaths: [target],
      operations: { rename: failingRename },
    }),
    /simulated rename failure/,
  );
  equal(await readFile(target, "utf8"), "original");
});

test("persistence rejects paths outside the explicit allowlist", () => {
  const allowed = join(temporaryDirectory, "allowed.json");
  const rejected = join(temporaryDirectory, "rejected.json");
  equal(assertAllowedPersistencePath(allowed, [allowed]), undefined);
  return rejects(
    persistRaceGraphSnapshotAtomic({ path: rejected, snapshot: canonical, allowedPaths: [allowed] }),
    /non-allowlisted/,
  );
});
