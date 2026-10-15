import { mkdir, readFile } from "node:fs/promises";
import { discoverBeijingOfficialCandidates } from "./sourceDiscovery.ts";
import {
  discoverOfficialSources,
  assertDiscoveryLedger,
} from "./multiRaceDiscovery.ts";
import { loadRaceSourceRegistry } from "./sourceRegistry.ts";
import { assertRaceGraphSnapshot } from "./validation.ts";
import { CANONICAL_PATH, writeJsonAtomicValidated } from "./persistence.ts";
import { assertSanitizedText } from "./productionWorkflow.ts";

const args = process.argv.slice(2);
if (!args.length) {
  const report = await discoverBeijingOfficialCandidates();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== "success") process.exitCode = 1;
} else if (args.length === 1 && args[0] === "--all") {
  const snapshot = JSON.parse(await readFile(CANONICAL_PATH, "utf8"));
  assertRaceGraphSnapshot(snapshot);
  let ledger;
  try {
    ledger = JSON.parse(
      await readFile("artifacts/source-discovery-input.json", "utf8"),
    );
    assertDiscoveryLedger(ledger);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const result = await discoverOfficialSources({
    snapshot,
    registry: await loadRaceSourceRegistry(),
    ledger,
  });
  const reportPath = "artifacts/race-update/source-discovery-report.json",
    ledgerPath = "artifacts/race-update/source-discovery-ledger.json";
  // Listing content is untrusted. A disclosure failure isolates Discovery, never relaxes a fact gate.
  assertSanitizedText({
    text: JSON.stringify(result),
    environment: process.env,
  });
  await mkdir("artifacts/race-update", { recursive: true });
  await writeJsonAtomicValidated({
    path: ledgerPath,
    value: result.ledger,
    validate: assertDiscoveryLedger,
    allowedPaths: [ledgerPath],
  });
  await writeJsonAtomicValidated({
    path: reportPath,
    value: {
      ...result.report,
      dedupBaseline: ledger ? "available" : "not_available",
    },
    validate: (value) => {
      if (
        (value as typeof result.report).schemaVersion !==
        "multi-race-discovery-v1"
      )
        throw new Error("INVALID_DISCOVERY_REPORT");
    },
    allowedPaths: [reportPath],
  });
  console.log(
    `DISCOVERY_EDITIONS=${result.report.summary.editionsChecked} NEW_SOURCES=${result.report.summary.newSources} NEEDS_REVIEW=${result.report.summary.unresolvedReview} FAILED=${result.report.summary.failed} NOT_COVERED=${result.report.summary.notCovered} MODEL_CALLS=0`,
  );
} else throw new Error("Usage: sourceDiscoveryCli.ts [--all]");
