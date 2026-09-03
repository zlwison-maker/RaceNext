import { getRecommendationCards } from "@/lib/raceAdapter";
import { getRaceSourceRecords } from "@/lib/raceDataSource";
import { getRaceEditorialContent } from "@/data/race-guides";
import { FIRST5_EVENT_IDS, findFirst5MvpEvent } from "@/data/events/first5-events";
import type { MvpAccommodationArea } from "@/data/events/first5-events";
import type { RaceEditorialContent } from "@/types/raceDetail";
import type { MergedConnectorRecord } from "@/types/sourceRecord";

export type DecisionCategory = {
  id: string;
  name: string;
  distanceKm: number | null;
  elevationGain: number | null;
  cutoffTime: string | null;
  fee: number | null;
  registrationUrl: string | null;
  oneLineVerdict: string | null;
  raceNextAdvice: string | null;
  recommendedFor: string[];
  notRecommendedFor: string[];
  aiGuide: {
    level: string;
    preparation: string;
    gear: string;
    caution: string;
    finish: string;
  } | null;
};

export type RaceDecisionPage = {
  id: string;
  analyticsEventId: string;
  name: string;
  type: "marathon" | "half_marathon" | "trail" | "ultra_trail" | "other";
  sourceUrl: string | null;
  registrationUrl: string | null;
  coverImage: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  venue: string | null;
  raceDate: string | null;
  dateText: string | null;
  registrationStatus: "registration_open" | "upcoming" | "lottery" | "closed" | "racing" | "finished" | "unknown";
  registrationStatusText: string;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  registrationCountdownText: string | null;
  raceCountdownText: string | null;
  categories: DecisionCategory[];
  accommodationAreas: MvpAccommodationArea[];
  editorialContent: RaceEditorialContent | null;
  faq: Array<{ question: string; answer: string }>;
  nextRaces: Array<{
    id: string;
    name: string;
    type: RaceDecisionPage["type"];
    coverImage: string | null;
    dateText: string | null;
    locationText: string | null;
    categoryText: string | null;
    registrationStatusText: string;
  }>;
  about: {
    introduction: string | null;
    history: string | null;
    organizer: string | null;
    officialLink: string | null;
  };
  seo: {
    title: string;
    description: string;
  };
};

const statusLabels: Record<RaceDecisionPage["registrationStatus"], string> = {
  registration_open: "报名中",
  upcoming: "即将开放",
  lottery: "抽签中",
  closed: "报名已截止",
  racing: "比赛进行中",
  finished: "比赛已结束",
  unknown: "报名信息待更新",
};

export function getRaceDecisionPages() {
  const records = getRaceSourceRecords();
  return records.map((record) => toRaceDecisionPage(record, records));
}

export function getRaceDecisionPage(slug: string) {
  return getRaceDecisionPages().find((page) => page.id === slug);
}

