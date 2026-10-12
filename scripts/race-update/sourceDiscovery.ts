import { createHash } from "node:crypto";

const HOME_URL = "https://www.beijing-marathon.com/";
const CMS_HOST = "mara-public-res-online.oss-cn-beijing.aliyuncs.com";
const CMS_PATH = "/beta/cms/internal";
const MAX_RESPONSE_BYTES = 2_000_000;
const TIMEOUT_MS = 15_000;

export type SourceCandidate = {
  candidateId: string;
  targetEditionId: "beijing-marathon-2026";
  candidateUrl: string;
  cmsReturnedUrl: string | null;
  candidateUrlProvenance: "official_frontend_route" | "cms_record_url";
  normalizedUrl: string;
  discoveredAt: string;
  discoveryMethod: "official_listing";
  discoveryEntry: string;
  cmsQueryUrl: string;
  sourceDomain: string;
  title: string;
  articleId: string;
  fetchStatus: "record_only_body_not_fetched";
  eventIdentityStatus: "title_match" | "needs_review";
  editionIdentityStatus: "title_year_match" | "cms_tag_only_needs_review" | "needs_review";
  categoryScope: "unknown";
  sourceAuthorityStatus: "official_site_unapproved" | "external_link_unverified";
  reviewStatus: "needs_review";
  rejectionOrUncertaintyReason: string;
  evidence: {
    homepageUrl: string;
    frontendScriptUrl: string;
    noticeRouteScriptUrl: string;
    cmsBaseUrl: string;
    cmsResponseSha256: string;
    cmsResponseBytes: number;
    cmsRecord: unknown;
  };
};

export type SourceDiscoveryReport = {
  targetEditionId: "beijing-marathon-2026";
  checkedAt: string;
  status: "success" | "partial" | "failed";
  sourceChain: { homepageUrl: string; frontendScriptUrl?: string; noticeRouteScriptUrl?: string; cmsBaseUrl?: string; queries: string[] };
  recordsExamined: number;
  newsReportedTotal: number | null;
  newsRecordsReturned: number;
  coverageWarnings: string[];
  candidates: SourceCandidate[];
  errors: string[];
  factVerification: "not_verified";
};

