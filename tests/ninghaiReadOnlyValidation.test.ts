import { deepEqual, equal, match, ok } from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { validateNinghaiReadOnly } from "../scripts/race-update/ninghaiReadOnlyValidation.ts";
import { loadRaceSourceRegistry } from "../scripts/race-update/sourceRegistry.ts";
import { apiScript, entryScript, groupDetails, groupList, homepageHtml, newsList, routeScript } from "./fixtures/ninghaiOfficialResponses.ts";

const checkedAt = "2026-10-13T10:15:00.000Z";
const base = "https://ninghai100.com/";
const api = `${base}app-api/race/`;
const protectedPaths = [
  "data/canonical/race-graph-v1.json", "data/pending/race-update-pending.json",
  "data/sources/race-source-registry.json", "data/sources/official-source-ingestion-state.json",
];

async function record() {
  const graph = JSON.parse(await readFile(new URL("../data/canonical/race-graph-v1.json", import.meta.url), "utf8"));
  return structuredClone(graph.records.find((item: { edition: { editionId: string } }) => item.edition.editionId === "ninghai-ultra-trail-2026"));
}

function replay(overrides: Record<string, string> = {}) {
  const responses: Record<string, string> = {
    [base]: homepageHtml,
    [`${base}assets/index-live.js`]: entryScript,
    [`${base}assets/Index-live.js`]: routeScript,
    [`${base}assets/index-helper.js`]: apiScript,
    [`${api}group/list`]: JSON.stringify({ code: 0, data: groupList }),
    [`${api}news/list`]: JSON.stringify({ code: 0, data: newsList }),
    ...Object.fromEntries(groupDetails.map((group) => [`${api}group/get?id=${group.id}`, JSON.stringify({ code: 0, data: group })])),
    ...overrides,
  };
  const requests: string[] = [];
  const fetcher = (async (url: string | URL | Request) => {
    const key = String(url);
    requests.push(key);
    return key in responses ? new Response(responses[key], { status: 200 }) : new Response("Not found", { status: 404 });
  }) as typeof fetch;
  return { fetcher, requests };
}

test("official frontend replay discovers three category details and produces all 12 field checks", async () => {
  const { fetcher, requests } = replay();
  const report = await validateNinghaiReadOnly({ record: await record(), fetcher, checkedAt });
  equal(report.status, "success");
  equal(report.matrix.length, 12);
  equal(report.candidates.length, 6);
  equal(report.candidates.filter((item) => item.kind === "category_detail").length, 3);
  equal(report.candidates.filter((item) => item.kind === "news_record").length, 3);
  ok(requests.includes(`${api}group/list`));
  ok(requests.includes(`${api}group/get?id=6`));
  ok(!homepageHtml.includes("group/get?id=6"));
  ok(report.candidates.every((item) => item.reviewStatus === "needs_review"));
  ok(report.candidates.every((item) => item.sourceAuthorityStatus === "official_domain_unapproved"));
  match(report.candidates[0].responseSha256, /^[a-f0-9]{64}$/);
  const by = (name: string, field: string) => report.matrix.find((item) => item.categoryId.endsWith(name) && item.field === field)!;
  equal(by("utnh-100", "distanceKm").candidateValue, 100.6);
  equal(by("utnh-100", "distanceKm").action, "ACTUAL_COURSE_DISTANCE_ONLY");
  equal(by("cnh-60", "distanceKm").candidateValue, 58.8);
  equal(by("cnh-60", "distanceKm").action, "ACTUAL_COURSE_DISTANCE_ONLY");
  equal(by("cnh-60", "distanceKm").thirdPartyConflict, false);
  equal(by("ynh-25", "distanceKm").action, "ACTUAL_COURSE_DISTANCE_ONLY");
  equal(by("cnh-60", "elevationGain").action, "CONFLICT_NEEDS_REVIEW");
  equal(by("ynh-25", "distanceKm").precisionDifference, true);
  equal(by("ynh-25", "elevationGain").action, "NO_CHANGE_VERIFIED");
  for (const name of ["utnh-100", "cnh-60", "ynh-25"]) {
    equal(by(name, "startLocation").candidateValue, "西门城楼");
    equal(by(name, "finishLocation").candidateValue, "西门城楼");
    equal(by(name, "startLocation").missing, true);
  }
});

