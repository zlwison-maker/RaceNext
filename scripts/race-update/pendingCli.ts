import type { PendingChangeStatus } from "../../types/raceUpdate.ts";
import { runPendingCommand } from "./pendingStore.ts";

const [actionArg, ...argv] = process.argv.slice(2);
const action = actionArg as "list" | "approve" | "reject" | "apply";
if (!["list", "approve", "reject", "apply"].includes(action)) {
  throw new Error("Usage: pendingCli.ts <list|approve|reject|apply> [--id=<changeId>] [--status=<status>] [--reason=<text>]");
}
const changeId = valueFor(argv, "--id=");
const reason = valueFor(argv, "--reason=");
const status = valueFor(argv, "--status=") as PendingChangeStatus | "all" | undefined;
if (status && !["pending", "approved", "rejected", "applied", "all"].includes(status)) {
  throw new Error(`Unsupported pending status filter: ${status}`);
}

try {
  const changes = await runPendingCommand({ action, changeId, reason, status });
  if (action === "list") {
    if (changes.length === 0) console.log("No matching pending changes.");
    else console.table(changes.map((change) => ({
      id: change.changeId,
      status: change.status,
      event: change.eventId,
      edition: change.editionId,
      category: change.categoryId ?? "—",
      field: change.field,
      current: JSON.stringify(change.currentValue),
      candidate: change.conflict
        ? `CONFLICT ${JSON.stringify(change.candidateOptions?.map(({ value }) => value) ?? [])}`
        : JSON.stringify(change.candidateValue),
      source: change.sourceId,
      risk: change.risk,
    })));
  } else {
    console.log(`${changes[0].changeId}: ${changes[0].status}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function valueFor(argv: string[], prefix: string): string | undefined {
  return argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}