/** Read-only, bounded discovery. Candidate records never enter the approved Source Registry or fact pipeline. */
export async function discoverBeijingOfficialCandidates(input: {
  fetcher?: typeof fetch;
  checkedAt?: string;
} = {}): Promise<SourceDiscoveryReport> {
  const fetcher = input.fetcher ?? fetch;
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const report: SourceDiscoveryReport = {
    targetEditionId: "beijing-marathon-2026",
    checkedAt,
    status: "failed",
    sourceChain: { homepageUrl: HOME_URL, queries: [] },
    recordsExamined: 0,
    newsReportedTotal: null,
    newsRecordsReturned: 0,
    coverageWarnings: [],
    candidates: [],
    errors: [],
    factVerification: "not_verified",
  };

  try {
    const homepage = await fetchText(HOME_URL, fetcher);
    const appKey = homepage.match(/\bWKEY["']?\s*:\s*["']([A-Z]+)["']/)?.[1];
    if (appKey !== "BJCN") throw new Error("Official homepage app key was not BJCN.");
    const scriptPath = homepage.match(/(?:https?:)?\/\/res\.mararun\.com\/online\/mara-race\/assets\/js\/beijing\/common\.[a-f0-9]+\.js/)?.[0];
    if (!scriptPath) throw new Error("Official homepage did not reference the expected public frontend script.");
    const scriptUrl = scriptPath.startsWith("//") ? `https:${scriptPath}` : scriptPath;
    report.sourceChain.frontendScriptUrl = scriptUrl;
    const script = await fetchText(scriptUrl, fetcher);
    const routeScriptPath = homepage.match(/(?:https?:)?\/\/res\.mararun\.com\/online\/mara-race\/assets\/js\/beijing\/index\.[a-f0-9]+\.js/)?.[0];
    if (!routeScriptPath) throw new Error("Official homepage did not reference the notice route script.");
    const routeScriptUrl = routeScriptPath.startsWith("//") ? `https:${routeScriptPath}` : routeScriptPath;
    report.sourceChain.noticeRouteScriptUrl = routeScriptUrl;
    const routeScript = await fetchText(routeScriptUrl, fetcher);
    if (!routeScript.includes('"/subject.html?topicId="') || !routeScript.includes('"&detailId="')) {
      throw new Error("Official frontend no longer exposes the reviewed notice route.");
    }
    const cmsBase = script.match(/baseUrl\s*=\s*["'](https:\/\/[^"']+)["']/)?.[1];
    if (!cmsBase || !script.includes('"/homeIndex.json') || !script.includes('"/articles/')) {
      throw new Error("Public frontend script did not expose the expected CMS endpoints.");
    }
    const cmsUrl = new URL(cmsBase);
    if (cmsUrl.hostname !== CMS_HOST || cmsUrl.pathname !== CMS_PATH) {
      throw new Error("Public frontend CMS endpoint is outside the reviewed allowlist.");
    }
    report.sourceChain.cmsBaseUrl = cmsBase;
    const indexUrl = `${cmsBase}/${appKey}/homeIndex.json`;
    report.sourceChain.queries.push(indexUrl);
    const indexRaw = await fetchText(indexUrl, fetcher);
    const index = parseObject(indexRaw);
    const topics = arrayOfObjects(index.topics);
    const noticeTopic = topics.find((topic) => topic.mode === "notice" && topic.structTag === "notice");
    const newsTopic = topics.find((topic) => topic.mode === "news" && topic.structTag === "news");
    if (!validId(noticeTopic?.id) || !validId(newsTopic?.id)) {
      throw new Error("Official CMS index did not identify notice and news topics.");
    }
    const newsUrl = `${cmsBase}/${appKey}/articles/${newsTopic.id}.json`;
    report.sourceChain.queries.push(newsUrl);
    const newsRaw = await fetchText(newsUrl, fetcher);
    const news = parseObject(newsRaw);
    const noticeRecords = arrayOfObjects(parseObject(index.articles).notice);
    const newsRecords = arrayOfObjects(news.datas);
    report.recordsExamined = noticeRecords.length + newsRecords.length;
    report.newsReportedTotal = typeof news.total === "number" ? news.total : null;
    report.newsRecordsReturned = newsRecords.length;
    if (report.newsReportedTotal !== null && report.newsReportedTotal > newsRecords.length) {
      report.coverageWarnings.push("CMS reported more news records than it returned; historical coverage is incomplete.");
    }

    const records: Array<{
      record: Record<string, unknown>; title: string; id: string; tag: string; url: string;
      cmsReturnedUrl: string | null; candidateUrlProvenance: SourceCandidate["candidateUrlProvenance"];
      query: string; response: string;
    }> = [];
    for (const record of noticeRecords) {
      if (typeof record.title !== "string" || !validId(record.id)) continue;
      records.push({
        record, title: record.title, id: record.id, tag: String(record.tag ?? ""),
        url: `${HOME_URL}subject.html?topicId=${noticeTopic.id}&detailId=${record.id}&type=notice`,
        cmsReturnedUrl: null, candidateUrlProvenance: "official_frontend_route",
        query: indexUrl, response: indexRaw,
      });
    }
    for (const record of newsRecords) {
      const article = parseObject(record.article);
      const data = parseObject(article.data);
      const relation = parseObject(record.relation);
      if (typeof data.title !== "string" || !validId(article.id) || relation.topicID !== newsTopic.id) continue;
      if (typeof data.URL !== "string" || !isHttpUrl(data.URL)) continue;
      records.push({
        record, title: data.title, id: article.id, tag: String(data.tag ?? ""),
        url: data.URL, cmsReturnedUrl: data.URL, candidateUrlProvenance: "cms_record_url",
        query: newsUrl, response: newsRaw,
      });
    }

    const seen = new Set<string>();
    for (const item of records) {
      if (item.tag !== "2026") continue;
      // The public BJCN feed also publishes a separate 10 km event; it is not this marathon Edition.
      if (/10\s*(公里|千米|km)/i.test(item.title)) continue;
      const editionIdentityStatus = classifyEditionIdentity({ title: item.title, tag: item.tag, targetYear: 2026 });
      if (editionIdentityStatus === "year_conflict") continue;
      const normalizedUrl = normalizeCandidateUrl(item.url);
      if (seen.has(normalizedUrl)) continue;
      seen.add(normalizedUrl);
      const sourceDomain = new URL(normalizedUrl).hostname.toLowerCase();
      const sameDomain = sourceDomain === "www.beijing-marathon.com";
      const eventMatch = /(北京马拉松|北马)/.test(item.title);
      report.candidates.push({
        candidateId: `sc-${createHash("sha256").update(`${report.targetEditionId}\n${normalizedUrl}`).digest("hex").slice(0, 20)}`,
        targetEditionId: report.targetEditionId,
        candidateUrl: item.url,
        cmsReturnedUrl: item.cmsReturnedUrl,
        candidateUrlProvenance: item.candidateUrlProvenance,
        normalizedUrl,
        discoveredAt: checkedAt,
        discoveryMethod: "official_listing",
        discoveryEntry: HOME_URL,
        cmsQueryUrl: item.query,
        sourceDomain,
        title: item.title,
        articleId: item.id,
        fetchStatus: "record_only_body_not_fetched",
        eventIdentityStatus: eventMatch ? "title_match" : "needs_review",
        editionIdentityStatus,
        categoryScope: "unknown",
        sourceAuthorityStatus: sameDomain ? "official_site_unapproved" : "external_link_unverified",
        reviewStatus: "needs_review",
        rejectionOrUncertaintyReason: sameDomain
          ? "CMS listing is not full-body or publication-time evidence; edition facts require review."
          : "Cross-domain link is not automatically official; account, body, publication time, and edition need review.",
        evidence: {
          homepageUrl: HOME_URL,
          frontendScriptUrl: scriptUrl,
          noticeRouteScriptUrl: routeScriptUrl,
          cmsBaseUrl: cmsBase,
          cmsResponseSha256: createHash("sha256").update(item.response).digest("hex"),
          cmsResponseBytes: Buffer.byteLength(item.response),
          cmsRecord: item.record,
        },
      });
    }
    report.candidates.sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    report.status = report.coverageWarnings.length ? "partial" : "success";
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  }
  return report;
}

