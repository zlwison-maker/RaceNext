import { createHash } from "node:crypto";

import { PDFParse } from "pdf-parse";

import type {
  OfficialDocumentContentType,
  OfficialDocumentSnapshot,
  OfficialIngestionStatus,
} from "../../types/officialSourceIngestion.ts";
import type { RaceSourceRegistrySource } from "../../types/raceUpdate.ts";
import { CONNECTOR_USER_AGENT, decodeHtml, detectRestriction, stripHtml } from "../connectors/shared.ts";
import { normalizeDomain } from "./sourceRegistry.ts";

export const OFFICIAL_FETCH_LIMITS = {
  timeoutMs: 15_000,
  maxRedirects: 3,
  maxBytes: 5_000_000,
  maxTextCharacters: 200_000,
  maxLinks: 100,
} as const;

export type OfficialDocumentResult =
  | { ok: true; document: OfficialDocumentSnapshot }
  | { ok: false; status: OfficialIngestionStatus; detail: string };

/** Network primitive only. Phase 1 tests inject a fetcher and never contact a real source. */
export async function fetchOfficialDocument(input: {
  source: RaceSourceRegistrySource;
  editionId: string;
  fetchedAt: string;
  fetcher?: typeof fetch;
}): Promise<OfficialDocumentResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFFICIAL_FETCH_LIMITS.timeoutMs);
  const fetcher = input.fetcher ?? fetch;

  try {
    let currentUrl = input.source.url;
    let response: Response | null = null;
    for (let redirects = 0; redirects <= OFFICIAL_FETCH_LIMITS.maxRedirects; redirects += 1) {
      response = await fetcher(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": CONNECTOR_USER_AGENT,
          Accept: "text/html,text/plain,application/pdf;q=0.9",
        },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location) return failure("fetch_error", "Redirect response omitted Location.");
      if (redirects === OFFICIAL_FETCH_LIMITS.maxRedirects) {
        return failure("fetch_error", "Official source redirect limit exceeded.");
      }
      currentUrl = new URL(location, currentUrl).toString();
      if (normalizeDomain(new URL(currentUrl).hostname) !== normalizeDomain(input.source.domain)) {
        return failure("identity_mismatch", "Cross-domain redirect rejected.");
      }
    }

    if (!response) return failure("fetch_error", "Official source returned no response.");
    const finalUrl = response.url || currentUrl;
    if (normalizeDomain(new URL(finalUrl).hostname) !== normalizeDomain(input.source.domain)) {
      return failure("identity_mismatch", "Final URL did not match the approved source domain.");
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > OFFICIAL_FETCH_LIMITS.maxBytes) {
      return failure("parse_error", "Official source exceeded the maximum file size.");
    }
    const body = new Uint8Array(await response.arrayBuffer());
    if (body.byteLength > OFFICIAL_FETCH_LIMITS.maxBytes) {
      return failure("parse_error", "Official source exceeded the maximum file size.");
    }

    const restriction = detectRestriction(response.status, new TextDecoder().decode(body.slice(0, 20_000)));
    if (restriction) return failure("fetch_error", restriction);
    if (!response.ok) return failure("fetch_error", `HTTP ${response.status}`);

    const rawContentType = response.headers.get("content-type");
    const contentType = normalizeContentType(rawContentType);
    if (!contentType) {
      return failure(
        "unsupported_content_type",
        `Unsupported Content-Type: ${response.headers.get("content-type") ?? "missing"}`,
      );
    }

    return extractDocumentSnapshot({
      sourceId: input.source.sourceId,
      editionId: input.editionId,
      url: finalUrl,
      contentType,
      body,
      fetchedAt: input.fetchedAt,
      httpStatus: response.status,
      charset: extractCharset(rawContentType),
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") return failure("fetch_error", "Official source request timed out.");
    return failure("fetch_error", error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractDocumentSnapshot(input: {
  sourceId: string;
  editionId: string;
  url: string;
  contentType: OfficialDocumentContentType;
  body: Uint8Array;
  fetchedAt: string;
  httpStatus?: number;
  charset?: string | null;
}): Promise<OfficialDocumentResult> {
  try {
    if (input.body.byteLength > OFFICIAL_FETCH_LIMITS.maxBytes) {
      return failure("parse_error", "Official source exceeded the maximum file size.");
    }

    if (input.contentType === "application/pdf") {
      const parser = new PDFParse({ data: input.body });
      try {
        const result = await parser.getText();
        const text = normalizeDocumentText(result.text).slice(0, OFFICIAL_FETCH_LIMITS.maxTextCharacters);
        if (countMeaningfulCharacters(text) < 10) {
          return failure("unsupported_scanned_pdf", "PDF contains no usable text layer; OCR is outside V1.");
        }
        return {
          ok: true,
          document: buildSnapshot({
            ...input,
            title: decodeURIComponent(new URL(input.url).pathname.split("/").at(-1) ?? "Official PDF"),
            text,
            links: [],
            extractionMethod: "pdf_text",
            responseBytes: input.body.byteLength,
          }),
        };
      } finally {
        await parser.destroy();
      }
    }

    const raw = new TextDecoder("utf-8", { fatal: false }).decode(input.body);
    if (input.contentType === "text/plain") {
      const text = normalizeDocumentText(raw).slice(0, OFFICIAL_FETCH_LIMITS.maxTextCharacters);
      return {
        ok: true,
        document: buildSnapshot({
          ...input,
          title: input.url,
          text,
          links: [],
          extractionMethod: "plain_text",
          responseBytes: input.body.byteLength,
        }),
      };
    }

    const reducedHtml = removeHtmlNoise(raw);
    const text = normalizeDocumentText(stripHtml(reducedHtml)).slice(0, OFFICIAL_FETCH_LIMITS.maxTextCharacters);
    return {
      ok: true,
      document: buildSnapshot({
        ...input,
        title: extractHtmlTitle(raw) ?? input.url,
        text,
        links: extractDocumentLinks(reducedHtml, input.url),
        extractionMethod: "html_text",
        responseBytes: input.body.byteLength,
      }),
    };
  } catch (error) {
    return failure("parse_error", error instanceof Error ? error.message : String(error));
  }
}

export function normalizeDocumentText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSnapshot(input: {
  sourceId: string;
  editionId: string;
  url: string;
  contentType: OfficialDocumentContentType;
  fetchedAt: string;
  title: string;
  text: string;
  links: string[];
  extractionMethod: OfficialDocumentSnapshot["extractionMethod"];
  httpStatus?: number;
  charset?: string | null;
  responseBytes: number;
}): OfficialDocumentSnapshot {
  return {
    ...input,
    httpStatus: input.httpStatus ?? 200,
    charset: input.charset ?? null,
    contentHash: createHash("sha256").update(input.text).digest("hex"),
  };
}

function normalizeContentType(value: string | null): OfficialDocumentContentType | null {
  const type = value?.split(";", 1)[0]?.trim().toLowerCase();
  if (type === "text/html" || type === "application/xhtml+xml") return "text/html";
  if (type === "text/plain") return "text/plain";
  if (type === "application/pdf") return "application/pdf";
  return null;
}

function extractCharset(value: string | null): string | null {
  return value?.match(/(?:^|;)\s*charset=([^;\s]+)/i)?.[1]?.replace(/^['"]|['"]$/g, "").toLowerCase() ?? null;
}

function removeHtmlNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<([a-z0-9]+)\b[^>]*(?:id|class)=["'][^"']*(?:cookie|breadcrumb|menu|navigation|sidebar)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, " ");
}

function extractHtmlTitle(html: string): string | null {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeHtml(stripHtml(title)) : null;
}

function extractDocumentLinks(html: string, baseUrl: string): string[] {
  const baseDomain = normalizeDomain(new URL(baseUrl).hostname);
  const links: string[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      if (/^https?:$/.test(url.protocol) && normalizeDomain(url.hostname) === baseDomain) {
        url.hash = "";
        links.push(url.toString());
      }
    } catch {
      // Malformed links are not document facts and are safely ignored.
    }
  }
  return [...new Set(links)].slice(0, OFFICIAL_FETCH_LIMITS.maxLinks);
}

function countMeaningfulCharacters(value: string): number {
  return (value.match(/[\p{L}\p{N}]/gu) ?? []).length;
}

function failure(status: OfficialIngestionStatus, detail: string): OfficialDocumentResult {
  return { ok: false, status, detail };
}
