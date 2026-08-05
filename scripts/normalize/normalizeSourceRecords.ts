import { readFile } from "node:fs/promises";
import type { ConnectorOutput, NormalizedConnectorRecord, SourceRecord } from "../../types/sourceRecord.ts";
import { writeJson } from "../connectors/shared.ts";

const RUNCHINA_RAW_PATH = "data/raw/runchina_sample.json";
const ZUICOOL_RAW_PATH = "data/raw/zuicool_sample.json";
const OUTPUT_PATH = "data/normalized/normalized_sample.json";

export async function normalizeConnectorSamples(): Promise<{
  generatedAt: string;
  records: NormalizedConnectorRecord[];
}> {
  const outputs = await Promise.all([readConnectorOutput(RUNCHINA_RAW_PATH), readConnectorOutput(ZUICOOL_RAW_PATH)]);
  const records = outputs.flatMap((output) => output.records).map(normalizeRecord);
  const result = {
    generatedAt: new Date().toISOString(),
    records,
  };
  await writeJson(OUTPUT_PATH, result);
  console.log(`[connector-poc] normalized records written ${records.length}`);
  return result;
}

async function readConnectorOutput(path: string): Promise<ConnectorOutput> {
  const text = await readFile(path, "utf8");
  return JSON.parse(text) as ConnectorOutput;
}

function normalizeRecord(record: SourceRecord): NormalizedConnectorRecord {
  const fields = record.extractedFields;
  const originalName = readString(fields.name);
  const canonicalNameCandidate = normalizeName(originalName ?? "");
  const raceDate = readString(fields.raceDate);
  const editionYear = inferYear(raceDate, originalName);
  const categories = normalizeCategories(fields.categories);
  const normalized: NormalizedConnectorRecord = {
    id: `${record.sourceId}-${record.rawId}`,
    originalName,
    canonicalNameCandidate,
    normalizedName: normalizeDedupeName(canonicalNameCandidate),
    sourceIds: [record.sourceId],
    sourceUrl: record.sourceUrl,
    rawId: record.rawId,
    sourceId: record.sourceId,
    editionYear,
    raceDate,
    province: readString(fields.province),
    city: readString(fields.city),
    district: readString(fields.district),
    venue: readString(fields.venue),
    registrationStatus: normalizeRegistrationStatus(readString(fields.registrationStatus) ?? readString(fields.statusText)),
    registrationUrl: readString(fields.registrationUrl),
    coverImage: readString(fields.coverImage),
    categories,
    fieldSources: buildFieldSources(record),
    missingFields: [],
    confidence: computeConfidence(record, categories),
    rawData: record.rawData,
  };
  normalized.missingFields = findMissingFields(normalized);
  return normalized;
}

function normalizeCategories(value: unknown): NormalizedConnectorRecord["categories"] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      categoryName: readString(record.categoryName),
      distanceKm: readNumber(record.distanceKm),
      elevationGain: readNumber(record.elevationGain),
      cutoffTime: readString(record.cutoffTime),
      registrationFee: readNumber(record.registrationFee) ?? readNumber(record.categoryFee),
      categoryRegistrationUrl: readString(record.categoryRegistrationUrl),
    };
  });
}

function normalizeName(value: string): string {
  return value
    .replace(/^\s*20\d{2}\s*/g, "")
    .replace(/\s*20\d{2}\s*$/g, "")
    .replace(/^[·・\-—\s]+|[·・\-—\s]+$/g, "")
    .replace(/赛$/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function normalizeDedupeName(value: string): string {
  return normalizeName(value)
    .replace(/[·・\-—“”"']/g, "")
    .replace(/（.*?）|\(.*?\)/g, "")
    .toLowerCase();
}

function inferYear(date: string | null, name: string | null): number | null {
  const fromDate = date?.match(/^(20\d{2})/)?.[1];
  if (fromDate) return Number(fromDate);
  const fromName = name?.match(/20\d{2}/)?.[0];
  return fromName ? Number(fromName) : null;
}

function normalizeRegistrationStatus(value: string | null): string | null {
  if (!value) return null;
  if (/registration_open|报名|点此报名|一键报名/.test(value)) return "registration_open";
  if (/lottery|抽签/.test(value)) return "lottery";
  if (/closed|关闭|截止|结束/.test(value)) return "closed";
  if (/finished|完赛|已结束/.test(value)) return "finished";
  return value;
}

function buildFieldSources(record: SourceRecord): Record<string, SourceRecord["sourceId"]> {
  const fields: Record<string, SourceRecord["sourceId"]> = {};
  for (const key of Object.keys(record.extractedFields)) {
    fields[key] = record.sourceId;
  }
  fields.rawId = record.sourceId;
  fields.sourceUrl = record.sourceId;
  return fields;
}

function findMissingFields(record: NormalizedConnectorRecord): string[] {
  const missing: string[] = [];
  for (const field of ["originalName", "canonicalNameCandidate", "editionYear", "raceDate", "province", "city"] as const) {
    if (!record[field]) missing.push(field);
  }
  if (!record.registrationStatus) missing.push("registrationStatus");
  if (!record.registrationUrl) missing.push("registrationUrl");
  if (!record.categories.length) missing.push("categories");
  return missing;
}

function computeConfidence(record: SourceRecord, categories: NormalizedConnectorRecord["categories"]): number {
  let confidence = record.sourceId === "runchina" ? 0.76 : 0.68;
  if (record.dataQuality === "high") confidence += 0.1;
  if (record.extractedFields.registrationUrl) confidence += 0.04;
  if (categories.length) confidence += 0.06;
  confidence -= Math.min(record.warnings.length * 0.03, 0.12);
  return Number(Math.max(0.3, Math.min(confidence, 0.95)).toFixed(2));
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

if (process.argv[1]?.endsWith("normalizeSourceRecords.ts")) {
  normalizeConnectorSamples().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
