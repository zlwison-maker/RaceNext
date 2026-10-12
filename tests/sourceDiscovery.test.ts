import { deepEqual, equal, match, ok } from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  classifyEditionIdentity, discoverBeijingOfficialCandidates, normalizeCandidateUrl,
} from "../scripts/race-update/sourceDiscovery.ts";
import { findRegistrySource, loadRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import {
  frontendScript, homeIndexResponse, homepageHtml, newsResponse, routeScript,
} from "./fixtures/beijingSourceDiscoveryResponses.ts";

const observedAt = "2026-10-12T08:45:00.000Z";
const homepageUrl = "https://www.beijing-marathon.com/";
const scriptUrl = "https://res.mararun.com/online/mara-race/assets/js/beijing/common.022d5ece.js";
const routeScriptUrl = "https://res.mararun.com/online/mara-race/assets/js/beijing/index.3e33815f.js";
const cmsBase = "https://mara-public-res-online.oss-cn-beijing.aliyuncs.com/beta/cms/internal/BJCN";
const indexUrl = `${cmsBase}/homeIndex.json`;
const newsUrl = `${cmsBase}/articles/7793646346787704.json`;

function replayFetcher(overrides: Partial<Record<string, string>> = {}) {
  const responses: Record<string, string> = {
    [homepageUrl]: homepageHtml,
    [scriptUrl]: frontendScript,
    [routeScriptUrl]: routeScript,
    [indexUrl]: JSON.stringify(homeIndexResponse),
    [newsUrl]: JSON.stringify(newsResponse),
    ...overrides,
  };
  const requests: string[] = [];
  const fetcher = (async (url: string | URL | Request) => {
    const key = String(url);
    requests.push(key);
    return key in responses
      ? new Response(responses[key], { status: 200 })
      : new Response("Not found", { status: 404 });
  }) as typeof fetch;
  return { fetcher, requests };
}

test("real-response replay independently discovers Beijing registration notice and archived second draw", async () => {
  const { fetcher, requests } = replayFetcher();
  const report = await discoverBeijingOfficialCandidates({ fetcher, checkedAt: observedAt });
  equal(report.status, "success");
  deepEqual(requests, [homepageUrl, scriptUrl, routeScriptUrl, indexUrl, newsUrl]);
  equal(report.recordsExamined, 3);
  const registration = report.candidates.find((item) => item.title.includes("报名须知"));
  const secondDraw = report.candidates.find((item) => item.title.includes("二抽结果"));
  ok(registration);
  ok(secondDraw);
  equal(registration.articleId, "9024245728409368");
  equal(registration.cmsReturnedUrl, null);
  equal(registration.candidateUrlProvenance, "official_frontend_route");
  equal(registration.cmsQueryUrl, indexUrl);
  equal(registration.sourceAuthorityStatus, "official_site_unapproved");
  equal(registration.editionIdentityStatus, "title_year_match");
  equal(secondDraw.articleId, "9056984619947595");
  equal(secondDraw.candidateUrl, "https://mp.weixin.qq.com/s/rslZoUfFlE0oN6v9Fmum2w");
  equal(secondDraw.cmsReturnedUrl, secondDraw.candidateUrl);
  equal(secondDraw.candidateUrlProvenance, "cms_record_url");
  equal(secondDraw.cmsQueryUrl, newsUrl);
  equal(secondDraw.sourceAuthorityStatus, "external_link_unverified");
  equal(secondDraw.editionIdentityStatus, "cms_tag_only_needs_review");
  equal(secondDraw.reviewStatus, "needs_review");
  match(secondDraw.evidence.cmsResponseSha256, /^[a-f0-9]{64}$/);
  deepEqual(secondDraw.evidence.cmsRecord, newsResponse.datas[0]);
  equal(report.factVerification, "not_verified");
  ok(!homepageHtml.includes("9056984619947595"));
  ok(!requests.some((url) => url.includes("9056984619947595")));
});

test("older-year and conflicting-year records cannot become 2026 candidates", async () => {
  const news = structuredClone(newsResponse);
  const old = structuredClone(news.datas[0]);
  old.article.data.title = "2025北京马拉松二次抽签公告";
  old.article.data.tag = "2026";
  old.article.id = "9999999999999999";
  old.article.data.URL = "https://www.beijing-marathon.com/2025-draw";
  news.datas.push(old);
  const { fetcher } = replayFetcher({ [newsUrl]: JSON.stringify(news) });
  const report = await discoverBeijingOfficialCandidates({ fetcher, checkedAt: observedAt });
  equal(report.status, "success");
  equal(report.candidates.some((item) => item.articleId === old.article.id), false);
  equal(report.candidates.some((item) => item.title.includes("2025")), false);
  equal(classifyEditionIdentity({ title: old.article.data.title, tag: "2026", targetYear: 2026 }), "year_conflict");
});

test("the separate Beijing 10 km event is not treated as a marathon source candidate", async () => {
  const news = structuredClone(newsResponse);
  const otherEvent = structuredClone(news.datas[0]);
  otherEvent.article.data.title = "2026中行北马10公里报名启动";
  otherEvent.article.id = "8888888888888888";
  otherEvent.article.data.URL = "https://mp.weixin.qq.com/s/other-event";
  news.datas.push(otherEvent);
  const { fetcher } = replayFetcher({ [newsUrl]: JSON.stringify(news) });
  const report = await discoverBeijingOfficialCandidates({ fetcher, checkedAt: observedAt });
  equal(report.status, "success");
  equal(report.candidates.some((item) => item.articleId === otherEvent.article.id), false);
});

test("HK100 old Notice remains edition-unknown rather than verified for 2027", () => {
  // Live page metadata: published 2024-08-08, modified 2025-03-10. Its shared navigation now says 2027,
  // but navigation is not evidence that this old Notice belongs to the 2027 Edition.
  const oldNotice = { title: "HK100 Notice", publishedAt: "2024-08-08", navigationYear: "2027" };
  equal(classifyEditionIdentity({ title: oldNotice.title, targetYear: 2027 }), "needs_review");
  equal(classifyEditionIdentity({ title: "2024 HK100 Notice", targetYear: 2027 }), "year_conflict");
});

test("repeat discovery has stable IDs, normalizes URL format, and de-duplicates duplicates", async () => {
  const news = structuredClone(newsResponse);
  news.datas.push(structuredClone(news.datas[0]));
  const { fetcher } = replayFetcher({ [newsUrl]: JSON.stringify(news) });
  const first = await discoverBeijingOfficialCandidates({ fetcher, checkedAt: observedAt });
  const second = await discoverBeijingOfficialCandidates({ fetcher, checkedAt: "2026-10-13T08:45:00.000Z" });
  deepEqual(first.candidates.map(({ candidateId }) => candidateId), second.candidates.map(({ candidateId }) => candidateId));
  equal(first.candidates.filter((item) => item.articleId === "9056984619947595").length, 1);
  equal(normalizeCandidateUrl("HTTPS://MP.WEIXIN.QQ.COM/s/a?b=2&a=1#fragment"), "https://mp.weixin.qq.com/s/a?a=1&b=2");
});

test("provider failure is visible and cannot report discovery success", async () => {
  const { fetcher } = replayFetcher({ [indexUrl]: "not JSON" });
  const report = await discoverBeijingOfficialCandidates({ fetcher, checkedAt: observedAt });
  equal(report.status, "failed");
  equal(report.candidates.length, 0);
  ok(report.errors.length > 0);
});

test("missing or malformed required CMS structures fail rather than appear empty", async (t) => {
  const malformedResponses = [
    { name: "missing news.datas", url: newsUrl, body: { total: 1 }, error: /news\.datas/ },
    { name: "non-array news.datas", url: newsUrl, body: { total: 1, datas: {} }, error: /news\.datas/ },
    { name: "missing news.total", url: newsUrl, body: { datas: newsResponse.datas }, error: /news\.total/ },
    { name: "invalid news.total", url: newsUrl, body: { total: -1, datas: newsResponse.datas }, error: /news\.total/ },
    { name: "non-integer news.total", url: newsUrl, body: { total: "1", datas: newsResponse.datas }, error: /news\.total/ },
    { name: "missing notice list", url: indexUrl, body: { ...homeIndexResponse, articles: {} }, error: /homeIndex\.articles\.notice/ },
    { name: "non-array notice list", url: indexUrl, body: { ...homeIndexResponse, articles: { notice: {} } }, error: /homeIndex\.articles\.notice/ },
  ];
  for (const scenario of malformedResponses) {
    await t.test(scenario.name, async () => {
      const { fetcher } = replayFetcher({ [scenario.url]: JSON.stringify(scenario.body) });
      const report = await discoverBeijingOfficialCandidates({ fetcher, checkedAt: observedAt });
      equal(report.status, "failed");
      equal(report.candidates.length, 0);
      match(report.errors[0], scenario.error);
      equal(report.factVerification, "not_verified");
    });
  }
});

test("a truncated news response is explicitly partial, not discovery success", async () => {
  const news = { ...newsResponse, total: 111 };
  const { fetcher } = replayFetcher({ [newsUrl]: JSON.stringify(news) });
  const report = await discoverBeijingOfficialCandidates({ fetcher, checkedAt: observedAt });
  equal(report.status, "partial");
  equal(report.newsReportedTotal, 111);
  equal(report.newsRecordsReturned, 1);
  match(report.coverageWarnings[0], /historical coverage is incomplete/);
});

test("cross-domain CMS link is not in the approved Registry or fact chain", async () => {
  const registry = await loadRaceSourceRegistry();
  const { fetcher } = replayFetcher();
  const report = await discoverBeijingOfficialCandidates({ fetcher, checkedAt: observedAt });
  const external = report.candidates.find((item) => item.sourceDomain === "mp.weixin.qq.com");
  ok(external);
  equal(external.sourceAuthorityStatus, "external_link_unverified");
  equal(findRegistrySource(registry, "beijing-marathon-2026", external.candidateId), undefined);
  const registryText = await readFile(new URL("../data/sources/race-source-registry.json", import.meta.url), "utf8");
  equal(registryText.includes(external.candidateId), false);
  match(external.rejectionOrUncertaintyReason, /Cross-domain/);
});
