import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import type { MultiRaceDiscoveryReport } from "./multiRaceDiscovery.ts";
const first = JSON.parse(
  await readFile("artifacts/race-update/source-discovery-first.json", "utf8"),
) as MultiRaceDiscoveryReport;
const second = JSON.parse(
  await readFile("artifacts/race-update/source-discovery-report.json", "utf8"),
) as MultiRaceDiscoveryReport;
assert.ok(first.editions.some(e=>e.candidates.some(c=>c.sourceAuthorityStatus==="official_site_unapproved" && c.editionIdentityStatus==="title_year_match" && c.eventIdentityStatus==="title_match")),"REAL_OFFICIAL_ANNOUNCEMENT_DISCOVERY_NOT_PROVEN");
const prior = new Set(
  first.editions.flatMap((e) => e.candidates.map((c) => c.candidateId)),
);
assert.equal(second.factPendingWrites, 0);
assert.equal(second.registryWrites, 0);
assert.equal(second.modelCalls, 0);
for (const id of second.editions.flatMap((e) => e.newCandidateIds))
  assert.ok(!prior.has(id), `DUPLICATE_SOURCE_REVIEW:${id}`);
const protectedPaths = [
  "data/canonical/race-graph-v1.json",
  "data/pending/race-update-pending.json",
  "data/sources/race-source-registry.json",
  "data/sources/official-source-ingestion-state.json",
];
for (const path of protectedPaths)
  assert.deepEqual(
    await readFile(path),
    execFileSync("git", ["show", `HEAD:${path}`]),
  );
console.log(
  `REAL_DISCOVERY_REPLAY=PASS repeated_source_tasks=0 new_sources=${second.summary.newSources} protected_stores=unchanged`,
);