function toRaceDecisionPage(record: MergedConnectorRecord, allRecords: MergedConnectorRecord[]): RaceDecisionPage {
  const type = inferRaceType(record);
  const registrationStatus = calculateRegistrationStatus(record);
  const dateText = formatDate(record.raceDate);
  const locationText = formatLocation(record);
  const categories = record.categories
    .filter((category) => category.categoryName || category.distanceKm || category.registrationFee || category.categoryRegistrationUrl)
    .map((category, index) => {
      const decisionCategory: DecisionCategory = {
        id: `${record.id}-${index}`,
        name: category.categoryName ?? `组别 ${index + 1}`,
        distanceKm: category.distanceKm,
        elevationGain: category.elevationGain,
        cutoffTime: category.cutoffTime,
        fee: category.registrationFee,
        registrationUrl: category.categoryRegistrationUrl ?? record.registrationUrl,
        oneLineVerdict: buildOneLineVerdict(type, category.distanceKm, category.elevationGain),
        raceNextAdvice: buildRaceNextAdvice(type, category.distanceKm, category.elevationGain, category.cutoffTime),
        recommendedFor: buildRecommendedFor(type, category.distanceKm),
        notRecommendedFor: buildNotRecommendedFor(type, category.distanceKm, category.elevationGain),
        aiGuide: buildAiGuide(type, category.distanceKm, category.elevationGain, category.cutoffTime),
      };
      return decisionCategory;
    });

  const titleLocation = locationText ? `${locationText} · ` : "";
  const primaryCategoryText = formatCategorySummary(categories);
  const first5MvpEvent = findFirst5MvpEvent(record.id, readableName(record));
  const analyticsEventId = first5MvpEvent?.base.eventId ?? record.id;
  const isBeijingMarathon = record.id === "beijing-marathon";
  const isGongga100 = record.id === "kailas-gongga-100";
  const isHk100 = record.id === "hk100";
  const isShanghaiMarathon = record.id === "shanghai-marathon";
  const isXiamenMarathon = record.id === "xiamen-marathon";
  const editorialContent = getRaceEditorialContent(record.id);
  const name = readableName(record);

  return {
    id: record.id,
    analyticsEventId,
    name,
    type,
    sourceUrl: record.sources[0]?.sourceUrl ?? null,
    registrationUrl: record.registrationUrl,
    coverImage: record.coverImage ?? null,
    province: record.province,
    city: record.city,
    district: record.district,
    venue: record.venue,
    raceDate: record.raceDate,
    dateText,
    registrationStatus,
    registrationStatusText:
      (isBeijingMarathon || isXiamenMarathon) && record.registrationStatus ? record.registrationStatus : statusLabels[registrationStatus],
    registrationStartDate: null,
    registrationEndDate: null,
    registrationCountdownText: null,
    raceCountdownText: formatRaceCountdown(record.raceDate),
    categories,
    accommodationAreas: first5MvpEvent?.decision.accommodationAreas ?? [],
    editorialContent,
    faq: editorialContent
      ? []
      : buildFaq(name, registrationStatus, record.registrationUrl, record.sources[0]?.sourceUrl ?? null, primaryCategoryText),
    nextRaces: buildNextRaces(record, allRecords),
    about: {
      introduction: null,
      history: null,
      organizer: null,
      officialLink: record.sources[0]?.sourceUrl ?? null,
    },
    seo: {
      title: isBeijingMarathon
        ? "2026北京马拉松｜比赛时间、报名、住宿与参赛指南 - RaceNext"
        : isGongga100
          ? "2026凯乐石贡嘎100冰川极限挑战赛｜路线、爬升、住宿与参赛指南 - RaceNext"
          : isHk100
            ? "2027香港HK100越野赛｜比赛时间、路线、住宿与参赛指南 - RaceNext"
            : isShanghaiMarathon
              ? "2026上海马拉松｜比赛时间、报名、住宿与参赛指南 - RaceNext"
              : isXiamenMarathon
                ? "2027厦门马拉松｜比赛时间、报名、住宿与参赛指南 - RaceNext"
                : `${name}住宿指南与赛事信息 - RaceNext`,
      description: isBeijingMarathon
        ? "查看2026北京马拉松比赛时间、地点、报名状态及住宿建议，了解北马天安门起跑、赛道特点、PB潜力与真实跑者反馈，帮助你判断这场比赛是否适合自己。"
        : isGongga100
          ? "查看2026凯乐石贡嘎100冰川极限挑战赛时间、路线、爬升及住宿建议，了解100K高海拔垭口、冰川赛道、比赛难点与RaceNext策略判断，帮助你判断这场高山百公里是否适合自己。"
          : isHk100
            ? "查看2027香港HK100越野赛比赛时间、路线、爬升与住宿建议，了解港百后半程爬升、台阶、山海赛道、CP补给策略与真实跑者反馈，帮助你判断这场百公里越野是否适合自己。"
            : isShanghaiMarathon
              ? "查看2026上海马拉松比赛时间、地点、报名状态及住宿建议，了解上马赛道特点、PB潜力、城市体验与真实跑者反馈，帮助你判断这场比赛是否适合自己。"
              : isXiamenMarathon
                ? "查看2027厦门马拉松比赛时间、地点、报名状态、赛事特点及住宿建议。了解厦马海滨赛道、演武大桥、比赛体验与参赛准备，帮助跑者判断这场比赛是否适合自己。"
                : `${titleLocation}${dateText ?? "比赛日期待更新"}。${primaryCategoryText ? `${primaryCategoryText}。` : ""}查看报名状态、赛事组别与参赛住宿区域建议。`,
    },
  };
}

