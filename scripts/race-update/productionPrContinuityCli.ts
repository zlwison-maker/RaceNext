import { execFile } from "node:child_process";
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import {
  assertFinishBaseline,
  assertOutputDataOnly,
  assertSafePrBaseline,
  parsePrState,
  planAutomationDataPr,
  type AutomationDataPr,
  type ContinuityPlan,
} from "./productionPrContinuity.ts";
import {
  OFFICIAL_INGESTION_STATE_PATH,
  PENDING_CHANGE_PATH,
  persistPendingChangeStoreAtomic,
  writeJsonAtomicValidated,
  assertOfficialIngestionState,
} from "./persistence.ts";

const exec = promisify(execFile);
const CONTEXT_PATH = "artifacts/race-update/continuity-context.json";
const repository = process.env.GITHUB_REPOSITORY ?? "";
const token = process.env.GH_TOKEN ?? "";
const testApiBase = process.env.RACENEXT_TEST_GITHUB_API_URL;
if (testApiBase && !/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(testApiBase)) {
  throw new Error("TEST_GITHUB_API_MUST_BE_LOOPBACK");
}
const githubApiBase = testApiBase ?? "https://api.github.com";
const mode = process.argv[2];
if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !token) {
  throw new Error("CONTINUITY_GITHUB_CONTEXT_MISSING");
}

try {
  if (mode === "prepare") await prepare();
  else if (mode === "finish") await finish();
  else throw new Error("CONTINUITY_MODE_REQUIRED:prepare|finish");
} catch (error) {
  const reason = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  if (reason.startsWith("PARTIAL_SUCCESS:")) {
    await summary(reason);
    console.log("CONTINUITY_RESULT=PARTIAL_SUCCESS");
  } else {
    await summary(`WRITE_BLOCKED / RUN_FAILED: ${reason}`);
  }
  throw error;
}

