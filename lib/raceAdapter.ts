import { getRaceSourceRecords } from "@/lib/raceDataSource";
import type { MergedConnectorRecord } from "@/types/sourceRecord";

export type RaceCardType = "marathon" | "half_marathon" | "trail" | "ultra_trail" | "other";
export type RaceDifficulty = "beginner" | "intermediate" | "challenge" | "high_challenge" | "unknown";
export type RaceRegistrationStatus =
  | "registration_open"
  | "upcoming"
  | "lottery"
  | "closed"
  | "racing"
  | "finished"
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
  | "overseas"
  | "unknown";

export type RaceCardViewModel = {
  id: string;
  name: string;
  type: RaceCardType;
  province: string | null;
  city: string | null;
  district: string | null;
  region: RaceRegion;
  raceDate: string | null;
  month: number | null;
  dateText: string;
  countdownText: string;
  registrationStatus: RaceRegistrationStatus;
  registrationStatusText: string;
  registrationUrl: string | null;
  sourceUrl: string | null;
  coverImage: string | null;
  categories: Array<{
    name: string;
    distanceKm: number | null;
    elevationGain: number | null;
    cutoffTime: string | null;
    registrationFee: number | null;
    registrationUrl?: string | null;
  }>;
  distancesText: string;
  elevationText: string;
  priceText: string;
  feeMainText: string;
  feeSubText: string;
  tags: string[];
  sourceIds: string[];
  confidence: number;
  summary: string;
  difficulty: RaceDifficulty;
  difficultyText: string;
};

export type RecommendationViewModel = {
  race: RaceCardViewModel;
  persona: string;
  matchScore: number;
  reasons: string[];
  riskTip: string;
};

export type RunnerStage = "any" | "beginner" | "half_marathon" | "marathon" | "trail" | "advanced";
export type RecommendationGoal = "any" | "first_half" | "first_marathon" | "first_trail" | "challenge_50k" | "challenge_100k" | "scenic_trail";
export type RecommendationDistance =
  | "any"
  | "lte30"
  | "30_50"
  | "50_100"
  | "gt100";
export type RegistrationPreference = "actionable" | "any";

export type RecommendationInputProfile = {
  stage: RunnerStage;
  goal: RecommendationGoal;
  targetDistance: RecommendationDistance;
  region: RaceRegion | "all";
  registrationPreference: RegistrationPreference;
};

export const raceTypeLabels: Record<RaceCardType, string> = {
  marathon: "马拉松",
  half_marathon: "半马",
  trail: "越野",
  ultra_trail: "超级越野",
  other: "其他",
};

export const regionLabels: Record<RaceRegion, string> = {
  east_china: "华东",
  south_china: "华南",
  north_china: "华北",
  central_china: "华中",
  southwest_china: "西南",
  northwest_china: "西北",
  northeast_china: "东北",
  hongkong_macao_taiwan: "港澳台",
  overseas: "海外",
  unknown: "未知",
};

export const difficultyLabels: Record<RaceDifficulty, string> = {
  beginner: "新手友好",
  intermediate: "进阶",
  challenge: "挑战",
  high_challenge: "高挑战",
  unknown: "难度待评估",
};

export const registrationStatusLabels: Record<RaceRegistrationStatus, string> = {
  registration_open: "报名中",
  upcoming: "即将开放",
  lottery: "抽签中",
  closed: "已截止",
  racing: "比赛中",
  finished: "已结束",
  unknown: "信息待更新",
};

export const goalLabels: Record<RecommendationGoal, string> = {
  any: "不限",
  first_half: "首个半马",
  first_marathon: "首个全马",
  first_trail: "首个越野",
  challenge_50k: "挑战 50K",
  challenge_100k: "挑战 100K",
  scenic_trail: "风景越野",
};

export const distanceLabels: Record<RecommendationDistance, string> = {
  any: "不限",
  lte30: "≤30KM",
  "30_50": "30KM - 50KM",
  "50_100": "50KM - 100KM",
  gt100: "＞100KM",
};

