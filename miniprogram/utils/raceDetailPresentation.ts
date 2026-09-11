import type {
  PublicCoursePoint,
  PublicRaceCategory,
  PublicRaceDetail,
  PublicRaceGuide,
  PublicRaceStrategy,
  RaceType,
  RegistrationStatus,
} from "../types/races";
import { formatRaceDate, formatRaceLocation } from "./racePresentation";

export type RaceFactViewModel = {
  key: string;
  label: string;
  value: string;
};

export type CategoryViewModel = {
  categoryId: string;
  label: string;
  isPrimaryCategory: boolean;
  coreFacts: RaceFactViewModel[];
  executionFacts: RaceFactViewModel[];
  coursePointSection: CoursePointSectionViewModel | null;
};

export type CoursePointViewModel = {
  pointId: string;
  type: PublicCoursePoint["type"];
  pointLabel: string;
  name: string;
  factsDisplay: string | null;
  serviceDisplay: string | null;
};

export type CoursePointSectionViewModel = {
  title: "补给与关门";
  points: CoursePointViewModel[];
};

export type RaceGuideSectionViewModel = {
  title: string;
  body: string[];
};

export type RaceGuideNumberedSectionViewModel = RaceGuideSectionViewModel & {
  number: string;
};

export type RaceGuideViewModel = {
  opening: RaceGuideSectionViewModel;
  judgment: RaceGuideSectionViewModel;
  experiences: Array<RaceGuideNumberedSectionViewModel & {
    conclusion: string | null;
  }>;
  runnerFit: {
    title: string;
    introduction: string | null;
    items: RaceGuideNumberedSectionViewModel[];
  } | null;
  closing: string | null;
};

export type RaceStrategyViewModel = PublicRaceStrategy;

export type RaceDetailViewModel = {
  editionId: string;
  name: string;
  heroImage: string | null;
  heroMode: "aspectFill";
  heroFocalPoint: string;
  dateDisplay: string;
  locationDisplay: string;
  summaryDisplay: string | null;
  registrationDisplay: string | null;
  categories: CategoryViewModel[];
  showCategorySelector: boolean;
  selectedCategoryId: string;
  selectedCategory: CategoryViewModel | null;
  raceGuide: RaceGuideViewModel | null;
  raceStrategy: RaceStrategyViewModel | null;
  showRaceStrategy: boolean;
};

const HERO_FOCAL_POINTS: Readonly<Record<string, string>> = {
  "shanghai-marathon-2026": "62% 50%",
  "kailas-gongga-100-2026": "44% 50%",
};

export function createRaceDetailViewModel(race: PublicRaceDetail): RaceDetailViewModel {
  const categories = race.categories
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((category) => toCategoryViewModel(category, race.raceType));
  const selectedCategory = categories.find(({ isPrimaryCategory }) => isPrimaryCategory) ?? categories[0] ?? null;
  const showCategorySelector = categories.length > 1;
  const raceStrategy = toRaceStrategyViewModel(race.raceStrategy);

  return {
    editionId: race.editionId,
    name: formatRaceTitle(race.name),
    heroImage: race.heroImage,
    heroMode: "aspectFill",
    heroFocalPoint: HERO_FOCAL_POINTS[race.editionId] ?? "50% 50%",
    dateDisplay: formatRaceDate(race.raceDate, race.endDate),
    locationDisplay: formatRaceLocation(race, true),
    summaryDisplay: formatEditionSummary(race.raceType, showCategorySelector, race.categories[0] ?? null),
    registrationDisplay: formatRegistrationStatus(race.registrationStatus),
    categories,
    showCategorySelector,
    selectedCategoryId: selectedCategory?.categoryId ?? "",
    selectedCategory,
    raceGuide: toRaceGuideViewModel(race.raceGuide),
    raceStrategy,
    showRaceStrategy: raceStrategy?.categoryId === selectedCategory?.categoryId,
  };
}

function formatRaceTitle(name: string): string {
  return name.replace(/^(\d{4})(?=\S)/, "$1 ");
}

