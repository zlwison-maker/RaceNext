import { readFile } from "node:fs/promises";

import { validateNinghaiReadOnly } from "./ninghaiReadOnlyValidation.ts";

const graph = JSON.parse(await readFile(new URL("../../data/canonical/race-graph-v1.json", import.meta.url), "utf8"));
const record = graph.records.find((item: { edition: { editionId: string } }) => item.edition.editionId === "ninghai-ultra-trail-2026");
if (!record) throw new Error("Ninghai 2026 record was not found.");
const report = await validateNinghaiReadOnly({ record });
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status === "failed") process.exitCode = 1;
