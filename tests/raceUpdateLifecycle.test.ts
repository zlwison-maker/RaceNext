import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { isCompletedEdition, isDailyMonitoringEdition } from "../scripts/race-update/editionLifecycle.ts";
import { buildRaceDailyCheckTargets, runRaceDailyCheck } from "../scripts/race-update/dailyCheck.ts";
import { discoverOfficialSources } from "../scripts/race-update/multiRaceDiscovery.ts";
import { prepareOfficialAnnouncements } from "../scripts/race-update/officialAnnouncements.ts";
import { loadRaceSourceRegistry, activeFreshnessSources } from "../scripts/race-update/sourceRegistry.ts";
import { evaluateVerificationAlerts } from "../scripts/race-update/verificationAlerts.ts";
import type { FactExtractionProvider, OfficialSourceIngestionState } from "../types/officialSourceIngestion.ts";
import type { PendingChangeStore, RaceGraphSnapshot, RaceSourceRegistry } from "../types/raceUpdate.ts";

const paths = ["data/canonical/race-graph-v1.json", "data/pending/race-update-pending.json",
  "data/sources/race-source-registry.json", "data/sources/official-source-ingestion-state.json"];
const bytes = await Promise.all(paths.map(p => readFile(new URL(`../${p}`, import.meta.url))));
const original = JSON.parse(bytes[0].toString()) as RaceGraphSnapshot;
const registry = await loadRaceSourceRegistry();
const gonggaId = "kailas-gongga-100-2026";
const gongga = original.records.find(r => r.edition.editionId === gonggaId)!;
const NOW = "2026-10-15T02:00:00Z";

test("actual confirmed Gongga date excludes its active Edition but retains every future Edition and formal Store", async () => {
  assert.equal(gongga.edition.lifecycleStatus, "active");
  assert.equal(gongga.edition.endDate, "2026-09-27");
  const targets = buildRaceDailyCheckTargets(original, registry, NOW);
  assert.deepEqual(targets.map(t => t.editionId), original.records.filter(r => r !== gongga).map(r => r.edition.editionId));
  assert.equal(targets.length, original.records.length - 1);
  assert.equal(targets.reduce((n, t) => n + t.sourceIds.length, 0), original.records.filter(r => r !== gongga)
    .reduce((n, r) => n + activeFreshnessSources(registry, r.edition.editionId).length, 0));
  assert.equal(original.records.length, 19); // Public/historical inventory is not the monitoring target count.
  for (let i = 0; i < paths.length; i++) assert.deepEqual(await readFile(new URL(`../${paths[i]}`, import.meta.url)), bytes[i]);
});

test("completion respects the full last local day, multi-day endDate and raceDate fallback", () => {
  assert.equal(isCompletedEdition(gongga, "2026-09-25T16:00:00Z"), false);
  assert.equal(isCompletedEdition(gongga, "2026-09-27T15:59:59Z"), false);
  assert.equal(isCompletedEdition(gongga, "2026-09-27T16:00:00Z"), true);
  const single = structuredClone(gongga); single.edition.endDate = null;
  assert.equal(isCompletedEdition(single, "2026-09-25T15:59:59Z"), false);
  assert.equal(isCompletedEdition(single, "2026-09-25T16:00:00Z"), true);
  single.edition.timezone = "America/Los_Angeles";
  assert.equal(isCompletedEdition(single, "2026-09-26T06:59:59Z"), false);
  assert.equal(isCompletedEdition(single, "2026-09-26T07:00:00Z"), true);
});

