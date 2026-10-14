import { deepEqual, equal, match, ok, rejects, throws } from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  assertOfficialIngestionState,
  assertRealExtractionArtifact,
  CANONICAL_PATH,
  OFFICIAL_INGESTION_STATE_PATH,
  PENDING_CHANGE_PATH,
  REAL_EXTRACTION_ARTIFACT_PATH,
  writeJsonAtomicValidated,
} from "../scripts/race-update/persistence.ts";
import { loadPendingChangeStore } from "../scripts/race-update/pendingStore.ts";
import { runRealExtractionDryRun } from "../scripts/race-update/realExtraction.ts";
import type { PreparedRealExtractionRun } from "../scripts/race-update/realExtraction.ts";
import { assertRaceSourceRegistry, loadRaceSourceRegistry, RACE_SOURCE_REGISTRY_PATH } from "../scripts/race-update/sourceRegistry.ts";
import type { FactExtractionProvider, OfficialSourceIngestionState, RealExtractionArtifact } from "../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceGraphSnapshot, RaceSourceRegistry, RaceSourceRegistrySource } from "../types/raceUpdate.ts";
import { groupDetails } from "./fixtures/ninghaiOfficialResponses.ts";

const exec = promisify(execFile);
const cli = new URL("../scripts/race-update/realExtractionCli.ts", import.meta.url);
const generatedAt = "2026-10-14T04:00:00.000Z";
const editionId = "ninghai-ultra-trail-2026";
const protectedPaths = [CANONICAL_PATH, PENDING_CHANGE_PATH, OFFICIAL_INGESTION_STATE_PATH, RACE_SOURCE_REGISTRY_PATH];
const productionBytes = await Promise.all(protectedPaths.map((path) => readFile(new URL(`../${path}`, import.meta.url))));
const approvedJsonSources: RaceSourceRegistrySource[] = [6, 5, 4].map((id) => ({
  sourceId: `ninghai100-official-category-${id}-2026`,
  url: `https://ninghai100.com/app-api/race/group/get?id=${id}`,
  domain: "ninghai100.com", tier: "primary_official", sourceType: "category_page",
  status: "active", isPrimary: false, notes: "SIMULATED_APPROVED_SOURCE — isolated tests only",
}));
type ExtractionScenario = {
  snapshot: RaceGraphSnapshot;
  history: PendingChangeStore;
  initialState: OfficialSourceIngestionState;
  registry: RaceSourceRegistry;
};

const sourceIds = new Set(approvedJsonSources.map(({ sourceId }) => sourceId));
const categoryIds = new Set(groupDetails.map(({ name }) => `${editionId}-${name.toLowerCase()}`));
const isTargetLocation = (change: PendingChangeStore["changes"][number]) => change.editionId === editionId
  && change.categoryId !== null && categoryIds.has(change.categoryId)
  && (change.field === "startLocation" || change.field === "finishLocation");

// Replay a first-discovery scenario independently of runner data and future Canonical updates.
// Only the six target locations and their three source states are reset in cloned fixtures.
function missingLocationScenario(input: ExtractionScenario): ExtractionScenario {
  const fixture = structuredClone(input);
  const record = fixture.snapshot.records.find(({ edition }) => edition.editionId === editionId)!;
  const categories = record.categories.filter(({ categoryId }) => categoryIds.has(categoryId));
  equal(categories.length, 3);
  for (const category of categories) {
    category.startLocation = null;
    category.finishLocation = null;
  }
  fixture.history.changes = fixture.history.changes.filter((change) => !isTargetLocation(change));
  fixture.initialState.sources = fixture.initialState.sources.filter((source) => (
    source.editionId !== editionId || !sourceIds.has(source.sourceId)
  ));
  const entry = fixture.registry.editions.find((entry) => entry.editionId === editionId)!;
  for (const approved of approvedJsonSources) {
    const existing = entry.sources.find(({ sourceId }) => sourceId === approved.sourceId);
    if (existing) Object.assign(existing, approved, { notes: existing.notes });
    else entry.sources.push(structuredClone(approved));
  }
  assertRaceSourceRegistry(fixture.registry);
  return fixture;
}