function inferRaceType(record: MergedConnectorRecord): RaceDecisionPage["type"] {
  const text = [record.normalizedName, ...record.originalNames].join(" ");
  const maxDistance = Math.max(...record.categories.map((category) => category.distanceKm ?? 0), 0);
  const maxElevation = Math.max(...record.categories.map((category) => category.elevationGain ?? 0), 0);
  if (/越野|跑山|山径|穿越|trail|贡嘎|崇礼|柴古|莫干|武功山|168/i.test(text) || maxElevation >= 500) return maxDistance >= 50 ? "ultra_trail" : "trail";
  if (/半程|半马/.test(text)) return "half_marathon";
  if (/马拉松/.test(text) || record.categories.some((category) => (category.distanceKm ?? 0) >= 40 && (category.distanceKm ?? 0) < 50)) return "marathon";
  return "other";
}

function calculateRegistrationStatus(record: MergedConnectorRecord): RaceDecisionPage["registrationStatus"] {
  if (record.raceDate && isSameDay(record.raceDate)) return "racing";
  if (record.raceDate && isPastDate(record.raceDate)) return "finished";
  if (record.registrationUrl || record.categories.some((category) => category.categoryRegistrationUrl)) return "registration_open";
  const value = record.registrationStatus ?? "";
  if (/lottery|抽签|摇号/.test(value)) return "lottery";
  if (/closed|截止|关闭/.test(value)) return "closed";
  if (/finished|结束/.test(value)) return "finished";
  if (/upcoming|即将/.test(value)) return "upcoming";
  if (/open|报名/.test(value)) return "registration_open";
  return "unknown";
}

function buildOneLineVerdict(type: RaceDecisionPage["type"], distanceKm: number | null, elevationGain: number | null) {
  if (!distanceKm && !elevationGain) return null;
  if ((type === "trail" || type === "ultra_trail") && distanceKm && elevationGain) {
    if (distanceKm >= 100) return "长距离高消耗越野组别，只适合有成熟百公里经验的跑者。";
    if (distanceKm >= 50) return "进阶越野挑战组别，需要稳定长距离训练和爬升能力。";
    return "中短距离越野组别，适合想体验山地路线的跑者谨慎评估。";
  }
  if (distanceKm && distanceKm >= 40) return "全马距离组别，适合已有系统备赛周期的跑者。";
  if (distanceKm && distanceKm >= 20) return "半马距离组别，适合有连续跑步习惯的跑者。";
  if (distanceKm) return "短距离组别，适合作为轻量参赛或亲友同行选择。";
  return null;
}

function buildRaceNextAdvice(type: RaceDecisionPage["type"], distanceKm: number | null, elevationGain: number | null, cutoffTime: string | null) {
  const parts: string[] = [];
  if (distanceKm) parts.push(`先按 ${formatDistance(distanceKm)} 的距离评估近期训练量`);
  if (elevationGain) parts.push(`再按累计爬升 ${elevationGain}m 检查爬坡和下坡能力`);
  if (cutoffTime) parts.push("最后对照官方关门时间倒推配速和补给计划");
  if (!parts.length) return null;
  if (type === "trail" || type === "ultra_trail") return `${parts.join("，")}。报名前优先核对官方强制装备和路线说明。`;
  return `${parts.join("，")}。报名前优先核对官方比赛规程和关门要求。`;
}

function buildRecommendedFor(type: RaceDecisionPage["type"], distanceKm: number | null) {
  if (!distanceKm) return [];
  if (type === "trail" || type === "ultra_trail") {
    if (distanceKm >= 100) return ["完成过 50K 以上越野", "具备夜跑与长时间补给经验", "能独立处理山地天气和装备问题"];
    if (distanceKm >= 50) return ["有马拉松或越野完赛经验", "近三个月有稳定爬升训练", "愿意提前做路线和装备准备"];
    return ["有连续跑步基础", "想尝试山地路线", "能接受非铺装路面和爬升变化"];
  }
  if (distanceKm >= 40) return ["完成过半马", "有 12 周以上系统备赛时间", "近期训练稳定且无明显伤病"];
  if (distanceKm >= 20) return ["有 10K 以上训练基础", "希望挑战半马距离", "需要一个清晰比赛目标"];
  return ["首次参赛跑者", "亲友同行", "想低压力体验赛事氛围"];
}

