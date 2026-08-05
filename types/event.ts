export type RaceType =
  | "marathon"
  | "half_marathon"
  | "road_running"
  | "trail"
  | "ultra_trail"
  | "utmb"
  | "triathlon"
  | "other";

export type LifecycleStatus = "active" | "archived" | "cancelled" | "uncertain";

export type RegistrationStatus =
  | "upcoming"
  | "registration_open"
  | "lottery"
  | "waiting_list"
  | "registration_closed"
  | "race_finished"
  | "cancelled"
  | "unknown";

export type Region =
  | "east_china"
  | "south_china"
  | "north_china"
  | "central_china"
  | "southwest_china"
  | "northwest_china"
  | "northeast_china"
  | "hongkong_macao_taiwan"
  | "asia"
  | "europe"
  | "north_america"
  | "other_overseas"
  | "unknown";

export type Season = "spring" | "summer" | "autumn" | "winter" | "unknown";

export type CourseType = "point_to_point" | "loop" | "out_and_back" | "multiple_loops" | "unknown";

export type SurfaceType = "road" | "trail" | "mixed" | "track" | "gravel" | "snow" | "desert" | "unknown";

export type TerrainType = "flat" | "rolling" | "mountain" | "high_altitude" | "technical" | "city" | "scenic" | "unknown";

export type DifficultyLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8" | "L9" | "L10";

export type VerificationStatus = "pending" | "verified" | "rejected" | "auto_verified";

export type DataQualityLevel = "A" | "B" | "C" | "D";

export type CommercialStatus = "none" | "partial" | "completed";

export type SourceType =
  | "official"
  | "registration_platform"
  | "media"
  | "community"
  | "manual"
  | "partner"
  | "ai_generated"
  | "system";

export type Currency = "CNY" | "USD" | "EUR" | "JPY" | "HKD" | "GBP" | "unknown";

export interface SourceRecord {
  sourceType: SourceType;
  sourceName: string;
  sourceUrl?: string;
  sourceRecordId?: string;
  crawledAt?: string;
  confidence?: number;
  rawData?: Record<string, unknown>;
}

export interface FieldSource {
  field: string;
  sourceType: SourceType | "merged" | "placeholder";
  sourceName?: string;
  confidence?: number;
  updatedAt?: string;
}

export interface MergeTrace {
  field: string;
  selectedSource: SourceType | "merged" | "manual" | "placeholder";
  selectedSourceName?: string;
  reason: string;
  candidates?: Array<{
    sourceType: SourceType;
    sourceName: string;
    value: unknown;
    confidence?: number;
  }>;
}

export interface DataGovernance {
  sources: SourceRecord[];
  fieldSources: Record<string, FieldSource>;
  sourcePriority: Record<string, number> | number;
  confidence: number;
  verified?: boolean | null;
  verificationStatus?: VerificationStatus | null;
  missingFields: string[];
  mergeNotes?: string[] | null;
  mergeTrace?: MergeTrace[] | null;
  lastCrawledAt: string;
  lastUpdatedAt: string;
  pipelineVersion?: string | null;
  schemaVersion?: string | null;
  recommendationVersion?: string | null;
  tagsVersion?: string | null;
  difficultyVersion?: string | null;
  dataQualityLevel?: DataQualityLevel | null;
  reviewNotes?: string | null;
  internalFlags?: string[] | null;
}

export interface Event {
  /** Layer 1 Identity: cross-year event brand. */
  eventId: string;
  canonicalName: string;
  aliases: string[];
  eventType: RaceType;
  homeCountry: string;
  homeProvince?: string | null;
  homeCity?: string | null;
  officialWebsite?: string | null;
  organizer?: string | null;
  lifecycleStatus: LifecycleStatus;
  createdAt: string;
  updatedAt: string;
  governance: DataGovernance;
}

