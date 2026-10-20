import { expectedPublicEditionIds } from "./fixtures/contentBatch20261020.ts";
import { equal, ok, rejects, throws } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildCanonicalReleaseManifest,
  verifyPublicRelease,
} from "../scripts/release/canonicalRelease.ts";
import { loadRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import type { RaceGraphSnapshot } from "../types/raceUpdate.ts";
const snapshot = JSON.parse(
  readFileSync(
    new URL("../data/canonical/race-graph-v1.json", import.meta.url),
    "utf8",
  ),
) as RaceGraphSnapshot;
const registry = await loadRaceSourceRegistry();
const sha = "a".repeat(40);
test("release is dynamic, excludes metadata-only triggers, and validates all Public Fact Gates", () => {
  const first = buildCanonicalReleaseManifest(snapshot, registry, sha);
  equal(first.expected.length, expectedPublicEditionIds.length + 1);
  const metadata = structuredClone(snapshot);
  metadata.generatedAt = "2026-10-15T00:00:00Z";
  equal(
    first.publicHash,
    buildCanonicalReleaseManifest(metadata, registry, sha).publicHash,
  );
  const changed = structuredClone(snapshot);
  changed.records.find(
    (r) => r.edition.editionId === "ninghai-ultra-trail-2026",
  )!.categories[0].finishLocation = "Fixture approved finish";
  ok(
    first.publicHash !==
      buildCanonicalReleaseManifest(changed, registry, sha).publicHash,
  );
  const invalid = structuredClone(snapshot);
  invalid.records[0].edition.governance.publicationGate!.publishable = false;
  throws(
    () => buildCanonicalReleaseManifest(invalid, registry, sha),
    /PUBLIC_FACT_GATE/,
  );
});
test("production smoke checks every expected DTO and rejects stale, leaking or failing API without disabling HTTPS", async () => {
  const manifest = buildCanonicalReleaseManifest(snapshot, registry, sha);
  const fetcher = (async (url) =>
    new Response(
      JSON.stringify(
        manifest.expected.find((e) => new URL(String(url)).pathname === e.path)?.body,
      ),
      { headers: { "content-type": "application/json" } },
    )) as typeof fetch;
  equal(
    await verifyPublicRelease(manifest, "https://racenext.run", fetcher),
    manifest.expected.length,
  );
  await rejects(
    verifyPublicRelease(manifest, "http://racenext.run", fetcher),
    /SMOKE_SCOPE/,
  );
  await rejects(
    verifyPublicRelease(
      manifest,
      "https://racenext.run",
      (async () => new Response("", { status: 503 })) as typeof fetch,
    ),
    /API_HTTP/,
  );
  await rejects(
    verifyPublicRelease(manifest, "https://racenext.run", (async () =>
      Response.json({ governance: {} })) as typeof fetch),
    /INTERNAL_DATA_LEAK/,
  );
  await rejects(
    verifyPublicRelease(manifest, "https://racenext.run", (async () =>
      Response.json({
        schemaVersion: "race-graph-public-v1",
        races: [],
      })) as typeof fetch),
    /DATA_MISMATCH/,
  );
});
test("deployment stays off until audited setup; no PR merge, model credentials, unchecked host keys or workflow dispatch", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/canonical-data-release.yml", import.meta.url),
    "utf8",
  );
  ok(workflow.includes("vars.CANONICAL_DEPLOY_ENABLED == 'true'"));
  ok(workflow.includes("vars.DEPLOY_REVIEW_POLICY_VERIFIED == 'true'"));
  ok(workflow.includes("environment: production"));
  ok(workflow.includes("StrictHostKeyChecking=yes"));
  ok(workflow.includes("cancel-in-progress: false"));
  equal(
    /StrictHostKeyChecking=no|curl -k|gh pr merge|workflow_dispatch|FACT_EXTRACTION_API_KEY/.test(
      workflow,
    ),
    false,
  );
  ok(workflow.includes("needs.validate.outputs.public_fact_change"));
  ok(workflow.includes("publicApiSmokeCli.ts"));
});