export function getLockedTargetDistance(goal: RecommendationGoal): RecommendationDistance | null {
  const lockedDistances: Partial<Record<RecommendationGoal, RecommendationDistance>> = {
    first_half: "lte30",
    first_marathon: "30_50",
    challenge_50k: "50_100",
    challenge_100k: "gt100",
  };
  return lockedDistances[goal] ?? null;
}

export function getRaceCards(): RaceCardViewModel[] {
  const records = getRaceSourceRecords();
  return records.map(toRaceCardViewModel).sort(sortByDateThenConfidence);
}

export const defaultRecommendationProfile: RecommendationInputProfile = {
  stage: "any",
  goal: "any",
  targetDistance: "any",
  region: "all",
  registrationPreference: "actionable",
};

export function getRecommendationCards(races = getRaceCards(), profile: RecommendationInputProfile = defaultRecommendationProfile): RecommendationViewModel[] {
  const scored = races
    .filter(isValuableFutureRace)
    .filter((race) => matchesTargetGoalHardFilter(race, profile))
    .map((race) => scoreRecommendation(race, profile))
    .sort((a, b) => b.matchScore - a.matchScore || getRaceDatePriority(a.race) - getRaceDatePriority(b.race));

  const strongMatches = scored.filter((item) => item.matchScore >= 70);
  return strongMatches.slice(0, 10);
}

function toRaceCardViewModel(record: MergedConnectorRecord): RaceCardViewModel {
  const categories = record.categories.map((category) => ({
    name: category.categoryName ?? "未命名组别",
    distanceKm: category.distanceKm,
    elevationGain: category.elevationGain,
    cutoffTime: category.cutoffTime,
    registrationFee: category.registrationFee,
    registrationUrl: category.categoryRegistrationUrl,
  }));
  const type = inferRaceType(record.normalizedName, categories);
  const region = inferRegion(record.province);
  const difficulty = inferDifficulty(type, categories);
  const raceDate = record.raceDate;
  const registrationStatus = normalizeRegistrationStatus(record.registrationStatus, record.registrationUrl, raceDate);
  const feeInfo = formatFeeInfo(categories);

  return {
    id: record.id,
    name: readableName(record),
    type,
    province: record.province,
    city: record.city,
    district: record.district,
    region,
    raceDate,
    month: raceDate ? Number(raceDate.slice(5, 7)) : null,
    dateText: formatRaceDate(raceDate, record.editionYear),
    countdownText: formatCountdown(raceDate),
    registrationStatus,
    registrationStatusText: registrationStatusLabels[registrationStatus],
    registrationUrl: record.registrationUrl,
    sourceUrl: record.sources[0]?.sourceUrl ?? null,
    coverImage: record.coverImage ?? null,
    categories,
    distancesText: formatDistances(categories),
    elevationText: formatElevation(categories),
    priceText: formatPrice(categories),
    feeMainText: feeInfo.main,
    feeSubText: feeInfo.sub,
    tags: buildTags(difficulty),
    sourceIds: record.sourceIds,
    confidence: record.confidence,
    summary: buildSummary(record, categories),
    difficulty,
    difficultyText: difficultyLabels[difficulty],
  };
}

function inferRaceType(name: string, categories: RaceCardViewModel["categories"]): RaceCardType {
  const max = maxDistance({ categories } as RaceCardViewModel);
  const distances = categories.map((category) => category.distanceKm).filter((value): value is number => Boolean(value));
  if (/越野|跑山|山径|trail|贡嘎|FUGA/i.test(name)) return max >= 50 ? "ultra_trail" : "trail";
  if (distances.some((distance) => distance >= 40 && distance < 50)) return "marathon";
  if (distances.length && Math.max(...distances) <= 22) return "half_marathon";
  if (/半程|半马/.test(name)) return "half_marathon";
  if (/马拉松/.test(name)) return "marathon";
  return "other";
}