async function prepare(): Promise<void> {
  const mainSha = (await git("rev-parse", "HEAD")).trim();
  if ((await remoteSha("main")) !== mainSha) throw new Error("MAIN_BASELINE_CHANGED");
  const plan = planAutomationDataPr({ prs: await listOpenPrs(), repository, mainSha });
  if (plan.mode === "new") await assertNoUnlinkedBranches();
  if (plan.mode === "continue") {
    const { pr } = plan;
    await git("fetch", "--no-tags", "origin", `refs/heads/${pr.headRef}`);
    const fetched = (await git("rev-parse", "FETCH_HEAD")).trim();
    if (fetched !== pr.headSha || (await remoteSha(pr.headRef)) !== pr.headSha) {
      throw new Error("DATA_PR_HEAD_CHANGED");
    }
    const base = (await git("merge-base", mainSha, pr.headSha)).trim();
    assertSafePrBaseline({
      prPaths: await diffPaths(base, pr.headSha),
      mainPaths: await diffPaths(base, mainSha),
    });
    const pending = await git("show", `${pr.headSha}:${PENDING_CHANGE_PATH}`);
    const state = await git("show", `${pr.headSha}:${OFFICIAL_INGESTION_STATE_PATH}`);
    const parsed = parsePrState({ pending, state });
    // Both documents are validated before either is written. Pending remains durable before State.
    await persistPendingChangeStoreAtomic({ store: parsed.pending });
    await writeJsonAtomicValidated({
      path: OFFICIAL_INGESTION_STATE_PATH,
      value: parsed.state,
      validate: assertOfficialIngestionState,
    });
  }
  await mkdir("artifacts/race-update", { recursive: true });
  await writeFile(CONTEXT_PATH, `${JSON.stringify(plan)}\n`, "utf8");
  await summary(`MONITORING_PREPARED; Canonical=${mainSha}; Pending/State=${plan.mode === "continue" ? `PR #${plan.pr.number} ${plan.pr.headSha}` : "main"}`);
  console.log(`CONTINUITY_MODE=${plan.mode}`);
}

async function finish(): Promise<void> {
  const start = JSON.parse(await readFile(CONTEXT_PATH, "utf8")) as ContinuityPlan;
  const currentMain = (await git("rev-parse", "HEAD")).trim();
  const current = planAutomationDataPr({ prs: await listOpenPrs(), repository, mainSha: currentMain });
  assertFinishBaseline({
    start,
    current,
    remoteMainSha: await remoteSha("main"),
    remoteHeadSha: start.mode === "continue" ? await remoteSha(start.pr.headRef) : undefined,
  });
  const changed = await diffPaths(start.mainSha);
  assertOutputDataOnly(changed);
  const meaningful = process.env.MEANINGFUL_DATA_CHANGE === "true";
  if (!meaningful) {
    await summary("MONITORING_EXECUTED; NO_MEANINGFUL_CHANGE; durable PR state unchanged");
    console.log("CONTINUITY_RESULT=NO_MEANINGFUL_CHANGE");
    return;
  }
  if (changed.length === 0) throw new Error("MEANINGFUL_CHANGE_WITHOUT_DATA_DIFF");
  if (start.mode === "continue") await updateExisting(start);
  else await createNew(start);
}

async function updateExisting(plan: Extract<ContinuityPlan, { mode: "continue" }>): Promise<void> {
  const review = reviewMetadata();
  const directory = await mkdtemp(join(tmpdir(), "racenext-continuity-"));
  const checkout = join(directory, "data-pr");
  let attached = false;
  try {
    await git("worktree", "add", "--detach", checkout, plan.pr.headSha);
    attached = true;
    for (const path of [PENDING_CHANGE_PATH, OFFICIAL_INGESTION_STATE_PATH]) {
      await writeFile(join(checkout, path), await readFile(path));
    }
    await run("git", ["-C", checkout, "add", "--", PENDING_CHANGE_PATH, OFFICIAL_INGESTION_STATE_PATH]);
    const staged = await run("git", ["-C", checkout, "diff", "--cached", "--name-only"]);
    assertOutputDataOnly(staged.trim().split("\n").filter(Boolean));
    if (!staged.trim()) throw new Error("MEANINGFUL_CHANGE_WITHOUT_DATA_DIFF");
    await run("git", ["-C", checkout, "diff", "--cached", "--check"]);
    await run("git", ["-C", checkout, "-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "commit", "-m", "Continue race data monitoring state"]);
    const headSha = (await run("git", ["-C", checkout, "rev-parse", "HEAD"])).trim();
    await assertRemoteUnchanged(plan);
    try {
      await run("git", ["-C", checkout, "push", "origin", `HEAD:refs/heads/${plan.pr.headRef}`]);
    } catch {
      throw new Error("DATA_PR_HEAD_CHANGED_OR_PUSH_FAILED");
    }
    const comment = [
      "## Race Data Update — latest monitored run",
      "",
      `- Run ID: ${review.runId}`,
      `- Data PR Head SHA: ${headSha}`,
      `- New Pending: ${review.newPending}`,
      `- Deduped Pending: ${review.dedupedPending}`,
      `- Sanitized report artifact: ${review.artifactName}`,
      `- Workflow run: https://github.com/${repository}/actions/runs/${review.runId}`,
      "- Auto Apply: OFF; Canonical automatic writes: ZERO.",
      "",
      "Review the current PR diff and this run artifact before merging.",
    ].join("\n");
    try {
      await postReviewComment(plan.pr.number, comment);
    } catch {
      throw new Error(`PARTIAL_SUCCESS:DATA_PR_UPDATED_REVIEW_SUMMARY_FAILED; PR=#${plan.pr.number}; Head=${headSha}; Run=${review.runId}; Artifact=${review.artifactName}; branch changes are durable; human review required at ${plan.pr.url}`);
    }
    await summary(`MONITORING_EXECUTED; DATA_PR_UPDATED #${plan.pr.number} ${plan.pr.url}; Head=${headSha}; Run=${review.runId}; NewPending=${review.newPending}; Artifact=${review.artifactName}; review_summary=posted`);
    console.log("CONTINUITY_RESULT=DATA_PR_UPDATED");
  } finally {
    if (attached) await git("worktree", "remove", "--force", checkout);
    await rm(directory, { recursive: true, force: true });
  }
}

async function createNew(plan: Extract<ContinuityPlan, { mode: "new" }>): Promise<void> {
  const branch = `automation/race-data-update-${process.env.GITHUB_RUN_ID ?? ""}`;
  if (!/^automation\/race-data-update-[0-9]+$/.test(branch)) throw new Error("GITHUB_RUN_ID_MISSING");
  const bodyPath = process.env.PR_BODY_PATH ?? "";
  if (!bodyPath) throw new Error("PR_BODY_PATH_MISSING");
  await assertRemoteUnchanged(plan);
  await git("switch", "-c", branch, plan.mainSha);
  await git("add", "--", PENDING_CHANGE_PATH, OFFICIAL_INGESTION_STATE_PATH);
  const staged = (await git("diff", "--cached", "--name-only")).trim().split("\n").filter(Boolean);
  assertOutputDataOnly(staged);
  if (!staged.length) throw new Error("MEANINGFUL_CHANGE_WITHOUT_DATA_DIFF");
  await git("diff", "--cached", "--check");
  await git("-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "commit", "-m", "Update race data from official sources");
  await assertRemoteUnchanged(plan);
  await git("push", "origin", branch);
  const pushedSha = (await git("rev-parse", "HEAD")).trim();
  // A newly opened automation PR after the push must not become a competing PR.
  try {
    await assertRemoteUnchanged(plan);
  } catch {
    throw new Error(`PARTIAL_SUCCESS:DATA_BRANCH_PUSHED_PR_CONFLICT; Branch=${branch}; Head=${pushedSha}; Run=${process.env.GITHUB_RUN_ID}; human review required before another run`);
  }
  const title = `Race data update: ${new Date().toISOString().slice(0, 10)}`;
  try {
    await run("gh", ["pr", "create", "--repo", repository, "--base", "main", "--head", branch, "--title", title, "--body-file", bodyPath]);
  } catch {
    let linked: TrackedPull[];
    try {
      linked = await listPrsForHead(branch);
    } catch {
      throw new Error(`PARTIAL_SUCCESS:DATA_PR_CREATE_OUTCOME_UNVERIFIED; Branch=${branch}; Head=${pushedSha}; Run=${process.env.GITHUB_RUN_ID}; remote branch is durable; human review required`);
    }
    const created = linked.find((pr) => pr.state === "open" && pr.baseRef === "main");
    if (created && created.headSha !== pushedSha) {
      throw new Error(`PARTIAL_SUCCESS:DATA_PR_CREATED_HEAD_CHANGED; Branch=${branch}; PushedHead=${pushedSha}; CurrentHead=${created.headSha}; PR=#${created.number}; human review required`);
    }
    if (!created) {
      throw new Error(`PARTIAL_SUCCESS:UNLINKED_DATA_BRANCH; Branch=${branch}; Head=${pushedSha}; Run=${process.env.GITHUB_RUN_ID}; no PR found; human must link or resolve this branch before the next run`);
    }
    await summary(`MONITORING_EXECUTED; DATA_PR_CREATED #${created.number} ${created.url}; Head=${pushedSha}; PR create command failed but the PR exists`);
    console.log("CONTINUITY_RESULT=DATA_PR_CREATED");
    return;
  }
  await summary(`MONITORING_EXECUTED; DATA_PR_CREATED ${branch}; persisted=yes`);
  console.log("CONTINUITY_RESULT=DATA_PR_CREATED");
}

async function assertRemoteUnchanged(plan: ContinuityPlan): Promise<void> {
  const current = planAutomationDataPr({ prs: await listOpenPrs(), repository, mainSha: plan.mainSha });
  assertFinishBaseline({
    start: plan,
    current,
    remoteMainSha: await remoteSha("main"),
    remoteHeadSha: plan.mode === "continue" ? await remoteSha(plan.pr.headRef) : undefined,
  });
}

type TrackedPull = AutomationDataPr & { state: string; baseRef: string };

async function listOpenPrs(): Promise<AutomationDataPr[]> {
  return listPulls("state=open&base=main");
}

async function listPrsForHead(branch: string): Promise<TrackedPull[]> {
  const owner = repository.split("/")[0];
  const all = await listPulls(`state=all&head=${encodeURIComponent(`${owner}:${branch}`)}`);
  return all.filter((pr) => pr.headRef === branch && pr.headRepo.toLowerCase() === repository.toLowerCase());
}

async function listPulls(query: string): Promise<TrackedPull[]> {
  const result: TrackedPull[] = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${githubApiBase}/repos/${repository}/pulls?${query}&per_page=100&page=${page}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error(`GITHUB_PR_LIST_FAILED:${response.status}`);
    const batch = await response.json() as Array<{
      number: number; html_url: string; state: string;
      base: { ref: string };
      head: { ref: string; sha: string; repo: { full_name: string } | null };
    }>;
    if (!Array.isArray(batch)) throw new Error("GITHUB_PR_LIST_INVALID");
    for (const pr of batch) result.push({
      number: pr.number, url: pr.html_url, headRef: pr.head.ref,
      headSha: pr.head.sha, headRepo: pr.head.repo?.full_name ?? "",
      state: pr.state, baseRef: pr.base?.ref ?? "",
    });
    if (batch.length < 100) return result;
  }
}

async function assertNoUnlinkedBranches(): Promise<void> {
  const remote = await git("ls-remote", "--heads", "origin", "refs/heads/automation/race-data-update-*");
  const unlinked: string[] = [];
  for (const line of remote.trim().split("\n").filter(Boolean)) {
    const [sha, ref] = line.split(/\s+/);
    const branch = ref?.replace(/^refs\/heads\//, "");
    if (!branch || !/^automation\/race-data-update-[0-9]+$/.test(branch)) continue;
    if ((await listPrsForHead(branch)).length === 0) unlinked.push(`${branch}@${sha}`);
  }
  if (unlinked.length) throw new Error(`UNLINKED_DATA_BRANCH:${unlinked.join(",")}; human must link or resolve the remote branch before monitoring creates another`);
}

function reviewMetadata(): { runId: string; artifactName: string; newPending: number; dedupedPending: number } {
  const runId = process.env.GITHUB_RUN_ID ?? "";
  const artifactName = process.env.ARTIFACT_NAME ?? "";
  const newPending = Number(process.env.NEW_PENDING_COUNT);
  const dedupedPending = Number(process.env.DEDUPED_PENDING_COUNT);
  if (!/^[0-9]+$/.test(runId) || !/^race-update-report-[0-9]+$/.test(artifactName)
    || !Number.isSafeInteger(newPending) || newPending < 0
    || !Number.isSafeInteger(dedupedPending) || dedupedPending < 0) {
    throw new Error("CONTINUITY_REVIEW_METADATA_INVALID");
  }
  return { runId, artifactName, newPending, dedupedPending };
}

async function postReviewComment(prNumber: number, body: string): Promise<void> {
  const response = await fetch(`${githubApiBase}/repos/${repository}/issues/${prNumber}/comments`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) throw new Error(`DATA_PR_REVIEW_COMMENT_FAILED:${response.status}`);
}

async function diffPaths(left: string, right?: string): Promise<string[]> {
  const args = ["diff", "--name-only", left];
  if (right) args.push(right);
  return (await git(...args)).trim().split("\n").filter(Boolean);
}

async function remoteSha(branch: string): Promise<string> {
  const result = await git("ls-remote", "origin", `refs/heads/${branch}`);
  const sha = result.trim().split(/\s+/)[0];
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("DATA_PR_OR_MAIN_BRANCH_MISSING");
  return sha;
}

async function git(...args: string[]): Promise<string> { return run("git", args); }
async function run(command: string, args: string[]): Promise<string> {
  const { stdout } = await exec(command, args, { maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}
async function summary(line: string): Promise<void> {
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
  console.log(line);
}
