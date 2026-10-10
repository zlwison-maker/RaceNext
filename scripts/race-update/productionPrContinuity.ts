import type { OfficialSourceIngestionState } from "../../types/officialSourceIngestion.ts";
import type { PendingChangeStore } from "../../types/raceUpdate.ts";
import { assertOfficialIngestionState, assertPendingChangeStore } from "./persistence.ts";
import { assertDataOnlyPaths } from "./productionWorkflow.ts";

export type AutomationDataPr = {
  number: number;
  url: string;
  headRef: string;
  headSha: string;
  headRepo: string;
};

export type ContinuityPlan =
  | { mode: "new"; mainSha: string }
  | { mode: "continue"; mainSha: string; pr: AutomationDataPr };

const BRANCH_PATTERN = /^automation\/race-data-update-[0-9]+$/;
const STATE_PATHS = [
  "data/pending/race-update-pending.json",
  "data/sources/official-source-ingestion-state.json",
] as const;
const MAIN_CONFLICT_PATHS = new Set([
  "data/canonical/race-graph-v1.json",
  "data/sources/race-source-registry.json",
  ...STATE_PATHS,
]);

export function planAutomationDataPr(input: {
  prs: AutomationDataPr[];
  repository: string;
  mainSha: string;
}): ContinuityPlan {
  const candidates = input.prs.filter(({ headRef }) => headRef.startsWith("automation/race-data-update-"));
  if (candidates.length > 1) {
    throw new Error(`MULTIPLE_OPEN_DATA_PRS:${candidates.map(({ number, url }) => `#${number} ${url}`).join(" | ")}`);
  }
  if (candidates.length === 0) return { mode: "new", mainSha: input.mainSha };
  const pr = candidates[0];
  if (!BRANCH_PATTERN.test(pr.headRef) || pr.headRepo.toLowerCase() !== input.repository.toLowerCase()
    || !/^[0-9a-f]{40}$/.test(pr.headSha)) {
    throw new Error(`UNTRUSTED_DATA_PR_HEAD:#${pr.number}`);
  }
  return { mode: "continue", mainSha: input.mainSha, pr };
}

export function assertSafePrBaseline(input: {
  prPaths: string[];
  mainPaths: string[];
}): void {
  const unexpected = input.prPaths.filter((path) => !STATE_PATHS.includes(path as typeof STATE_PATHS[number]));
  if (unexpected.length) throw new Error(`UNTRUSTED_DATA_PR_DIFF:${unexpected.join(",")}`);
  const conflict = input.mainPaths.filter((path) => MAIN_CONFLICT_PATHS.has(path));
  if (conflict.length) throw new Error(`MAIN_BASELINE_CONFLICT:${conflict.join(",")}`);
}

export function parsePrState(input: { pending: string; state: string }): {
  pending: PendingChangeStore;
  state: OfficialSourceIngestionState;
} {
  const pending = JSON.parse(input.pending) as unknown;
  const state = JSON.parse(input.state) as unknown;
  assertPendingChangeStore(pending);
  assertOfficialIngestionState(state);
  return { pending, state };
}

export function assertFinishBaseline(input: {
  start: ContinuityPlan;
  current: ContinuityPlan;
  remoteMainSha: string;
  remoteHeadSha?: string;
}): void {
  if (input.remoteMainSha !== input.start.mainSha || input.current.mainSha !== input.start.mainSha) {
    throw new Error("MAIN_BASELINE_CHANGED");
  }
  if (input.start.mode !== input.current.mode) throw new Error("DATA_PR_HEAD_CHANGED");
  if (input.start.mode === "continue" && input.current.mode === "continue") {
    if (input.current.pr.number !== input.start.pr.number
      || input.current.pr.headSha !== input.start.pr.headSha
      || input.remoteHeadSha !== input.start.pr.headSha) {
      throw new Error("DATA_PR_HEAD_CHANGED");
    }
  }
}

export function assertOutputDataOnly(paths: string[]): void {
  assertDataOnlyPaths(paths);
  if (paths.includes("data/canonical/race-graph-v1.json")) throw new Error("CANONICAL_AUTOMATIC_WRITE_FORBIDDEN");
}
