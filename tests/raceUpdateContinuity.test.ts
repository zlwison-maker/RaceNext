import { deepEqual, equal, match, ok, rejects, throws } from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

import {
  assertFinishBaseline,
  assertOutputDataOnly,
  assertSafePrBaseline,
  parsePrState,
  planAutomationDataPr,
  type AutomationDataPr,
} from "../scripts/race-update/productionPrContinuity.ts";
import { mergeDurablePendingChanges } from "../scripts/race-update/realExtraction.ts";
import type { PendingChange, PendingChangeStore } from "../types/raceUpdate.ts";

const exec = promisify(execFile);
const cli = new URL("../scripts/race-update/productionPrContinuityCli.ts", import.meta.url).pathname;
const gateCli = new URL("../scripts/race-update/productionGateCli.ts", import.meta.url).pathname;
const pendingPath = "data/pending/race-update-pending.json";
const statePath = "data/sources/official-source-ingestion-state.json";
const productionPending = JSON.parse(await readFile(new URL(`../${pendingPath}`, import.meta.url), "utf8")) as PendingChangeStore;
const productionState = await readFile(new URL(`../${statePath}`, import.meta.url), "utf8");
const shaA = "a".repeat(40);
const shaB = "b".repeat(40);
const pr: AutomationDataPr = {
  number: 42, url: "https://github.com/example/RaceNext/pull/42",
  headRef: "automation/race-data-update-42", headSha: shaA, headRepo: "example/RaceNext",
};

