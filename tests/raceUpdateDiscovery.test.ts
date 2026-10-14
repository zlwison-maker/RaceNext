import { deepEqual, equal, ok, rejects, throws } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertOperationsReviewState } from "../scripts/race-update/operationsReview.ts";
import {
  assertDiscoveryLedger,
  discoverOfficialSources,
  emptyDiscoveryLedger,
} from "../scripts/race-update/multiRaceDiscovery.ts";
import {
  assertPublicDiscoveryUrl,
  DISCOVERY_LIMITS,
  fetchDiscoveryText,
  isPublicAddress,
} from "../scripts/race-update/discoveryFetch.ts";
import { buildRaceDailyCheckTargets } from "../scripts/race-update/dailyCheck.ts";
import type {
  RaceGraphSnapshot,
  RaceSourceRegistry,
} from "../types/raceUpdate.ts";

const canonical = JSON.parse(
  readFileSync(
    new URL("../data/canonical/race-graph-v1.json", import.meta.url),
    "utf8",
  ),
) as RaceGraphSnapshot;
function fixture() {
  const snapshot = structuredClone(canonical);
  snapshot.records = [snapshot.records[0]];
  const id = snapshot.records[0].edition.editionId;
  const registry: RaceSourceRegistry = {
    schemaVersion: "race-source-registry-v1",
    editions: [
      {
        editionId: id,
        sources: [
          {
            sourceId: "approved-entry",
            url: "https://official.example.org/",
            domain: "official.example.org",
            tier: "primary_official",
            sourceType: "event_home",
            status: "active",
            isPrimary: true,
            notes: null,
          },
        ],
      },
    ],
  };
  return { snapshot, registry, checkedAt: "2026-10-14T12:00:00Z" };
}
const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html" } });

