export type RawRaceSource = "runchina" | "zuicool" | "itra";

/**
 * @deprecated POC-era raw source shape. New architecture should use RawRecord naming
 * and split merged data into Event / Edition / Category via CanonicalRecord.
 */
export type RawRace = {
  source: RawRaceSource;
  sourceUrl?: string;
  rawId?: string;
  rawName?: string;
  rawDate?: string;
  rawLocation?: string;
  rawCity?: string;
  rawProvince?: string;
  rawType?: string;
  rawDistance?: string;
  rawElevationGain?: string;
  rawRegistrationStatus?: string;
  rawRegistrationUrl?: string;
  rawOfficialUrl?: string;
  rawTags?: string[];
  rawDifficulty?: string;
  rawData?: Record<string, unknown>;
  crawledAt: string;
};