test("unconfirmed dates, identity conflicts, uncertain Editions and unknown timezones remain daily targets", () => {
  const variants: Array<(r: typeof gongga) => void> = [
    r => { r.edition.lifecycleStatus = "uncertain"; },
    r => { r.edition.raceDate = null; r.edition.endDate = null; },
    r => { r.edition.endDate = "2026-09-20"; },
    r => { r.edition.endDate = "2026-02-30"; },
    r => { r.edition.raceDate = "2025-09-25"; },
    r => { r.edition.timezone = null; },
    r => { r.edition.timezone = "Unknown/Timezone"; },
    r => { r.edition.governance.publicationGate = null; },
    r => { r.edition.governance.publicationGate!.dateEvidenceStatus = "pending_review"; },
    r => { r.edition.governance.publicationGate!.conflictStatus = "needs_review"; },
    r => { r.edition.governance.publicationGate!.requestedEditionYear = 2027; },
    r => { r.edition.governance.publicationGate!.latestRelevantOfficialEditionYear = 2027; },
    r => { r.edition.eventId = "different-event"; },
  ];
  for (const change of variants) {
    const r = structuredClone(gongga); change(r);
    assert.equal(isCompletedEdition(r, NOW), false);
    assert.equal(isDailyMonitoringEdition(r, NOW), true);
  }
  for (const status of ["archived", "cancelled"] as const) {
    const r = structuredClone(gongga); r.edition.lifecycleStatus = status;
    assert.equal(isDailyMonitoringEdition(r, NOW), false);
  }
});

function scenario() {
  const snapshot = structuredClone(original);
  snapshot.records = snapshot.records.filter(r => [gonggaId, "xian-marathon-2026"].includes(r.edition.editionId));
  const registry: RaceSourceRegistry = {schemaVersion:"race-source-registry-v1", editions:snapshot.records.map(r => {
    const domain = r.edition.editionId === gonggaId ? "gongga.example.org" : "xian.example.org";
    return {editionId:r.edition.editionId, sources:[{sourceId:`${r.edition.editionId}-fixture-official`,url:`https://${domain}/`,domain,
      tier:"primary_official",sourceType:"event_home",status:"active",isPrimary:true,notes:null}]};
  })};
  const requests: string[] = [];
  const fetcher = (async (url) => {
    requests.push(String(url));
    const source = registry.editions.find(e => e.sources[0].domain === new URL(String(url)).hostname)!;
    const r = snapshot.records.find(r => r.edition.editionId === source.editionId)!;
    return new Response(`<title>${r.edition.editionName}报名公告</title><h1>${r.edition.editionName}报名公告</h1><article>本届赛事报名入口，详细报名规则见赛事组委会正式公告。<a href="/registration-current">本届赛事报名入口</a><a href="/post-notice">${r.edition.editionName}报名公告</a></article>`, {headers:{"content-type":"text/html"}});
  }) as typeof fetch;
  const calls: string[] = [];
  const provider: FactExtractionProvider = {id:"fixture",model:"fixture",promptVersion:"fixture-v1",configured:true,async extract(request) {
    calls.push(request.document.editionId);
    return {provider:"fixture",model:"fixture",promptVersion:"fixture-v1",protocol:"openai-compatible-chat-completions",
      reasoningMode:"none",structuredOutputMode:"strict_json_schema",latencyMs:1,usage:{inputTokens:1,outputTokens:1,totalTokens:2},
      output:{contractVersion:"official-fact-extraction-v1",facts:request.document.url.endsWith("/") ? [{
        eventId:request.editionContext.eventId,editionId:request.editionContext.editionId,categoryId:null,entityType:"Edition",field:"registrationUrl",
        candidateValue:new URL("/registration-current",request.document.url).href,sourceId:request.document.sourceId,sourceUrl:request.document.url,
        evidenceText:"本届赛事报名入口",evidenceLocator:"article",confidence:0.99,fetchedAt:request.document.fetchedAt,
        contentHash:request.document.contentHash,extractionMethod:request.document.extractionMethod,
      }] : []}};
  }};
  return {snapshot,registry,fetcher,provider,requests,calls};
}