function buildNotRecommendedFor(type: RaceDecisionPage["type"], distanceKm: number | null, elevationGain: number | null) {
  if (!distanceKm && !elevationGain) return [];
  if ((type === "trail" || type === "ultra_trail") && (distanceKm ?? 0) >= 50) {
    return ["没有越野补给和装备经验", "近期缺少长距离训练", "无法接受天气和路线不确定性"];
  }
  if (distanceKm && distanceKm >= 40) return ["近期跑量不足", "仍在伤病恢复期", "没有完整备赛周期"];
  if (distanceKm && distanceKm >= 20) return ["完全没有连续跑步基础", "无法按计划完成赛前训练"];
  return [];
}

function buildAiGuide(type: RaceDecisionPage["type"], distanceKm: number | null, elevationGain: number | null, cutoffTime: string | null) {
  if (!distanceKm && !elevationGain && !cutoffTime) return null;
  const isTrail = type === "trail" || type === "ultra_trail";
  return {
    level: isTrail
      ? "适合有稳定跑步基础，并愿意为爬升、下坡和补给做专项准备的跑者。"
      : "适合能保持规律跑步，并愿意围绕比赛日期完成阶段性备赛的跑者。",
    preparation: distanceKm
      ? `围绕 ${formatDistance(distanceKm)} 建立训练计划，赛前至少完成一次接近比赛强度的关键训练。`
      : "先确认官方距离和路线，再决定训练周期。",
    gear: isTrail
      ? "优先准备越野鞋、软水壶或水袋、能量补给、防风雨层和官方要求的强制装备。"
      : "优先准备已磨合跑鞋、比赛服装、号码布固定方式和赛中补给。",
    caution: elevationGain
      ? `累计爬升 ${elevationGain}m 会显著影响体感强度，配速目标应比平路保守。`
      : "请在报名前核对官方规程、关门时间、补给安排和退改政策。",
    finish: cutoffTime
      ? `用官方关门时间倒推分段目标，宁可前半程保守，也不要过早透支。`
      : "比赛日以稳定完赛为第一目标，遇到异常天气或身体信号及时调整。",
  };
}

function buildFaq(
  name: string,
  status: RaceDecisionPage["registrationStatus"],
  registrationUrl: string | null,
  sourceUrl: string | null,
  categoryText: string | null,
) {
  const faq = [
    {
      question: `如何报名${name}？`,
      answer: status === "registration_open" && (registrationUrl || sourceUrl) ? "当前有可访问的报名或赛事来源入口，请以官方或报名平台页面的最新状态为准。" : "当前没有可靠的开放报名入口，建议等待官方或报名平台更新。",
    },
    {
      question: `参加${name}住哪里更方便？`,
      answer: "优先比较赛事地点附近、交通便利区域和综合性价比区域。住宿选择应围绕距离、交通和价格三个因素判断。",
    },
    {
      question: `${name}比赛当天如何到达？`,
      answer: "请优先核对官方发布的比赛地点、集合点和交通接驳信息，再结合机场、高铁站和市内公共交通规划到达方式。",
    },
    {
      question: `${name}有哪些组别？`,
      answer: categoryText ? `当前页面收录的赛事组别包括：${categoryText}。具体报名组别、资格和名额请以官方信息为准。` : "当前页面暂未收录完整组别信息，请以官方发布的报名信息为准。",
    },
  ];
  return faq;
}

