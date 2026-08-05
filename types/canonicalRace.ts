import type {
  DataQuality,
  RaceCategory,
  RaceRegion,
  RaceStatus,
  RaceType,
} from "./race.ts";
import type { RawRaceSource } from "./rawRace.ts";
import type { MergeTrace } from "./sourceGovernance.ts";

/**
 * @deprecated POC-era canonical race shape. New architecture should use
 * CanonicalRecord from types/event.ts before entity split.
 */
export type CanonicalRace = {
  id: string;
  canonicalName: string;
  aliases: string[];
  type: RaceType;
  status: RaceStatus;
  year: number | null;
  month: number | null;
  date: string | null;
  country: string;
  province: string;
  city: string;
  region: RaceRegion | "unknown";
  categories: RaceCategory[];
  officialUrl?: string;
  registrationUrl?: string;
  sources: Array<{
    source: RawRaceSource;
    sourceUrl?: string;
    sourceRawId?: string;
    confidence: number;
    lastUpdatedAt: string;
  }>;
  fieldSources: Record<string, RawRaceSource | "merged" | "manual" | "placeholder">;
  dataQuality: DataQuality;
  verified: boolean;
  missingFields: string[];
  mergeNotes: string[];
  mergeTrace?: MergeTrace[];
  updatedAt: string;
};
