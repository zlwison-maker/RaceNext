import { strict as assert } from "node:assert";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { runRaceDailyCheck } from "./dailyCheck.ts";
import { discoverOfficialSources, assertDiscoveryLedger } from "./multiRaceDiscovery.ts";
import { loadRaceSourceRegistry } from "./sourceRegistry.ts";
import { loadQwenProviderFromEnvironment } from "./qwenProvider.ts";
import { assertRaceGraphSnapshot } from "./validation.ts";
import { assertOfficialIngestionState, assertPendingChangeStore, assertRealExtractionArtifact } from "./persistence.ts";
import { buildSanitizedRaceUpdateReport, classifyMeaningfulDataChange, assertSanitizedText } from "./productionWorkflow.ts";
import { prepareOfficialAnnouncements } from "./officialAnnouncements.ts";
import { runRealExtractionDryRun } from "./realExtraction.ts";
import { isNinghaiOfficialJsonSource } from "./ninghaiOfficialJson.ts";
import { evaluateVerificationAlerts } from "./verificationAlerts.ts";

// Explicit read-only validation: all prepared Pending / State stay in memory and ignored Artifacts.
const args=process.argv.slice(2);
if (args.some(a=>!a.startsWith("--editions=")&&!a.startsWith("--ledger=")&&a!=="--real-provider") || args.filter(a=>a.startsWith("--editions=")).length>1 || args.filter(a=>a.startsWith("--ledger=")).length>1) throw new Error("INVALID_READ_ONLY_VALIDATION_ARGUMENT");
const ids=(args.find(a=>a.startsWith("--editions="))?.slice(11) ?? "xian-marathon-2026").split(",");
const paths=["data/canonical/race-graph-v1.json","data/pending/race-update-pending.json","data/sources/race-source-registry.json","data/sources/official-source-ingestion-state.json"];
const before=await Promise.all(paths.map(p=>readFile(p)));
const snapshot=JSON.parse(before[0].toString());assertRaceGraphSnapshot(snapshot);
snapshot.records=snapshot.records.filter(r=>ids.includes(r.edition.editionId));
assert.equal(snapshot.records.length,new Set(ids).size,"UNKNOWN_OR_DUPLICATE_VALIDATION_EDITION");
const registry=await loadRaceSourceRegistry();
const pending=JSON.parse(before[1].toString());assertPendingChangeStore(pending);
const state=JSON.parse(before[3].toString());assertOfficialIngestionState(state);
let ledger;
const ledgerPath=args.find(a=>a.startsWith("--ledger="))?.slice(9);
if(ledgerPath) { ledger=JSON.parse(await readFile(ledgerPath,"utf8"));assertDiscoveryLedger(ledger); ledger={...ledger,candidates:ledger.candidates.filter(c=>ids.includes(c.targetEditionId))}; }
else ledger=(await discoverOfficialSources({snapshot,registry})).ledger;
const dir="artifacts/race-update/exception-review-validation";await mkdir(dir,{recursive:true});
if (!args.includes("--real-provider")) {
  const inspected=await prepareOfficialAnnouncements({snapshot,registry,ledger,checkedAt:new Date().toISOString()});
  const deterministicTargets=snapshot.records.map(r=>({editionId:r.edition.editionId,sourceIds:registry.editions
    .find(e=>e.editionId===r.edition.editionId)?.sources.filter(s=>s.status==="active"&&isNinghaiOfficialJsonSource(s,r.edition.editionId)).map(s=>s.sourceId)??[]})).filter(t=>t.sourceIds.length);
  const deterministic=deterministicTargets.length ? await runRealExtractionDryRun({snapshot,registry,state,pendingStore:pending,
    targets:deterministicTargets,provider:{id:"unconfigured",configured:false,model:"none",promptVersion:"none",
      async extract(){throw new Error("MODEL_MUST_NOT_BE_CALLED");}}}) : null;
  const verification=deterministic ? evaluateVerificationAlerts({snapshot:{...snapshot,records:snapshot.records.filter(r=>deterministicTargets.some(t=>t.editionId===r.edition.editionId))},registry,extraction:deterministic.report}) : null;
  const proof={readOnly:true,modelCalls:0,generatedAt:new Date().toISOString(),editions:ids,
    decisions:inspected.decisions,documents:inspected.documents,deterministicExtraction:deterministic?.report??null,
    verificationEditionIds:deterministicTargets.map(t=>t.editionId),verification};
  assertSanitizedText({text:JSON.stringify(proof),environment:process.env});
  await writeFile(`${dir}/article-inspection.json`,JSON.stringify(proof,null,2)+"\n");
  for(let i=0;i<paths.length;i++)assert.deepEqual(await readFile(paths[i]),before[i]);
  console.log(JSON.stringify({readOnly:true,modelCalls:0,eligibleDocuments:inspected.documents.length,decisions:inspected.decisions,
    inheritedFields:verification?.criticalFactVerification.filter(v=>v.status==="VERIFIED_INHERITED").length??0,
    deterministicSources:deterministic?.report.sources.map(s=>({sourceId:s.sourceId,status:s.extractionStatus,identity:s.identity?.status}))??[]}));
  process.exit(0);
}
const provider=loadQwenProviderFromEnvironment();if(!provider.configured)throw new Error("REAL_PROVIDER_NOT_CONFIGURED");
const calls:Array<{url:string;hash:string}>=[];
const observed={...provider, id:provider.id,model:provider.model,promptVersion:provider.promptVersion,configured:provider.configured,
  extract:async(request:Parameters<typeof provider.extract>[0])=>{calls.push({url:request.document.url,hash:request.document.contentHash});return provider.extract(request);} };
