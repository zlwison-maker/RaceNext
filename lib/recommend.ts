import { races } from "@/lib/races";
import type { Race, RaceCategory, RaceRegion, RaceTag, RaceType } from "@/types/race";
import type { LongestCompletedRace, RunnerExperience, RegionPreference, RunnerProfile, RunnerTargetRaceType } from "@/types/runner";

export interface RecommendationResult {
  race: Race;
  category: RaceCategory;
  score: number;
  conclusion: string;
  reasons: string[];
  riskTip: string;
}

const targetTypeRules: Record<RunnerTargetRaceType, RaceType[]> = {
  marathon: ["marathon", "half_marathon", "road_running"],
  trail: ["trail", "ultra_trail", "utmb"],
  utmb: ["utmb", "ultra_trail"],
};

const targetTypeTags: Record<RunnerTargetRaceType, RaceTag[]> = {
  marathon: ["MARATHON", "FIRST_MARATHON", "CITY_ROUTE"],
  trail: ["TRAIL", "FIRST_TRAIL", "MOUNTAIN_ROUTE"],
  utmb: ["UTMB", "UTMB_QUALIFIER", "WORLD_CLASS_EVENT"],
};

const completedRaceRanges: Record<LongestCompletedRace, { min: number; max: number; challengeMax: number }> = {
  none: { min: 1, max: 3, challengeMax: 4 },
  five_k: { min: 1, max: 3, challengeMax: 4 },
  ten_k: { min: 1, max: 3, challengeMax: 4 },
  half_marathon: { min: 3, max: 5, challengeMax: 6 },
  marathon: { min: 4, max: 6, challengeMax: 7 },
  trail_20k: { min: 4, max: 5, challengeMax: 6 },
  trail_30k: { min: 5, max: 7, challengeMax: 8 },
  trail_50k: { min: 7, max: 8, challengeMax: 9 },
  trail_100k: { min: 9, max: 10, challengeMax: 10 },
};

const experienceNudge: Record<RunnerExperience, number> = {
  beginner: -1,
  foundation: 0,
  intermediate: 0,
  advanced: 1,
  elite: 2,
};

const overseasRegions: RaceRegion[] = ["asia", "europe", "north_america", "other_overseas"];

function levelNumber(level: RaceCategory["difficultyLevel"]) {
  return Number(level.replace("L", ""));
}

function inferAbilityRange(profile: RunnerProfile) {
  const base = completedRaceRanges[profile.longestCompletedRace];
  const nudge = experienceNudge[profile.runnerExperience];
  return {
    min: Math.max(1, Math.min(10, base.min + nudge)),
    max: Math.max(1, Math.min(10, base.max + nudge)),
    challengeMax: Math.max(1, Math.min(10, base.challengeMax + nudge)),
  };
}

function typePriority(raceType: RaceType, targetType: RunnerTargetRaceType) {
  const index = targetTypeRules[targetType].indexOf(raceType);
  return index === -1 ? 99 : index;
}

function isAllowedType(raceType: RaceType, targetType: RunnerTargetRaceType) {
  return targetTypeRules[targetType].includes(raceType);
}

function isOverseasRegion(region: RaceRegion) {
  return overseasRegions.includes(region);
}

function matchesRegionPreference(race: Race, preference: RegionPreference) {
  if (preference === "nationwide") return !isOverseasRegion(race.region);
  if (preference === "overseas") return isOverseasRegion(race.region);
  return race.region === preference;
}

function isAllowedByTravelScope(race: Race, profile: RunnerProfile) {
  if (profile.travelScope === "overseas") return true;
  if (profile.travelScope === "nationwide") return !isOverseasRegion(race.region);
  return matchesRegionPreference(race, profile.regionPreference);
}

function scoreType(race: Race, profile: RunnerProfile) {
  const priority = typePriority(race.type, profile.targetRaceType);
  if (priority === 0) return 25;
  if (priority === 1) return 16;
  return 8;
}

function scoreDistance(category: RaceCategory, profile: RunnerProfile) {
  const diff = Math.abs(category.distanceKm - profile.targetDistance);
  if (diff <= 1) return 20;
  if (diff <= 10) return 14;
  if (diff <= 25) return 8;
  return 0;
}

function scoreAbility(category: RaceCategory, profile: RunnerProfile) {
  const level = levelNumber(category.difficultyLevel);
  const range = inferAbilityRange(profile);
  if (level >= range.min && level <= range.max) return 30;
  if (level <= range.challengeMax) return 18;
  return 0;
}

function scoreRegion(race: Race, profile: RunnerProfile) {
  if (profile.regionPreference === "nationwide") return 10;
  if (profile.regionPreference === "overseas") return isOverseasRegion(race.region) ? 15 : 4;
  if (race.region === profile.regionPreference) return 15;
  if (profile.travelScope === "nationwide" && !isOverseasRegion(race.region)) return 8;
  if (profile.travelScope === "overseas") return 6;
  return 0;
}

