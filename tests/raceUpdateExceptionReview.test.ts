import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import type { FactExtractionProvider, OfficialFactCandidate, RealExtractionArtifact } from "../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshot, RaceSourceRegistry } from "../types/raceUpdate.ts";
import { runRaceDailyCheck } from "../scripts/race-update/dailyCheck.ts";
import { discoverOfficialSources } from "../scripts/race-update/multiRaceDiscovery.ts";
import { prepareOfficialAnnouncements } from "../scripts/race-update/officialAnnouncements.ts";
import { findRegistrySource } from "../scripts/race-update/sourceRegistry.ts";
import { validateOfficialFactCandidate } from "../scripts/race-update/validation.ts";
import { assertRealExtractionArtifact } from "../scripts/race-update/persistence.ts";

const canonical = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json",import.meta.url),"utf8")) as RaceGraphSnapshot;
const NOW="2026-10-15T01:00:00Z", LATER="2026-10-15T02:00:00Z";
const heading="2026 西安马拉松竞赛公告";
const distance="2026 西安马拉松 马拉松组 官方组别距离为42.195公里。";
const location="2026 西安马拉松 马拉松组 起点：测试起点。";
function fixture(body=distance+location) {
  const snapshot=structuredClone(canonical);
  snapshot.records=snapshot.records.filter(r=>r.edition.editionId==="xian-marathon-2026");
  snapshot.records[0].categories[0].startLocation=null;
  const registry:RaceSourceRegistry={schemaVersion:"race-source-registry-v1",editions:[{
    editionId:"xian-marathon-2026",sources:[{sourceId:"approved-site",url:"https://official.example.org/",domain:"official.example.org",
      tier:"primary_official",sourceType:"event_home",status:"active",isPrimary:true,notes:null}],
  }]};
  const page=`<h1>${heading}</h1><article>${body}</article>`;
  const fetcher=(async (url)=>new Response(String(url).endsWith("/")
    ? `<title>2026 西安马拉松</title><a href="/post-current.html">${heading}</a>` : page,{headers:{"content-type":"text/html"}})) as typeof fetch;
  let calls=0;
  const provider:FactExtractionProvider={id:"fixture",model:"fixture",promptVersion:"fixture-v1",configured:true,
    async extract(request) {
      calls++;
      const facts:OfficialFactCandidate[]=request.document.url.endsWith("/post-current.html") ? [
        {field:"distanceKm" as const,candidateValue:42.195,evidenceText:distance},
        {field:"startLocation" as const,candidateValue:"测试起点",evidenceText:location},
      ].filter(f=>body.includes(f.evidenceText)).map(f=>({...f,eventId:request.editionContext.eventId,
        editionId:request.editionContext.editionId,categoryId:request.editionContext.categories[0].categoryId,
        entityType:"Category",sourceId:request.document.sourceId,sourceUrl:request.document.url,
        evidenceLocator:"article",confidence:0.99,fetchedAt:request.document.fetchedAt,
        contentHash:request.document.contentHash,extractionMethod:request.document.extractionMethod})) : [];
      return {output:{contractVersion:"official-fact-extraction-v1",facts},provider:"fixture",model:"fixture",promptVersion:"fixture-v1",
        protocol:"openai-compatible-chat-completions",reasoningMode:"none",structuredOutputMode:"strict_json_schema",latencyMs:1,
        usage:{inputTokens:1,outputTokens:1,totalTokens:2}};
    }};
  return {snapshot,registry,fetcher,provider,calls:()=>calls};
}
const state=()=>({schemaVersion:"official-source-ingestion-state-v1" as const,sources:[]});
const pending=()=>({schemaVersion:"race-update-pending-v1" as const,changes:[]});
const artifact=(report:RealExtractionArtifact["report"]):RealExtractionArtifact=>({schemaVersion:"race-real-extraction-artifact-v1",generatedAt:report.finishedAt,report});

