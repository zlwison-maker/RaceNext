import { deepStrictEqual } from "node:assert";
import { createHash } from "node:crypto";
import {
  createPublicRaceDetailResult,
  createPublicRaceListResult,
} from "../../lib/raceGraphPublic.ts";
import { evaluatePrePublishFactGate } from "../../lib/prePublishFactGate.ts";
import { assertRaceGraphSnapshot } from "../race-update/validation.ts";
import { assertRaceSourceRegistry } from "../race-update/sourceRegistry.ts";
import type {
  RaceGraphSnapshot,
  RaceSourceRegistry,
} from "../../types/raceUpdate.ts";

export type CanonicalReleaseManifest = {
  schemaVersion: "canonical-release-manifest-v1";
  commitSha: string;
  publicHash: string;
  expected: Array<{ path: string; body: unknown }>;
};
export function buildCanonicalReleaseManifest(
  snapshot: RaceGraphSnapshot,
  registry: RaceSourceRegistry,
  commitSha: string,
): CanonicalReleaseManifest {
  assertRaceGraphSnapshot(snapshot);
  assertRaceSourceRegistry(registry);
  if (!/^[a-f0-9]{40}$/.test(commitSha))
    throw new Error("INVALID_RELEASE_COMMIT");
  for (const record of snapshot.records.filter(
    (r) => r.edition.lifecycleStatus === "active",
  )) {
    const gate = evaluatePrePublishFactGate(
      record,
      registry.editions.find((e) => e.editionId === record.edition.editionId),
    );
    if (!gate.publishable || gate.issues.length)
      throw new Error(`RELEASE_PUBLIC_FACT_GATE:${record.edition.editionId}`);
  }
  const list = createPublicRaceListResult(snapshot);
  if (list.status !== 200 || list.body.races.length === 0)
    throw new Error("RELEASE_PUBLIC_LIST_UNAVAILABLE");
  const expected: CanonicalReleaseManifest["expected"] = [
    { path: "/api/races", body: list.body },
  ];
  for (const race of list.body.races) {
    const detail = createPublicRaceDetailResult(snapshot, race.editionId);
    if (detail.status !== 200)
      throw new Error(`RELEASE_DETAIL_UNAVAILABLE:${race.editionId}`);
    expected.push({
      path: `/api/races/${encodeURIComponent(race.editionId)}`,
      body: detail.body,
    });
  }
  return {
    schemaVersion: "canonical-release-manifest-v1",
    commitSha,
    publicHash: publicContentHash(expected),
    expected,
  };
}
export function publicContentHash(
  expected: CanonicalReleaseManifest["expected"],
): string {
  // A metadata-only check must not trigger deployment.
  const stable = expected.map((e) => ({
    path: e.path,
    body: Object.fromEntries(
      Object.entries(e.body as Record<string, unknown>).filter(
        ([key]) => key !== "dataUpdatedAt",
      ),
    ),
  }));
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
export async function verifyPublicRelease(
  manifest: CanonicalReleaseManifest,
  origin: string,
  fetcher: typeof fetch = fetch,
): Promise<number> {
  if (
    origin !== "https://racenext.run" ||
    manifest.schemaVersion !== "canonical-release-manifest-v1" ||
    !/^[a-f0-9]{40}$/.test(manifest.commitSha) ||
    manifest.expected.length < 2 ||
    manifest.publicHash !== publicContentHash(manifest.expected)
  )
    throw new Error("INVALID_RELEASE_SMOKE_SCOPE");
  for (const target of manifest.expected) {
    if (!/^\/api\/races(?:\/[a-z0-9%-]+)?$/.test(target.path))
      throw new Error("INVALID_RELEASE_SMOKE_PATH");
    const response = await fetcher(`${origin}${target.path}?canonical_release=${manifest.commitSha}`, {
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      headers: { "Cache-Control": "no-cache" },
    });
    if (response.status !== 200)
      throw new Error(`RELEASE_API_HTTP:${target.path}:${response.status}`);
    if (Number(response.headers.get("content-length")) > 5_000_000)
      throw new Error("RELEASE_API_RESPONSE_TOO_LARGE");
    const text = await response.text();
    if (Buffer.byteLength(text) > 5_000_000)
      throw new Error("RELEASE_API_RESPONSE_TOO_LARGE");
    const actual = JSON.parse(text);
    for (const key of [
      "governance",
      "rawData",
      "mergeTrace",
      "confidence",
      "pending",
      "contentHash",
    ])
      if (JSON.stringify(actual).includes(`"${key}":`))
        throw new Error("RELEASE_API_INTERNAL_DATA_LEAK");
    deepStrictEqual(
      actual,
      target.body,
      `RELEASE_API_DATA_MISMATCH:${target.path}`,
    );
  }
  return manifest.expected.length;
}