test("after completion all daily paths stop fetching Gongga, retain Ledger/Pending/State history and keep future monitoring", async () => {
  const f = scenario(), before = structuredClone({snapshot:f.snapshot,registry:f.registry});
  const checkedAt = "2026-09-27T10:00:00Z";
  const discovery = await discoverOfficialSources({...f,checkedAt});
  assert.ok(discovery.ledger.candidates.some(c => c.targetEditionId === gonggaId));
  const pending = JSON.parse(bytes[1].toString()) as PendingChangeStore;
  const state = JSON.parse(bytes[3].toString()) as OfficialSourceIngestionState;
  const first = await runRaceDailyCheck({...f,discoveryLedger:discovery.ledger,pendingStore:pending,state,now:()=>checkedAt,autoApplyLowRisk:false});
  assert.ok(first.report.newPending.some(c => c.editionId === gonggaId && c.field === "registrationUrl"));
  assert.deepEqual(first.prepared.pendingStore.changes.slice(0,pending.changes.length),pending.changes);
  f.requests.length = 0; f.calls.length = 0;
  const nextDiscovery = await discoverOfficialSources({...f,checkedAt:NOW,ledger:discovery.ledger});
  assert.deepEqual(nextDiscovery.ledger.candidates,discovery.ledger.candidates);
  assert.equal(nextDiscovery.report.summary.unresolvedReview, nextDiscovery.ledger.candidates.filter(c => c.targetEditionId !== gonggaId && c.reviewStatus === "needs_review").length);
  const announcements = await prepareOfficialAnnouncements({...f,ledger:nextDiscovery.ledger,checkedAt:NOW});
  assert.ok(announcements.decisions.filter(d => d.editionId === gonggaId).every(d => d.status === "ended"));
  const second = await runRaceDailyCheck({...f,discoveryLedger:nextDiscovery.ledger,pendingStore:first.prepared.pendingStore,state:first.prepared.nextState,now:()=>NOW,autoApplyLowRisk:false});
  assert.deepEqual(second.report.editions.map(e => e.editionId),["xian-marathon-2026"]);
  assert.ok(f.requests.every(url => !url.includes("gongga.example.org")));
  assert.ok(f.calls.length > 0); // The future Edition crossed a re-verification boundary.
  assert.ok(f.calls.every(id => id === "xian-marathon-2026"));
  assert.equal(second.report.newPending.length,0);
  assert.deepEqual(second.prepared.pendingStore,first.prepared.pendingStore);
  assert.deepEqual(second.prepared.nextState.sources.filter(s => s.editionId === gonggaId),first.prepared.nextState.sources.filter(s => s.editionId === gonggaId));
  assert.ok(second.report.criticalFactVerification.every(c => c.editionId !== gonggaId));
  const alerts = evaluateVerificationAlerts({snapshot:f.snapshot,registry:f.registry,extraction:second.prepared.report});
  assert.ok(alerts.verificationAlerts.every(a => a.editionId !== gonggaId));
  assert.ok(alerts.criticalFactVerification.every(c => c.editionId !== gonggaId));
  assert.deepEqual({snapshot:f.snapshot,registry:f.registry},before);
  for (let i = 0; i < paths.length; i++) assert.deepEqual(await readFile(new URL(`../${paths[i]}`,import.meta.url)),bytes[i]);
});


test("a run crossing the final local midnight keeps target and coverage selection at its start time", async () => {
  const f = scenario();
  let tick = 0;
  const result = await runRaceDailyCheck({...f,
    pendingStore:{schemaVersion:"race-update-pending-v1",changes:[]},
    state:{schemaVersion:"official-source-ingestion-state-v1",sources:[]},
    now:() => tick++ === 0 ? "2026-09-27T15:59:59Z" : "2026-09-27T16:00:01Z",
    autoApplyLowRisk:false,
  });
  assert.equal(result.report.startedAt,"2026-09-27T15:59:59Z");
  assert.ok(result.report.finishedAt > result.report.startedAt);
  assert.equal(result.report.editions.length,2);
  assert.ok(result.report.criticalFactVerification.some(c => c.editionId === gonggaId));
  assert.ok(result.prepared.report.sources.some(s => s.editionId === gonggaId));
  assert.equal(buildRaceDailyCheckTargets(f.snapshot,f.registry,result.report.finishedAt).length,1);
});
