import { createHash } from "node:crypto";

import type { RaceGraphSnapshotRecord } from "../../types/raceUpdate.ts";
import { normalizeCandidateUrl } from "./sourceDiscovery.ts";

const HOME_URL = "https://ninghai100.com/";
const EDITION_ID = "ninghai-ultra-trail-2026";
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 2_000_000;
const FIELDS = ["distanceKm", "elevationGain", "startLocation", "finishLocation"] as const;
type Field = typeof FIELDS[number];
type Action = "NO_CHANGE_VERIFIED" | "FACT_CANDIDATE" | "VERIFICATION_ALERT"
  | "SOURCE_DISCOVERY_REQUIRED" | "CONFLICT_NEEDS_REVIEW" | "FETCH_OR_EXTRACTION_BLOCKED";

type Group = {
  id: number;
  name: string;
  distance: number;
  elevationGain: number;
  startPoint: string | null;
  endPoint: string | null;
  buttons?: Array<{ linkUrl?: string }>;
};

export type NinghaiCandidate = {
  candidateId: string;
  targetEditionId: string;
  url: string;
  discoveryMethod: "official_frontend_api";
  discoveryEntry: string;
  sourceAuthorityStatus: "official_domain_unapproved";
  reviewStatus: "needs_review";
  kind: "category_detail" | "news_record";
  fetchStatus: "fetched" | "record_only_body_not_fetched";
  title: string;
  categoryName?: string;
  editionIdentityStatus: "linked_2026_asset" | "dated_2026_listing" | "needs_review" | "year_conflict";
  fetchedAt: string;
  responseSha256: string;
  responseBytes: number;
  publicationDate: string | null;
  evidenceLocator: string;
};

export type NinghaiFieldCheck = {
  categoryId: string;
  field: Field;
  currentValue: number | string | null;
  missing: boolean;
  candidateValue: number | string | null;
  sourceUrl: string | null;
  evidenceLocator: string | null;
  evidenceText: string | null;
  publishedAt: null;
  fetchedAt: string | null;
  editionIdentity: NinghaiCandidate["editionIdentityStatus"] | "not_checked";
  precisionDifference: boolean;
  thirdPartyConflict: boolean;
  action: Action;
  sourceApprovalRequired: true;
};

export type NinghaiReadOnlyReport = {
  editionId: typeof EDITION_ID;
  checkedAt: string;
  status: "success" | "partial" | "failed";
  sourceChain: { homepage: string; entryScript?: string; homeRouteScript?: string; apiScript?: string; apiBase?: string };
  candidates: NinghaiCandidate[];
  matrix: NinghaiFieldCheck[];
  errors: string[];
  factVerification: "read_only_unapproved_sources";
};