test("current official article enters existing Fact Pipeline without a Registry write; repeat creates no AI call or duplicate Pending",async()=>{
  const f=fixture(), before=JSON.stringify({snapshot:f.snapshot,registry:f.registry});
  const discovery=await discoverOfficialSources({...f,checkedAt:NOW});
  const first=await runRaceDailyCheck({...f,discoveryLedger:discovery.ledger,state:state(),pendingStore:pending(),now:()=>NOW});
  assert.equal(first.announcementDecisions[0].status,"processed");
  assert.equal(first.report.newPending.length,1);
  const change=first.report.newPending[0];assert.equal(change.risk,"high_impact");assert.equal(change.status,"pending");
  assert.equal(change.sourceUrl,"https://official.example.org/post-current.html");
  assert.ok(findRegistrySource(f.registry,change.editionId,change.sourceId,change.sourceUrl));
  assert.deepEqual(validateOfficialFactCandidate(f.snapshot,f.registry,{...change,candidateValue:change.candidateValue}),[]);
  assert.equal(first.report.summary.canonicalWrites,0);
  const a=JSON.parse(JSON.stringify(artifact(first.prepared.report)));assertRealExtractionArtifact(a);
  const calls=f.calls();
  const second=await runRaceDailyCheck({...f,discoveryLedger:discovery.ledger,state:first.prepared.nextState,
    pendingStore:first.prepared.pendingStore,previousExtraction:a,now:()=>LATER});
  assert.equal(f.calls(),calls);assert.equal(second.report.newPending.length,0);
  assert.deepEqual(second.prepared.pendingStore,first.prepared.pendingStore);
  const verified=second.report.criticalFactVerification.find(v=>v.field==="distanceKm"&&v.categoryId===change.categoryId)!;
  assert.equal(verified.status,"VERIFIED_INHERITED");
  const proof=second.prepared.report.sources.flatMap(s=>s.candidates).find(c=>c.field==="distanceKm")!;
  assert.equal(proof.evidenceVerifiedAt,NOW);
  assert.equal(JSON.stringify({snapshot:f.snapshot,registry:f.registry}),before);
});

test("historical, foreign and unknown actual article identities fail closed before AI; site furniture cannot establish article year",async()=>{
  for (const variant of ["historical","foreign","body-history","unknown-year","wrong-event"]) {
    const f=fixture();const discovery=await discoverOfficialSources({...f,checkedAt:NOW});
    if(variant==="historical") { discovery.ledger.candidates[0].title="2025 西安马拉松公告"; }
    if(variant==="foreign") { f.registry.editions[0].sources[0].sourceType="registration_platform"; }
    const body=variant==="body-history" ? "<h1>2025 西安马拉松公告</h1><article>2025 西安马拉松比赛公告，有效历史正文内容。</article><footer>2026 西安马拉松</footer>"
      :variant==="unknown-year" ? "<h1>西安马拉松比赛公告</h1><article>西安马拉松比赛公告，没有当届适用性证据。</article>"
      :"<h1>2026 北京马拉松公告</h1><article>2026 北京马拉松公告，没有西安赛事身份。</article>";
    const r=await prepareOfficialAnnouncements({...f,ledger:discovery.ledger,checkedAt:NOW,fetcher:(async()=>new Response(body,{headers:{"content-type":"text/html"}})) as typeof fetch});
    assert.equal(r.documents.length,0,variant);assert.equal(f.calls(),0);
    assert.equal(r.decisions[0].status,variant==="historical"?"historical":"needs_review");
  }
  const f=fixture();assert.equal(findRegistrySource(f.registry,"xian-marathon-2026","unregistered","https://official.example.org/notice"),undefined);
  const known=await discoverOfficialSources({...f,checkedAt:NOW});
  const prepared=await prepareOfficialAnnouncements({...f,ledger:known.ledger,checkedAt:NOW});
  assert.equal(findRegistrySource(f.registry,"xian-marathon-2026",prepared.documents[0].sourceId,"https://foreign.example.org/post-current.html"),undefined);
});

test("no relevant facts produce no Pending; unreadable image evidence remains an evidence exception",async()=>{
  const f=fixture("2026 西安马拉松本届赛事奖牌设计公告，介绍视觉设计与组织工作，不包含赛事日期和组别事实。");
  const d=await discoverOfficialSources({...f,checkedAt:NOW});
  const r=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:state(),pendingStore:pending(),now:()=>NOW});
  assert.equal(r.report.newPending.length,0);assert.equal(r.report.extraction.summary.candidateCount,0);
  assert.equal(r.announcementDecisions[0].status,"processed");
  const images=fixture('<img src="https://cdn.example.org/notice.jpg">');
  const img=await prepareOfficialAnnouncements({...images,ledger:d.ledger,checkedAt:NOW});
  assert.equal(img.documents.length,0);assert.equal(img.decisions[0].reason,"ARTICLE_IMAGE_EVIDENCE_NOT_READABLE");
});