const scenario = missingLocationScenario({
  snapshot: JSON.parse(productionBytes[0].toString("utf8")) as RaceGraphSnapshot,
  history: JSON.parse(productionBytes[1].toString("utf8")) as PendingChangeStore,
  initialState: JSON.parse(productionBytes[2].toString("utf8")) as OfficialSourceIngestionState,
  registry: await loadRaceSourceRegistry(new URL(`../${RACE_SOURCE_REGISTRY_PATH}`, import.meta.url).pathname),
});
const { snapshot, history, initialState, registry } = scenario;
const jsonSources = registry.editions.find((entry) => entry.editionId === editionId)!.sources
  .filter(({ sourceId }) => sourceIds.has(sourceId));
const fixtureBytes = [snapshot, history, initialState, registry].map((value) => Buffer.from(`${JSON.stringify(value)}\n`));
const provider: FactExtractionProvider = {
  id: "fixture-provider", configured: true, model: "fixture-model", promptVersion: "fixture-prompt",
  async extract() {
    return {
      output: { contractVersion: "official-fact-extraction-v1", facts: [] },
      provider: this.id, model: this.model, promptVersion: this.promptVersion,
      protocol: "openai-compatible-chat-completions", reasoningMode: "none", structuredOutputMode: "strict_json_schema",
      latencyMs: 0, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  },
};

async function prepareJson(state = initialState, pendingStore = history, forceExtract = false, fixture = scenario) {
  return runRealExtractionDryRun({
    snapshot: fixture.snapshot, registry: fixture.registry, state, pendingStore, forceExtract,
    provider: { ...provider, configured: false, async extract() { throw new Error("JSON must not call a model"); } },
    targets: [{ editionId, sourceIds: jsonSources.map(({ sourceId }) => sourceId) }],
    now: () => generatedAt,
    fetcher: (async (url) => {
      const id = Number(new URL(String(url)).searchParams.get("id"));
      return Response.json({ code: 0, data: groupDetails.find((group) => group.id === id) });
    }) as typeof fetch,
  });
}

async function prepareModel(contentType: "text/html" | "application/pdf" = "text/html") {
  return runRealExtractionDryRun({
    snapshot, registry, state: initialState, pendingStore: history, provider, now: () => generatedAt,
    fetcher: (async (url) => {
      const text = String(url).includes("beijing-marathon.com") ? "2026 Beijing Marathon" : "2027 Xiamen Marathon";
      return new Response(contentType === "application/pdf" ? textPdf(text) : `<html><body>${text}</body></html>`,
        { headers: { "content-type": contentType } });
    }) as typeof fetch,
  });
}

// A real, local text-layer PDF exercises the existing parser without network or new dependencies.
function textPdf(text: string): Uint8Array<ArrayBuffer> {
  const stream = `BT /F1 16 Tf 50 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const startXref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

function artifact(prepared: PreparedRealExtractionRun): RealExtractionArtifact {
  return { schemaVersion: "race-real-extraction-artifact-v1", generatedAt, report: prepared.report };
}

test("real JSON and original HTML/PDF/model extraction artifacts validate and round-trip through atomic files", async (t) => {
  for (const [name, prepared] of [["json", await prepareJson()], ["html", await prepareModel()], ["pdf", await prepareModel("application/pdf")]] as const) {
    await t.test(name, async () => {
      equal(prepared.report.summary.sourcesSucceeded, 3);
      equal(prepared.report.summary.modelCalls, name === "json" ? 0 : 3);
      const directory = await mkdtemp(join(tmpdir(), "racenext-artifact-roundtrip-"));
      try {
        const path = join(directory, "artifact.json");
        const value = artifact(prepared);
        assertRealExtractionArtifact(value);
        await writeJsonAtomicValidated({ path, value, validate: assertRealExtractionArtifact, allowedPaths: [path] });
        const stored: unknown = JSON.parse(await readFile(path, "utf8"));
        assertRealExtractionArtifact(stored);
        deepEqual(stored, value);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
});

test("unknown protocols and every mixed protocol/mode combination fail closed", async () => {
  const value = artifact(await prepareJson());
  for (const protocol of ["deterministic-json", "openai-compatible-chat-completions", "unknown", "", null, undefined]) {
    for (const reasoningMode of ["none", "not_applicable", "unknown", null, undefined]) {
      for (const structuredOutputMode of ["strict_json_schema", "not_applicable", "unknown", null, undefined]) {
        const candidate = structuredClone(value);
        Object.assign(candidate.report.sources[0], { protocol, reasoningMode, structuredOutputMode });
        const valid = (protocol === "deterministic-json" && reasoningMode === "not_applicable" && structuredOutputMode === "not_applicable")
          || (protocol === "openai-compatible-chat-completions" && reasoningMode === "none" && structuredOutputMode === "strict_json_schema");
        if (valid) assertRealExtractionArtifact(candidate);
        else throws(() => assertRealExtractionArtifact(candidate), /Invalid real extraction artifact/);
      }
    }
  }
});

test("required artifact/report/source fields and existing report safety constraints remain enforced", async () => {
  const value = artifact(await prepareJson());
  const required = [
    ["schemaVersion"], ["generatedAt"], ["report"],
    ["report", "schemaVersion"], ["report", "dryRun"], ["report", "processingVersion"],
    ["report", "sources"], ["report", "summary"], ["report", "summary", "canonicalWrites"],
    ...["canonicalWritten", "protocol", "reasoningMode", "structuredOutputMode", "processingVersion", "candidates", "rejectedCandidates"]
      .map((field) => ["report", "sources", "0", field]),
  ];
  for (const path of required) {
    const candidate = structuredClone(value);
    let parent = candidate as unknown as Record<string, unknown>;
    for (const key of path.slice(0, -1)) parent = parent[key] as Record<string, unknown>;
    delete parent[path.at(-1)!];
    throws(() => assertRealExtractionArtifact(candidate), /Invalid real extraction artifact/, path.join("."));
  }
  for (const invalid of [null, [], {}, { ...value, report: [] },
    { ...value, report: { ...value.report, sources: [null] } },
    { ...value, report: { ...value.report, summary: { canonicalWrites: 1 } } },
    { ...value, report: { ...value.report, dryRun: false } },
    { ...value, report: { ...value.report, sources: [{ ...value.report.sources[0], canonicalWritten: true }] } },
    { ...value, report: { ...value.report, sources: [{ ...value.report.sources[0], candidates: {} }] } },
    { ...value, report: { ...value.report, sources: [{ ...value.report.sources[0], rejectedCandidates: null }] } },
  ]) throws(() => assertRealExtractionArtifact(invalid), /Invalid real extraction artifact/);
});

// Execute the actual CLI and durability/writer code with cwd set to an isolated data copy.
// Only extraction/provider loading is replayed: no network, credentials, or production writes.
async function sandbox() {
  const directory = await mkdtemp(join(tmpdir(), "racenext-artifact-cli-"));
  for (let index = 0; index < protectedPaths.length; index += 1) {
    const path = join(directory, protectedPaths[index]);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, fixtureBytes[index]);
  }
  const replayPath = join(directory, "replay.mjs");
  await writeFile(replayPath, `
    import { readFile } from 'node:fs/promises';
    export async function runRealExtractionDryRun() {
      return JSON.parse(await readFile(new URL('./prepared.json', import.meta.url), 'utf8'));
    }
    export function loadQwenProviderFromEnvironment() { return {}; }
  `);
  const loaderPath = join(directory, "loader.mjs");
  await writeFile(loaderPath, `
    import { registerHooks } from 'node:module';
    globalThis.fetch = async () => { throw new Error('Network is forbidden in CLI replay'); };
    registerHooks({ resolve(specifier, context, nextResolve) {
      if (context.parentURL === ${JSON.stringify(cli.href)}
        && (specifier === './realExtraction.ts' || specifier === './qwenProvider.ts')) {
        return { url: ${JSON.stringify(pathToFileURL(replayPath).href)}, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    } });
  `);
  return {
    directory,
    async run(prepared: PreparedRealExtractionRun) {
      await writeFile(join(directory, "prepared.json"), JSON.stringify(prepared));
      return exec(process.execPath, ["--experimental-strip-types", "--import", loaderPath, cli.pathname], {
        cwd: directory, env: { NODE_ENV: "test", NODE_NO_WARNINGS: "1" }, timeout: 30_000,
      });
    },
    async assertProtectedReadsUnchanged() {
      for (const path of [CANONICAL_PATH, RACE_SOURCE_REGISTRY_PATH]) {
        deepEqual(await readFile(join(directory, path)), fixtureBytes[protectedPaths.indexOf(path)]);
      }
      deepEqual(await Promise.all(protectedPaths.map((path) => readFile(new URL(`../${path}`, import.meta.url)))), productionBytes);
    },
  };
}

test("actual CLI rejects invalid Artifact before any Pending, State or Artifact write", async (t) => {
  const first = await prepareJson();
  ok(first.pendingRequirements.length > 0);
  for (const failure of ["protocol", "mixed_modes", "report_structure"] as const) {
    await t.test(failure, async () => {
      const fixture = await sandbox();
      try {
        const prepared = structuredClone(first);
        if (failure === "protocol") Object.assign(prepared.report.sources[0], { protocol: "unknown" });
        else if (failure === "mixed_modes") prepared.report.sources[0].reasoningMode = "none";
        else Object.assign(prepared.report, { summary: null });
        const artifactPath = join(fixture.directory, REAL_EXTRACTION_ARTIFACT_PATH);
        await mkdir(dirname(artifactPath), { recursive: true });
        await writeFile(artifactPath, "previous artifact");
        await rejects(fixture.run(prepared), /Invalid real extraction artifact/);
        deepEqual(await readFile(join(fixture.directory, PENDING_CHANGE_PATH)), fixtureBytes[1]);
        deepEqual(await readFile(join(fixture.directory, OFFICIAL_INGESTION_STATE_PATH)), fixtureBytes[2]);
        equal(await readFile(artifactPath, "utf8"), "previous artifact");
        await fixture.assertProtectedReadsUnchanged();
      } finally {
        await rm(fixture.directory, { recursive: true, force: true });
      }
    });
  }
});

test("actual CLI Pending filesystem failure leaves State unadvanced and no Artifact", async () => {
  const fixture = await sandbox();
  try {
    const pendingPath = join(fixture.directory, PENDING_CHANGE_PATH);
    await rm(pendingPath);
    await mkdir(pendingPath);
    await rejects(fixture.run(await prepareJson()), /EISDIR/);
    deepEqual(await readFile(join(fixture.directory, OFFICIAL_INGESTION_STATE_PATH)), fixtureBytes[2]);
    await rejects(readFile(join(fixture.directory, REAL_EXTRACTION_ARTIFACT_PATH)), { code: "ENOENT" });
    await fixture.assertProtectedReadsUnchanged();
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("actual CLI JSON persistence, normal/forced reruns and original review history round-trip", async () => {
  const fixture = await sandbox();
  try {
    let state = initialState;
    let pendingStore = history;
    const canonicalBefore = structuredClone(snapshot);
    for (const [run, forceExtract] of [false, false, true].entries()) {
      const prepared = await prepareJson(state, pendingStore, forceExtract);
      equal(prepared.createdPendingChangeIds.length, run === 0 ? 6 : 0);
      const locations = prepared.pendingStore.changes.filter(isTargetLocation);
      equal(locations.length, 6);
      ok(locations.every(({ status, risk }) => status === "pending" && risk === "high_impact"));
      ok(!prepared.report.sources.flatMap(({ candidates }) => candidates).some(({ field }) => field === "distanceKm"));
      const output = await fixture.run(prepared);
      match(output.stdout, /artifact=/);
      const stored: unknown = JSON.parse(await readFile(join(fixture.directory, REAL_EXTRACTION_ARTIFACT_PATH), "utf8"));
      assertRealExtractionArtifact(stored);
      deepEqual(stored.report, prepared.report);
      pendingStore = await loadPendingChangeStore(join(fixture.directory, PENDING_CHANGE_PATH));
      equal(pendingStore.changes.length, history.changes.length + 6);
      equal(new Set(pendingStore.changes.map(({ changeId }) => changeId)).size, pendingStore.changes.length);
      deepEqual(pendingStore.changes.slice(0, history.changes.length), history.changes);
      const storedState: unknown = JSON.parse(await readFile(join(fixture.directory, OFFICIAL_INGESTION_STATE_PATH), "utf8"));
      assertOfficialIngestionState(storedState);
      state = storedState;
      deepEqual(state, prepared.nextState);
      const jsonState = state.sources.filter((entry) => entry.editionId === editionId
        && jsonSources.some(({ sourceId }) => sourceId === entry.sourceId));
      equal(jsonState.length, 3);
      ok(jsonState.every(({ lastSuccessfulExtractionHash, lastObservedContentHash }) =>
        lastSuccessfulExtractionHash !== null && lastSuccessfulExtractionHash === lastObservedContentHash));
    }
    deepEqual(snapshot, canonicalBefore);
    await fixture.assertProtectedReadsUnchanged();
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("actual CLI retains original model Artifact persistence", async () => {
  const fixture = await sandbox();
  try {
    const prepared = await prepareModel();
    await fixture.run(prepared);
    const stored: unknown = JSON.parse(await readFile(join(fixture.directory, REAL_EXTRACTION_ARTIFACT_PATH), "utf8"));
    assertRealExtractionArtifact(stored);
    deepEqual(stored.report, prepared.report);
    deepEqual(await readFile(join(fixture.directory, PENDING_CHANGE_PATH)), fixtureBytes[1]);
    await fixture.assertProtectedReadsUnchanged();
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("missing-location fixtures stay independent when runner Pending/State and future Canonical already contain the facts", async () => {
  const first = await prepareJson();
  equal(first.createdPendingChangeIds.length, 6);
  const advanced = structuredClone({ ...scenario, history: first.pendingStore, initialState: first.nextState });
  const record = advanced.snapshot.records.find(({ edition }) => edition.editionId === editionId)!;
  for (const category of record.categories.filter(({ categoryId }) => categoryIds.has(categoryId))) {
    category.startLocation = "西门城楼";
    category.finishLocation = "西门城楼";
  }
  const before = structuredClone(advanced);
  const isolated = missingLocationScenario(advanced);
  deepEqual(advanced, before);
  deepEqual(isolated.history.changes, advanced.history.changes.filter((change) => !isTargetLocation(change)));
  deepEqual(isolated.initialState.sources, advanced.initialState.sources.filter((source) => (
    source.editionId !== editionId || !sourceIds.has(source.sourceId)
  )));
  deepEqual(isolated.registry, advanced.registry);
  const replay = await prepareJson(isolated.initialState, isolated.history, false, isolated);
  equal(replay.createdPendingChangeIds.length, 6);
  deepEqual(replay.pendingStore.changes.slice(0, isolated.history.changes.length), isolated.history.changes);
  equal(replay.report.summary.canonicalWrites, 0);
  deepEqual(advanced, before);

  const absentSources = structuredClone(advanced);
  absentSources.registry.editions.find((entry) => entry.editionId === editionId)!.sources =
    absentSources.registry.editions.find((entry) => entry.editionId === editionId)!.sources.filter(({ sourceId }) => !sourceIds.has(sourceId));
  const restored = missingLocationScenario(absentSources);
  equal(restored.registry.editions.find((entry) => entry.editionId === editionId)!.sources.filter(({ sourceId }) => sourceIds.has(sourceId)).length, 3);
  assertRaceSourceRegistry(restored.registry);
});

test("existing Pending/State and every review status survive normal and forced JSON reruns", async () => {
  const fixture = await sandbox();
  try {
    const first = await prepareJson();
    equal(first.createdPendingChangeIds.length, 6);
    await fixture.run(first);
    const reviewed = structuredClone(first.pendingStore);
    const statuses = ["pending", "approved", "rejected", "applied"] as const;
    let index = 0;
    for (const change of reviewed.changes.filter(isTargetLocation)) {
      change.status = statuses[index++ % statuses.length];
      change.reviewedAt = change.status === "pending" ? null : generatedAt;
      change.reviewReason = change.status === "rejected" ? "Isolated review fixture" : null;
      change.appliedAt = change.status === "applied" ? generatedAt : null;
    }
    await writeFile(join(fixture.directory, PENDING_CHANGE_PATH), JSON.stringify(reviewed));
    for (const forceExtract of [false, true]) {
      const repeat = await prepareJson(first.nextState, reviewed, forceExtract);
      const expectedState = structuredClone(first.nextState);
      for (const source of expectedState.sources.filter((source) => source.editionId === editionId && sourceIds.has(source.sourceId))) {
        source.lastExtractionStatus = forceExtract ? "success" : "unchanged";
      }
      equal(repeat.createdPendingChangeIds.length, 0);
      deepEqual(repeat.pendingStore, reviewed);
      deepEqual(repeat.nextState, expectedState);
      await fixture.run(repeat);
      const stored = await loadPendingChangeStore(join(fixture.directory, PENDING_CHANGE_PATH));
      deepEqual(stored, reviewed);
      equal(new Set(stored.changes.map(({ changeId }) => changeId)).size, stored.changes.length);
      deepEqual(JSON.parse(await readFile(join(fixture.directory, OFFICIAL_INGESTION_STATE_PATH), "utf8")), expectedState);
    }
    await fixture.assertProtectedReadsUnchanged();
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});