/** Bounded public-front-end discovery; it never imports a candidate into the Registry or fact pipeline. */
export async function validateNinghaiReadOnly(input: {
  record: RaceGraphSnapshotRecord;
  fetcher?: typeof fetch;
  checkedAt?: string;
}): Promise<NinghaiReadOnlyReport> {
  if (input.record.edition.editionId !== EDITION_ID) throw new Error("Wrong Edition record.");
  const fetcher = input.fetcher ?? fetch;
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const report: NinghaiReadOnlyReport = {
    editionId: EDITION_ID, checkedAt, status: "failed", sourceChain: { homepage: HOME_URL },
    candidates: [], matrix: [], errors: [], factVerification: "read_only_unapproved_sources",
  };
  const groups = new Map<string, { value: Group; url: string; identity: NinghaiCandidate["editionIdentityStatus"] }>();
  try {
    const homepage = await readOfficial(HOME_URL, fetcher);
    const entryPath = homepage.match(/<script[^>]+src="(\/assets\/index-[\w-]+\.js)"/)?.[1];
    if (!entryPath) throw new Error("Official homepage did not expose its public entry script.");
    report.sourceChain.entryScript = new URL(entryPath, HOME_URL).toString();
    const entry = await readOfficial(report.sourceChain.entryScript, fetcher);
    if (!entry.includes('VITE_API_URL:"/app-api"')) throw new Error("Official frontend did not expose the expected public API base.");
    report.sourceChain.apiBase = new URL("/app-api", HOME_URL).toString();
    const routePath = entry.match(/import\("\.\/(Index-[\w-]+\.js)"\)/)?.[1];
    if (!routePath) throw new Error("Official frontend did not expose its home route script.");
    report.sourceChain.homeRouteScript = new URL(`/assets/${routePath}`, HOME_URL).toString();
    const route = await readOfficial(report.sourceChain.homeRouteScript, fetcher);
    const apiPath = [...route.matchAll(/from"\.\/(index-[\w-]+\.js)"/g)]
      .map((match) => match[1]).find((path) => path !== entryPath.split("/").at(-1));
    if (!apiPath) throw new Error("Official home route did not expose its API module.");
    report.sourceChain.apiScript = new URL(`/assets/${apiPath}`, HOME_URL).toString();
    const apiScript = await readOfficial(report.sourceChain.apiScript, fetcher);
    for (const path of ["/race/group/list", "/race/group/get", "/race/news/list"]) {
      if (!apiScript.includes(`url:"${path}"`)) throw new Error(`Official frontend did not expose ${path}.`);
    }

    const listUrl = `${report.sourceChain.apiBase}/race/group/list`;
    const list = parseApi(await readOfficial(listUrl, fetcher));
    if (!Array.isArray(list) || !list.every(isGroupListItem)) throw new Error("Official group list structure is invalid.");
    const seenNames = new Set<string>();
    for (const item of list) {
      if (seenNames.has(item.name)) throw new Error(`Duplicate official group name: ${item.name}.`);
      seenNames.add(item.name);
      if (!/^(UTNH-100|CNH-60|YNH-25)$/.test(item.name)) continue;
      const url = `${report.sourceChain.apiBase}/race/group/get?id=${item.id}`;
      try {
        const raw = await readOfficial(url, fetcher);
        const detail = parseApi(raw);
        if (!isGroupDetail(detail) || detail.id !== item.id || detail.name !== item.name) {
          throw new Error("Group detail identity or structure mismatch.");
        }
        const identity = classifyGroupEdition(detail, 2026);
        groups.set(item.name, { value: detail, url, identity });
        report.candidates.push(candidate({ url, title: item.name, kind: "category_detail", categoryName: item.name,
          identity, checkedAt, raw, locator: `data.id=${item.id}; data.name=${item.name}` }));
      } catch (error) {
        report.errors.push(`${item.name}: ${message(error)}`);
      }
    }
    const newsUrl = `${report.sourceChain.apiBase}/race/news/list`;
    try {
      const raw = await readOfficial(newsUrl, fetcher);
      const news = parseApi(raw);
      if (!isObject(news) || !Array.isArray(news.list)) throw new Error("Official news list structure is invalid.");
      const seenNewsIds = new Set<number>();
      for (const item of news.list) {
        if (!isObject(item) || !Number.isSafeInteger(item.id) || typeof item.title !== "string") continue;
        if (seenNewsIds.has(item.id)) continue;
        seenNewsIds.add(item.id);
        const url = `${report.sourceChain.apiBase}/race/news/get?id=${item.id}`;
        const year = Array.isArray(item.publishDate) ? item.publishDate[0] : null;
        const identity = year === 2026 ? "dated_2026_listing" : year === null ? "needs_review" : "year_conflict";
        if (identity === "year_conflict") continue;
        const publicationDate = Array.isArray(item.publishDate) && item.publishDate.length === 3
          && item.publishDate.every((part: unknown) => Number.isSafeInteger(part))
          ? `${item.publishDate[0]}-${String(item.publishDate[1]).padStart(2, "0")}-${String(item.publishDate[2]).padStart(2, "0")}`
          : null;
        report.candidates.push(candidate({ url, title: item.title, kind: "news_record", identity,
          checkedAt, raw, locator: `data.list[id=${item.id}]`, publicationDate }));
      }
    } catch (error) {
      report.errors.push(`news list: ${message(error)}`);
    }
    report.candidates.sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    report.matrix = compareNinghaiFields(input.record, groups, checkedAt);
    report.status = report.errors.length || report.matrix.some((item) => item.action === "FETCH_OR_EXTRACTION_BLOCKED")
      ? "partial" : "success";
  } catch (error) {
    report.errors.push(message(error));
    report.matrix = compareNinghaiFields(input.record, groups, checkedAt);
  }
  return report;
}

function compareNinghaiFields(
  record: RaceGraphSnapshotRecord,
  groups: Map<string, { value: Group; url: string; identity: NinghaiCandidate["editionIdentityStatus"] }>,
  checkedAt: string,
): NinghaiFieldCheck[] {
  return record.categories.flatMap((category) => {
    const groupName = category.categoryId.slice(`${EDITION_ID}-`.length).toUpperCase();
    if (!/^(UTNH-100|CNH-60|YNH-25)$/.test(groupName)) return [];
    const found = groups.get(groupName);
    return FIELDS.map((field) => {
      const currentValue = category[field] ?? null;
      const candidateValue = found ? fieldValue(found.value, field) : null;
      const thirdPartyConflict = candidateValue !== null && (category.governance?.mergeTrace ?? [])
        .some((trace) => trace.field === field && (trace.candidates ?? []).some((choice) => choice.value !== candidateValue));
      const precisionDifference = field === "distanceKm" && typeof candidateValue === "number"
        && typeof currentValue === "number" && Number(groupName.split("-")[1]) === currentValue
        && candidateValue !== currentValue;
      let action: Action = "FETCH_OR_EXTRACTION_BLOCKED";
      if (found) {
        if (found.identity !== "linked_2026_asset") action = "VERIFICATION_ALERT";
        else if (candidateValue === null) action = "SOURCE_DISCOVERY_REQUIRED";
        else if (thirdPartyConflict) action = "CONFLICT_NEEDS_REVIEW";
        else if (candidateValue === currentValue) action = "NO_CHANGE_VERIFIED";
        else action = "FACT_CANDIDATE";
      }
      return {
        categoryId: category.categoryId, field, currentValue,
        missing: currentValue === null, candidateValue,
        sourceUrl: found?.url ?? null,
        evidenceLocator: found ? `data.${field === "distanceKm" ? "distance" : field === "startLocation" ? "startPoint" : field === "finishLocation" ? "endPoint" : field}` : null,
        evidenceText: found && candidateValue !== null ? `${field === "distanceKm" ? "distance" : field === "startLocation" ? "startPoint" : field === "finishLocation" ? "endPoint" : field}: ${candidateValue}` : null,
        publishedAt: null, fetchedAt: found ? checkedAt : null,
        editionIdentity: found?.identity ?? "not_checked", precisionDifference, thirdPartyConflict,
        action, sourceApprovalRequired: true,
      };
    });
  });
}

