import futureTop100Seed from "@/data/seed/future_top100_seed.json";
import mergedSample from "@/data/merged/merged_sample.json";
import { FIRST5_EVENT_BASE_DATA } from "@/data/events/first5-events";
import type { EventBaseData } from "@/data/events/first5-events";
import type { MergedConnectorRecord, SourceRecord } from "@/types/sourceRecord";

type SourceId = SourceRecord["sourceId"];

type FutureTop100SeedRecord = {
  id: string;
  name: string | null;
  type: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  raceDate: string | null;
  registrationStatus: string | null;
  registrationUrl: string | null;
  sourceUrl: string | null;
  coverImage?: string | null;
  categories: Array<{
    categoryName: string | null;
    distanceKm: number | null;
    elevationGain: number | null;
    registrationFee: number | null;
    cutoffTime?: string | null;
    categoryRegistrationUrl?: string | null;
  }>;
  sourceIds: SourceId[];
  confidence: number;
  missingFields: string[];
};

type FutureTop100SeedFile = {
  generatedAt?: string | null;
  records?: FutureTop100SeedRecord[];
};

type MergedSampleFile = {
  records: MergedConnectorRecord[];
};

export function getRaceSourceRecords(): MergedConnectorRecord[] {
  const first5Records = FIRST5_EVENT_BASE_DATA.map(first5BaseToMergedRecord);
  const seedRecords = (futureTop100Seed as unknown as FutureTop100SeedFile).records ?? [];
  if (seedRecords.length > 0) return [...first5Records, ...seedRecords.map(seedToMergedRecord)];
  return [...first5Records, ...(mergedSample as MergedSampleFile).records];
}

function first5BaseToMergedRecord(record: EventBaseData): MergedConnectorRecord {
  const location = parseEventLocation(record.eventLocation);
  const eventName = formatEventName(record);
  return {
    id: record.eventId,
    normalizedName: normalizeDedupeName(eventName),
    originalNames: [eventName],
    editionYear: record.eventYear,
    raceDate: normalizeEventDate(record.eventDate),
    province: location.province,
    city: location.city,
    district: location.district,
    venue: location.venue,
    registrationStatus: record.eventStatus,
    registrationUrl: null,
    coverImage: record.coverImage || getFallbackCoverImage(record),
    categories: record.categories.map((category) => ({
      categoryName: category,
      distanceKm: parseCategoryDistance(category),
      elevationGain: null,
      cutoffTime: null,
      registrationFee: null,
      categoryRegistrationUrl: null,
    })),
    sourceIds: ["zuicool"],
    sources: [
      {
        sourceId: "zuicool",
        rawId: record.eventId,
        sourceUrl: record.source.url,
      },
    ],
    fieldSources: {
      normalizedName: "merged",
      raceDate: "merged",
      province: "merged",
      city: "merged",
      district: "merged",
      venue: "merged",
      registrationStatus: "merged",
      coverImage: "merged",
      categories: "merged",
    },
    conflicts: [],
    mergeTrace: [
      {
        field: "first5",
        selectedSource: "merged",
        reason: "First5 MVP event base data is prioritized for commercial validation pages.",
      },
    ],
    missingFields: record.coverImage ? [] : ["coverImage"],
    confidence: 90,
  };
}

function seedToMergedRecord(record: FutureTop100SeedRecord): MergedConnectorRecord {
  const sourceIds: SourceId[] = record.sourceIds.length ? record.sourceIds : ["zuicool"];
  const primarySource = sourceIds[0] ?? "zuicool";
  const registrationSource: SourceId = sourceIds.includes("zuicool") ? "zuicool" : primarySource;
  return {
    id: record.id,
    normalizedName: normalizeDedupeName(record.name ?? record.id),
    originalNames: record.name ? [record.name] : [],
    editionYear: record.raceDate ? Number(record.raceDate.slice(0, 4)) : null,
    raceDate: record.raceDate,
    province: record.province,
    city: record.city,
    district: record.district,
    venue: null,
    registrationStatus: record.registrationStatus,
    registrationUrl: record.registrationUrl,
    coverImage: record.coverImage ?? null,
    categories: record.categories.map((category) => ({
      categoryName: category.categoryName,
      distanceKm: category.distanceKm,
      elevationGain: category.elevationGain,
      cutoffTime: category.cutoffTime ?? null,
      registrationFee: category.registrationFee,
      categoryRegistrationUrl: category.categoryRegistrationUrl ?? null,
    })),
    sourceIds,
    sources: sourceIds.map((sourceId) => ({
      sourceId,
      rawId: record.id,
      sourceUrl: record.sourceUrl ?? "",
    })),
    fieldSources: {
      normalizedName: primarySource,
      raceDate: primarySource,
      province: primarySource,
      city: primarySource,
      district: primarySource,
      registrationStatus: primarySource,
      registrationUrl: registrationSource,
      coverImage: registrationSource,
    },
    conflicts: [],
    mergeTrace: [],
    missingFields: record.missingFields,
    confidence: record.confidence,
  };
}

function normalizeDedupeName(value: string): string {
  return value
    .replace(/^\s*20\d{2}\s*/g, "")
    .replace(/\s*20\d{2}\s*$/g, "")
    .replace(/[·・\-—“”"']/g, "")
    .replace(/（.*?）|\(.*?\)/g, "")
    .replace(/赛$/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

function normalizeEventDate(date: string | null) {
  if (!date) return null;
  return date.split("/")[0] ?? date;
}

function formatEventName(record: EventBaseData) {
  if (!record.eventYear || record.eventName.includes(String(record.eventYear))) return record.eventName;
  return `${record.eventYear}${record.eventName}`;
}

function parseCategoryDistance(category: string) {
  if (/马拉松/.test(category)) return 42.195;
  const match = category.match(/(\d+(?:\.\d+)?)\s*(?:k|km|公里)/i);
  return match ? Number(match[1]) : null;
}

function parseEventLocation(value: string) {
  const normalized = value.trim();

  if (normalized.startsWith("上海")) {
    return {
      province: "上海",
      city: "上海市",
      district: normalized.includes("黄浦") ? "黄浦区" : null,
      venue: normalized,
    };
  }

  if (normalized.startsWith("北京")) {
    return {
      province: "北京",
      city: "北京市",
      district: null,
      venue: normalized,
    };
  }

  if (normalized.startsWith("福建")) {
    return {
      province: "福建",
      city: normalized.includes("厦门") ? "厦门市" : null,
      district: null,
      venue: normalized,
    };
  }

  if (normalized.startsWith("香港")) {
    return {
      province: "香港",
      city: "香港",
      district: normalized.includes("西贡") ? "西贡" : null,
      venue: normalized,
    };
  }

  if (normalized.startsWith("四川")) {
    return {
      province: "四川",
      city: normalized.includes("甘孜") ? "甘孜州" : null,
      district: normalized.includes("泸定") ? "泸定县" : null,
      venue: normalized,
    };
  }

  return {
    province: normalized || null,
    city: null,
    district: null,
    venue: normalized || null,
  };
}

function getFallbackCoverImage(record: EventBaseData) {
  if (/HK100|越野|贡嘎/i.test(record.eventName) || record.categories.some((category) => /km|k|越野/i.test(category))) {
    return "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1800&q=90";
  }
  return "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1800&q=90";
}
