import type { RaceType } from "../types/event";
import type { First50Candidate, First50ScoreBreakdown } from "../types/first50";

export const FIRST50_SCORING_DATE = "2026-07-31";

export type First50SourceCategory = {
  categoryName: string | null;
  distanceKm: number | null;
  elevationGain: number | null;
  registrationFee: number | null;
  cutoffTime?: string | null;
  categoryRegistrationUrl?: string | null;
};

export type First50SourceRace = {
  id: string;
  name: string | null;
  type: RaceType | string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  raceDate: string | null;
  registrationStatus: string | null;
  registrationUrl: string | null;
  sourceUrl: string | null;
  categories: First50SourceCategory[];
  sourceIds: string[];
  confidence: number | null;
  missingFields?: string[];
};

export type First50CandidateAnalysis = {
  candidate: First50Candidate;
  advantages: string[];
  issues: string[];
  recommendedPilotRole: "trail_depth" | "road_search" | "commercial_travel" | "decision_complexity" | "data_repair";
  shouldEnterNextStage: boolean;
};

export function buildFirst50Candidate(record: First50SourceRace): First50CandidateAnalysis {
  const raceType = inferRaceType(record);
  const scoreBreakdown = scoreFirst50Candidate(record, raceType);
  const totalScore = sumScore(scoreBreakdown);
  const completeness = getExistingDataCompleteness(record);
  const sourceQuality = getSourceQuality(record);
  const issues = getIssues(record);
  const advantages = getAdvantages(record, scoreBreakdown, raceType);

  const candidate: First50Candidate = {
    raceId: record.id,
    sourceRecordId: record.id,
    name: record.name ?? record.id,
    raceName: record.name ?? record.id,
    raceType,
    location: {
      province: record.province,
      city: record.city,
      district: record.district,
      text: formatLocation(record),
    },
    raceDate: record.raceDate,
    categoryCount: record.categories.length,
    existingDataCompleteness: completeness,
    sourceQuality,
    status: totalScore >= 65 ? "candidate" : "deferred",
    scoreBreakdown,
    scores: scoreBreakdown,
    totalScore,
    reason: buildReason(scoreBreakdown, advantages),
    biggestGap: issues[0] ?? null,
    estimatedCompletionCost: estimateCompletionCost(record),
    owner: "manual",
    reviewStatus: "pending",
    updatedAt: FIRST50_SCORING_DATE,
  };

  return {
    candidate,
    advantages,
    issues,
    recommendedPilotRole: inferPilotRole(record, scoreBreakdown, raceType),
    shouldEnterNextStage: totalScore >= 65,
  };
}

export function scoreFirst50Candidate(record: First50SourceRace, raceType = inferRaceType(record)): First50ScoreBreakdown {
  return {
    runnerAttention: scoreRunnerAttention(record, raceType),
    searchValue: scoreSearchValue(record, raceType),
    commercialValue: scoreCommercialValue(record, raceType),
    decisionComplexity: scoreDecisionComplexity(record, raceType),
    dataCompleteness: scoreDataCompleteness(record),
    contentDifficulty: 0,
  };
}

export function sumScore(score: First50ScoreBreakdown) {
  return Object.values(score).reduce((sum, value) => sum + value, 0);
}

export function inferRaceType(record: First50SourceRace): RaceType {
  const name = record.name ?? "";
  const maxDistance = Math.max(...record.categories.map((category) => category.distanceKm ?? 0), 0);
  const maxElevation = Math.max(...record.categories.map((category) => category.elevationGain ?? 0), 0);
  if (/越野|跑山|山径|穿越|trail|贡嘎|崇礼|柴古|莫干|武功山|168|山野/i.test(name) || maxElevation >= 500) {
    return maxDistance >= 50 ? "ultra_trail" : "trail";
  }
  if (/半程|半马/.test(name)) return "half_marathon";
  if (/马拉松/.test(name) || record.categories.some((category) => (category.distanceKm ?? 0) >= 40 && (category.distanceKm ?? 0) < 50)) return "marathon";
  if (record.type === "marathon" || record.type === "half_marathon" || record.type === "trail" || record.type === "ultra_trail") return record.type;
  return "other";
}