function fieldValue(group: Group, field: Field): number | string | null {
  const value = field === "distanceKm" ? group.distance : field === "elevationGain" ? group.elevationGain
    : field === "startLocation" ? group.startPoint : group.endPoint;
  return typeof value === "string" ? value.trim() || null : value;
}

function classifyGroupEdition(group: Group, year: number): NinghaiCandidate["editionIdentityStatus"] {
  const links = (group.buttons ?? []).map((button) => button.linkUrl ?? "").filter(Boolean);
  const linkedNames = links.map((link) => decodeURIComponent(new URL(link).pathname.split("/").at(-1) ?? ""));
  const relevant = linkedNames.filter((name) => name.includes(group.name) && name.includes("宁海"));
  if (relevant.some((name) => [...name.matchAll(/(?<!\d)20\d{2}(?!\d)/g)].some(([found]) => Number(found) !== year))) return "year_conflict";
  return relevant.some((name) => name.includes(String(year))) ? "linked_2026_asset" : "needs_review";
}

function candidate(input: { url: string; title: string; kind: NinghaiCandidate["kind"]; categoryName?: string;
  identity: NinghaiCandidate["editionIdentityStatus"]; checkedAt: string; raw: string; locator: string;
  publicationDate?: string | null }): NinghaiCandidate {
  const url = normalizeCandidateUrl(input.url);
  return {
    candidateId: `sc-${createHash("sha256").update(`${EDITION_ID}\n${url}`).digest("hex").slice(0, 20)}`,
    targetEditionId: EDITION_ID, url, discoveryMethod: "official_frontend_api", discoveryEntry: HOME_URL,
    sourceAuthorityStatus: "official_domain_unapproved", reviewStatus: "needs_review", kind: input.kind,
    fetchStatus: input.kind === "category_detail" ? "fetched" : "record_only_body_not_fetched",
    title: input.title, ...(input.categoryName ? { categoryName: input.categoryName } : {}),
    editionIdentityStatus: input.identity, fetchedAt: input.checkedAt,
    responseSha256: createHash("sha256").update(input.raw).digest("hex"),
    responseBytes: Buffer.byteLength(input.raw), publicationDate: input.publicationDate ?? null,
    evidenceLocator: input.locator,
  };
}

async function readOfficial(url: string, fetcher: typeof fetch): Promise<string> {
  if (new URL(url).origin !== new URL(HOME_URL).origin) throw new Error("Cross-domain discovery fetch rejected.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(url, { signal: controller.signal, redirect: "error",
      headers: { Accept: "text/html,application/javascript,application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_BYTES) throw new Error("Official response exceeds size limit.");
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_BYTES) throw new Error("Official response exceeds size limit.");
    return new TextDecoder().decode(body);
  } finally {
    clearTimeout(timeout);
  }
}

function parseApi(raw: string): unknown {
  const parsed: unknown = JSON.parse(raw);
  if (!isObject(parsed) || parsed.code !== 0 || !Object.hasOwn(parsed, "data")) {
    throw new Error("Official public API response structure is invalid.");
  }
  return parsed.data;
}

function isObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isGroupListItem(value: unknown): value is { id: number; name: string } {
  return isObject(value) && Number.isSafeInteger(value.id) && value.id >= 0 && typeof value.name === "string";
}

function isGroupDetail(value: unknown): value is Group {
  if (!isObject(value) || !isGroupListItem(value)) return false;
  const detail: Record<string, unknown> = value;
  return typeof detail.distance === "number" && Number.isFinite(detail.distance)
    && typeof detail.elevationGain === "number" && Number.isFinite(detail.elevationGain)
    && (detail.startPoint === null || typeof detail.startPoint === "string")
    && (detail.endPoint === null || typeof detail.endPoint === "string")
    && (detail.buttons === undefined || (Array.isArray(detail.buttons) && detail.buttons.every((button: unknown) => isObject(button) && typeof button.linkUrl === "string")));
}

function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
