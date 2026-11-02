import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runRealExtractionDryRun, validateExtractedCandidates, isLocationSemanticReview } from "../scripts/race-update/realExtraction.ts";
import { RACE_FACT_PROCESSING_VERSION } from "../scripts/race-update/ingestionState.ts";
import { evaluateVerificationAlerts } from "../scripts/race-update/verificationAlerts.ts";
import type { FactExtractionProvider, OfficialDocumentSnapshot, OfficialFactCandidate, OfficialSourceIngestionState } from "../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceGraphSnapshot, RaceSourceRegistry } from "../types/raceUpdate.ts";
import { hengqinConflict, replayHengqinConflict } from "./fixtures/hengqinPendingCollision.ts";

type Sample = {
  id: string; origin: string; editionId: string; sourceId: string; sourceUrl: string;
  field: OfficialFactCandidate["field"]; value: unknown; quote: string; expectation: string;
  categoryId?: string | null; context: string; snapshotValue?: unknown; originalCurrentValue?: unknown;
};
const read = async (path: string) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const snapshot = await read("../data/canonical/race-graph-v1.json") as RaceGraphSnapshot;
const registry = await read("../data/sources/race-source-registry.json") as RaceSourceRegistry;
const history = await read("../data/pending/race-update-pending.json") as PendingChangeStore;
const { samples } = await read("./fixtures/factSemanticReplay.json") as { samples: Sample[] };
const emptyState = (): OfficialSourceIngestionState => ({ schemaVersion: "official-source-ingestion-state-v1", sources: [] });