export function getExistingDataCompleteness(record: First50SourceRace) {
  const hasLocation = Boolean(record.city || (record.province && !/不限地点|线上/.test(record.province)));
  const hasCategory = record.categories.length > 0 && record.categories.some((category) => category.categoryName);
  const hasDistance = record.categories.some((category) => Boolean(category.distanceKm));
  const hasRegistrationUrl = Boolean(record.registrationUrl || record.categories.some((category) => category.categoryRegistrationUrl));
  const hasStatus = Boolean(record.registrationStatus);
  const hasElevation = record.categories.some((category) => Boolean(category.elevationGain));
  const hasCutoff = record.categories.some((category) => Boolean(category.cutoffTime));
  const hasFee = record.categories.some((category) => Boolean(category.registrationFee));

  const p0Checks = [record.name, record.raceDate, hasLocation, hasCategory, hasDistance, hasRegistrationUrl, hasStatus];
  const p1Checks = [hasElevation, hasCutoff, hasFee, false];
  const p2Checks = [false, false, false];
  const p0 = Math.round((p0Checks.filter(Boolean).length / p0Checks.length) * 10);
  const p1 = Math.round((p1Checks.filter(Boolean).length / p1Checks.length) * 5);
  const p2 = Math.round((p2Checks.filter(Boolean).length / p2Checks.length) * 5);

  return {
    p0,
    p1,
    p2,
    summary: `P0 ${p0}/10, P1 ${p1}/5, P2 ${p2}/5`,
  };
}

function scoreRunnerAttention(record: First50SourceRace, raceType: RaceType) {
  const name = record.name ?? "";
  let score = 8;
  if (raceType === "ultra_trail") score += 8;
  if (raceType === "trail") score += 6;
  if (raceType === "marathon") score += 7;
  if (raceType === "half_marathon") score += 4;
  if (/崇礼168|六盘水马拉松|斯巴达|越山向海|武功山|莫干山|贡嘎|柴古|熊猫|香山|青海|贵阳|阿尔山|天山/i.test(name)) score += 10;
  if (/训练营|训练赛|亲子|青少年|线上|徒步|急救培训|彩色|荧光/.test(name)) score -= 7;
  if (record.categories.length >= 3) score += 3;
  return clamp(score, 0, 30);
}

function scoreSearchValue(record: First50SourceRace, raceType: RaceType) {
  const name = record.name ?? "";
  let score = 8;
  if (name.length >= 8) score += 4;
  if (raceType === "marathon" || raceType === "ultra_trail") score += 5;
  if (/马拉松|越野|跑山|168|100|50K|斯巴达|香山|六盘水|崇礼|武功山|莫干山|贡嘎|柴古|阿尔山|天山/i.test(name)) score += 8;
  if (/线上|培训|亲子|青少年|Colorful|荧光|徒步/.test(name)) score -= 5;
  return clamp(score, 0, 25);
}

function scoreCommercialValue(record: First50SourceRace, raceType: RaceType) {
  let score = 5;
  const physicalLocation = Boolean(record.city && !/不限地点|线上/.test(record.province ?? ""));
  if (physicalLocation) score += 4;
  if (raceType === "trail" || raceType === "ultra_trail") score += 6;
  if (raceType === "marathon") score += 4;
  if (/贵州|云南|四川|青海|内蒙古|河北|吉林|新疆|西藏|海南|张家口|六盘水|贵阳|阿尔山|崇礼|甘孜|西湖|杭州/.test([record.province, record.city, record.district].filter(Boolean).join(" "))) score += 5;
  if (/线上|亲子|青少年|培训|荧光/.test(record.name ?? "")) score -= 5;
  return clamp(score, 0, 20);
}

function scoreDecisionComplexity(record: First50SourceRace, raceType: RaceType) {
  let score = 5;
  const maxDistance = Math.max(...record.categories.map((category) => category.distanceKm ?? 0), 0);
  const hasTrailFacts = record.categories.some((category) => category.elevationGain || category.cutoffTime);
  const hasMultipleCategories = record.categories.length >= 3;

  if (raceType === "marathon" || raceType === "half_marathon") score = 8;
  if (raceType === "trail" || raceType === "ultra_trail") score = 12;
  if (raceType === "ultra_trail" || maxDistance >= 50) score += 2;
  if (hasTrailFacts) score += 1;
  if (hasMultipleCategories) score += 1;
  if (/贡嘎|崇礼|天山|阿尔山|西湖|高海拔|冰川|山径|跑山|穿越/i.test(record.name ?? "")) score += 1;

  return clamp(score, 5, 15);
}

