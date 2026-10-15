import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertOperationsReviewState } from "./operationsReview.ts";
import { assertDiscoveryLedger } from "./multiRaceDiscovery.ts";
import { assertRealExtractionArtifact, writeJsonAtomicValidated } from "./persistence.ts";

const exec = promisify(execFile);
const repository = process.env.GITHUB_REPOSITORY;
if (!repository || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository))
  throw new Error("INVALID_REPOSITORY");
async function gh(...args: string[]) {
  return (await exec("gh", args, { maxBuffer: 5_000_000 })).stdout;
}
const runs = JSON.parse(
  await gh(
    "api",
    `repos/${repository}/actions/workflows/race-data-update.yml/runs?branch=main&status=completed&per_page=10`,
  ),
);
let restored = false;
let operationsRestored = false;
let evidenceRestored = false;
for (const run of runs.workflow_runs ?? []) {
  if (
    run.head_branch !== "main" ||
    run.path !== ".github/workflows/race-data-update.yml" ||
    run.id === Number(process.env.GITHUB_RUN_ID)
  )
    continue;
  const name = `race-update-report-${run.id}`;
  const artifacts = JSON.parse(
    await gh("api", `repos/${repository}/actions/runs/${run.id}/artifacts`),
  );
  if (
    !artifacts.artifacts?.some(
      (a: { name: string; expired: boolean }) => a.name === name && !a.expired,
    )
  )
    continue;
  const dir = await mkdtemp(join(tmpdir(), "racenext-discovery-"));
  await gh(
    "run",
    "download",
    String(run.id),
    "--repo",
    repository,
    "--name",
    name,
    "--dir",
    dir,
  );
  for (const [filename, destination, validate, kind] of [
    ["source-discovery-ledger.json", "artifacts/source-discovery-input.json", assertDiscoveryLedger, "discovery"],
    ["operations-review-state.json", "artifacts/operations-review-input.json", assertOperationsReviewState, "operations"],
    ["phase3-real-extraction.json", "artifacts/field-evidence-input.json", assertRealExtractionArtifact, "evidence"],
  ] as const) {
    if ((kind === "discovery" && restored) || (kind === "operations" && operationsRestored) || (kind === "evidence" && evidenceRestored)) continue;
    try {
      const path=join(dir,filename);
      if ((await stat(path)).size>10_000_000) throw new Error("REVIEW_BASELINE_TOO_LARGE");
      const value=JSON.parse(await readFile(path,"utf8")); validate(value);
      await mkdir("artifacts",{recursive:true});
      await writeJsonAtomicValidated({path:destination,value,validate,allowedPaths:[destination]});
      if (kind === "discovery") restored=true; else if (kind === "operations") operationsRestored=true; else evidenceRestored=true;
      console.log(`REVIEW_BASELINE_RESTORED=${kind} RUN=${run.id}`);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  if (restored && operationsRestored && evidenceRestored) break;
}
if (!restored) console.log("DISCOVERY_DEDUP_BASELINE=not_available; first rollout or report retention gap; new-candidate counts have no historical baseline");
if (!operationsRestored) console.log("OPERATIONS_REVIEW_BASELINE=not_available; no current alerts suppressed");
if (!evidenceRestored) console.log("FIELD_EVIDENCE_BASELINE=not_available; no field verification inferred from successful hashes");