function scenario(sample: Sample) {
  const snap = structuredClone(snapshot);
  const record = snap.records.find(r => r.edition.editionId === sample.editionId)!;
  const entity = sample.categoryId ? record.categories.find(c => c.categoryId === sample.categoryId)! : record.edition;
  const fields = entity as unknown as Record<string, unknown>;
  if (Object.hasOwn(sample, "snapshotValue")) fields[sample.field] = sample.snapshotValue;
  if (Object.hasOwn(sample, "originalCurrentValue")) fields[sample.field] = sample.originalCurrentValue;
  // Exact archived quotes, reconstructed local context; never claim this is the historical full-page hash.
  const document: OfficialDocumentSnapshot = {
    sourceId: sample.sourceId, editionId: sample.editionId, url: sample.sourceUrl,
    title: record.edition.editionName, text: sample.context, links: [],
    contentType: "text/plain", httpStatus: 200, charset: "utf-8", responseBytes: Buffer.byteLength(sample.context),
    fetchedAt: "2026-11-02T00:00:00.000Z", extractionMethod: "plain_text",
    contentHash: createHash("sha256").update(sample.context).digest("hex"),
  };
  const fact: OfficialFactCandidate = {
    eventId: record.event.eventId, editionId: sample.editionId, categoryId: sample.categoryId ?? null,
    entityType: sample.categoryId ? "Category" : "Edition", field: sample.field, candidateValue: sample.value,
    evidenceText: sample.quote, evidenceLocator: "fixed-isolated-excerpt", confidence: 1,
    sourceId: sample.sourceId, sourceUrl: sample.sourceUrl, contentHash: document.contentHash,
    fetchedAt: document.fetchedAt, extractionMethod: document.extractionMethod,
  };
  let calls = 0;
  const provider: FactExtractionProvider = {
    id: "offline-replay", model: "fixed-output", promptVersion: "semantic-replay-v1", configured: true,
    async extract() {
      calls++;
      return { output: { contractVersion: "official-fact-extraction-v1", facts: [fact] },
        provider: this.id, model: this.model, promptVersion: this.promptVersion,
        protocol: "openai-compatible-chat-completions", reasoningMode: "none", structuredOutputMode: "strict_json_schema",
        latencyMs: 0, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
    },
  };
  return { snap, document, fact, provider, calls: () => calls };
}

async function replay(sample: Sample, options: { history?: PendingChangeStore; state?: OfficialSourceIngestionState } = {}) {
  const f = scenario(sample), before = structuredClone(f.snap);
  const inputHistory = options.history ?? { schemaVersion: "race-update-pending-v1" as const, changes: [] };
  const beforeHistory = structuredClone(inputHistory);
  const prepared = await runRealExtractionDryRun({
    snapshot: f.snap, registry, documents: [f.document], provider: f.provider,
    targets: [{ editionId: sample.editionId, sourceIds: [sample.sourceId] }],
    state: options.state ?? emptyState(), pendingStore: inputHistory, autoApplyLowRisk: false,
    now: () => f.document.fetchedAt, fetcher: async () => { throw new Error("NETWORK_FORBIDDEN"); },
  });
  assert.deepEqual(f.snap, before);
  assert.deepEqual(inputHistory, beforeHistory);
  assert.equal(prepared.report.summary.canonicalWrites, 0);
  return { ...f, prepared, source: prepared.report.sources[0] };
}

assert.equal(samples.length, 25);
for (const sample of samples) {
  test(`semantic replay: ${sample.id} → ${sample.expectation}`, async () => {
    const { prepared, source, snap } = await replay(sample);
    assert.equal(source.identity?.status, "matched");
    const review = source.candidates[0];
    if (sample.expectation.startsWith("reject") || sample.expectation === "retain_full_waves_no_scalar_pending") {
      assert.equal(source.validationAcceptedCount, 0);
      assert.equal(source.validationRejectedCount, 1);
      assert.equal(prepared.createdPendingChangeIds.length, 0);
    } else if (sample.expectation.startsWith("semantic_review")) {
      assert.equal(review.action, "semantic_review");
      assert.equal(review.diff, "SEMANTIC_REVIEW");
      assert.equal(review.changeId, null);
      assert.equal(review.evidenceVerifiedAt, undefined);
      assert.equal(prepared.createdPendingChangeIds.length, 0);
      const verification = evaluateVerificationAlerts({ snapshot: snap, registry, extraction: prepared.report });
      const check = verification.criticalFactVerification.find(c => c.editionId === sample.editionId
        && c.categoryId === sample.categoryId && c.field === sample.field);
      if (check) assert.ok(!["VERIFIED_THIS_RUN", "VERIFIED_INHERITED"].includes(check.status));
    } else if (sample.expectation === "no_change") {
      assert.equal(review.action, "no_change");
      assert.equal(prepared.createdPendingChangeIds.length, 0);
    } else {
      assert.equal(review.action, "pending");
      assert.equal(prepared.createdPendingChangeIds.length, 1);
      assert.equal(prepared.pendingStore.changes[0].status, "pending");
      assert.equal(prepared.pendingStore.changes[0].reviewedAt, null);
      assert.equal(prepared.pendingStore.changes[0].appliedAt, null);
      if (sample.field === "startTimes" || sample.field === "finishLocation") assert.equal(review.risk, "high_impact");
    }
    if (sample.origin === "historical_rejected_pending") {
      const repeat = await replay(sample, { history });
      assert.deepEqual(repeat.prepared.pendingStore, history);
      assert.equal(repeat.prepared.pendingStore.changes.find(p => p.changeId === sample.id)?.status, "rejected");
    }
  });
}

test("new location equivalence never bypasses Category scope or discards material qualifiers", () => {
  const sample = samples.find(s => s.id === "location-punctuation-only")!;
  for (const quote of [
    "全程马拉松终点：奥体中心东南侧(解放大道与洋江西路交叉口)",
    "半程马拉松终点：奥体中心西北侧(解放大道与洋江西路交叉口)",
  ]) {
    const f = scenario({ ...sample, quote, context: quote });
    const result = validateExtractedCandidates({ snapshot: f.snap, registry, document: f.document, candidates: [f.fact] });
    assert.equal(result.accepted.length, 0); // wrong scope, or candidate place not in quote
  }
});

test("registration dates bind to the correct boundary, not a neighbouring phase or range endpoint", () => {
  const sample = samples.find(s => s.id === "registration-open-explicit")!;
  const cases: Array<[OfficialFactCandidate["field"], string, string, boolean]> = [
    ["registrationOpenDate", "2026-08-18T10:00:00+08:00", "报名时间：8月18日10:00至9月4日18:00。", true],
    ["registrationCloseDate", "2026-09-04T18:00:00+08:00", "报名时间：8月18日10:00至9月4日18:00。", true],
    ["registrationOpenDate", "2026-09-04T18:00:00+08:00", "报名时间：8月18日10:00至9月4日18:00。", false],
    ["registrationCloseDate", "2026-08-18T10:00:00+08:00", "报名时间：8月18日10:00至9月4日18:00。", false],
    ["registrationOpenDate", "2026-08-18T10:00:00+08:00", "报名时间：8月18日10:00-9月4日18:00", true],
    ["registrationCloseDate", "2026-09-04T18:00:00+08:00", "报名时间：8月18日10:00-9月4日18:00", true],
    ["registrationOpenDate", "2026-09-04T18:00:00+08:00", "报名时间：8月18日10:00-9月4日18:00", false],
    ["registrationCloseDate", "2026-08-18T10:00:00+08:00", "报名时间：8月18日10:00-9月4日18:00", false],
    ["registrationOpenDate", "2026-08-18T10:00:00+08:00", "报名时间：2026-08-18T10:00-2026-09-04T18:00", true],
    ["registrationCloseDate", "2026-09-04T18:00:00+08:00", "报名时间：2026-08-18T10:00-2026-09-04T18:00", true],
    ["registrationOpenDate", "2026-09-04T18:00:00+08:00", "报名时间：2026-08-18T10:00-2026-09-04T18:00", false],
    ["registrationCloseDate", "2026-08-18T10:00:00+08:00", "报名时间：2026-08-18T10:00-2026-09-04T18:00", false],
    ["registrationOpenDate", "2026-08-18", "报名时间：2026-08-18开始", true],
    ["registrationOpenDate", "2026-08-18", "报名时间：2026-08-18", false],
    ["registrationOpenDate", "2026-08-18", "报名时间：2026-08-18-2026-09-04", true],
    ["registrationCloseDate", "2026-09-04", "报名时间：2026-08-18-2026-09-04", true],
    ["registrationOpenDate", "2026-09-04", "报名时间：2026-08-18-2026-09-04", false],
    ["registrationCloseDate", "2026-08-18", "报名时间：2026-08-18-2026-09-04", false],
    ["registrationOpenDate", "2026-08-18T10:00:00+08:00", "报名于8月18日10:00开放（中签后缴费）", true],
    ["registrationOpenDate", "2026-08-18T10:00:00+08:00", "报名于8月18日10:00开放（中签后于9月21日10:00缴费）", true],
    ["registrationOpenDate", "2026-09-21T10:00:00+08:00", "报名于8月18日10:00开放（中签后于9月21日10:00缴费）", false],
    ["registrationOpenDate", "2026-09-21T10:00:00+08:00", "抽签结果查询于9月21日10:00开放（中签后缴费）", false],
    ["registrationOpenDate", "2026-08-18T10:00:00+08:00", "预报名于8月18日10:00开放（中签后缴费）", false],
    ["registrationCloseDate", "2026-09-21T10:00:00+08:00", "中签缴费于9月21日10:00截止（中签后缴费）", false],
    ["registrationOpenDate", "2026-08-18T10:00:00+08:00", "8月18日10:00起，所有组别及所有报名渠道统一开放正式报名。", true],
    ["registrationOpenDate", "2026-08-18T10:00:00+08:00", "正式报名于8月18日10:00开始，中签缴费于9月21日10:00开始。", true],
    ["registrationOpenDate", "2026-09-21T10:00:00+08:00", "正式报名于8月18日10:00开始，中签缴费于9月21日10:00开始。", false],
    ["registrationOpenDate", "2026-09-21", "9月21日报名尚未开始。", false],
    ["registrationOpenDate", "2026-09-21", "报名公告发布日期：9月21日。", false],
    ["registrationOpenDate", "2026-08-18", "Registration opens on 18 August 2026. Payment follows after the draw.", true],
    ["registrationOpenDate", "2026-08-18", "报名于2025年8月18日开始。", false],
    ["registrationOpenDate", "2026-08-18", "Registration opens on 18 August 2025.", false],
    ["registrationCloseDate", "2026-09-21", "Registration information for the weekend of 21 September 2026.", false],
  ];
  for (const [field, value, quote, accepted] of cases) {
    const f = scenario({ ...sample, field, value, quote, context: quote });
    const result = validateExtractedCandidates({ snapshot: f.snap, registry, document: f.document, candidates: [f.fact] });
    assert.equal(result.accepted.length, accepted ? 1 : 0, `${field}: ${quote}`);
  }
});

test("only multiple start times are blocked; a start plus cutoff is not a second wave", () => {
  const sample = samples.find(s => s.id === "waves-collapsed-to-startAt")!;
  for (const [quote, accepted] of [
    ["CNH-60 发枪时间：06:00、06:20。", false],
    ["CNH-60 wave 1 starts 06:00, wave 2 starts 06:20.", false],
    ["CNH-60 第一波06:00起跑，关门时间18:00。", true],
  ] as const) {
    const f = scenario({ ...sample, quote, context: quote });
    const result = validateExtractedCandidates({ snapshot: f.snap, registry, document: f.document, candidates: [f.fact] });
    assert.equal(result.accepted.length, accepted ? 1 : 0, quote);
  }
});

test("a shared venue never hides a changed side, entrance, floor or street number", async () => {
  const sample = samples.find(s => s.id === "location-real-direction-change")!;
  for (const value of ["奥体中心北侧", "奥体中心2号门", "奥体中心3楼"]) {
    const quote = `半程马拉松终点：${value}`;
    const altered = { ...sample, value, quote, context: quote, snapshotValue: "奥体中心" };
    const f = scenario(altered);
    assert.equal(isLocationSemanticReview(f.snap, f.fact), false);
    const { prepared } = await replay(altered);
    assert.equal(prepared.pendingStore.changes.length, 1);
    assert.equal(prepared.pendingStore.changes[0].risk, "high_impact");
  }
});

test("rejecting historical Hengqin payment evidence preserves the unresolved original conflict", async () => {
  const snap = structuredClone(snapshot);
  snap.records.find(r => r.edition.editionId === hengqinConflict.editionId)!.edition.registrationOpenDate = hengqinConflict.currentValue;
  const seed: PendingChangeStore = { ...history, changes: [
    ...history.changes.filter(p => p.changeId !== hengqinConflict.changeId), structuredClone(hengqinConflict),
  ] };
  const result = await replayHengqinConflict({ snapshot: snap, registry, pendingStore: seed,
    state: emptyState(), checkedAt: "2026-11-02T00:00:00Z", forceExtract: true });
  assert.deepEqual(result.prepared.pendingStore, seed);
  assert.equal(result.prepared.createdPendingChangeIds.length, 0);
  const payment = result.prepared.report.sources.find(s => s.sourceId === "hengqin-marathon-result-2026")!;
  assert.equal(payment.validationRejectedCount, 1);
  assert.match(payment.rejectedCandidates[0].reason, /registration boundary/);
});

test("new processing version revalidates once, then skips successful and rejected unchanged samples", async () => {
  for (const id of ["registration-open-explicit", "chg-32e3e80855ca07581756ad66"]) {
    const sample = samples.find(s => s.id === id)!;
    const f = scenario(sample);
    const state: OfficialSourceIngestionState = { schemaVersion: "official-source-ingestion-state-v1", sources: [{
      sourceId: sample.sourceId, editionId: sample.editionId, lastObservedContentHash: f.document.contentHash,
      lastSuccessfulExtractionHash: f.document.contentHash, lastSuccessfulProvider: f.provider.id,
      lastSuccessfulModel: f.provider.model, lastSuccessfulPromptVersion: f.provider.promptVersion,
      lastSuccessfulProcessingVersion: "race-fact-processing-v4", lastSuccessfulExtractionAt: f.document.fetchedAt,
      lastExtractionMethod: "plain_text", lastCheckedAt: f.document.fetchedAt, lastFetchStatus: "success", lastExtractionStatus: "success",
    }] };
    const targets = [{ editionId: sample.editionId, sourceIds: [sample.sourceId] }];
    const first = await runRealExtractionDryRun({ snapshot: f.snap, registry, state, provider: f.provider,
      documents: [f.document], targets, autoApplyLowRisk: false, now: () => f.document.fetchedAt });
    assert.equal(f.calls(), 1);
    assert.equal(first.report.processingVersion, RACE_FACT_PROCESSING_VERSION);
    const second = await runRealExtractionDryRun({ snapshot: f.snap, registry, state: first.nextState, provider: f.provider,
      documents: [f.document], targets, autoApplyLowRisk: false, now: () => f.document.fetchedAt,
      previousExtraction: { schemaVersion: "race-real-extraction-artifact-v1", generatedAt: f.document.fetchedAt, report: first.report } });
    assert.equal(f.calls(), 1);
    assert.equal(second.report.sources[0].requestStatus, "skipped");
    assert.equal(second.createdPendingChangeIds.length, 0);
  }
});