test("history requires actual valid field evidence, current hash, identities, Canonical value and processing rules",async()=>{
  const f=fixture(), d=await discoverOfficialSources({...f,checkedAt:NOW});
  const first=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:state(),pendingStore:pending(),now:()=>NOW});
  for (const kind of ["missing","hash","text","identity","scope","rules","value"]) {
    const a=structuredClone(artifact(first.prepared.report)), snapshot=structuredClone(f.snapshot);
    const source=a.report.sources.find(s=>s.sourceId.includes("::announcement:"))!;
    const c=source.candidates.find(c=>c.field==="distanceKm")!;
    if(kind==="missing")source.candidates=[];
    if(kind==="hash")source.contentHash="f".repeat(64);
    if(kind==="text")c.evidenceText="fabricated official category distance 42.195";
    if(kind==="identity")c.eventId="other-event";
    if(kind==="scope")c.categoryId="other-category";
    if(kind==="rules")a.report.processingVersion="expired-rules";
    if(kind==="value")snapshot.records[0].categories[0].distanceKm=43;
    const r=await runRaceDailyCheck({...f,snapshot,discoveryLedger:d.ledger,state:first.prepared.nextState,
      pendingStore:first.prepared.pendingStore,previousExtraction:a,now:()=>LATER});
    assert.notEqual(r.report.criticalFactVerification.find(v=>v.field==="distanceKm"&&v.categoryId===c.categoryId)?.status,"VERIFIED_INHERITED",kind);
  }
});

test("material lifecycle boundary forces extraction and never carries inherited verification across it",async()=>{
  const f=fixture();f.snapshot.records[0].edition.registrationCloseDate="2026-10-15T01:30:00Z";
  f.snapshot.records[0].edition.registrationStatus="lottery";
  const d=await discoverOfficialSources({...f,checkedAt:NOW});
  const first=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:state(),pendingStore:pending(),now:()=>NOW});
  const calls=f.calls();
  const next=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:first.prepared.nextState,
    pendingStore:first.prepared.pendingStore,previousExtraction:artifact(first.prepared.report),now:()=>LATER});
  assert.ok(f.calls()>calls);
  assert.equal(next.report.criticalFactVerification.some(v=>v.status==="VERIFIED_INHERITED"),false);
  assert.ok(next.report.verificationAlerts.some(a=>a.reasonCode==="REGISTRATION_LIFECYCLE_REVIEW"));
});

test("already applied direct Pending evidence bootstraps safely when historical run Artifacts are absent",async()=>{
  const f=fixture(), d=await discoverOfficialSources({...f,checkedAt:NOW});
  const first=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:state(),pendingStore:pending(),now:()=>NOW});
  const reviewed=structuredClone(first.prepared.pendingStore);
  reviewed.changes[0].status="applied";reviewed.changes[0].reviewedAt=NOW;reviewed.changes[0].appliedAt=NOW;
  f.snapshot.records[0].categories[0].startLocation="测试起点";
  const before=structuredClone(reviewed), calls=f.calls();
  const next=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:first.prepared.nextState,pendingStore:reviewed,now:()=>LATER});
  assert.equal(f.calls(),calls);assert.deepEqual(next.prepared.pendingStore,before);assert.equal(next.report.newPending.length,0);
  const target=next.report.criticalFactVerification.find(c=>c.categoryId===reviewed.changes[0].categoryId&&c.field==="startLocation")!;
  assert.equal(target.status,"VERIFIED_INHERITED");
  assert.equal(next.report.criticalFactVerification.find(c=>c.categoryId===target.categoryId&&c.field==="distanceKm")!.status,"NOT_VERIFIED_THIS_RUN");
  const bad=structuredClone(reviewed);bad.changes[0].status="pending";bad.changes[0].reviewedAt=null;bad.changes[0].appliedAt=null;
  const unapproved=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:first.prepared.nextState,pendingStore:bad,now:()=>LATER});
  assert.equal(unapproved.report.criticalFactVerification.find(c=>c.categoryId===target.categoryId&&c.field==="startLocation")!.status,"NOT_VERIFIED_THIS_RUN");
});

