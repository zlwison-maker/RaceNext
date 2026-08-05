import type { RawRace, RawRaceSource } from "../../types/rawRace.ts";

export type FetchOptions = {
  userAgent?: string;
  headers?: Record<string, string>;
  requestDelayMs?: number;
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
};

export type FetchTextResult = {
  ok: boolean;
  status: number;
  text: string;
  finalUrl: string;
};

export type SourceFetchResult = {
  source: RawRaceSource;
  races: RawRace[];
  candidatePages: string[];
  accessiblePages: string[];
  failedPages: Array<{ url: string; reason: string }>;
  notes: string[];
  durationMs: number;
};

export const REQUEST_DELAY_MS = 1_500;

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function logInfo(message: string, meta?: unknown) {
  log("info", message, meta);
}

export function logWarn(message: string, meta?: unknown) {
  log("warn", message, meta);
}

export function logError(message: string, meta?: unknown) {
  log("error", message, meta);
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<FetchTextResult> {
  const retries = options.retries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 1_500;
  const timeoutMs = options.timeoutMs ?? 15_000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": options.userAgent ?? USER_AGENT,
          Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7",
          ...(options.headers ?? {}),
        },
        redirect: "follow",
        signal: controller.signal,
      });
      const text = await response.text();
      const result = {
        ok: response.ok,
        status: response.status,
        text,
        finalUrl: response.url,
      };
      if (!shouldRetryStatus(response.status) || attempt === retries) {
        if (options.requestDelayMs) await sleep(options.requestDelayMs);
        return result;
      }
      await sleep(retryDelayMs);
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(retryDelayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (options.requestDelayMs) await sleep(options.requestDelayMs);
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function fetchHtml(url: string, options: FetchOptions = {}): Promise<FetchTextResult> {
  return fetchText(url, {
    ...options,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...(options.headers ?? {}),
    },
  });
}

export async function fetchJson<T = unknown>(url: string, options: FetchOptions = {}): Promise<{ ok: boolean; status: number; data: T | null; finalUrl: string; text: string }> {
  const result = await fetchText(url, {
    ...options,
    headers: {
      Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
      ...(options.headers ?? {}),
    },
  });
  try {
    return {
      ...result,
      data: JSON.parse(result.text) as T,
    };
  } catch {
    return {
      ...result,
      data: null,
    };
  }
}

export function stripHtml(value: string): string {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

export function absolutizeUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

export function uniqueByNameAndUrl(races: RawRace[]): RawRace[] {
  const seen = new Set<string>();
  return races.filter((race) => {
    const key = `${race.rawName ?? ""}|${race.sourceUrl ?? ""}`;
    if (!race.rawName || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractJsonLdEvents(html: string, source: RawRaceSource, pageUrl: string): RawRace[] {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const crawledAt = new Date().toISOString();
  const events: RawRace[] = [];

  for (const block of blocks) {
    const content = stripHtml(block[1]);
    try {
      const parsed = JSON.parse(content);
      const nodes = flattenJsonLd(parsed);
      for (const node of nodes) {
        if (!isEventLike(node)) continue;
        events.push({
          source,
          sourceUrl: typeof node.url === "string" ? absolutizeUrl(node.url, pageUrl) : pageUrl,
          rawId: typeof node.identifier === "string" ? node.identifier : undefined,
          rawName: typeof node.name === "string" ? node.name : undefined,
          rawDate: typeof node.startDate === "string" ? node.startDate : undefined,
          rawLocation: readLocation(node.location),
          rawOfficialUrl: typeof node.url === "string" ? absolutizeUrl(node.url, pageUrl) : undefined,
          rawData: node,
          crawledAt,
        });
      }
    } catch {
      continue;
    }
  }

  return events;
}

export function extractRaceLinks(html: string, source: RawRaceSource, pageUrl: string): RawRace[] {
  const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const crawledAt = new Date().toISOString();
  const races: RawRace[] = [];
  const racePattern =
    /马拉松|半程|半马|越野|跑|trail|marathon|ultra|race|event|calendar|赛事|公里|km/i;

  for (const [, attrs, inner] of links) {
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const name = stripHtml(inner);
    if (!href || !name || name.length < 4 || name.length > 80 || !racePattern.test(name)) continue;
    races.push({
      source,
      sourceUrl: absolutizeUrl(href, pageUrl),
      rawName: name,
      rawData: { anchorText: name, href },
      crawledAt,
    });
  }

  return uniqueByNameAndUrl(races);
}

export function pickFirstDate(text?: string): string | undefined {
  if (!text) return undefined;
  return (
    text.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/)?.[0] ??
    text.match(/20\d{2}[-/.年]\d{1,2}/)?.[0] ??
    text.match(/\d{1,2}[-/.月]\d{1,2}/)?.[0]
  );
}

export function inferDistanceText(text?: string): string | undefined {
  if (!text) return undefined;
  return text.match(/全马|半马|半程马拉松|马拉松|(?:\d+(?:\.\d+)?)\s?(?:km|KM|公里)/)?.[0];
}

function flattenJsonLd(value: unknown): Record<string, unknown>[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const graph = record["@graph"];
  return [record, ...flattenJsonLd(graph)];
}

function isEventLike(node: Record<string, unknown>): boolean {
  const type = node["@type"];
  const typeText = Array.isArray(type) ? type.join(" ") : String(type ?? "");
  return /Event|SportsEvent/i.test(typeText) || Boolean(node.startDate && node.name && node.location);
}

function readLocation(location: unknown): string | undefined {
  if (typeof location === "string") return location;
  if (!location || typeof location !== "object") return undefined;
  const record = location as Record<string, unknown>;
  if (typeof record.name === "string") return record.name;
  const address = record.address;
  if (typeof address === "string") return address;
  if (address && typeof address === "object") {
    const addressRecord = address as Record<string, unknown>;
    return [addressRecord.addressRegion, addressRecord.addressLocality, addressRecord.streetAddress]
      .filter(Boolean)
      .join(" ");
  }
  return undefined;
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function log(level: "info" | "warn" | "error", message: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  const suffix = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
  const line = `[${timestamp}] [${level}] ${message}${suffix}`;
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