function scoreTags(race: Race, category: RaceCategory, profile: RunnerProfile) {
  const wanted = new Set<RaceTag>(targetTypeTags[profile.targetRaceType]);
  if (profile.isFirstTrail) {
    wanted.add("FIRST_TRAIL");
    wanted.add("BEGINNER");
    wanted.add("MODERATE");
  }
  let score = Math.min(8, race.tags.filter((tag) => wanted.has(tag)).length * 2);
  if (profile.isFirstTrail && category.beginnerFriendly) score += 2;
  if (profile.halfMarathonPB || profile.marathonPB) score += 2;
  return Math.min(10, score);
}

function makeConclusion(race: Race, category: RaceCategory, profile: RunnerProfile) {
  if (profile.targetRaceType === "trail" && profile.isFirstTrail) {
    return "适合作为你的第一场越野赛";
  }
  if (profile.targetDistance === 30 && profile.longestCompletedRace === "half_marathon") {
    return "适合从半马走向 30KM 越野";
  }
  if (profile.targetDistance === 50 && profile.longestCompletedRace === "trail_30k") {
    return "适合从 30KM 越野进阶到 50KM";
  }
  if (profile.targetRaceType === "marathon" && profile.longestCompletedRace === "half_marathon") {
    return "适合作为你的首马目标赛事";
  }
  if (profile.targetRaceType === "utmb") {
    return "适合作为 UTMB 积分积累赛事";
  }
  if (["trail", "ultra_trail"].includes(race.type) && category.distanceKm >= 50) {
    return "适合从中距离越野走向更长距离挑战";
  }
  return "适合作为你下一阶段的比赛选择";
}

function makeReasons(race: Race, category: RaceCategory, profile: RunnerProfile) {
  const reasons: string[] = [];
  const level = levelNumber(category.difficultyLevel);
  const range = inferAbilityRange(profile);

  reasons.push("赛事类型符合你的目标方向。");

  if (Math.abs(category.distanceKm - profile.targetDistance) <= 10) {
    reasons.push("组别距离接近你的目标距离。");
  }

  if (level >= range.min && level <= range.max) {
    reasons.push("难度落在你的当前能力范围内。");
  } else if (level <= range.challengeMax) {
    reasons.push("难度略高于当前能力区间，可作为挑战目标。");
  }

  if (profile.regionPreference === "nationwide" || profile.regionPreference === "overseas" || race.region === profile.regionPreference) {
    reasons.push("地区符合你的参赛偏好。");
  }

  if (profile.halfMarathonPB || profile.marathonPB) {
    reasons.push("已参考你的近期成绩。");
  }

  if (profile.isFirstTrail && category.beginnerFriendly) {
    reasons.push("更适合作为入门越野选择。");
  }

  return reasons.slice(0, 4);
}

function makeRiskTip(category: RaceCategory, profile: RunnerProfile) {
  const tips: string[] = [];
  const level = levelNumber(category.difficultyLevel);
  const range = inferAbilityRange(profile);

  if (level > range.max) {
    tips.push("这场比赛略高于你当前能力区间，建议作为挑战目标，并提前准备专项训练。");
  }
  if (profile.isFirstTrail && level >= 5) {
    tips.push("首次越野建议重点准备爬升、下坡、补给和装备。");
  }
  if (!category.beginnerFriendly) {
    tips.push("这场比赛不适合作为完全新手的第一场比赛。");
  }
  if (profile.targetDistance >= 50) {
    tips.push("长距离赛事对耐力、补给和恢复要求较高，建议确认近期训练量后再报名。");
  }
  if (tips.length === 0) {
    tips.push("请结合近期训练量、伤病情况和赛事官网关门时间，再决定是否报名。");
  }

  return `风险提示：${tips.join("")}`;
}

export function getRecommendations(profile: RunnerProfile): RecommendationResult[] {
  return races
    .flatMap((race) =>
      race.categories.map((category) => {
        const level = levelNumber(category.difficultyLevel);
        const abilityRange = inferAbilityRange(profile);
        const typeBlock = !isAllowedType(race.type, profile.targetRaceType);
        const travelBlock = !isAllowedByTravelScope(race, profile);
        const abilityBlock = level > abilityRange.challengeMax;
        const firstTrailBlock = profile.isFirstTrail && ["trail", "ultra_trail", "utmb"].includes(race.type) && level >= 8;

        if (typeBlock || travelBlock || abilityBlock || firstTrailBlock) {
          return null;
        }

        const score =
          scoreType(race, profile) +
          scoreDistance(category, profile) +
          scoreAbility(category, profile) +
          scoreRegion(race, profile) +
          scoreTags(race, category, profile);

        return {
          race,
          category,
          score: Math.max(0, Math.min(100, Math.round(score))),
          conclusion: makeConclusion(race, category, profile),
          reasons: makeReasons(race, category, profile),
          riskTip: makeRiskTip(category, profile),
        };
      }),
    )
    .filter((result): result is RecommendationResult => result !== null)
    .sort((a, b) => typePriority(a.race.type, profile.targetRaceType) - typePriority(b.race.type, profile.targetRaceType) || b.score - a.score)
    .slice(0, 5);
}
