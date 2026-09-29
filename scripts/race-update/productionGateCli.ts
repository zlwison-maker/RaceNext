import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import {
  assertDataOnlyPaths,
  assertProductionSecrets,
  assertSanitizedText,
  DATA_ONLY_PR_ALLOWLIST,
} from "./productionWorkflow.ts";

const [command] = process.argv.slice(2);

if (command === "data-only") {
  const changed = gitLines(["diff", "--name-only", "--no-ext-diff", "--"]);
  const untracked = gitLines(["ls-files", "--others", "--exclude-standard"]);
  assertDataOnlyPaths([...changed, ...untracked]);
  console.log(`DATA_ONLY_DIFF=pass files=${[...new Set([...changed, ...untracked])].length}`);
} else if (command === "secret-scan") {
  assertProductionSecrets(process.env);
  const artifactFiles = [
    "artifacts/race-update/race-update-report.json",
    "artifacts/race-update/race-update-pr-body.md",
  ];
  for (const path of artifactFiles) {
    const text = await readFile(path, "utf8");
    assertSanitizedText({ text, environment: process.env });
  }
  for (const path of DATA_ONLY_PR_ALLOWLIST) {
    const text = await readFile(path, "utf8");
    assertSanitizedText({ text, environment: process.env, scanMarkers: false });
  }
  console.log(`SECRET_SCAN=pass files=${artifactFiles.length + DATA_ONLY_PR_ALLOWLIST.length}`);
} else {
  throw new Error("Usage: productionGateCli.ts <data-only|secret-scan>");
}

function gitLines(args: string[]): string[] {
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