function buildNextRaces(record: MergedConnectorRecord, allRecords: MergedConnectorRecord[]) {
  const type = inferRaceType(record);
  const currentDate = record.raceDate ? new Date(`${record.raceDate}T00:00:00+08:00`).getTime() : 0;
  return allRecords
    .filter((candidate) => candidate.id !== record.id)
    .filter((candidate) => FIRST5_EVENT_IDS.includes(candidate.id))
    .sort((a, b) => {
      const aType = inferRaceType(a);
      const bType = inferRaceType(b);
      const aRelevance = getRecommendationRelevance(type, record.province, aType, a.province);
      const bRelevance = getRecommendationRelevance(type, record.province, bType, b.province);
      const aDate = a.raceDate ? Math.abs(new Date(`${a.raceDate}T00:00:00+08:00`).getTime() - currentDate) : Number.MAX_SAFE_INTEGER;
      const bDate = b.raceDate ? Math.abs(new Date(`${b.raceDate}T00:00:00+08:00`).getTime() - currentDate) : Number.MAX_SAFE_INTEGER;
      return bRelevance - aRelevance || aDate - bDate || b.confidence - a.confidence;
    })
    .slice(0, 3)
    .map((candidate) => ({
      id: candidate.id,
      name: readableName(candidate),
      type: inferRaceType(candidate),
      coverImage: candidate.coverImage ?? null,
      dateText: formatDate(candidate.raceDate),
      locationText: formatLocation(candidate),
      registrationStatusText: statusLabels[calculateRegistrationStatus(candidate)],
      categoryText: formatCategorySummary(
        candidate.categories.map((category, index) => ({
          id: `${candidate.id}-${index}`,
          name: category.categoryName ?? `组别 ${index + 1}`,
          distanceKm: category.distanceKm,
          elevationGain: category.elevationGain,
          cutoffTime: category.cutoffTime,
          fee: category.registrationFee,
          registrationUrl: category.categoryRegistrationUrl ?? candidate.registrationUrl,
          oneLineVerdict: null,
          raceNextAdvice: null,
          recommendedFor: [],
          notRecommendedFor: [],
          aiGuide: null,
        })),
      ),
    }));
}

function getRecommendationRelevance(
  currentType: RaceDecisionPage["type"],
  currentProvince: string | null,
  candidateType: RaceDecisionPage["type"],
  candidateProvince: string | null,
) {
  const sameFamily =
    candidateType === currentType ||
    ((currentType === "trail" || currentType === "ultra_trail") && (candidateType === "trail" || candidateType === "ultra_trail")) ||
    ((currentType === "marathon" || currentType === "half_marathon") && (candidateType === "marathon" || candidateType === "half_marathon"));

  return (sameFamily ? 2 : 0) + (currentProvince && candidateProvince === currentProvince ? 1 : 0);
}

function readableName(record: MergedConnectorRecord) {
  return record.originalNames[0] ?? record.normalizedName;
}

function formatLocation(record: Pick<MergedConnectorRecord, "province" | "city" | "district">) {
  return [record.province, record.city, record.district].filter(Boolean).join(" · ") || null;
}

function formatDate(date: string | null) {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, "0")}.${String(parsed.getDate()).padStart(2, "0")} ${weekdays[parsed.getDay()]}`;
}

function formatRaceCountdown(date: string | null) {
  if (!date) return null;
  const days = getDiffDays(date);
  if (days > 0) return `距离比赛 ${days} 天`;
  if (days === 0) return "今日比赛";
  return null;
}

function formatCategorySummary(categories: Array<Pick<DecisionCategory, "distanceKm" | "elevationGain" | "name">>) {
  const distances = unique(categories.map((category) => category.distanceKm).filter((value): value is number => Boolean(value)));
  if (distances.length) return distances.map(formatDistance).join(" / ");
  const names = categories.map((category) => category.name).filter(Boolean);
  return names.length ? names.slice(0, 3).join(" / ") : null;
}

export function formatDistance(distanceKm: number) {
  return Number.isInteger(distanceKm) ? `${distanceKm}KM` : `${distanceKm.toFixed(1)}KM`;
}

function getDiffDays(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00+08:00`);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isPastDate(date: string) {
  return getDiffDays(date) < 0;
}

function isSameDay(date: string) {
  return getDiffDays(date) === 0;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function getSimpleNextRecommendations(raceId: string) {
  const raceCards = getRecommendationCards();
  return raceCards.filter((item) => item.race.id !== raceId).slice(0, 3);
}
