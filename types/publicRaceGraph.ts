import type {
  CoursePointDataStatus,
  CoursePointService,
  CoursePointType,
  RaceType,
  RegistrationStatus,
} from "./event.ts";

export const PUBLIC_RACE_GRAPH_SCHEMA_VERSION = "race-graph-public-v1" as const;

export type PublicRaceLocation = {
  country: string;
  province: string | null;
  city: string | null;
  district: string | null;
  venue: string | null;
};

export type RaceListItem = {
  editionId: string;
  eventId: string;
  slug: string;
  name: string;
  raceType: RaceType;
  raceDate: string | null;
  endDate: string | null;
  dateDisplay: string;
  location: PublicRaceLocation;
  locationDisplay: string;
  coverImage: string | null;
  heroImage: string | null;
  registrationStatus: RegistrationStatus;
  registrationUrl: string | null;
};

export type PublicRaceCategory = {
  categoryId: string;
  name: string;
  shortName: string | null;
  distanceKm: number | null;
  elevationGain: number | null;
  cutoffTimeHours: number | null;
  startAt: string | null;
  startLocation: string | null;
  finishLocation: string | null;
  registrationUrl: string | null;
  displayOrder: number;
  isPrimaryCategory: boolean;
  coursePoints: PublicCoursePoint[] | null;
  coursePointDataStatus: CoursePointDataStatus;
};

export type PublicCoursePoint = {
  pointId: string;
  type: CoursePointType;
  name: string;
  displayOrder: number;
  distanceKm: number | null;
  cutoffAt: string | null;
  services: CoursePointService[] | null;
};

export type PublicRaceGuideParagraphs = {
  title: string;
  body: string[];
};

export type PublicRaceGuide = {
  opening: PublicRaceGuideParagraphs;
  judgment: PublicRaceGuideParagraphs;
  experiences: Array<PublicRaceGuideParagraphs & {
    conclusion: string | null;
  }>;
  runnerFit: {
    title: string;
    introduction: string | null;
    items: PublicRaceGuideParagraphs[];
  } | null;
  closing: string | null;
};

export type PublicRaceDetail = RaceListItem & {
  categories: PublicRaceCategory[];
  raceGuide: PublicRaceGuide | null;
};

export type PublicRaceListResponse = {
  schemaVersion: typeof PUBLIC_RACE_GRAPH_SCHEMA_VERSION;
  dataUpdatedAt: string;
  races: RaceListItem[];
};

export type PublicRaceDetailResponse = {
  schemaVersion: typeof PUBLIC_RACE_GRAPH_SCHEMA_VERSION;
  dataUpdatedAt: string;
  race: PublicRaceDetail;
};

export type PublicRaceErrorResponse = {
  schemaVersion: typeof PUBLIC_RACE_GRAPH_SCHEMA_VERSION;
  error: {
    code: "canonical_unavailable" | "race_not_found";
    message: string;
  };
};