test("same-domain authority never accepts invented field evidence or ambiguous Category scope",async()=>{
  for(const kind of ["invented","wrong-category","no-category-scope"]) {
    const ambiguous="2026 西安马拉松起点：测试起点。";
    const f=fixture(kind==="no-category-scope" ? `2026 西安马拉松 马拉松组、半程马拉松组公告。${ambiguous}${distance}` : undefined);
    const d=await discoverOfficialSources({...f,checkedAt:NOW}), base=f.provider.extract.bind(f.provider);
    f.provider.extract=async request=>{
      const r=await base(request);
      for(const c of r.output.facts) {
        if(kind==="invented")c.evidenceText="Unwritten official evidence for 42.195 and 测试起点";
        else if(kind==="wrong-category")c.categoryId="nonexistent-category";
        else { c.field="startLocation";c.candidateValue="测试起点";c.evidenceText=ambiguous; }
      }
      return r;
    };
    const r=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:state(),pendingStore:pending(),now:()=>NOW});
    assert.equal(r.report.newPending.length,0,kind);assert.equal(r.announcementDecisions[0].status,"needs_review");
    if(kind==="no-category-scope")assert.match(r.announcementDecisions[0].reason,/ambiguous_entity_scope/);
  }
});

test("foreign candidates and shared official hosts are explicit exceptions, not delegated sites",async()=>{
  const f=fixture();
  const d=await discoverOfficialSources({...f,checkedAt:NOW,fetcher:(async()=>new Response(`<a href="https://foreign.example.org/post">${heading}</a>`,{headers:{"content-type":"text/html"}})) as typeof fetch});
  let requests=0;
  const r=await prepareOfficialAnnouncements({...f,ledger:d.ledger,checkedAt:NOW,fetcher:(async()=>{requests++;throw new Error("MUST_NOT_FETCH_FOREIGN_CANDIDATE");}) as typeof fetch});
  assert.equal(requests,0);assert.equal(r.documents.length,0);assert.equal(r.decisions[0].status,"needs_review");
  const own=await discoverOfficialSources({...f,checkedAt:NOW});
  f.registry.editions.push({editionId:"another-race-2026",sources:[{...f.registry.editions[0].sources[0],sourceId:"shared-official-site"}]});
  const shared=await prepareOfficialAnnouncements({...f,ledger:own.ledger,checkedAt:NOW});
  assert.equal(shared.documents.length,0);assert.equal(shared.decisions[0].status,"needs_review");
});

test("current article may cite old rulebooks, but generic current site furniture cannot redeem historical article content",async()=>{
  const f=fixture(),d=await discoverOfficialSources({...f,checkedAt:NOW});
  for(const current of [true,false]) {
    const body=current ? `<title>2026 西安马拉松竞赛规程</title><article>2026 西安马拉松比赛公告。本次比赛按照2025年田径规则执行。</article>`
      : `<title>2026 西安马拉松</title><article>2025 西安马拉松比赛公告。这是2025届比赛的正式公告，不能用于当前赛事。</article>`;
    const r=await prepareOfficialAnnouncements({...f,ledger:d.ledger,checkedAt:NOW,fetcher:(async()=>new Response(body,{headers:{"content-type":"text/html"}})) as typeof fetch});
    assert.equal(r.documents.length,current?1:0);
  }
});

