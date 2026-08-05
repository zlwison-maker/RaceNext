import { readFile } from "node:fs/promises";
import type { MergedConnectorRecord, NormalizedConnectorRecord, SourceRecord } from "../../types/sourceRecord.ts";
import { writeJson } from "../connectors/shared.ts";

const NORMALIZED_PATH = "data/normalized/normalized_sample.json";
const OUTPUT_PATH = "data/merged/merged_sample.json";

type NormalizedOutput = {
  generatedAt: string;
  records: NormalizedConnectorRecord[];
};

type MergeOutput = {
  generatedAt: string;
  summary: {
    normalizedCount: number;
    mergedCount: number;
    conflictCount: number;
    mergedGroups: number;
  };
  records: MergedConnectorRecord[];
};

export async function mergeConnectorSamples(): Promise<MergeOutput> {
  const normalized = JSON.parse(await readFile(NORMALIZED_PATH, "utf8")) as NormalizedOutput;
  const groups = groupRecords(normalized.records);
  const records = [...groups.values()].map(mergeGroup);
  const conflictCount = records.reduce((sum, record) => sum + record.conflicts.length, 0);
  const result: MergeOutput = {
    generatedAt: new Date().toISOString(),
    summary: {
      normalizedCount: normalized.records.length,
      mergedCount: records.length,
      conflictCount,
      mergedGroups: records.filter((record) => record.sources.length > 1).length,
    },
    records,
  };
  await writeJson(OUTPUT_PATH, result);
  console.log(`[connector-poc] merged records written ${records.length}`);
  return result;
}

function groupRecords(records: NormalizedConnectorRecord[]): Map<string, NormalizedConnectorRecord[]> {
  const groups = new Map<string, NormalizedConnectorRecord[]>();
  for (const record of records) {
    const key = `${record.normalizedName}|${record.city ?? ""}|${record.editionYear ?? ""}`;
    const existing = groups.get(key) ?? [];
    existing.push(record);
    groups.set(key, existing);
  }
  return groups;
}

function mergeGroup(records: NormalizedConnectorRecord[]): MergedConnectorRecord {
  const runchina = records.find((record) => record.sourceId === "runchina");
  const zuicool = records.find((record) => record.sourceId === "zuicool");
  const base = runchina ?? zuicool ?? records[0];
  const conflicts = buildConflicts(records);
  const categories = mergeCategories(records.flatMap((record) => record.categories));
  const fieldSources: MergedConnectorRecord["fieldSources"] = {};
  const mergeTrace: MergedConnectorRecord["mergeTrace"] = [];

  const pick = <K extends keyof NormalizedConnectorRecord>(
    field: K,
    preferred: SourceRecord["sourceId"][],
    fallback: NormalizedConnectorRecord | undefined = base,
  ): NormalizedConnectorRecord[K] => {
    const selected = preferred.map((sourceId) => records.find((record) => record.sourceId === sourceId && hasValue(record[field]))).find(Boolean) ?? (hasValue(fallback?.[field]) ? fallback : records.find((record) => hasValue(record[field]))) ?? base;
    fieldSources[String(field)] = selected.sourceId;
    mergeTrace.push({
      field: String(field),
      selectedSource: selected.sourceId,
      reason: `${preferred.join(" -> ")} priority for ${String(field)}`,
    });
    return selected[field];
  };

  const raceDate = pick("raceDate", ["runchina", "zuicool"]);
  const registrationUrl = pick("registrationUrl", ["zuicool", "runchina"]);
  const coverImage = pick("coverImage", ["zuicool", "runchina"]);

  return {
    id: `merged-${base.normalizedName}-${base.city ?? "unknown"}-${base.editionYear ?? "unknown"}`.replace(/[^\w\u4e00-\u9fa5-]+/g, "-"),
    normalizedName: pick("normalizedName", ["runchina", "zuicool"]),
    originalNames: unique(records.map((record) => record.originalName).filter((name): name is string => Boolean(name))),
    editionYear: pick("editionYear", ["runchina", "zuicool"]),
    raceDate,
    province: pick("province", ["runchina", "zuicool"]),
    city: pick("city", ["runchina", "zuicool"]),
    district: pick("district", ["runchina", "zuicool"]),
    venue: pick("venue", ["zuicool", "runchina"]),
    registrationStatus: pick("registrationStatus", ["zuicool", "runchina"]),
    registrationUrl,
    coverImage,
    categories,
    sourceIds: unique(records.flatMap((record) => record.sourceIds)),
    sources: records.map((record) => ({
      sourceId: record.sourceId,
      rawId: record.rawId,
      sourceUrl: record.sourceUrl,
    })),
    fieldSources: markConflictFields(fieldSources, conflicts),
    conflicts,
    mergeTrace,
    missingFields: unique(records.flatMap((record) => record.missingFields)).filter((field) => !hasMergedValue(field, { raceDate, registrationUrl, coverImage, categories })),
    confidence: Number((records.reduce((sum, record) => sum + record.confidence, 0) / records.length).toFixed(2)),
  };
}

function buildConflicts(records: NormalizedConnectorRecord[]): MergedConnectorRecord["conflicts"] {
  const conflicts: MergedConnectorRecord["conflicts"] = [];
  for (const field of ["raceDate", "province", "city", "district"] as const) {
    const values = unique(records.map((record) => record[field]).filter(Boolean));
    if (values.length > 1) {
      conflicts.push({
        field,
        values: Object.fromEntries(records.map((record) => [record.sourceId, record[field]])),
        reason: "cross-source value conflict; kept source-priority value and preserved conflict",
      });
    }
  }
  return conflicts;
}

function mergeCategories(categories: NormalizedConnectorRecord["categories"]): NormalizedConnectorRecord["categories"] {
  const byKey = new Map<string, NormalizedConnectorRecord["categories"][number]>();
  for (const category of categories) {
    const key = `${category.categoryName ?? ""}|${category.distanceKm ?? ""}`;
    if (!key.trim()) continue;
    const existing = byKey.get(key);
    byKey.set(key, {
      ...existing,
      ...category,
      registrationFee: category.registrationFee ?? existing?.registrationFee ?? null,
      elevationGain: category.elevationGain ?? existing?.elevationGain ?? null,
      cutoffTime: category.cutoffTime ?? existing?.cutoffTime ?? null,
    });
  }
  return [...byKey.values()];
}

function markConflictFields(
  fieldSources: MergedConnectorRecord["fieldSources"],
  conflicts: MergedConnectorRecord["conflicts"],
): MergedConnectorRecord["fieldSources"] {
  const result = { ...fieldSources };
  for (const conflict of conflicts) {
    result[conflict.field] = "conflict";
  }
  return result;
}

function hasMergedValue(field: string, merged: Pick<MergedConnectorRecord, "raceDate" | "registrationUrl" | "coverImage" | "categories">): boolean {
  if (field === "raceDate") return Boolean(merged.raceDate);
  if (field === "registrationUrl") return Boolean(merged.registrationUrl);
  if (field === "coverImage") return Boolean(merged.coverImage);
  if (field === "categories") return merged.categories.length > 0;
  return false;
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

if (process.argv[1]?.endsWith("mergeConnectorSamples.ts")) {
  mergeConnectorSamples().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
