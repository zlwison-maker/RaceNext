import { discoverBeijingOfficialCandidates } from "./sourceDiscovery.ts";

const report = await discoverBeijingOfficialCandidates();
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status !== "success") process.exitCode = 1;