let currentState=state,currentPending=pending,previousExtraction;
for(const pass of [1,2]) {
  console.log(`READ_ONLY_PASS=${pass} EDITIONS=${ids.join(",")} CANDIDATE_URLS=${ledger.candidates.length}`);
  const count=calls.length;
  const result=await runRaceDailyCheck({snapshot,registry,state:currentState,pendingStore:currentPending,
    provider:observed,discoveryLedger:ledger,previousExtraction,autoApplyLowRisk:false});
  if(pass===2) {
    const successful=new Set(previousExtraction!.report.sources.filter(s=>["success","unchanged"].includes(s.extractionStatus)).map(s=>`${s.sourceUrl}/${s.contentHash}`));
    assert.ok(calls.slice(count).every(c=>!successful.has(`${c.url}/${c.hash}`)),"UNCHANGED_SUCCESSFUL_DOCUMENT_RECALLED_AI");
    assert.equal(result.report.newPending.length,0,"REPEAT_CREATED_DUPLICATE_PENDING");
  }
  const report=buildSanitizedRaceUpdateReport({report:result.report,autoApplyLowRisk:false,appliedChanges:[],
    meaningfulDiff:classifyMeaningfulDataChange({canonicalBefore:snapshot,canonicalAfter:snapshot,pendingBefore:currentPending,
      pendingAfter:result.prepared.pendingStore,stateBefore:currentState,stateAfter:result.prepared.nextState})});
  const extraction={schemaVersion:"race-real-extraction-artifact-v1" as const,generatedAt:result.report.finishedAt,report:result.prepared.report};
  assertRealExtractionArtifact(extraction);
  const proof={pass,readOnly:true,editions:ids,report,announcementDecisions:result.announcementDecisions,extraction,
    actualProviderCalls:calls.slice(count),protectedStores:paths.map((path,i)=>({path,sha256:createHash("sha256").update(before[i]).digest("hex")}))};
  assertSanitizedText({text:JSON.stringify(proof),environment:process.env});
  await writeFile(`${dir}/pass-${pass}.json`,JSON.stringify(proof,null,2)+"\n");
  console.log(JSON.stringify({pass,sources:report.sources.checked,officialEffective:report.verification.officialSourcesEffectivelyProcessed,
    freshlyVerified:report.verification.criticalFactsVerifiedThisRun,inherited:report.verification.criticalFactsVerifiedInherited,
    alerts:report.verification.alertCount,newPending:report.newPending.length,actualProviderCalls:calls.length-count,
    announcements:result.announcementDecisions.map(d=>({url:d.url,status:d.status,reason:d.reason}))}));
  currentState=result.prepared.nextState;currentPending=result.prepared.pendingStore;previousExtraction=extraction;
  for(let i=0;i<paths.length;i++)assert.deepEqual(await readFile(paths[i]),before[i],`PROTECTED_STORE_CHANGED:${paths[i]}`);
}
console.log(`READ_ONLY_VALIDATION=PASS; prepared data was never persisted to formal Stores; reports=${dir}; provider_calls=${calls.length}`);
