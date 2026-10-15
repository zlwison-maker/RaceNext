import { deepEqual, equal, ok, throws, rejects } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  assertDailyMonitoringCoverage,
  buildRaceDailyCheckTargets,
  runRaceDailyCheck,
} from "../scripts/race-update/dailyCheck.ts";
import type { FactExtractionProvider } from "../types/officialSourceIngestion.ts";
import type {
  RaceGraphSnapshot,
  RaceSourceRegistry,
} from "../types/raceUpdate.ts";

const original = JSON.parse(
  readFileSync(
    new URL("../data/canonical/race-graph-v1.json", import.meta.url),
    "utf8",
  ),
) as RaceGraphSnapshot;
function scenario(size: number) {
  const snapshot = structuredClone(original);
  snapshot.records = [];
  const registry: RaceSourceRegistry = {
    schemaVersion: "race-source-registry-v1",
    editions: [],
  };
  for (let i = 0; i < size; i++) {
    const record = structuredClone(original.records[0]);
    const oldEvent = record.event.eventId,
      oldEdition = record.edition.editionId;
    const eventId = `fixture-marathon-${i}`,
      editionId = `${eventId}-2026`;
    const rewritten = JSON.parse(
      JSON.stringify(record)
        .replaceAll(oldEdition, editionId)
        .replaceAll(oldEvent, eventId),
    ) as typeof record;
    rewritten.event.canonicalName = `Fixture Marathon ${i}`;
    rewritten.event.aliases = [];
    rewritten.edition.editionName = `2026 Fixture Marathon ${i}`;
    snapshot.records.push(rewritten);
    registry.editions.push({
      editionId,
      sources: [
        {
          sourceId: `fixture-official-${i}`,
          url: `https://fixture.example/race/${i}`,
          domain: "fixture.example",
          tier: "primary_official",
          sourceType: "event_home",
          status: "active",
          isPrimary: true,
          notes: null,
        },
      ],
    });
  }
  let calls = 0;
  const provider: FactExtractionProvider = {
    id: "fixture",
    configured: true,
    model: "fixture",
    promptVersion: "fixture-v1",
    async extract() {
      calls++;
      return {
        output: { contractVersion: "official-fact-extraction-v1", facts: [] },
        provider: "fixture",
        model: "fixture",
        protocol: "openai-compatible-chat-completions",
        reasoningMode: "none",
        structuredOutputMode: "strict_json_schema",
        promptVersion: "fixture-v1",
        latencyMs: 1,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      };
    },
  };
  const fetcher = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const i = Number(url.pathname.split("/").at(-1));
    return new Response(
      `<title>2026 Fixture Marathon ${i}</title><body>2026 Fixture Marathon ${i}</body>`,
      { headers: { "content-type": "text/html" } },
    );
  }) as typeof fetch;
  const run = (
    state = {
      schemaVersion: "official-source-ingestion-state-v1" as const,
      sources: [],
    } as Parameters<typeof runRaceDailyCheck>[0]["state"],
  ) =>
    runRaceDailyCheck({
      snapshot,
      registry,
      state,
      pendingStore: { schemaVersion: "race-update-pending-v1", changes: [] },
      provider,
      fetcher,
      now: () => "2026-10-14T11:00:00Z",
      autoApplyLowRisk: false,
    });
  return { snapshot, registry, run, calls: () => calls };
}
for (const count of [12, 20, 30])
  test(`dynamic monitoring covers ${count} Editions and every source; same hashes skip without writes`, async () => {
    const fixture = scenario(count);
    const before = structuredClone(fixture.snapshot);
    const first = await fixture.run();
    equal(first.report.summary.editionsChecked, count);
    equal(first.report.summary.sourcesChecked, count);
    equal(first.report.summary.modelCalls, count);
    equal(fixture.calls(), count);
    ok(first.report.editions.every((e) => e.health === "HEALTHY"));
    equal(first.report.summary.canonicalWrites, 0);
    deepEqual(fixture.snapshot, before);
    const second = await fixture.run(first.prepared.nextState);
    equal(second.report.summary.modelCalls, 0);
    equal(second.report.summary.sourcesUnchanged, count);
    equal(second.prepared.pendingStore.changes.length, 0);
    equal(second.report.summary.canonicalWrites, 0);
    const omitted = structuredClone(first.report);
    omitted.editions.pop();
    omitted.summary.editionsChecked--;
    throws(
      () =>
        assertDailyMonitoringCoverage(
          fixture.snapshot,
          fixture.registry,
          omitted,
        ),
      /EDITION_COVERAGE_MISMATCH/,
    );
    const skipped = structuredClone(first.report);
    skipped.extraction.sources.pop();
    throws(
      () =>
        assertDailyMonitoringCoverage(
          fixture.snapshot,
          fixture.registry,
          skipped,
        ),
      /SOURCE_COVERAGE_MISMATCH/,
    );
  });
test("missing Registry or official source produces explicit gaps and never HEALTHY", async () => {
  const fixture = scenario(3);
  fixture.registry.editions.shift();
  fixture.registry.editions[0].sources[0].tier = "trusted_structured";
  fixture.registry.editions[0].sources[0].sourceType = "event_directory";
  fixture.registry.editions[0].sources[0].isPrimary = false;
  const result = await fixture.run();
  equal(result.report.editions[0].health, "NO_VALID_SOURCE");
  equal(result.report.editions[1].health, "PARTIAL");
  ok(
    result.report.sourceGaps.some(
      (e) => e.editionId === fixture.snapshot.records[0].edition.editionId,
    ),
  );
  equal(
    result.report.verificationAlerts.filter(
      (a) => a.reasonCode === "OFFICIAL_SOURCE_NOT_REGISTERED",
    ).length,
    2,
  );
});
test("zero monitoring and wholly absent Registry fail closed; archived Editions are not daily targets", async () => {
  const fixture = scenario(2);
  fixture.snapshot.records[0].edition.lifecycleStatus = "archived";
  equal(
    buildRaceDailyCheckTargets(fixture.snapshot, fixture.registry, "2026-10-14T11:00:00Z").length,
    1,
  );
  fixture.registry.editions = [];
  await rejects(fixture.run(), /NO_MONITORING_SOURCES/);
  fixture.snapshot.records[1].edition.lifecycleStatus = "archived";
  await rejects(fixture.run(), /NO_MONITORING_TARGETS/);
});