test("unchanged deterministic rejection stays an exception without repeated AI or a successful State hash",async()=>{
  const f=fixture(),d=await discoverOfficialSources({...f,checkedAt:NOW}),extract=f.provider.extract.bind(f.provider);
  f.provider.extract=async request=>{const r=await extract(request);r.output.facts.forEach(c=>{c.evidenceText="invented evidence";});return r;};
  const first=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:state(),pendingStore:pending(),now:()=>NOW});
  assert.equal(first.announcementDecisions[0].status,"needs_review");
  const calls=f.calls();
  const second=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:first.prepared.nextState,
    pendingStore:first.prepared.pendingStore,previousExtraction:artifact(first.prepared.report),now:()=>LATER});
  assert.equal(f.calls(),calls);assert.equal(second.report.summary.modelCalls,0);assert.equal(second.report.newPending.length,0);
  assert.equal(second.announcementDecisions[0].status,"needs_review");
  const source=second.prepared.report.sources.find(s=>s.sourceId.includes("::announcement:"))!;
  assert.equal(source.extractionStatus,"validation_error");assert.equal(source.requestStatus,"skipped");
  assert.ok(source.rejectedCandidates.length>0);
  assert.equal(second.prepared.nextState.sources.find(s=>s.sourceId===source.sourceId)!.lastSuccessfulExtractionHash,null);
  assert.equal(second.report.criticalFactVerification.some(c=>["VERIFIED_THIS_RUN","VERIFIED_INHERITED"].includes(c.status)),false);
});

test("current site banner cannot override the actual historical article heading",async()=>{
  const f=fixture(),d=await discoverOfficialSources({...f,checkedAt:NOW});
  for(const content of [
    '<h1>2026 西安马拉松</h1><article><h2>2025 西安马拉松竞赛公告</h2>2025 西安马拉松比赛正式历史内容。</article>',
    '<h1>2026 西安马拉松</h1><h3>2025 西安马拉松竞赛公告</h3><div class="content">2025 西安马拉松比赛正式历史内容。</div>',
    '<h1>2026 西安马拉松</h1><article>2025 西安马拉松比赛正式历史内容，不能用于当前赛事。</article>',
  ]) {
    const r=await prepareOfficialAnnouncements({...f,ledger:d.ledger,checkedAt:NOW,fetcher:(async()=>new Response(content,{headers:{"content-type":"text/html"}})) as typeof fetch});
    assert.equal(r.documents.length,0);assert.equal(r.decisions[0].status,"needs_review");
  }
});

test("matching historical evidence cannot hide a newly accepted contrary official fact",async()=>{
  const f=fixture(),d=await discoverOfficialSources({...f,checkedAt:NOW});
  const first=await runRaceDailyCheck({...f,discoveryLedger:d.ledger,state:state(),pendingStore:pending(),now:()=>NOW});
  f.registry.editions[0].sources.push({...f.registry.editions[0].sources[0],sourceId:"new-direct-notice",
    url:"https://second.example.org/current",domain:"second.example.org",sourceType:"notice",isPrimary:false});
  const evidence="2026 西安马拉松 马拉松组 官方组别距离为43公里。";
  const base=f.provider.extract.bind(f.provider);
  f.provider.extract=async request=>{
    const result=await base(request);
    if(request.document.url.includes("second.example.org")) result.output.facts=[{eventId:request.editionContext.eventId,
      editionId:request.editionContext.editionId,categoryId:request.editionContext.categories[0].categoryId,entityType:"Category",
      field:"distanceKm",candidateValue:43,sourceId:request.document.sourceId,sourceUrl:request.document.url,
      contentHash:request.document.contentHash,fetchedAt:request.document.fetchedAt,extractionMethod:request.document.extractionMethod,
      evidenceText:evidence,evidenceLocator:"article",confidence:0.99}];
    return result;
  };
  const fetcher=(async (url,init)=>String(url).includes("second.example.org")
    ?new Response(`<title>2026 西安马拉松</title><article>${evidence}</article>`,{headers:{"content-type":"text/html"}})
    :f.fetcher(url,init)) as typeof fetch;
  const next=await runRaceDailyCheck({...f,fetcher,discoveryLedger:d.ledger,state:first.prepared.nextState,
    pendingStore:first.prepared.pendingStore,previousExtraction:artifact(first.prepared.report),now:()=>LATER});
  assert.equal(next.report.criticalFactVerification.find(c=>c.field==="distanceKm"&&c.categoryId===f.snapshot.records[0].categories[0].categoryId)!.status,"NOT_VERIFIED_THIS_RUN");
  const change=next.report.newPending.find(c=>c.field==="distanceKm")!;
  assert.ok(change);assert.equal(change.status,"pending");assert.equal(change.risk,"high_impact");
});