/** URL equality only; no authority or identity implication. */
export function normalizeCandidateUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Non-HTTP candidate URL.");
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.searchParams.sort();
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

/** Listing-level identity only. A match here is never sufficient for source approval or fact verification. */
export function classifyEditionIdentity(input: { title: string; tag?: string | null; targetYear: number }): SourceCandidate["editionIdentityStatus"] | "year_conflict" {
  const years = [...input.title.matchAll(/\b20\d{2}\b/g)].map((match) => Number(match[0]));
  if (years.some((year) => year !== input.targetYear)) return "year_conflict";
  if (input.tag && /^20\d{2}$/.test(input.tag) && input.tag !== String(input.targetYear)) return "year_conflict";
  if (years.includes(input.targetYear)) return "title_year_match";
  if (input.tag === String(input.targetYear)) return "cms_tag_only_needs_review";
  return "needs_review";
}

async function fetchText(url: string, fetcher: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(url, { signal: controller.signal, redirect: "error", headers: { Accept: "text/html,application/javascript,application/json" } });
    if (!response.ok) throw new Error(`Discovery fetch failed: HTTP ${response.status} (${new URL(url).hostname}).`);
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) throw new Error("Discovery response exceeds size limit.");
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_RESPONSE_BYTES) throw new Error("Discovery response exceeds size limit.");
    return new TextDecoder().decode(body);
  } finally {
    clearTimeout(timeout);
  }
}

function parseObject(value: unknown): Record<string, any> {
  if (typeof value === "string") return parseObject(JSON.parse(value));
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function arrayOfObjects(value: unknown): Record<string, any>[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) : [];
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}

function isHttpUrl(value: string): boolean {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