test("0, 1, or multiple open PRs select one safe branch or fail closed", () => {
  deepEqual(planAutomationDataPr({ prs: [], repository: pr.headRepo, mainSha: shaB }), { mode: "new", mainSha: shaB });
  equal(planAutomationDataPr({ prs: [pr], repository: pr.headRepo, mainSha: shaB }).mode, "continue");
  throws(() => planAutomationDataPr({ prs: [pr, { ...pr, number: 43 }], repository: pr.headRepo, mainSha: shaB }), /MULTIPLE_OPEN_DATA_PRS.*#42.*#43/);
  throws(() => planAutomationDataPr({ prs: [{ ...pr, headRepo: "other/repo" }], repository: pr.headRepo, mainSha: shaB }), /UNTRUSTED_DATA_PR_HEAD/);
  throws(() => planAutomationDataPr({ prs: [{ ...pr, headRef: "automation/race-data-update-evil" }], repository: pr.headRepo, mainSha: shaB }), /UNTRUSTED_DATA_PR_HEAD/);
});

test("untrusted PR code, main data divergence, head races and output scope fail closed", () => {
  assertSafePrBaseline({ prPaths: [pendingPath, statePath], mainPaths: ["docs/project/README.md"] });
  throws(() => assertSafePrBaseline({ prPaths: ["scripts/race-update/pipeline.ts"], mainPaths: [] }), /UNTRUSTED_DATA_PR_DIFF/);
  throws(() => assertSafePrBaseline({ prPaths: [], mainPaths: ["data/canonical/race-graph-v1.json"] }), /MAIN_BASELINE_CONFLICT/);
  throws(() => assertSafePrBaseline({ prPaths: [], mainPaths: [pendingPath] }), /MAIN_BASELINE_CONFLICT/);
  const start = planAutomationDataPr({ prs: [pr], repository: pr.headRepo, mainSha: shaB });
  assertFinishBaseline({ start, current: start, remoteMainSha: shaB, remoteHeadSha: shaA });
  throws(() => assertFinishBaseline({ start, current: start, remoteMainSha: shaB, remoteHeadSha: shaB }), /DATA_PR_HEAD_CHANGED/);
  throws(() => assertFinishBaseline({ start, current: start, remoteMainSha: shaA, remoteHeadSha: shaA }), /MAIN_BASELINE_CHANGED/);
  throws(() => assertFinishBaseline({ start, current: { mode: "new", mainSha: shaB }, remoteMainSha: shaB }), /DATA_PR_HEAD_CHANGED/);
  assertOutputDataOnly([pendingPath, statePath]);
  throws(() => assertOutputDataOnly(["data/canonical/race-graph-v1.json"]), /CANONICAL_AUTOMATIC_WRITE_FORBIDDEN/);
  throws(() => assertOutputDataOnly(["data/sources/race-source-registry.json"]), /UNEXPECTED_DATA_DIFF/);
});

test("reviewed Pending is retained; identical evidence dedups and new official evidence remains eligible", () => {
  const rejected = productionPending.changes.find(({ status }) => status === "rejected");
  ok(rejected);
  const existing = { schemaVersion: productionPending.schemaVersion, changes: [structuredClone(rejected)] } satisfies PendingChangeStore;
  const same = { ...structuredClone(rejected), status: "pending" as const, reviewedAt: null, reviewReason: null, appliedAt: null };
  deepEqual(mergeDurablePendingChanges(existing, [same]), existing);
  const newEvidence = structuredClone(same);
  newEvidence.changeId = "chg-test-new-evidence";
  newEvidence.sourceId = "new-official-source";
  newEvidence.evidence = newEvidence.evidence.map((evidence) => ({ ...evidence, sourceId: "new-official-source", contentHash: "f".repeat(64) }));
  const merged = mergeDurablePendingChanges(existing, [newEvidence]);
  equal(merged.changes.length, 2);
  equal(merged.changes[0].status, "rejected");
  equal(merged.changes[1].status, "pending");
  for (const status of ["approved", "applied"] as const) {
    const reviewed: PendingChange = structuredClone(rejected);
    reviewed.status = status;
    reviewed.reviewReason = null;
    if (status === "applied") reviewed.appliedAt = "2026-10-09T00:00:00Z";
    const protectedStore: PendingChangeStore = { schemaVersion: productionPending.schemaVersion, changes: [reviewed] };
    deepEqual(mergeDurablePendingChanges(protectedStore, [same]), protectedStore);
  }
});

test("real prepare/finish CLI continues one open PR across two local monitoring runs", async () => {
  const root = await mkdtemp(join(tmpdir(), "racenext-two-run-"));
  const productionSummary = join(root, "production-summary.md");
  await writeFile(productionSummary, "Real production stage remains visible\n");
  const bare = join(root, "remote.git");
  const checkout = join(root, "runner");
  await shell(root, "git", ["init", "--bare", bare]);
  await shell(root, "git", ["clone", bare, checkout]);
  await shell(checkout, "git", ["config", "user.name", "Fixture"]);
  await shell(checkout, "git", ["config", "user.email", "fixture@example.test"]);
  await mkdir(join(checkout, "data/pending"), { recursive: true });
  await mkdir(join(checkout, "data/sources"), { recursive: true });
  await mkdir(join(checkout, "data/canonical"), { recursive: true });
  await writeFile(join(checkout, pendingPath), `${JSON.stringify(productionPending)}\n`);
  await writeFile(join(checkout, statePath), productionState);
  await writeFile(join(checkout, "data/canonical/race-graph-v1.json"), "{}\n");
  await writeFile(join(checkout, "data/sources/race-source-registry.json"), "{}\n");
  await writeFile(join(checkout, ".gitignore"), "artifacts/\n");
  await shell(checkout, "git", ["add", "--", "data", ".gitignore"]);
  await shell(checkout, "git", ["commit", "-m", "Fixture main"]);
  await shell(checkout, "git", ["branch", "-M", "main"]);
  await shell(checkout, "git", ["push", "-u", "origin", "main"]);
  const mainSha = (await shell(checkout, "git", ["rev-parse", "HEAD"])).trim();

  await shell(checkout, "git", ["switch", "-c", pr.headRef]);
  const recordA = { ...structuredClone(productionPending.changes[0]), changeId: "chg-continuity-a" };
  const firstPrStore: PendingChangeStore = { ...productionPending, changes: [...productionPending.changes, recordA] };
  const firstPrState = JSON.parse(productionState) as { sources: Array<{ lastObservedContentHash: string | null }> };
  firstPrState.sources[0].lastObservedContentHash = "b".repeat(64);
  await writeFile(join(checkout, pendingPath), `${JSON.stringify(firstPrStore)}\n`);
  await writeFile(join(checkout, statePath), `${JSON.stringify(firstPrState)}\n`);
  await shell(checkout, "git", ["add", "--", pendingPath, statePath]);
  await shell(checkout, "git", ["commit", "-m", "Fixture pending A"]);
  await shell(checkout, "git", ["push", "origin", pr.headRef]);
  await shell(checkout, "git", ["switch", "main"]);

  let commentStatus = 201;
  const reviewComments: string[] = [];
  const server = createServer(async (request, response) => {
    if (request.method === "POST" && request.url?.includes("/issues/42/comments")) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of request) chunks.push(chunk as Uint8Array);
      if (commentStatus === 201) reviewComments.push((JSON.parse(Buffer.concat(chunks).toString("utf8")) as { body: string }).body);
      response.writeHead(commentStatus, { "content-type": "application/json" });
      response.end("{}");
      return;
    }
    const headSha = (await shell(root, "git", ["--git-dir", bare, "rev-parse", `refs/heads/${pr.headRef}`])).trim();
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify([{
      number: pr.number, html_url: pr.url, state: "open", base: { ref: "main" },
      head: { ref: pr.headRef, sha: headSha, repo: { full_name: pr.headRepo } },
    }]));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  ok(address && typeof address !== "string");
  const productionEnvironment = { ...process.env, GITHUB_STEP_SUMMARY: productionSummary };
  const environment = {
    ...productionEnvironment,
    ...isolatedActionsEnvironment(root), GITHUB_REPOSITORY: pr.headRepo, GH_TOKEN: "fixture-token",
    RACENEXT_TEST_GITHUB_API_URL: `http://127.0.0.1:${address.port}`,
    GITHUB_RUN_ID: "42", ARTIFACT_NAME: "race-update-report-42",
    NEW_PENDING_COUNT: "1", DEDUPED_PENDING_COUNT: "0",
  };
  try {
    await shell(checkout, "node", [cli, "prepare"], environment);
    const day1 = JSON.parse(await readFile(join(checkout, pendingPath), "utf8")) as PendingChangeStore;
    equal(day1.changes.at(-1)?.changeId, recordA.changeId);
    const inheritedState = JSON.parse(await readFile(join(checkout, statePath), "utf8")) as typeof firstPrState;
    equal(inheritedState.sources[0].lastObservedContentHash, "b".repeat(64));
    const recordB = {
      ...structuredClone(productionPending.changes[1]),
      changeId: "chg-continuity-b", candidateValue: "Fixture-only alternative finish line",
    };
    const withB = mergeDurablePendingChanges(day1, [recordB]);
    await writeFile(join(checkout, pendingPath), `${JSON.stringify(withB)}\n`);
    inheritedState.sources[0].lastObservedContentHash = "c".repeat(64);
    await writeFile(join(checkout, statePath), `${JSON.stringify(inheritedState)}\n`);
    match(await shell(checkout, "node", [gateCli, "data-only"], environment), /DATA_ONLY_DIFF=pass/);
    await writeFile(join(checkout, "artifacts/race-update/race-update-report.json"), "{\"status\":\"fixture\"}\n");
    await writeFile(join(checkout, "artifacts/race-update/race-update-pr-body.md"), "Fixture data PR\n");
    match(await shell(checkout, "node", [gateCli, "secret-scan"], {
      ...environment,
      FACT_EXTRACTION_PROVIDER: "fixture",
      FACT_EXTRACTION_API_KEY: "fixture-secret-not-in-output",
      FACT_EXTRACTION_MODEL: "fixture",
      FACT_EXTRACTION_BASE_URL: "https://provider.example.test",
    }), /SECRET_SCAN=pass/);
    await shell(checkout, "node", [cli, "finish"], { ...environment, MEANINGFUL_DATA_CHANGE: "true" });
    const firstHead = (await shell(checkout, "git", ["rev-parse", `refs/remotes/origin/${pr.headRef}`])).trim();
    equal(reviewComments.length, 1);
    match(reviewComments[0], /Run ID: 42/);
    match(reviewComments[0], new RegExp(`Data PR Head SHA: ${firstHead}`));
    match(reviewComments[0], /New Pending: 1/);
    match(reviewComments[0], /Sanitized report artifact: race-update-report-42/);
    match(reviewComments[0], /github\.com\/example\/RaceNext\/actions\/runs\/42/);
    match(await readFile(join(root, "fixture-summary.md"), "utf8"), /PR #42/);
    equal(await readFile(productionSummary, "utf8"), "Real production stage remains visible\n");

    await shell(checkout, "git", ["restore", "--", pendingPath, statePath]);
    await shell(checkout, "node", [cli, "prepare"], environment);
    const day2 = JSON.parse(await readFile(join(checkout, pendingPath), "utf8")) as PendingChangeStore;
    equal(day2.changes.at(-2)?.changeId, recordA.changeId);
    equal(day2.changes.at(-1)?.changeId, recordB.changeId);
    const day2State = JSON.parse(await readFile(join(checkout, statePath), "utf8")) as typeof firstPrState;
    equal(day2State.sources[0].lastObservedContentHash, "c".repeat(64));
    const repeated = mergeDurablePendingChanges(day2, [recordB]);
    deepEqual(repeated, day2);
    equal(day2.changes.filter(({ status }) => status === "rejected").length,
      productionPending.changes.filter(({ status }) => status === "rejected").length);
    await shell(checkout, "node", [cli, "finish"], { ...environment, MEANINGFUL_DATA_CHANGE: "false" });
    equal((await shell(checkout, "git", ["rev-parse", `refs/remotes/origin/${pr.headRef}`])).trim(), firstHead);
    equal((await shell(checkout, "git", ["rev-parse", "main"])).trim(), mainSha);
    match(await shell(checkout, "git", ["branch", "-r"]), /origin\/automation\/race-data-update-42/);

    // The branch update is durable even if the PR comment endpoint rejects the summary.
    await shell(checkout, "git", ["restore", "--", pendingPath, statePath]);
    await shell(checkout, "node", [cli, "prepare"], environment);
    const beforeFailedComment = (await shell(root, "git", ["--git-dir", bare, "rev-parse", `refs/heads/${pr.headRef}`])).trim();
    const nextPending = JSON.parse(await readFile(join(checkout, pendingPath), "utf8")) as PendingChangeStore;
    nextPending.changes.push({ ...structuredClone(productionPending.changes[2]), changeId: "chg-continuity-c" });
    await writeFile(join(checkout, pendingPath), `${JSON.stringify(nextPending)}\n`);
    commentStatus = 403;
    let partialSuccess = false;
    try {
      await shell(checkout, "node", [cli, "finish"], { ...environment, MEANINGFUL_DATA_CHANGE: "true" });
    } catch (error) {
      match(String((error as { stderr?: string }).stderr), /PARTIAL_SUCCESS:DATA_PR_UPDATED_REVIEW_SUMMARY_FAILED/);
      match(String((error as { stderr?: string }).stderr), /Head=[0-9a-f]{40}/);
      partialSuccess = true;
    }
    ok(partialSuccess);
    const afterFailedComment = (await shell(root, "git", ["--git-dir", bare, "rev-parse", `refs/heads/${pr.headRef}`])).trim();
    ok(afterFailedComment !== beforeFailedComment);
    equal(reviewComments.length, 1);
    await shell(checkout, "git", ["restore", "--", pendingPath, statePath]);
    await shell(checkout, "node", [cli, "prepare"], environment);
    const recoveredPending = JSON.parse(await readFile(join(checkout, pendingPath), "utf8")) as PendingChangeStore;
    equal(recoveredPending.changes.at(-1)?.changeId, "chg-continuity-c");
    deepEqual(mergeDurablePendingChanges(recoveredPending, [nextPending.changes.at(-1)!]), recoveredPending);

    // A concurrent human/automation push after prepare cannot be overwritten.
    await shell(checkout, "git", ["restore", "--", pendingPath, statePath]);
    await shell(checkout, "node", [cli, "prepare"], environment);
    const other = join(root, "other-writer");
    await shell(root, "git", ["clone", bare, other]);
    await shell(other, "git", ["config", "user.name", "Other Writer"]);
    await shell(other, "git", ["config", "user.email", "other@example.test"]);
    await shell(other, "git", ["switch", "--track", `origin/${pr.headRef}`]);
    await writeFile(join(other, "other-review.txt"), "Concurrent review\n");
    await shell(other, "git", ["add", "--", "other-review.txt"]);
    await shell(other, "git", ["commit", "-m", "Concurrent review"]);
    await shell(other, "git", ["push", "origin", pr.headRef]);
    const concurrentHead = (await shell(root, "git", ["--git-dir", bare, "rev-parse", `refs/heads/${pr.headRef}`])).trim();
    let rejectedHead = false;
    try {
      await shell(checkout, "node", [cli, "finish"], { ...environment, MEANINGFUL_DATA_CHANGE: "true" });
    } catch (error) {
      match(String((error as { stderr?: string }).stderr), /DATA_PR_HEAD_CHANGED/);
      rejectedHead = true;
    }
    ok(rejectedHead);
    equal((await shell(root, "git", ["--git-dir", bare, "rev-parse", `refs/heads/${pr.headRef}`])).trim(), concurrentHead);
  } finally {
    server.close();
  }
});

test("real CLI with no open PR creates one data-only branch and leaves main Canonical intact", async () => {
  const root = await mkdtemp(join(tmpdir(), "racenext-no-pr-"));
  const bare = join(root, "remote.git");
  const checkout = join(root, "runner");
  await shell(root, "git", ["init", "--bare", bare]);
  await shell(root, "git", ["clone", bare, checkout]);
  await shell(checkout, "git", ["config", "user.name", "Fixture"]);
  await shell(checkout, "git", ["config", "user.email", "fixture@example.test"]);
  await mkdir(join(checkout, "data/pending"), { recursive: true });
  await mkdir(join(checkout, "data/sources"), { recursive: true });
  await mkdir(join(checkout, "data/canonical"), { recursive: true });
  await writeFile(join(checkout, pendingPath), `${JSON.stringify(productionPending)}\n`);
  await writeFile(join(checkout, statePath), productionState);
  await writeFile(join(checkout, "data/canonical/race-graph-v1.json"), "{}\n");
  await writeFile(join(checkout, "data/sources/race-source-registry.json"), "{}\n");
  await writeFile(join(checkout, ".gitignore"), "artifacts/\n");
  await shell(checkout, "git", ["add", "--", "data", ".gitignore"]);
  await shell(checkout, "git", ["commit", "-m", "Fixture main"]);
  await shell(checkout, "git", ["branch", "-M", "main"]);
  await shell(checkout, "git", ["push", "-u", "origin", "main"]);
  const mainSha = (await shell(checkout, "git", ["rev-parse", "HEAD"])).trim();
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end("[]");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  ok(address && typeof address !== "string");
  const ghShim = join(root, "gh");
  await writeFile(ghShim, "#!/bin/sh\necho https://github.com/example/RaceNext/pull/99\n", { mode: 0o755 });
  const bodyPath = join(root, "pr-body.md");
  await writeFile(bodyPath, "Fixture data PR\n");
  const environment = {
    ...process.env, ...isolatedActionsEnvironment(root),
    GITHUB_REPOSITORY: "example/RaceNext", GH_TOKEN: "fixture-token",
    RACENEXT_TEST_GITHUB_API_URL: `http://127.0.0.1:${address.port}`,
    GITHUB_RUN_ID: "99", PATH: `${root}:${process.env.PATH ?? ""}`,
    PR_BODY_PATH: bodyPath, MEANINGFUL_DATA_CHANGE: "true",
  };
  try {
    await shell(checkout, "node", [cli, "prepare"], environment);
    const next = structuredClone(productionPending);
    next.changes.push({ ...structuredClone(next.changes[0]), changeId: "chg-new-pr-fixture" });
    await writeFile(join(checkout, pendingPath), `${JSON.stringify(next)}\n`);
    await shell(checkout, "node", [cli, "finish"], environment);
    equal((await shell(checkout, "git", ["rev-parse", "main"])).trim(), mainSha);
    const dataBranch = (await shell(checkout, "git", ["rev-parse", "refs/remotes/origin/automation/race-data-update-99"])).trim();
    ok(dataBranch !== mainSha);
    deepEqual((await shell(checkout, "git", ["diff", "--name-only", mainSha, dataBranch])).trim().split("\n"), [pendingPath]);
    equal(await shell(checkout, "git", ["show", `${dataBranch}:data/canonical/race-graph-v1.json`]), "{}\n");
  } finally {
    server.close();
  }
});

test("PR create 403 leaves a traceable unlinked branch and blocks a second orphan on the next run", async () => {
  const root = await mkdtemp(join(tmpdir(), "racenext-pr-403-"));
  const bare = join(root, "remote.git");
  const checkout = join(root, "runner");
  await shell(root, "git", ["init", "--bare", bare]);
  await shell(root, "git", ["clone", bare, checkout]);
  await shell(checkout, "git", ["config", "user.name", "Fixture"]);
  await shell(checkout, "git", ["config", "user.email", "fixture@example.test"]);
  await mkdir(join(checkout, "data/pending"), { recursive: true });
  await mkdir(join(checkout, "data/sources"), { recursive: true });
  await mkdir(join(checkout, "data/canonical"), { recursive: true });
  await writeFile(join(checkout, pendingPath), `${JSON.stringify(productionPending)}\n`);
  await writeFile(join(checkout, statePath), productionState);
  await writeFile(join(checkout, "data/canonical/race-graph-v1.json"), "{}\n");
  await writeFile(join(checkout, "data/sources/race-source-registry.json"), "{}\n");
  await writeFile(join(checkout, ".gitignore"), "artifacts/\n");
  await shell(checkout, "git", ["add", "--", "data", ".gitignore"]);
  await shell(checkout, "git", ["commit", "-m", "Fixture main"]);
  await shell(checkout, "git", ["branch", "-M", "main"]);
  await shell(checkout, "git", ["push", "-u", "origin", "main"]);
  const mainSha = (await shell(checkout, "git", ["rev-parse", "HEAD"])).trim();
  let headLookups = 0;
  const server = createServer((request, response) => {
    if (request.url?.includes("state=all")) headLookups += 1;
    response.setHeader("content-type", "application/json");
    response.end("[]");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  ok(address && typeof address !== "string");
  await writeFile(join(root, "gh"), "#!/bin/sh\necho 403 >&2\nexit 1\n", { mode: 0o755 });
  const bodyPath = join(root, "pr-body.md");
  await writeFile(bodyPath, "Fixture data PR\n");
  const environment = {
    ...process.env, ...isolatedActionsEnvironment(root),
    GITHUB_REPOSITORY: "example/RaceNext", GH_TOKEN: "fixture-token",
    RACENEXT_TEST_GITHUB_API_URL: `http://127.0.0.1:${address.port}`,
    GITHUB_RUN_ID: "77", PATH: `${root}:${process.env.PATH ?? ""}`,
    PR_BODY_PATH: bodyPath, MEANINGFUL_DATA_CHANGE: "true",
  };
  try {
    await shell(checkout, "node", [cli, "prepare"], environment);
    const next = structuredClone(productionPending);
    next.changes.push({ ...structuredClone(next.changes[0]), changeId: "chg-orphan-fixture" });
    await writeFile(join(checkout, pendingPath), `${JSON.stringify(next)}\n`);
    let firstBlocked = false;
    try {
      await shell(checkout, "node", [cli, "finish"], environment);
    } catch (error) {
      match(String((error as { stderr?: string }).stderr), /PARTIAL_SUCCESS:UNLINKED_DATA_BRANCH/);
      firstBlocked = true;
    }
    ok(firstBlocked);
    ok(headLookups > 0, "PR existence must be checked after create failure");
    const orphanBranch = "automation/race-data-update-77";
    const orphanSha = (await shell(root, "git", ["--git-dir", bare, "rev-parse", `refs/heads/${orphanBranch}`])).trim();
    ok(orphanSha !== mainSha);
    await shell(checkout, "git", ["switch", "main"]);
    let secondBlocked = false;
    try {
      await shell(checkout, "node", [cli, "prepare"], { ...environment, GITHUB_RUN_ID: "78" });
    } catch (error) {
      match(String((error as { stderr?: string }).stderr), /UNLINKED_DATA_BRANCH:automation\/race-data-update-77/);
      secondBlocked = true;
    }
    ok(secondBlocked);
    equal((await shell(root, "git", ["--git-dir", bare, "rev-parse", `refs/heads/${orphanBranch}`])).trim(), orphanSha);
    equal((await shell(checkout, "git", ["rev-parse", "main"])).trim(), mainSha);
    equal((await shell(root, "git", ["--git-dir", bare, "branch", "--list", "automation/race-data-update-*"])).trim(), orphanBranch);
  } finally {
    server.close();
  }
});

test("invalid inherited Pending or State is rejected before monitoring", () => {
  throws(() => parsePrState({ pending: "{}", state: productionState }), /Invalid Pending/);
  throws(() => parsePrState({ pending: JSON.stringify(productionPending), state: "{}" }), /Invalid official source ingestion state/);
});

async function shell(cwd: string, command: string, args: string[], env = process.env): Promise<string> {
  const { stdout } = await exec(command, args, { cwd, env, maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}

function isolatedActionsEnvironment(root: string) {
  return {
    GITHUB_STEP_SUMMARY: join(root, "fixture-summary.md"),
    GITHUB_OUTPUT: join(root, "fixture-output.txt"),
    GITHUB_ENV: join(root, "fixture-env.txt"),
    GITHUB_PATH: join(root, "fixture-path.txt"),
  };
}
