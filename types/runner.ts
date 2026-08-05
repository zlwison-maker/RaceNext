import type { RaceRegion } from "@/types/race";

export type RegionPreference = RaceRegion | "nationwide" | "overseas";

export type RunnerTargetRaceType = "marathon" | "trail" | "utmb";

export type RunnerTargetDistance = 10 | 21.1 | 42.2 | 30 | 50 | 100;

export type LongestCompletedRace =
  | "none"
  | "five_k"
  | "ten_k"
  | "half_marathon"
  | "marathon"
  | "trail_20k"
  | "trail_30k"
  | "trail_50k"
  | "trail_100k";

export type RunnerExperience = "beginner" | "foundation" | "intermediate" | "advanced" | "elite";

export type TravelScope = "local_region" | "nationwide" | "overseas";

export interface RunnerProfile {
  regionPreference: RegionPreference;
  targetRaceType: RunnerTargetRaceType;
  targetDistance: RunnerTargetDistance;
  longestCompletedRace: LongestCompletedRace;
  runnerExperience: RunnerExperience;
  halfMarathonPB?: string;
  marathonPB?: string;
  isFirstTrail: boolean;
  travelScope: TravelScope;
}