function inferDifficulty(type: RaceCardType, categories: RaceCardViewModel["categories"]): RaceDifficulty {
  const max = Math.max(...categories.map((category) => category.distanceKm ?? 0), 0);
  if (type === "half_marathon") return "beginner";
  if (type === "marathon") return "intermediate";
  if (["trail", "ultra_trail"].includes(type) && max >= 100) return "high_challenge";
  if (["trail", "ultra_trail"].includes(type) && max >= 50) return "challenge";
  if (["trail", "ultra_trail"].includes(type)) return "intermediate";
  return "unknown";
}

function inferRegion(province: string | null): RaceRegion {
  if (!province) return "unknown";
  if (/上海|江苏|浙江|安徽|福建|江西|山东/.test(province)) return "east_china";
  if (/广东|广西|海南/.test(province)) return "south_china";
  if (/北京|天津|河北|山西|内蒙古/.test(province)) return "north_china";
  if (/河南|湖北|湖南/.test(province)) return "central_china";
  if (/重庆|四川|贵州|云南|西藏/.test(province)) return "southwest_china";
  if (/陕西|甘肃|青海|宁夏|新疆/.test(province)) return "northwest_china";
  if (/辽宁|吉林|黑龙江/.test(province)) return "northeast_china";
  if (/香港|澳门|台湾/.test(province)) return "hongkong_macao_taiwan";
  if (/澳大利亚|美国|日本|韩国|欧洲|海外/.test(province)) return "overseas";
  return "unknown";
}

function normalizeRegistrationStatus(value: string | null, registrationUrl: string | null, raceDate: string | null): RaceRegistrationStatus {
  if (raceDate && isToday(raceDate)) return "racing";
  if (registrationUrl) return "registration_open";
  if (/lottery|抽签|摇号/.test(value ?? "")) return "lottery";
  if (/waiting|候补|等候/.test(value ?? "")) return "registration_open";
  if (/closed|截止|关闭/.test(value ?? "")) return "closed";
  if (/finished|结束|cancel|取消/.test(value ?? "")) return "finished";
  if (raceDate && isPastDate(raceDate)) return "finished";
  if (!value || value === "1") return "unknown";
  if (/open|报名|点此/.test(value)) return "registration_open";
  if (/upcoming|即将/.test(value)) return "upcoming";
  return "unknown";
}

function readableName(record: MergedConnectorRecord) {
  return record.originalNames[0] ?? record.normalizedName;
}