export interface Edition {
  /** Layer 1/2/4/6/7: one concrete year of an Event. */
  editionId: string;
  eventId: string;
  editionName: string;
  editionYear: number;
  raceDate?: string | null;
  raceWeekday?: string | null;
  season?: Season | null;
  country: string;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  venue?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  region: Region;
  timezone?: string | null;
  registrationStatus: RegistrationStatus;
  registrationOpenDate?: string | null;
  registrationCloseDate?: string | null;
  lotteryRequired?: boolean | null;
  lotteryResultDate?: string | null;
  registrationPlatform?: string | null;
  registrationUrl?: string | null;
  officialWebsite?: string | null;
  rulebookUrl?: string | null;
  capacity?: number | null;
  lifecycleStatus: LifecycleStatus;
  raceDistanceKm?: number | null;
  raceDistances?: number[] | null;
  primaryCategoryName?: string | null;
  elevationGain?: number | null;
  difficultyLevel?: DifficultyLevel | null;
  beginnerFriendly?: boolean | null;
  sceneryRating?: number | null;
  organizationRating?: number | null;
  trafficConvenience?: number | null;
  accommodationConvenience?: number | null;
  cityTravelRating?: number | null;
  experienceSummary?: string | null;
  bookingServices?: Record<string, unknown>[] | null;
  accommodationServices?: Record<string, unknown>[] | null;
  transportationServices?: Record<string, unknown>[] | null;
  raceReminderServices?: Record<string, unknown>[] | null;
  insuranceServices?: Record<string, unknown>[] | null;
  commercialStatus?: CommercialStatus | null;
  createdAt: string;
  updatedAt: string;
  governance: DataGovernance;
}

export interface Category {
  /** Layer 3/4/5/7: one concrete race category under an Edition. */
  categoryId: string;
  editionId: string;
  categoryName: string;
  distanceKm: number | null;
  elevationGain?: number | null;
  elevationLoss?: number | null;
  cutoffTimeHours?: number | null;
  fee?: number | null;
  currency?: Currency | null;
  capacity?: number | null;
  remainingQuota?: number | null;
  minAge?: number | null;
  qualificationRequired?: boolean | null;
  qualificationRules?: string | null;
  mandatoryGear?: string[] | null;
  itraPoints?: number | null;
  mountainLevel?: number | string | null;
  utmbIndex?: string | null;
  runningStones?: number | null;
  courseType?: CourseType | null;
  surfaceType?: SurfaceType | null;
  terrainType?: TerrainType | null;
  altitudeMin?: number | null;
  altitudeMax?: number | null;
  altitudeAverage?: number | null;
  aidStationCount?: number | null;
  aidStationSpacingKm?: number | null;
  officialCourseMapUrl?: string | null;
  gpxUrl?: string | null;
  courseDescription?: string | null;
  courseHighlights?: string[] | null;
  difficultyLevel?: DifficultyLevel | null;
  difficultyScore?: number | null;
  beginnerFriendly?: boolean | null;
  recommendedFor?: string[] | null;
  recommendationReasons?: string[] | null;
  riskWarnings?: string[] | null;
  suitableExperience?: string[] | null;
  suitableTrainingLevel?: string | null;
  raceNextScore?: number | null;
  recommendationConfidence?: number | null;
  recommendationVersion?: string | null;
  gearRecommendations?: Record<string, unknown>[] | null;
  trainingServices?: Record<string, unknown>[] | null;
  nutritionServices?: Record<string, unknown>[] | null;
  routeServices?: Record<string, unknown>[] | null;
  createdAt: string;
  updatedAt: string;
  governance: DataGovernance;
}

export interface CanonicalRecord {
  /** Pipeline record before entity split into Event / Edition / Category. */
  recordId: string;
  eventId?: string | null;
  editionId?: string | null;
  categoryId?: string | null;
  normalizedName: string;
  originalNames: string[];
  aliases?: string[];
  event?: Partial<Event>;
  edition?: Partial<Edition>;
  categories?: Partial<Category>[];
  governance: DataGovernance;
}

export interface RaceCardViewModel {
  /** Frontend aggregate, not a database table. */
  canonicalName: string;
  editionName: string;
  raceType: RaceType;
  raceDate: string | null;
  city: string | null;
  region: Region;
  registrationStatus: RegistrationStatus;
  registrationUrl?: string | null;
  officialWebsite?: string | null;
  raceDistances: number[];
  primaryCategoryName?: string | null;
  elevationGain?: number | null;
  difficultyLevel?: DifficultyLevel | null;
  tags?: string[];
  recommendationTags?: string[];
}

export interface RecommendationCardViewModel {
  /** Frontend aggregate for recommendation surfaces, not a database table. */
  canonicalName: string;
  editionName: string;
  categoryName: string;
  distanceKm: number | null;
  elevationGain?: number | null;
  difficultyLevel?: DifficultyLevel | null;
  raceNextScore?: number | null;
  recommendationReasons: string[];
  riskWarnings: string[];
  registrationStatus: RegistrationStatus;
  registrationUrl?: string | null;
  trafficConvenience?: number | null;
  accommodationConvenience?: number | null;
}
