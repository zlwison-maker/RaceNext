/**
 * @deprecated Legacy single-layer Race model kept for the current UI.
 * New data architecture should use Event / Edition / Category from types/event.ts.
 */
export type RaceType =
  | "marathon"
  | "half_marathon"
  | "road_running"
  | "trail"
  | "ultra_trail"
  | "utmb"
  | "triathlon"
  | "other";

export type RaceStatus =
  | "registration_open"
  | "upcoming"
  | "lottery"
  | "closed"
  | "finished"
  | "cancelled"
  | "unknown";

export type RaceRegion =
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
  | "other_overseas";

export type DifficultyLevel =
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
  | "L6"
  | "L7"
  | "L8"
  | "L9"
  | "L10";

export type RecommendedUserLevel =
  | "beginner"
  | "road_runner"
  | "first_marathon"
  | "first_trail"
  | "intermediate"
  | "advanced"
  | "elite";

export type DataSource =
  | "official"
  | "registration_platform"
  | "media"
  | "community"
  | "manual"
  | "ai_generated";

export type DataQuality = "verified" | "partially_verified" | "unverified" | "placeholder";

export type RaceTag =
  | "MARATHON"
  | "HALF_MARATHON"
  | "ROAD_RUNNING"
  | "TRAIL"
  | "ULTRA_TRAIL"
  | "UTMB"
  | "TRIATHLON"
  | "EAST_CHINA"
  | "SOUTH_CHINA"
  | "NORTH_CHINA"
  | "CENTRAL_CHINA"
  | "SOUTHWEST_CHINA"
  | "NORTHWEST_CHINA"
  | "NORTHEAST_CHINA"
  | "HONGKONG_MACAO_TAIWAN"
  | "ASIA"
  | "EUROPE"
  | "NORTH_AMERICA"
  | "OVERSEAS"
  | "SPRING"
  | "SUMMER"
  | "AUTUMN"
  | "WINTER"
  | "FIRST_5K"
  | "FIRST_10K"
  | "FIRST_HALF"
  | "FIRST_MARATHON"
  | "FIRST_TRAIL"
  | "FIRST_50K"
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "ELITE"
  | "CITY_ROUTE"
  | "MOUNTAIN_ROUTE"
  | "FOREST_ROUTE"
  | "SEA_ROUTE"
  | "LAKE_ROUTE"
  | "DESERT_ROUTE"
  | "GRASSLAND_ROUTE"
  | "STAIRS_HEAVY"
  | "TECHNICAL_ROUTE"
  | "FAST_ROUTE"
  | "CITY_VIEW"
  | "MOUNTAIN_VIEW"
  | "FOREST_VIEW"
  | "SEA_VIEW"
  | "LAKE_VIEW"
  | "SNOW_MOUNTAIN_VIEW"
  | "SUNRISE_VIEW"
  | "SUNSET_VIEW"
  | "EASY"
  | "MODERATE"
  | "HARD"
  | "EXTREME"
  | "HIGH_SPEED_RAIL_FRIENDLY"
  | "AIRPORT_FRIENDLY"
  | "SELF_DRIVE_FRIENDLY"
  | "TRANSPORT_CHALLENGE"
  | "POPULAR_RACE"
  | "CLASSIC_RACE"
  | "UTMB_QUALIFIER"
  | "ITRA_CERTIFIED"
  | "WORLD_CLASS_EVENT"
  | "HOT_RACE"
  | "LOTTERY_REQUIRED"
  | "CROWD_FAVORITE"
  | "FAMILY_FRIENDLY"
  | "HARDCORE_RUNNERS"
  | "SOCIAL_FRIENDLY"
  | "INTERNATIONAL_FIELD"
  | "HIGH_ALTITUDE"
  | "HOT_WEATHER"
  | "COLD_WEATHER"
  | "HUMID_WEATHER"
  | "SUMMER_ESCAPE";

export interface RaceCategory {
  id: string;
  name: string;
  distanceKm: number;
  elevationGain: number;
  difficultyLevel: DifficultyLevel;
  difficultyScore: number;
  beginnerFriendly: boolean;
}

export interface RaceDecision {
  popularityScore: number;
  sceneryScore: number;
  organizationScore: number;
  transportScore: number;
  technicalScore: number;
}

export interface Race {
  id: string;
  name: string;
  englishName?: string;
  slug: string;
  type: RaceType;
  status?: RaceStatus;
  summary: string;
  officialUrl?: string;
  registrationUrl?: string;
  year: number;
  month: number;
  date?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  lotteryDate?: string;
  country: string;
  province: string;
  city: string;
  region: RaceRegion;
  categories: RaceCategory[];
  tags: RaceTag[];
  decision: RaceDecision;
  suitableFor?: string[];
  notSuitableFor?: string[];
  recommendationReason?: string;
  recommendedUserLevel?: RecommendedUserLevel[];
  source: DataSource;
  verified: boolean;
  dataQuality: DataQuality;
  lastUpdatedAt: string;
}