export function selectRaceCategory(
  detail: RaceDetailViewModel,
  categoryId: string,
): RaceDetailViewModel {
  const selectedCategory = detail.categories.find((category) => category.categoryId === categoryId);
  if (!selectedCategory) return detail;
  return {
    ...detail,
    selectedCategoryId: categoryId,
    selectedCategory,
    showRaceStrategy: detail.raceStrategy?.categoryId === categoryId,
  };
}

function toCategoryViewModel(category: PublicRaceCategory, raceType: RaceType): CategoryViewModel {
  const coreFacts: RaceFactViewModel[] = [];
  const executionFacts: RaceFactViewModel[] = [];

  if (category.distanceKm !== null) {
    coreFacts.push({ key: "distance", label: "距离", value: `${formatNumber(category.distanceKm)} km` });
  }
  if (category.elevationGain !== null) {
    coreFacts.push({ key: "elevation", label: "累计爬升", value: `${formatNumber(category.elevationGain)} m` });
  }
  if (category.cutoffTimeHours !== null) {
    coreFacts.push({ key: "cutoff", label: "关门时间", value: `${formatNumber(category.cutoffTimeHours)} h` });
  }
  if (category.startAt) {
    executionFacts.push({ key: "startAt", label: "出发时间", value: formatStartAt(category.startAt) });
  }
  if (category.startLocation && category.startLocation === category.finishLocation) {
    executionFacts.push({ key: "startFinish", label: "起终点", value: category.startLocation });
  } else {
    if (category.startLocation) {
      executionFacts.push({ key: "start", label: "起点", value: category.startLocation });
    }
    if (category.finishLocation) {
      executionFacts.push({ key: "finish", label: "终点", value: category.finishLocation });
    }
  }

  return {
    categoryId: category.categoryId,
    label: category.shortName ?? category.name,
    isPrimaryCategory: category.isPrimaryCategory,
    coreFacts,
    executionFacts,
    coursePointSection: toCoursePointSectionViewModel(category, raceType),
  };
}

function toCoursePointSectionViewModel(
  category: PublicRaceCategory,
  raceType: RaceType,
): CoursePointSectionViewModel | null {
  if (!isTrailRaceType(raceType)
    || (category.coursePointDataStatus !== "available" && category.coursePointDataStatus !== "partial")
    || !category.coursePoints?.length) {
    return null;
  }

  let checkpointIndex = 0;
  const points = category.coursePoints
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder || left.pointId.localeCompare(right.pointId))
    .map((point) => {
      if (point.type === "checkpoint") checkpointIndex += 1;
      return toCoursePointViewModel(point, category.startAt, checkpointIndex);
    });

  return {
    title: "补给与关门",
    points,
  };
}

function toCoursePointViewModel(
  point: PublicCoursePoint,
  categoryStartAt: string | null,
  checkpointIndex: number,
): CoursePointViewModel {
  const distanceDisplay = point.distanceKm === null ? null : `${formatNumber(point.distanceKm)} km`;
  const cutoffDisplay = formatCoursePointCutoff(point.cutoffAt, categoryStartAt);

  return {
    pointId: point.pointId,
    type: point.type,
    pointLabel: point.type === "finish"
      ? "FINISH"
      : point.type === "water_point"
        ? "WP"
        : formatSequence(checkpointIndex - 1),
    name: point.name,
    factsDisplay: [distanceDisplay, cutoffDisplay].filter((value): value is string => Boolean(value)).join(" · ") || null,
    serviceDisplay: formatCoursePointServices(point.services),
  };
}

function formatCoursePointCutoff(cutoffAt: string | null, categoryStartAt: string | null): string | null {
  if (!cutoffAt) return null;
  const cutoff = parseLocalDateTime(cutoffAt);
  if (!cutoff) return null;

  const startDate = categoryStartAt ? parseLocalDate(categoryStartAt) : null;
  if (!startDate) return `关门 ${cutoff.time}`;

  const dayOffset = calendarDayNumber(cutoff) - calendarDayNumber(startDate);
  if (dayOffset <= 0) return `关门 ${cutoff.time}`;
  if (dayOffset === 1) return `次日 ${cutoff.time}`;
  return `第${dayOffset + 1}日 ${cutoff.time}`;
}