test("generic discovery records direct entry evidence and identity; duplicates never become new review tasks", async () => {
  const f = fixture();
  const before = structuredClone(f);
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return html(
      '<a href="/notice/2026?b=2&a=1&utm_source=mail">2026 上海马拉松报名通知</a><a href="/notice/2026?a=1&b=2#x">2026 上海马拉松报名通知</a><a href="https://registration.example.org/2026">2026 上海马拉松报名平台</a><a href="/notice/2025">2025 上海马拉松竞赛规程</a><a href="/unknown">赛事报名通知</a>',
    );
  }) as typeof fetch;
  const first = await discoverOfficialSources({ ...f, fetcher });
  equal(first.report.summary.newSources, 4);
  equal(calls, 1);
  const candidates = first.report.editions[0].candidates;
  const current = candidates.find((c) =>
    c.candidateUrl.includes("/notice/2026"),
  )!;
  equal(current.eventIdentityStatus, "title_match");
  equal(current.editionIdentityStatus, "title_year_match");
  equal(current.reviewStatus, "needs_review");
  equal(current.sourceAuthorityStatus, "official_site_unapproved");
  equal(current.evidence.listingUrl, f.registry.editions[0].sources[0].url);
  ok(current.evidence.listingHash.length === 64);
  ok(current.evidence.excerpt.includes("报名通知"));
  equal(
    candidates.find((c) => c.candidateUrl.includes("registration.example"))!
      .sourceAuthorityStatus,
    "external_link_unverified",
  );
  equal(
    candidates.find((c) => c.candidateUrl.endsWith("2025"))!
      .editionIdentityStatus,
    "year_conflict",
  );
  equal(
    candidates.find((c) => c.candidateUrl.endsWith("unknown"))!
      .editionIdentityStatus,
    "needs_review",
  );
  const ledgerBefore = structuredClone(first.ledger);
  const second = await discoverOfficialSources({
    ...f,
    fetcher,
    ledger: first.ledger,
    checkedAt: "2026-10-15T12:00:00Z",
  });
  equal(second.report.summary.newSources, 0);
  equal(second.report.editions[0].status, "NO_NEW_SOURCES");
  deepEqual(second.ledger, first.ledger);
  deepEqual(first.ledger, ledgerBefore);
  deepEqual(f, before);
  equal(first.report.factPendingWrites, 0);
  equal(first.report.registryWrites, 0);
  equal(first.report.modelCalls, 0);
  const targets = buildRaceDailyCheckTargets(f.snapshot, f.registry);
  deepEqual(targets[0].sourceIds, ["approved-entry"]);
  const approved = structuredClone(f.registry);
  approved.editions[0].sources.push({
    ...approved.editions[0].sources[0],
    sourceId: "human-approved-notice",
    url: current.candidateUrl,
    sourceType: "registration_notice",
    isPrimary: false,
  });
  deepEqual(buildRaceDailyCheckTargets(f.snapshot, approved)[0].sourceIds, [
    "approved-entry",
    "human-approved-notice",
  ]);
});
test("RSS and Sitemap are reusable strategies; cross-domain links are recorded but never fetched", async () => {
  for (const [contentType, body, method] of [
    [
      "application/rss+xml",
      "<rss><channel><item><title>2026 上海马拉松报名公告</title><link>https://foreign.example.org/new</link></item></channel></rss>",
      "rss",
    ],
    [
      "application/xml",
      "<urlset><url><loc>https://official.example.org/2026-marathon-registration</loc></url></urlset>",
      "sitemap",
    ],
  ]) {
    let calls = 0;
    const f = fixture();
    const result = await discoverOfficialSources({
      ...f,
      fetcher: (async () => {
        calls++;
        return new Response(body, { headers: { "content-type": contentType } });
      }) as typeof fetch,
    });
    equal(calls, 1);
    equal(result.report.summary.newSources, 1);
    equal(result.report.editions[0].candidates[0].discoveryMethod, method);
  }
});
test("listing traversal is bounded even on repeated failures; SPA and fetch failure are distinct", async () => {
  const f = fixture();
  let calls = 0;
  const r = await discoverOfficialSources({
    ...f,
    fetcher: (async (url) => {
      calls++;
      return String(url).endsWith("/")
        ? html(
            Array.from(
              { length: 50 },
              (_, i) => `<a href="/news/${i}">news</a>`,
            ).join(""),
          )
        : new Response("", { status: 503 });
    }) as typeof fetch,
  });
  equal(calls, 1 + DISCOVERY_LIMITS.listingsPerEdition);
  ok(r.report.editions[0].errors.length === 2);
  const spa = await discoverOfficialSources({
    ...f,
    fetcher: (async () =>
      html(
        '<div id="app"></div><script src="app.js"></script>',
      )) as typeof fetch,
  });
  equal(spa.report.editions[0].status, "NOT_COVERED");
  const fail = await discoverOfficialSources({
    ...f,
    fetcher: (async () => new Response("", { status: 503 })) as typeof fetch,
  });
  equal(fail.report.editions[0].status, "FAILED");
});
test("discovery isolates one Edition failure, preserves protected data, ignores unapproved/trusted entries", async () => {
  const f = fixture();
  f.snapshot.records.push(structuredClone(canonical.records[1]));
  f.registry.editions.push({
    editionId: f.snapshot.records[1].edition.editionId,
    sources: [
      {
        ...f.registry.editions[0].sources[0],
        sourceId: "second",
        url: "https://second.example.org/",
        domain: "second.example.org",
      },
    ],
  });
  const protectedPaths = [
    "canonical/race-graph-v1.json",
    "pending/race-update-pending.json",
    "sources/race-source-registry.json",
    "sources/official-source-ingestion-state.json",
  ];
  const bytes = protectedPaths.map((p) =>
    readFileSync(new URL(`../data/${p}`, import.meta.url)),
  );
  const r = await discoverOfficialSources({
    ...f,
    fetcher: (async (url) =>
      String(url).includes("second.")
        ? html('<a href="/race-registration-2026">2026 北京马拉松报名通知</a>')
        : new Response("", { status: 503 })) as typeof fetch,
  });
  equal(r.report.editions[0].status, "FAILED");
  equal(r.report.editions[1].status, "CANDIDATES_FOUND");
  deepEqual(
    protectedPaths.map((p) =>
      readFileSync(new URL(`../data/${p}`, import.meta.url)),
    ),
    bytes,
  );
  f.registry.editions[0].sources[0].status = "pending_review";
  const no = await discoverOfficialSources({
    ...f,
    fetcher: (async () => html("")) as typeof fetch,
  });
  equal(no.report.editions[0].entriesChecked, 0);
});
test("SSRF, credentials, port, downgrade, redirects and response limits fail before trust promotion", async () => {
  for (const url of [
    "http://127.0.0.1/",
    "http://169.254.169.254/",
    "http://[::1]/",
    "https://localhost/",
    "https://user:pass@example.org/",
    "https://example.org:8080/",
    "file:///tmp/a",
  ])
    throws(() => assertPublicDiscoveryUrl(url));
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.0.1",
    "::ffff:127.0.0.1",
    "fe80::1",
    "fc00::1",
    "::1",
    "2001:db8::1",
  ])
    equal(isPublicAddress(ip), false);
  for (const ip of ["8.8.8.8", "1.1.1.1", "2001:4860:4860::8888"])
    equal(isPublicAddress(ip), true);
  for (const location of [
    "https://other.example.org/",
    "http://official.example.org/",
    "http://127.0.0.1/",
  ])
    await rejects(
      fetchDiscoveryText({
        url: "https://official.example.org/",
        approvedHost: "official.example.org",
        fetcher: (async () =>
          new Response("", {
            status: 302,
            headers: { location },
          })) as typeof fetch,
      }),
      /DISCOVERY_/,
    );
  await rejects(
    fetchDiscoveryText({
      url: "https://official.example.org/",
      approvedHost: "official.example.org",
      fetcher: (async () =>
        new Response("x", {
          headers: {
            "content-type": "text/html",
            "content-length": String(DISCOVERY_LIMITS.maxBytes + 1),
          },
        })) as typeof fetch,
    }),
    /TOO_LARGE/,
  );
});
test("invalid candidate ledger and duplicate IDs reject; ended Editions produce no daily review tasks", async () => {
  const ledger = emptyDiscoveryLedger();
  assertDiscoveryLedger(ledger);
  throws(() => assertDiscoveryLedger({ schemaVersion: "bad", candidates: [] }));
  const f = fixture();
  const first = await discoverOfficialSources({
    ...f,
    fetcher: (async () =>
      html(
        '<a href="/race-registration-2026">2026 上海马拉松报名公告</a>',
      )) as typeof fetch,
  });
  throws(
    () =>
      assertDiscoveryLedger({
        ...first.ledger,
        candidates: [...first.ledger.candidates, ...first.ledger.candidates],
      }),
    /CANDIDATE_ID/,
  );
  f.snapshot.records[0].edition.raceDate = "2026-10-13";
  let calls = 0;
  const old = await discoverOfficialSources({
    ...f,
    fetcher: (async () => {
      calls++;
      return html("");
    }) as typeof fetch,
  });
  equal(calls, 0);
  equal(old.report.summary.newSources, 0);
});
test("shared government domains require target-event title identity and email utility routes never create review tasks", async () => {
  const f = fixture();
  f.registry.editions[0].sources[0].url = "https://sports.gov.cn/";
  f.registry.editions[0].sources[0].domain = "sports.gov.cn";
  const r = await discoverOfficialSources({
    ...f,
    fetcher: (async () =>
      html(
        '<a href="/recruitment">2026 体育局招聘通知</a><a href="/race">2026 上海马拉松报名通知</a><a href="/cdn-cgi/l/email-protection">Registrations: email protected</a>',
      )) as typeof fetch,
  });
  equal(r.report.summary.newSources, 1);
  equal(
    r.report.editions[0].candidates[0].candidateUrl,
    "https://sports.gov.cn/race",
  );
});
test("changed identity on an existing URL remains one Candidate and re-enters review without approving it", async () => {
  const f = fixture();
  const first = await discoverOfficialSources({
    ...f,
    fetcher: (async () =>
      html('<a href="/race">2025 上海马拉松报名公告</a>')) as typeof fetch,
  });
  equal(first.report.summary.unresolvedReview, 0);
  const second = await discoverOfficialSources({
    ...f,
    ledger: first.ledger,
    fetcher: (async () =>
      html('<a href="/race">2026 上海马拉松报名公告</a>')) as typeof fetch,
  });
  equal(second.report.summary.newSources, 0);
  equal(second.report.summary.changedCandidates, 1);
  equal(second.report.summary.unresolvedReview, 1);
  equal(second.ledger.candidates.length, 1);
  equal(second.ledger.candidates[0].reviewStatus, "needs_review");
});
test("script/comment markup cannot fabricate visible announcement Evidence or execute instructions", async () => {
  const f = fixture();
  const result = await discoverOfficialSources({
    ...f,
    fetcher: (async () =>
      html(
        '<script>const bait=\'<a href="/fake">2026 上海马拉松报名公告</a>\';</script><!-- <a href="/hidden">2026 上海马拉松报名公告</a> --><a href="/real">2026 上海马拉松竞赛规程</a>',
      )) as typeof fetch,
  });
  equal(result.report.summary.newSources, 1);
  equal(
    result.ledger.candidates[0].candidateUrl,
    "https://official.example.org/real",
  );
});
test("Candidate ledger and operations review survive actual temporary-file round trips without duplicate review tasks",async()=>{
  const {mkdtemp,readFile}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const {writeJsonAtomicValidated}=await import('../scripts/race-update/persistence.ts');
  const f=fixture();const fetcher=(async()=>html('<a href="/race">2026 上海马拉松报名公告</a>')) as typeof fetch;
  const first=await discoverOfficialSources({...f,fetcher});const dir=await mkdtemp(join(tmpdir(),'racenext-review-test-'));const path=join(dir,'ledger.json');
  await writeJsonAtomicValidated({path,value:first.ledger,validate:assertDiscoveryLedger,allowedPaths:[path]});
  const restored=JSON.parse(await readFile(path,'utf8'));assertDiscoveryLedger(restored);
  const second=await discoverOfficialSources({...f,fetcher,ledger:restored});equal(second.report.summary.newSources,0);deepEqual(second.ledger,first.ledger);
  const operationsPath=join(dir,'operations.json');const state={schemaVersion:'operations-review-state-v1' as const,alerts:[{alertId:'va-0123456789abcdef',signature:'a'.repeat(64)}]};
  await writeJsonAtomicValidated({path:operationsPath,value:state,validate:assertOperationsReviewState,allowedPaths:[operationsPath]});
  const restoredReview=JSON.parse(await readFile(operationsPath,'utf8'));assertOperationsReviewState(restoredReview);deepEqual(restoredReview,state);
});