function scoreDataCompleteness(record: First50SourceRace) {
  const completeness = getExistingDataCompleteness(record);
  return clamp(Math.round(completeness.p0 * 0.7 + completeness.p1 * 0.6), 0, 10);
}

function getSourceQuality(record: First50SourceRace) {
  const sourceIds = record.sourceIds ?? [];
  const confidence = record.confidence ?? null;
  const hasMultipleSources = sourceIds.length > 1;
  const hasRegistrationSource = Boolean(record.registrationUrl || record.categories.some((category) => category.categoryRegistrationUrl));
  const parts = [
    sourceIds.length ? `sources: ${sourceIds.join(", ")}` : "sources unknown",
    confidence === null ? "confidence unknown" : `confidence ${confidence}`,
    hasMultipleSources ? "multi-source" : "single-source",
    hasRegistrationSource ? "registration path present" : "registration path weak",
  ];
  return {
    sourceIds,
    confidence,
    summary: parts.join("; "),
  };
}

function getAdvantages(record: First50SourceRace, score: First50ScoreBreakdown, raceType: RaceType) {
  const advantages: string[] = [];
  if (score.runnerAttention >= 22) advantages.push("跑者认知或赛事品牌信号较强");
  if (score.searchValue >= 20) advantages.push("赛事名和类型具备明确搜索价值");
  if (score.commercialValue >= 15) advantages.push("住宿、交通、装备或旅行商业场景较强");
  if (score.decisionComplexity >= 13) advantages.push("用户报名决策复杂，需要 RaceNext 提供判断");
  if (score.dataCompleteness >= 8) advantages.push("现有 P0/P1 字段基础较好");
  if (raceType === "trail" || raceType === "ultra_trail") advantages.push("可验证越野赛事高决策成本场景");
  return advantages.slice(0, 4);
}

function getIssues(record: First50SourceRace) {
  const issues: string[] = [];
  if (!record.raceDate) issues.push("缺少比赛日期");
  if (!record.city && !record.province) issues.push("缺少明确举办地点");
  if (!record.registrationUrl && !record.categories.some((category) => category.categoryRegistrationUrl)) issues.push("报名入口不足");
  if (!record.categories.some((category) => category.distanceKm)) issues.push("组别距离不足");
  if (isTrailLike(record) && !record.categories.some((category) => category.elevationGain)) issues.push("越野爬升数据不足");
  if (isTrailLike(record) && !record.categories.some((category) => category.cutoffTime)) issues.push("关门时间不足");
  if (!record.categories.some((category) => category.registrationFee)) issues.push("报名费用不足");
  if (!issues.length) issues.push("官方来源校验和路线信息仍需补充");
  return issues;
}

function buildReason(score: First50ScoreBreakdown, advantages: string[]) {
  if (advantages.length) return advantages.join("；");
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best ? `当前候选主要优势来自 ${best[0]}。` : "当前数据不足，需要人工复核。";
}

function estimateCompletionCost(record: First50SourceRace): "low" | "medium" | "high" {
  const issues = getIssues(record).length;
  const hasRegistration = Boolean(record.registrationUrl || record.categories.some((category) => category.categoryRegistrationUrl));
  const hasDistance = record.categories.some((category) => category.distanceKm);
  if (issues <= 2 && hasRegistration && hasDistance) return "low";
  if (issues <= 4) return "medium";
  return "high";
}

function inferPilotRole(record: First50SourceRace, score: First50ScoreBreakdown, raceType: RaceType): First50CandidateAnalysis["recommendedPilotRole"] {
  if ((raceType === "trail" || raceType === "ultra_trail") && score.decisionComplexity >= 13) return "decision_complexity";
  if ((raceType === "trail" || raceType === "ultra_trail") && score.dataCompleteness >= 8) return "trail_depth";
  if (raceType === "marathon" && score.searchValue >= 20) return "road_search";
  if (score.commercialValue >= 15) return "commercial_travel";
  return "data_repair";
}

function formatLocation(record: Pick<First50SourceRace, "province" | "city" | "district">) {
  return [record.province, record.city, record.district].filter(Boolean).join(" · ") || null;
}

function isTrailLike(record: First50SourceRace) {
  const raceType = inferRaceType(record);
  return raceType === "trail" || raceType === "ultra_trail";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