function formatCoursePointServices(services: PublicCoursePoint["services"]): string | null {
  if (!services?.length) return null;
  const labels: Record<NonNullable<PublicCoursePoint["services"]>[number], string> = {
    water: "补水",
    food: "补给",
    hot_food: "热食",
    drop_bag: "换装",
    medical: "医疗",
  };
  return services.map((service) => labels[service]).join(" · ");
}

type LocalDateParts = { year: number; month: number; day: number };

function parseLocalDate(value: string): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function parseLocalDateTime(value: string): (LocalDateParts & { time: string }) | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    time: `${match[4]}:${match[5]}`,
  };
}

function calendarDayNumber(value: LocalDateParts): number {
  return Math.floor(Date.UTC(value.year, value.month - 1, value.day) / 86_400_000);
}

function toRaceGuideViewModel(guide: PublicRaceGuide | null): RaceGuideViewModel | null {
  if (!guide) return null;

  return {
    opening: guide.opening,
    judgment: guide.judgment,
    experiences: guide.experiences.slice(0, 3).map((experience, index) => ({
      ...experience,
      number: formatSequence(index),
    })),
    runnerFit: guide.runnerFit
      ? {
          ...guide.runnerFit,
          items: guide.runnerFit.items.map((item, index) => ({
            ...item,
            number: formatSequence(index),
          })),
        }
      : null,
    closing: guide.closing,
  };
}

function toRaceStrategyViewModel(strategy: PublicRaceStrategy | null): RaceStrategyViewModel | null {
  if (!strategy) return null;
  return {
    ...strategy,
    items: strategy.items.slice(0, 3).map((item) => ({
      ...item,
      paragraphs: item.paragraphs.map((paragraph) => ({ ...paragraph })),
    })),
  };
}

function formatSequence(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function formatEditionSummary(
  raceType: RaceType,
  hasMultipleCategories: boolean,
  category: PublicRaceCategory | null,
): string | null {
  if (hasMultipleCategories && isTrailRaceType(raceType)) return null;
  const values = [formatRaceType(raceType)];
  if (!hasMultipleCategories && category?.distanceKm !== null && category?.distanceKm !== undefined) {
    values.push(`${formatNumber(category.distanceKm)} km`);
  }
  return values.join(" · ");
}

function isTrailRaceType(raceType: RaceType): boolean {
  return raceType === "trail" || raceType === "ultra_trail" || raceType === "utmb";
}

function formatRaceType(raceType: RaceType): string {
  const labels: Record<RaceType, string> = {
    marathon: "马拉松",
    half_marathon: "半程马拉松",
    road_running: "路跑",
    trail: "越野跑",
    ultra_trail: "越野跑",
    utmb: "越野跑",
    triathlon: "铁人三项",
    other: "其他",
  };
  return labels[raceType];
}

function formatRegistrationStatus(status: RegistrationStatus): string | null {
  const labels: Partial<Record<RegistrationStatus, string>> = {
    upcoming: "报名未开始",
    registration_not_announced: "报名时间待公布",
    registration_open: "报名中",
    lottery: "抽签中",
    waiting_list: "候补中",
    registration_closed: "报名已结束",
    race_finished: "赛事已结束",
    cancelled: "赛事已取消",
  };
  return labels[status] ?? null;
}

function formatStartAt(value: string): string {
  const dateTime = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (dateTime) return `${dateTime[1]}.${dateTime[2]}.${dateTime[3]} ${dateTime[4]}:${dateTime[5]}`;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}.${dateOnly[2]}.${dateOnly[3]}`;
  return value;
}

function formatNumber(value: number): string {
  const [integer, decimal] = String(value).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal ? `${grouped}.${decimal}` : grouped;
}
