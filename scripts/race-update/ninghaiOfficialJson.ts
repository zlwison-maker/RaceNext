import type {
  FactExtractionProviderResult,
  OfficialDocumentSnapshot,
  OfficialFactCandidate,
} from "../../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshotRecord, RaceSourceRegistrySource } from "../../types/raceUpdate.ts";

const EDITION_ID = "ninghai-ultra-trail-2026";
const GROUPS = new Map([[4, "YNH-25"], [5, "CNH-60"], [6, "UTNH-100"]]);
export const NINGHAI_JSON_EXTRACTION_ID = {
  provider: "official-json-deterministic",
  model: "none",
  promptVersion: "ninghai-category-json-v1",
} as const;

export function isNinghaiOfficialJsonSource(source: RaceSourceRegistrySource, editionId: string): boolean {
  if (editionId !== EDITION_ID || source.status !== "active" || source.tier !== "primary_official"
    || source.sourceType !== "category_page" || source.domain !== "ninghai100.com") return false;
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" && url.hostname === "ninghai100.com" && url.port === ""
      && url.pathname === "/app-api/race/group/get" && url.searchParams.size === 1
      && GROUPS.has(Number(url.searchParams.get("id")))
      && String(Number(url.searchParams.get("id"))) === url.searchParams.get("id")
      && !url.hash && !url.username && !url.password;
  } catch { return false; }
}

export function parseNinghaiGroupJson(raw: string, url: string): NonNullable<OfficialDocumentSnapshot["structuredCategory"]> {
  const parsed: unknown = JSON.parse(raw);
  if (!isObject(parsed) || parsed.code !== 0 || !isObject(parsed.data)) throw new Error("Official category JSON envelope is invalid.");
  const data = parsed.data;
  const expectedId = Number(new URL(url).searchParams.get("id"));
  if (!Number.isSafeInteger(data.id) || data.id !== expectedId || data.name !== GROUPS.get(expectedId)) {
    throw new Error("Official category JSON identity does not match the approved source URL.");
  }
  if (typeof data.distance !== "number" || !Number.isFinite(data.distance) || data.distance <= 0
    || typeof data.elevationGain !== "number" || !Number.isFinite(data.elevationGain) || data.elevationGain < 0
    || !nullableText(data.startPoint) || !nullableText(data.endPoint)
    || !Array.isArray(data.buttons)) throw new Error("Official category JSON fact structure is invalid.");
  const links = data.buttons.filter(isObject).map((button: Record<string, unknown>) => button.linkUrl)
    .filter((link: unknown): link is string => typeof link === "string" && link.length > 0);
  const linkedGpxUrl = links.find((link: string) => {
    try {
      const parsedLink = new URL(link);
      return parsedLink.protocol === "https:" && decodeURIComponent(parsedLink.pathname).endsWith(".gpx");
    } catch { return false; }
  });
  if (!linkedGpxUrl) throw new Error("Official category JSON has no public GPX identity link.");
  return {
    id: data.id as number, name: data.name as string, distance: data.distance as number,
    elevationGain: data.elevationGain as number, startPoint: data.startPoint as string | null,
    endPoint: data.endPoint as string | null, linkedGpxUrl,
  };
}

export function ninghaiJsonDocumentText(group: NonNullable<OfficialDocumentSnapshot["structuredCategory"]>): string {
  return [
    `data.id: ${group.id}`,
    `data.name: ${group.name}`,
    `${group.name} data.distance (actual course distance): ${group.distance}`,
    `${group.name} data.elevationGain: ${group.elevationGain}`,
    `${group.name} data.startPoint: ${group.startPoint ?? "null"}`,
    `${group.name} data.endPoint: ${group.endPoint ?? "null"}`,
    `data.buttons[].linkUrl: ${group.linkedGpxUrl}`,
  ].join("\n");
}

/** Direct fields only. The JSON distance is actual course length, not Category.distanceKm. */
export function extractNinghaiJsonFacts(
  document: OfficialDocumentSnapshot,
  record: RaceGraphSnapshotRecord,
): FactExtractionProviderResult {
  const group = document.structuredCategory;
  if (document.extractionMethod !== "structured_json" || !group) throw new Error("Verified category JSON is required.");
  const category = record.categories.find((item) => item.shortName === group.name || item.categoryName === group.name);
  if (!category || category.categoryId !== `${EDITION_ID}-${group.name.toLowerCase()}`) {
    throw new Error("Official JSON Category does not map uniquely to the target Edition.");
  }
  const base = {
    eventId: record.event.eventId, editionId: record.edition.editionId,
    categoryId: category.categoryId, entityType: "Category" as const,
    sourceId: document.sourceId, sourceUrl: document.url, fetchedAt: document.fetchedAt,
    contentHash: document.contentHash, extractionMethod: "structured_json",
    confidence: 1,
  };
  const facts: OfficialFactCandidate[] = [];
  const add = (field: "elevationGain" | "startLocation" | "finishLocation", value: number | string | null, path: string, sourceKey: string) => {
    if (value === null || value === "") return;
    facts.push({ ...base, field, candidateValue: value,
      evidenceText: `${group.name} ${sourceKey}: ${value}`, evidenceLocator: path });
  };
  add("elevationGain", group.elevationGain, "data.elevationGain", "data.elevationGain");
  add("startLocation", group.startPoint, "data.startPoint", "data.startPoint");
  add("finishLocation", group.endPoint, "data.endPoint", "data.endPoint");
  return {
    output: { contractVersion: "official-fact-extraction-v1", facts },
    ...NINGHAI_JSON_EXTRACTION_ID,
    protocol: "deterministic-json", reasoningMode: "not_applicable", structuredOutputMode: "not_applicable",
    latencyMs: 0, usage: { inputTokens: null, outputTokens: null, totalTokens: null },
  };
}

function isObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function nullableText(value: unknown): boolean { return value === null || (typeof value === "string" && value.trim().length > 0); }
