import type { ConnectorOutput, SourceRecord } from "../../types/sourceRecord.ts";
import {
  absolutizeUrl,
  CONNECTOR_PIPELINE_VERSION,
  ConnectorStopError,
  fetchTextWithPolicy,
  firstMatch,
  logStep,
  stripHtml,
  writeJson,
} from "./shared.ts";

const SOURCE_ID = "zuicool" as const;
const SOURCE_NAME = "最酷";
const SOURCE_TYPE = "Aggregator" as const;
const LIST_URL = "https://zuicool.com/events?page=1&per-page=100";
const OUTPUT_PATH = "data/raw/zuicool_sample.json";

type ZuicoolCard = {
  eventId: string;
  name: string;
  detailUrl: string;
  dateLocation: string | null;
  shortDescription: string | null;
  statusText: string | null;
  registrationDeadline: string | null;
  coverImage: string | null;
  rawHtml: string;
};

type ZuicoolDetail = {
  detailUrl: string;
  title: string | null;
  description: string | null;
  registrationUrl: string | null;
  coverImage: string | null;
  categories: ZuicoolCategory[];
  rawText: string;
  rawHtmlSnippet: string;
};

type ZuicoolRegistrationPage = {
  registrationUrl: string;
  categories: ZuicoolCategory[];
  rawText: string;
  rawHtmlSnippet: string;
};

type ZuicoolCategory = {
  categoryName: string | null;
  categoryFee: number | null;
  categoryRegistrationUrl: string | null;
  rawText: string | null;
  distanceKm: number | null;
  elevationGain: number | null;
  cutoffTime: string | null;
};