test("2025 linked asset cannot authenticate a 2026 category fact", async () => {
  const old = { ...groupDetails[0], buttons: [{ linkUrl: "https://qiongjing.oss-cn-shanghai.aliyuncs.com/CNH-60_2025宁海.gpx" }] };
  const { fetcher } = replay({ [`${api}group/get?id=5`]: JSON.stringify({ code: 0, data: old }) });
  const report = await validateNinghaiReadOnly({ record: await record(), fetcher, checkedAt });
  equal(report.matrix.find((item) => item.categoryId.endsWith("cnh-60") && item.field === "startLocation")?.action, "VERIFICATION_ALERT");
  equal(report.candidates.find((item) => item.categoryName === "CNH-60")?.editionIdentityStatus, "year_conflict");
});

test("duplicate news records do not create duplicate source candidates", async () => {
  const repeated = { list: [...newsList.list, newsList.list[0]] };
  const { fetcher } = replay({ [`${api}news/list`]: JSON.stringify({ code: 0, data: repeated }) });
  const report = await validateNinghaiReadOnly({ record: await record(), fetcher, checkedAt });
  equal(report.candidates.length, 6);
  equal(new Set(report.candidates.map((item) => item.candidateId)).size, 6);
});

test("2025 news listing is not a 2026 Source Candidate", async () => {
  const oldNews = { list: [{ id: 2, title: "2025宁海赛道介绍", publishDate: [2025, 9, 24] }, ...newsList.list] };
  const { fetcher } = replay({ [`${api}news/list`]: JSON.stringify({ code: 0, data: oldNews }) });
  const report = await validateNinghaiReadOnly({ record: await record(), fetcher, checkedAt });
  equal(report.candidates.length, 6);
  ok(!report.candidates.some((item) => item.url.endsWith("id=2")));
});

test("category identity mismatch and absent direct evidence fail closed", async () => {
  const wrong = { ...groupDetails[0], name: "YNH-25" };
  const noLocation = { ...groupDetails[2], startPoint: null, endPoint: null };
  const { fetcher } = replay({
    [`${api}group/get?id=5`]: JSON.stringify({ code: 0, data: wrong }),
    [`${api}group/get?id=4`]: JSON.stringify({ code: 0, data: noLocation }),
  });
  const report = await validateNinghaiReadOnly({ record: await record(), fetcher, checkedAt });
  equal(report.status, "partial");
  ok(report.errors.some((error) => error.includes("CNH-60")));
  equal(report.matrix.find((item) => item.categoryId.endsWith("cnh-60") && item.field === "distanceKm")?.action, "FETCH_OR_EXTRACTION_BLOCKED");
  equal(report.matrix.find((item) => item.categoryId.endsWith("ynh-25") && item.field === "startLocation")?.action, "SOURCE_DISCOVERY_REQUIRED");
  equal(report.matrix.find((item) => item.categoryId.endsWith("ynh-25") && item.field === "startLocation")?.candidateValue, null);
});

test("fetch failure is visible, stable reruns deduplicate, and no protected data file changes", async () => {
  const before = await Promise.all(protectedPaths.map(async (path) => createHash("sha256").update(await readFile(new URL(`../${path}`, import.meta.url))).digest("hex")));
  const snapshot = await record();
  const { fetcher } = replay({ [`${api}group/get?id=6`]: "invalid json" });
  const first = await validateNinghaiReadOnly({ record: snapshot, fetcher, checkedAt });
  const second = await validateNinghaiReadOnly({ record: snapshot, fetcher, checkedAt });
  equal(first.status, "partial");
  ok(first.errors.some((error) => error.includes("UTNH-100")));
  deepEqual(first.candidates.map((item) => item.candidateId), second.candidates.map((item) => item.candidateId));
  equal(new Set(first.candidates.map((item) => item.candidateId)).size, first.candidates.length);
  const after = await Promise.all(protectedPaths.map(async (path) => createHash("sha256").update(await readFile(new URL(`../${path}`, import.meta.url))).digest("hex")));
  deepEqual(after, before);
  const registry = await loadRaceSourceRegistry();
  ok(!registry.editions.some((edition) => edition.sources.some((source) => source.url.includes("/app-api/race/group/get"))));
});