function formatRaceDate(date: string | null, year: number | null) {
  if (!date) return year ? `${year}年，日期待更新` : "比赛日期待更新";
  const parsed = new Date(`${date}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][parsed.getDay()];
  return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, "0")}.${String(parsed.getDate()).padStart(2, "0")} ${weekday}`;
}

function formatCountdown(date: string | null) {
  if (!date) return "具体日期待更新";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00+08:00`);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays > 0) return `距离开赛 ${diffDays} 天`;
  if (diffDays === 0) return "今日开赛";
  return "已结束";
}

function formatDistances(categories: RaceCardViewModel["categories"]) {
  const distances = categories.map((category) => category.distanceKm).filter((value): value is number => Boolean(value));
  if (!distances.length) return "距离待更新";
  return unique(distances).map((distance) => `${Number.isInteger(distance) ? distance : distance.toFixed(1)}KM`).join(" / ");
}

function formatElevation(categories: RaceCardViewModel["categories"]) {
  const gains = categories.map((category) => category.elevationGain).filter((value): value is number => Boolean(value));
  if (!gains.length) return "爬升待更新";
  return unique(gains).map((gain) => `${gain}m`).join(" / ");
}

function formatPrice(categories: RaceCardViewModel["categories"]) {
  const fees = categories.map((category) => category.registrationFee).filter((value): value is number => Boolean(value));
  if (!fees.length) return "报名信息待更新";
  const min = Math.min(...fees);
  const max = Math.max(...fees);
  return min === max ? `¥${min}` : `¥${min} - ¥${max}`;
}

function formatFeeInfo(categories: RaceCardViewModel["categories"]) {
  const fees = categories.map((category) => category.registrationFee).filter((value): value is number => Boolean(value));
  const categoryCount = categories.length;
  const categoryText = categoryCount ? `${categoryCount} 个组别` : "";

  if (fees.length) {
    return {
      main: `¥${Math.min(...fees)} 起`,
      sub: categoryText,
    };
  }

  if (categoryCount) {
    return {
      main: categoryText,
      sub: "",
    };
  }

  return {
    main: "报名信息待更新",
    sub: "",
  };
}

function buildTags(difficulty: RaceDifficulty) {
  const tags = [difficultyLabels[difficulty]];
  return unique(tags.filter((tag) => tag && tag !== "未知" && tag !== "难度待评估")).slice(0, 2);
}

function buildSummary(record: MergedConnectorRecord, categories: RaceCardViewModel["categories"]) {
  const parts = [
    record.city ? `${record.city}${record.district ? ` ${record.district}` : ""}` : null,
    categories.length ? `${categories.length} 个组别` : null,
    record.registrationUrl ? "报名信息已接入" : "报名信息待更新",
  ].filter(Boolean);
  return parts.join(" · ") || "数据仍在完善中，请以赛事官方信息为准。";
}

export function isValuableFutureRace(race: RaceCardViewModel) {
  if (race.registrationStatus === "closed" || race.registrationStatus === "finished") return false;
  if (race.raceDate) return !isPastRace(race);
  return ["registration_open", "upcoming", "lottery"].includes(race.registrationStatus);
}

function matchesTargetGoalHardFilter(race: RaceCardViewModel, profile: RecommendationInputProfile) {
  if (profile.goal === "any") return true;
  if (profile.goal === "first_half") return hasCategoryInDistanceRange(race, "lte30");
  if (profile.goal === "first_marathon") return hasCategoryInDistanceRange(race, "30_50");
  if (profile.goal === "first_trail" || profile.goal === "scenic_trail") return isTrailRace(race);
  if (profile.goal === "challenge_50k") return isTrailRace(race) && hasCategoryInDistanceRange(race, "50_100");
  if (profile.goal === "challenge_100k") return isTrailRace(race) && hasCategoryInDistanceRange(race, "gt100");
  return true;
}

function isTrailRace(race: Pick<RaceCardViewModel, "type">) {
  return race.type === "trail" || race.type === "ultra_trail";
}

function hasCategoryInDistanceRange(race: Pick<RaceCardViewModel, "categories">, target: RecommendationDistance) {
  return race.categories.some((category) => Boolean(category.distanceKm && isDistanceInTargetRange(category.distanceKm, target)));
}

function scoreRecommendation(race: RaceCardViewModel, profile: RecommendationInputProfile): RecommendationViewModel {
  const closestDistance = profile.targetDistance === "any" ? null : closestCategoryDistance(race, getTargetDistanceNumber(profile.targetDistance));
  const distanceScore =
    profile.targetDistance === "any" || (profile.stage === "any" && profile.goal === "any")
      ? getGeneralDistanceCompletenessScore(race)
      : getDistanceScoreForRace(race, profile.targetDistance);
  const matchScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        getTypeScore(race, profile) +
          distanceScore +
          getStageFitScore(race, profile) +
          getRegionScore(race, profile) +
          getRegistrationScore(race, profile) +
          getCompletenessScore(race, profile),
      ),
    ),
  );

  return {
    race,
    persona: goalLabels[profile.goal],
    matchScore,
    reasons: buildRecommendationReasons(race, profile, closestDistance),
    riskTip: buildRiskTip(race, profile),
  };
}

function getTypeScore(race: RaceCardViewModel, profile: RecommendationInputProfile) {
  const trailTypes: RaceCardType[] = ["trail", "ultra_trail"];
  if (profile.goal === "any") return race.type === "other" ? 16 : 22;
  if (profile.goal === "first_half") return race.type === "half_marathon" ? 30 : race.type === "marathon" ? 12 : 0;
  if (profile.goal === "first_marathon") return race.type === "marathon" ? 30 : race.type === "half_marathon" ? 12 : 0;
  if (["first_trail", "challenge_50k", "challenge_100k", "scenic_trail"].includes(profile.goal)) return trailTypes.includes(race.type) ? 30 : 0;
  return 0;
}

function getGeneralDistanceCompletenessScore(race: RaceCardViewModel) {
  if (race.distancesText === "距离待更新") return 8;
  if (race.categories.length >= 2) return 22;
  return 18;
}

function getDistanceScoreForRace(race: RaceCardViewModel, target: RecommendationDistance) {
  const distances = race.categories.map((category) => category.distanceKm).filter((value): value is number => Boolean(value));
  if (!distances.length) return 10;
  if (isDistanceInterval(target)) {
    if (distances.some((distance) => isDistanceInTargetRange(distance, target))) return 25;
    const closest = closestCategoryDistance(race, getTargetDistanceNumber(target));
    return getDistanceScore(closest, target);
  }
  return getDistanceScore(closestCategoryDistance(race, getTargetDistanceNumber(target)), target);
}

function getDistanceScore(distance: number | null, target: RecommendationDistance) {
  if (!distance) return 10;
  if (target === "lte30") {
    if (distance <= 30) return 25;
    if (distance <= 50) return 16;
    if (distance <= 100) return 7;
    return 0;
  }
  if (target === "30_50") {
    if (distance > 30 && distance <= 50) return 25;
    if (distance > 20 && distance <= 60) return 16;
    if (distance <= 100) return 7;
    return 0;
  }
  if (target === "50_100") {
    if (distance > 50 && distance <= 100) return 25;
    if (distance > 40 && distance <= 120) return 16;
    if (distance >= 30) return 7;
    return 0;
  }
  if (target === "gt100") {
    if (distance > 100) return 25;
    if (distance >= 80) return 16;
    if (distance >= 50) return 7;
    return 0;
  }
  return 0;
}

function getStageFitScore(race: RaceCardViewModel, profile: RecommendationInputProfile) {
  const maxRaceDistance = maxDistance(race);
  if (profile.goal === "challenge_100k") return maxRaceDistance >= 90 && race.difficulty === "high_challenge" ? 15 : maxRaceDistance >= 50 ? 8 : 0;
  if (profile.goal === "challenge_50k") return maxRaceDistance >= 40 && maxRaceDistance < 100 ? 15 : maxRaceDistance >= 100 ? 6 : 4;
  if (profile.stage === "any" && profile.goal === "any") {
    if (race.difficulty === "unknown") return 6;
    if (race.difficulty === "high_challenge") return 8;
    return 12;
  }
  if (profile.stage === "beginner" || profile.goal === "first_half") return race.difficulty === "beginner" ? 15 : race.difficulty === "intermediate" ? 9 : 0;
  if (isTrailDebutIntent(profile)) {
    if (maxRaceDistance >= 100) return 0;
    return ["beginner", "intermediate"].includes(race.difficulty) ? 15 : race.difficulty === "challenge" ? 7 : 3;
  }
  if (profile.stage === "advanced") return ["challenge", "high_challenge"].includes(race.difficulty) ? 15 : 8;
  return race.difficulty === "unknown" ? 5 : 11;
}

function isTrailDebutIntent(profile: RecommendationInputProfile) {
  return profile.stage !== "trail" && profile.goal === "first_trail";
}

function getRegionScore(race: RaceCardViewModel, profile: RecommendationInputProfile) {
  if (profile.region === "all") return 8;
  return race.region === profile.region ? 10 : 0;
}

function getRegistrationScore(race: RaceCardViewModel, profile: RecommendationInputProfile) {
  const actionable = Boolean(race.registrationUrl || race.sourceUrl);
  if (profile.registrationPreference === "any") {
    if (race.registrationUrl) return 10;
    if (race.sourceUrl) return 7;
    return race.registrationStatus === "unknown" ? 3 : 5;
  }
  if (race.registrationStatus === "registration_open" && race.registrationUrl) return 10;
  if (race.sourceUrl) return 6;
  if (race.registrationStatus === "unknown") return 2;
  return 0;
}

function getCompletenessScore(race: RaceCardViewModel, profile: RecommendationInputProfile) {
  let score = 10;
  if (!race.raceDate) score -= 2;
  if (!race.registrationUrl && !race.sourceUrl) score -= 2;
  if (race.registrationStatus === "unknown") score -= 1;
  if (race.distancesText === "距离待更新") score -= 4;
  if (["first_trail", "challenge_50k", "challenge_100k", "scenic_trail"].includes(profile.goal) && race.elevationText === "爬升待更新") score -= 2;
  if (!race.categories.length) score -= 2;
  return Math.max(0, score);
}

function buildRecommendationReasons(race: RaceCardViewModel, profile: RecommendationInputProfile, closestDistance: number | null) {
  const reasons: string[] = [];
  const maxRaceDistance = maxDistance(race);
  const isTrail = ["trail", "ultra_trail"].includes(race.type);
  const countdownDays = getCountdownDays(race.countdownText);

  if (profile.stage === "any" && profile.goal === "any") {
    if (race.registrationUrl) reasons.push("有报名入口，可以进一步查看。");
    else if (race.sourceUrl) reasons.push("可先查看赛事来源页面，确认报名安排。");
    if (race.raceDate) reasons.push("比赛日期明确，便于安排行程。");
    if (race.distancesText !== "距离待更新" && race.categories.length) reasons.push("距离和组别信息较完整。");
    if (race.registrationStatus !== "unknown") reasons.push("报名状态清晰，便于判断是否行动。");
    if (countdownDays !== null && countdownDays > 60) reasons.push("距离比赛还有较长准备周期，适合安排系统训练。");
    return unique(reasons).slice(0, 3);
  }

  if (race.type === "half_marathon" && profile.goal === "first_half") reasons.push("≤30KM 区间适合作为首个半马目标。");
  if (race.type === "marathon" && profile.goal === "first_marathon") reasons.push("30KM - 50KM 区间覆盖全马目标，适合从半马进阶。");
  if (race.type === "marathon" && profile.stage === "half_marathon") reasons.push("路跑赛事结构清晰，方便从半马过渡到全马。");
  if (isTrail && profile.goal === "first_trail") reasons.push(maxRaceDistance >= 100 ? "距离偏长，不建议作为首次越野的唯一选择。" : "距离适合作为首次越野尝试。");
  if (profile.goal === "challenge_50k" && maxRaceDistance >= 40 && maxRaceDistance < 100) reasons.push("组别距离接近 50K，适合作为进阶挑战。");
  if (profile.goal === "challenge_100k" && maxRaceDistance >= 90) reasons.push("长距离组别匹配 100K 挑战目标。");
  if (profile.goal === "scenic_trail" && isTrail) reasons.push("越野路线更符合风景型赛事偏好。");
  if (closestDistance && isDistanceCloseToTarget(closestDistance, profile.targetDistance)) reasons.push("组别距离接近你的目标距离。");
  if (profile.region !== "all" && race.region === profile.region) reasons.push("所在地区符合你的偏好。");
  if (race.city) reasons.push(`比赛位于${race.city}，便于你提前评估交通和住宿。`);
  if (race.registrationUrl) reasons.push("报名信息完整，可以直接行动。");
  else if (race.sourceUrl) reasons.push("可先查看赛事来源页面，确认报名安排。");
  else if (race.registrationStatus === "unknown") reasons.push("报名信息仍不完整，适合作为观察候选。");
  if (race.categories.length >= 2) reasons.push(`${race.categories.length} 个组别可选，方便比较报名选择。`);
  if (isTrail && race.elevationText !== "爬升待更新") reasons.push("累计爬升信息有助于判断赛事难度。");
  if (isTrail && race.elevationText === "爬升待更新") reasons.push("爬升信息待补充，报名前建议查看官方信息。");
  if (countdownDays !== null && countdownDays <= 30) reasons.push("比赛时间较近，适合已有训练基础的跑者。");
  if (countdownDays !== null && countdownDays > 60) reasons.push("距离比赛还有较长准备周期，适合安排系统训练。");
  if (!race.raceDate) reasons.push("比赛日期待补充，建议先作为备选观察。");

  return unique(reasons).slice(0, 3);
}

function buildRiskTip(race: RaceCardViewModel, profile: RecommendationInputProfile) {
  const maxRaceDistance = maxDistance(race);
  if (maxRaceDistance >= 100 || profile.goal === "challenge_100k") {
    return "100K 越野对训练量、装备、补给和夜间能力要求较高，请谨慎评估后报名。";
  }
  if (["trail", "ultra_trail"].includes(race.type)) {
    return "请重点关注累计爬升、关门时间、强制装备和近期训练量，再决定是否报名。";
  }
  return "请结合近期训练量、伤病情况和赛事官方关门时间，再决定是否报名。";
}

function closestCategoryDistance(race: RaceCardViewModel, target: number) {
  const distances = race.categories.map((category) => category.distanceKm).filter((value): value is number => Boolean(value));
  if (!distances.length) return null;
  return distances.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
}

function getRaceDatePriority(race: RaceCardViewModel) {
  if (!race.raceDate) return Number.MAX_SAFE_INTEGER;
  const date = new Date(`${race.raceDate}T00:00:00+08:00`).getTime();
  return Number.isNaN(date) ? Number.MAX_SAFE_INTEGER : date;
}

function getTargetDistanceNumber(distance: RecommendationDistance) {
  if (distance === "any") return 0;
  if (distance === "lte30") return 30;
  if (distance === "30_50") return 40;
  if (distance === "50_100") return 75;
  if (distance === "gt100") return 120;
  return 0;
}

function isDistanceCloseToTarget(distance: number, target: RecommendationDistance) {
  if (target === "any") return false;
  if (isDistanceInterval(target)) return isDistanceInTargetRange(distance, target);
  return false;
}

function isDistanceInterval(target: RecommendationDistance) {
  return target === "lte30" || target === "30_50" || target === "50_100" || target === "gt100";
}

function isDistanceInTargetRange(distance: number, target: RecommendationDistance) {
  if (target === "lte30") return distance <= 30;
  if (target === "30_50") return distance > 30 && distance <= 50;
  if (target === "50_100") return distance > 50 && distance <= 100;
  if (target === "gt100") return distance > 100;
  return false;
}

function getCountdownDays(value: string) {
  const match = value.match(/距离开赛\s+(\d+)\s+天/);
  return match ? Number(match[1]) : null;
}

function maxDistance(race: Pick<RaceCardViewModel, "categories">) {
  return Math.max(...race.categories.map((category) => category.distanceKm ?? 0), 0);
}

function sortByDateThenConfidence(a: RaceCardViewModel, b: RaceCardViewModel) {
  const aTime = a.raceDate ? new Date(a.raceDate).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.raceDate ? new Date(b.raceDate).getTime() : Number.MAX_SAFE_INTEGER;
  return aTime - bTime || b.confidence - a.confidence;
}

function isPastRace(race: RaceCardViewModel) {
  if (!race.raceDate) return false;
  return isPastDate(race.raceDate);
}

function isPastDate(date: string) {
  const target = new Date(`${date}T23:59:59+08:00`);
  return target.getTime() < Date.now();
}

function isToday(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00+08:00`);
  target.setHours(0, 0, 0, 0);
  return target.getTime() === today.getTime();
}

function uniqueRecommendations(items: RecommendationViewModel[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.race.id)) return false;
    seen.add(item.race.id);
    return true;
  });
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
