import type {
  PublicRaceCategory,
  PublicRaceDetail,
  PublicRaceGuide,
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
};

const HERO_FOCAL_POINTS: Readonly<Record<string, string>> = {
  "shanghai-marathon-2026": "62% 50%",
  "kailas-gongga-100-2026": "44% 50%",
};

export function createRaceDetailViewModel(race: PublicRaceDetail): RaceDetailViewModel {
  const categories = race.categories
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map(toCategoryViewModel);
  const selectedCategory = categories.find(({ isPrimaryCategory }) => isPrimaryCategory) ?? categories[0] ?? null;
  const showCategorySelector = categories.length > 1;

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
  return { ...detail, selectedCategoryId: categoryId, selectedCategory };
}

function toCategoryViewModel(category: PublicRaceCategory): CategoryViewModel {
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
  };
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
