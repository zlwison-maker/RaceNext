import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { buildCanonicalReleaseManifest } from "./canonicalRelease.ts";
import { loadRaceSourceRegistry } from "../race-update/sourceRegistry.ts";
import { assertPendingChangeStore } from "../race-update/persistence.ts";

const base = process.argv[2],
  head = process.env.GITHUB_SHA;
if (
  !base ||
  !/^[a-f0-9]{40}$/.test(base) ||
  !head ||
  !/^[a-f0-9]{40}$/.test(head)
)
  throw new Error("RELEASE_BASELINE_REQUIRED");
const registry = await loadRaceSourceRegistry();
const pending = JSON.parse(
  await readFile("data/pending/race-update-pending.json", "utf8"),
);
assertPendingChangeStore(pending);
const after = buildCanonicalReleaseManifest(
  JSON.parse(await readFile("data/canonical/race-graph-v1.json", "utf8")),
  registry,
  head,
);
const previous = JSON.parse(
  execFileSync("git", ["show", `${base}:data/canonical/race-graph-v1.json`], {
    encoding: "utf8",
  }),
);
const before = buildCanonicalReleaseManifest(previous, registry, base);
const changed = after.publicHash !== before.publicHash;
await mkdir("artifacts/release", { recursive: true });
await writeFile(
  "artifacts/release/canonical-release-manifest.json",
  JSON.stringify(after, null, 2) + "\n",
);
if (process.env.GITHUB_OUTPUT)
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `public_fact_change=${changed}\n`,
  );
console.log(
  `PUBLIC_FACT_CHANGE=${changed} PUBLIC_ENDPOINTS=${after.expected.length} AUTO_APPLY=OFF`,
);