export async function fetchZuicoolConnectorSample(
  options: { listLimit?: number; detailLimit?: number; registrationLimit?: number } = {},
): Promise<ConnectorOutput> {
  const startedAt = new Date().toISOString();
  const listLimit = Math.min(options.listLimit ?? 20, 20);
  const detailLimit = Math.min(options.detailLimit ?? 3, 3);
  const registrationLimit = Math.min(options.registrationLimit ?? 2, 2);
  const warnings: string[] = [];
  let stoppedReason: string | null = null;
  let detailCount = 0;
  let registrationPageCount = 0;
  const detailsByEventId = new Map<string, ZuicoolDetail>();
  const registrationsByUrl = new Map<string, ZuicoolRegistrationPage>();
  let cards: ZuicoolCard[] = [];

  try {
    logStep("Zuicool list fetch started", { listLimit });
    const listResult = await fetchTextWithPolicy(LIST_URL, {
      headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    cards = parseListCards(listResult.text, listResult.finalUrl).slice(0, listLimit);

    for (const card of cards.slice(0, detailLimit)) {
      try {
        logStep("Zuicool detail fetch", { eventId: card.eventId });
        const detailResult = await fetchTextWithPolicy(card.detailUrl, {
          headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
        });
        const detail = parseDetail(detailResult.text, detailResult.finalUrl);
        detailsByEventId.set(card.eventId, detail);
        detailCount += 1;
      } catch (error) {
        if (error instanceof ConnectorStopError) throw error;
        warnings.push(`detail request failed for ${card.eventId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const registrationUrls = [...detailsByEventId.values()]
      .map((detail) => detail.registrationUrl)
      .filter((url): url is string => Boolean(url))
      .slice(0, registrationLimit);

    for (const registrationUrl of registrationUrls) {
      try {
        logStep("Zuicool registration page fetch", { registrationUrl });
        const pageResult = await fetchTextWithPolicy(registrationUrl, {
          headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
        });
        registrationsByUrl.set(registrationUrl, parseRegistrationPage(pageResult.text, pageResult.finalUrl));
        registrationPageCount += 1;
      } catch (error) {
        if (error instanceof ConnectorStopError) throw error;
        warnings.push(`registration page failed for ${registrationUrl}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    stoppedReason = error instanceof Error ? error.message : String(error);
    warnings.push(stoppedReason);
  }

  const records = cards.map((card) => {
    const detail = detailsByEventId.get(card.eventId);
    const registration = detail?.registrationUrl ? registrationsByUrl.get(detail.registrationUrl) : undefined;
    return buildRecord(card, detail, registration);
  });

  const output: ConnectorOutput = {
    pipelineVersion: CONNECTOR_PIPELINE_VERSION,
    summary: {
      sourceId: SOURCE_ID,
      sourceName: SOURCE_NAME,
      startedAt,
      finishedAt: new Date().toISOString(),
      listCount: cards.length,
      detailCount,
      registrationPageCount,
      recordsCount: records.length,
      warnings,
      stoppedReason,
    },
    records,
  };

  await writeJson(OUTPUT_PATH, output);
  logStep("Zuicool connector finished", output.summary);
  return output;
}

function parseListCards(html: string, baseUrl: string): ZuicoolCard[] {
  const matches = [
    ...html.matchAll(
      /<div class="event" style="padding-bottom: 10px">([\s\S]*?)(?=<div class="event" style="padding-bottom: 10px">|<nav class="pagination-wrap">)/g,
    ),
  ];
  const cards: ZuicoolCard[] = [];
  const seen = new Set<string>();
  for (const match of matches) {
    const block = match[1];
    const eventId = block.match(/zuicool\.com\/event\/(\d+)/)?.[1];
    if (!eventId || seen.has(eventId)) continue;
    seen.add(eventId);
    const detailUrl = `https://zuicool.com/event/${eventId}`;
    const name = stripHtml(block.match(/<h4 class="name">([\s\S]*?)<\/h4>/)?.[1] ?? "");
    const info = stripHtml(block.match(/<div class="info">([\s\S]*?)<\/div>/)?.[1] ?? "");
    const shortDescription = stripHtml(block.match(/<p style="font-size: 12px;[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "") || null;
    const statusText = stripHtml(block.match(/class="status_bth[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "") || null;
    const registrationDeadline = block.match(/报名截止：([^<]+)/)?.[1]?.trim() ?? null;
    const coverImage = absolutizeUrl(block.match(/<img src="([^"]+)" class="logo"/)?.[1], baseUrl) ?? null;
    if (!name) continue;
    cards.push({
      eventId,
      name,
      detailUrl,
      dateLocation: info || null,
      shortDescription,
      statusText,
      registrationDeadline,
      coverImage,
      rawHtml: block.slice(0, 8_000),
    });
  }
  return cards;
}

function parseDetail(html: string, baseUrl: string): ZuicoolDetail {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = firstMatch(html, /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i);
  const coverImage = absolutizeUrl(
    firstMatch(html, /<meta[^>]+(?:name|property)=["']og:image["'][^>]+content=["']([^"']*)["']/i) ?? undefined,
    baseUrl,
  ) ?? null;
  const registrationUrl = absolutizeUrl(
    html.match(/href=["'](https:\/\/reg\.zuicool\.com\/\d+)["'][^>]*>\s*点此报名\s*<\/a>/i)?.[1] ??
      html.match(/href=["'](https:\/\/reg\.zuicool\.com\/\d+)["']/i)?.[1],
    baseUrl,
  ) ?? null;
  return {
    detailUrl: baseUrl,
    title: title ? stripHtml(title) : null,
    description: description ? stripHtml(description) : null,
    registrationUrl,
    coverImage,
    categories: parsePkgCategories(html, baseUrl),
    rawText: stripHtml(html).slice(0, 20_000),
    rawHtmlSnippet: html.slice(0, 20_000),
  };
}

function parseRegistrationPage(html: string, baseUrl: string): ZuicoolRegistrationPage {
  return {
    registrationUrl: baseUrl,
    categories: parseRegistrationCategories(html, baseUrl),
    rawText: stripHtml(html).slice(0, 20_000),
    rawHtmlSnippet: html.slice(0, 20_000),
  };
}

function parsePkgCategories(html: string, baseUrl: string): ZuicoolCategory[] {
  const blocks = [...html.matchAll(/<div class="pkg2">([\s\S]*?)(?=<div class="pkg2">|<div class="clearfix">)/g)];
  return blocks.map((match) => categoryFromBlock(match[1], baseUrl)).filter(hasCategoryName);
}

function parseRegistrationCategories(html: string, baseUrl: string): ZuicoolCategory[] {
  const blocks = [...html.matchAll(/<tr>\s*<td class="name">([\s\S]*?)<\/tr>/g)];
  return blocks.map((match) => categoryFromBlock(match[1], baseUrl)).filter(hasCategoryName);
}

function categoryFromBlock(block: string, baseUrl: string): ZuicoolCategory {
  const categoryName = stripHtml(block.match(/<h[45][^>]*>([\s\S]*?)<\/h[45]>/)?.[1] ?? "") || null;
  const rawText = stripHtml(block) || null;
  const feeText = block.match(/<div class="price">\s*([\d.]+)/)?.[1] ?? block.match(/<td class="fee">[\s\S]*?<p>\s*([\d.]+)/)?.[1] ?? null;
  const categoryRegistrationUrl = absolutizeUrl(block.match(/href=["'](https:\/\/reg\.zuicool\.com\/\d+\/\d+)["']/i)?.[1], baseUrl) ?? null;
  return {
    categoryName,
    categoryFee: feeText ? Number(feeText) : null,
    categoryRegistrationUrl,
    rawText,
    distanceKm: inferDistance(`${categoryName ?? ""} ${rawText ?? ""}`),
    elevationGain: inferElevation(rawText ?? ""),
    cutoffTime: inferCutoff(rawText ?? ""),
  };
}

function buildRecord(card: ZuicoolCard, detail?: ZuicoolDetail, registration?: ZuicoolRegistrationPage): SourceRecord {
  const parsedLocation = parseDateLocation(card.dateLocation);
  const categories = mergeCategories(detail?.categories ?? [], registration?.categories ?? []);
  const extractedFields: Record<string, unknown> = {
    eventId: card.eventId,
    name: detail?.title ?? card.name,
    raceDate: parsedLocation.date,
    rawDateLocation: card.dateLocation,
    province: parsedLocation.province,
    city: parsedLocation.city,
    district: parsedLocation.district,
    venue: parsedLocation.venue,
    shortDescription: card.shortDescription,
    statusText: card.statusText,
    registrationStatus: normalizeStatus(card.statusText),
    registrationDeadline: card.registrationDeadline,
    detailUrl: card.detailUrl,
    registrationUrl: detail?.registrationUrl ?? null,
    coverImage: detail?.coverImage ?? card.coverImage,
    categories,
  };
  return {
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    sourceType: SOURCE_TYPE,
    sourceUrl: card.detailUrl,
    rawId: card.eventId,
    fetchedAt: new Date().toISOString(),
    rawData: {
      card,
      detail,
      registration,
    },
    extractedFields,
    dataQuality: detail ? "medium" : "low",
    warnings: buildRecordWarnings(extractedFields, detail, registration),
  };
}

function parseDateLocation(value: string | null): {
  date: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  venue: string | null;
} {
  if (!value) return { date: null, province: null, city: null, district: null, venue: null };
  const [dateText, locationText = ""] = value.split("·").map((part) => part.trim());
  const date = normalizeDate(dateText);
  const parts = locationText.split(/\s+/).filter(Boolean);
  return {
    date,
    province: parts[0] ?? null,
    city: parts[1] ?? null,
    district: parts[2] ?? null,
    venue: parts.slice(3).join(" ") || null,
  };
}

function normalizeDate(value?: string): string | null {
  if (!value) return null;
  const match = value.match(/(20\d{2})[./-](\d{1,2})(?:[./-](\d{1,2}))?/);
  if (!match || !match[3]) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function normalizeStatus(value: string | null): string | null {
  if (!value) return null;
  if (/报名|点此报名|一键报名/.test(value)) return "registration_open";
  if (/截止|关闭|已结束/.test(value)) return "registration_closed";
  return value;
}

function inferDistance(value: string): number | null {
  if (/半程|半马/.test(value)) return 21.1;
  if (/全程|全马/.test(value)) return 42.2;
  const match = value.match(/(\d+(?:\.\d+)?)\s?(?:km|KM|公里)/);
  return match ? Number(match[1]) : null;
}

function inferElevation(value: string): number | null {
  const match = value.match(/(?:累计爬升|爬升|D\+)\s*(\d{3,5})\s*(?:米|m)?/i);
  return match ? Number(match[1]) : null;
}

function inferCutoff(value: string): string | null {
  return value.match(/关门时间([^，。；;]+)/)?.[0] ?? null;
}

function hasCategoryName(category: ZuicoolCategory): boolean {
  return Boolean(category.categoryName);
}

function mergeCategories(primary: ZuicoolCategory[], secondary: ZuicoolCategory[]): ZuicoolCategory[] {
  const byName = new Map<string, ZuicoolCategory>();
  for (const category of [...secondary, ...primary]) {
    const key = category.categoryName ?? "";
    if (!key) continue;
    byName.set(key, { ...(byName.get(key) ?? {}), ...category });
  }
  return [...byName.values()];
}

function buildRecordWarnings(extractedFields: Record<string, unknown>, detail?: ZuicoolDetail, registration?: ZuicoolRegistrationPage): string[] {
  const warnings: string[] = [];
  if (!detail) warnings.push("detail_not_fetched");
  if (detail?.registrationUrl && !registration) warnings.push("registration_page_not_fetched");
  if (!extractedFields.registrationUrl) warnings.push("registration_url_missing");
  if (!Array.isArray(extractedFields.categories) || extractedFields.categories.length === 0) warnings.push("categories_missing");
  return warnings;
}

if (process.argv[1]?.endsWith("zuicoolConnector.ts")) {
  fetchZuicoolConnectorSample().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
