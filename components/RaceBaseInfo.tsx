import {
  difficultyLabels,
  formatDistance,
  formatRaceCountdownOnly,
  formatRaceDate,
  raceTypeLabels,
  regionLabels,
  statusLabels,
  tagLabels,
} from "@/lib/races";
import type { Race, RaceCategory, RaceTag } from "@/types/race";

const priorityTags: RaceTag[] = [
  "FIRST_MARATHON",
  "FIRST_TRAIL",
  "POPULAR_RACE",
  "HOT_RACE",
  "HIGH_SPEED_RAIL_FRIENDLY",
  "AIRPORT_FRIENDLY",
  "UTMB_QUALIFIER",
  "CLASSIC_RACE",
  "CITY_ROUTE",
  "MOUNTAIN_ROUTE",
  "MOUNTAIN_VIEW",
  "FOREST_VIEW",
  "SEA_VIEW",
  "LAKE_VIEW",
  "FIRST_HALF",
  "FIRST_50K",
];

const repeatedTags: RaceTag[] = [
  "MARATHON",
  "HALF_MARATHON",
  "ROAD_RUNNING",
  "TRAIL",
  "ULTRA_TRAIL",
  "UTMB",
  "EAST_CHINA",
  "SOUTH_CHINA",
  "NORTH_CHINA",
  "CENTRAL_CHINA",
  "SOUTHWEST_CHINA",
  "NORTHWEST_CHINA",
  "NORTHEAST_CHINA",
  "HONGKONG_MACAO_TAIWAN",
  "ASIA",
  "EUROPE",
  "NORTH_AMERICA",
  "SPRING",
  "SUMMER",
  "AUTUMN",
  "WINTER",
];

function getCoreTagLabels(race: Race, category?: RaceCategory) {
  const baseTags = race.tags.filter((tag) => !repeatedTags.includes(tag));
  const sorted = [
    ...baseTags.filter((tag) => priorityTags.includes(tag)),
    ...baseTags.filter((tag) => !priorityTags.includes(tag)),
  ];
  const labels = sorted.slice(0, 4).map((tag) => tagLabels[tag]);
  const beginnerFriendly = category?.beginnerFriendly ?? race.categories.some((item) => item.beginnerFriendly);

  if (beginnerFriendly && !labels.includes("新手友好")) {
    labels.unshift("新手友好");
  }
  if (race.decision.sceneryScore >= 5 && !labels.includes("风景好")) {
    labels.push("风景好");
  }

  return labels.slice(0, 5);
}

function getDistanceText(race: Race, category?: RaceCategory) {
  if (category) return formatDistance(category.distanceKm);
  return race.categories.map((item) => formatDistance(item.distanceKm)).join(" / ");
}

function getElevationText(race: Race, category?: RaceCategory) {
  if (category) return `${category.elevationGain}m`;
  return race.categories.map((item) => `${item.elevationGain}m`).join(" / ");
}

function getDifficultyText(race: Race, category?: RaceCategory) {
  return difficultyLabels[(category ?? race.categories[0]).difficultyLevel];
}

function getDifficultyBadgeClass(race: Race, category?: RaceCategory) {
  const level = (category ?? race.categories[0]).difficultyLevel;
  const classes = {
    L1: "border-emerald-100 bg-emerald-50 text-emerald-700",
    L2: "border-emerald-100 bg-emerald-100 text-emerald-700",
    L3: "border-emerald-200 bg-emerald-100 text-emerald-800",
    L4: "border-orange-100 bg-orange-50 text-orange-800",
    L5: "border-orange-200 bg-orange-100 text-orange-900",
    L6: "border-red-100 bg-red-50 text-red-700",
    L7: "border-red-100 bg-red-100 text-red-800",
    L8: "border-red-200 bg-red-100 text-red-900",
    L9: "border-red-200 bg-red-200 text-red-950",
    L10: "border-red-300 bg-red-300 text-red-950",
  };
  return classes[level];
}

function getStatusTextClass(race: Race) {
  const status = race.status ?? "unknown";
  const classes = {
    registration_open: "text-emerald-700",
    upcoming: "text-sky-700",
    lottery: "text-violet-700",
    closed: "text-slate-500",
    finished: "text-slate-500",
    cancelled: "text-red-700",
    unknown: "text-slate-500",
  };
  return classes[status];
}

export function RaceBaseInfo({
  race,
  category,
  compact = false,
}: {
  race: Race;
  category?: RaceCategory;
  compact?: boolean;
}) {
  const tagLabels = getCoreTagLabels(race, category);
  const title = category ? `${race.name} · ${category.name}` : race.name;
  const status = race.status ?? "unknown";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">
            {raceTypeLabels[race.type]} · {race.city} / {regionLabels[race.region]}
          </p>
          <h2 className={`${compact ? "mt-2 text-2xl" : "mt-2 text-2xl"} font-bold tracking-tight text-slate-950`}>{title}</h2>
        </div>
        <span className={`shrink-0 pt-1 text-sm font-bold ${getStatusTextClass(race)}`}>
          {statusLabels[status]}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getDifficultyBadgeClass(race, category)}`}>
          {getDifficultyText(race, category)}
        </span>
        {tagLabels.map((label) => (
          <span key={label} className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            {label}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md bg-stone-50 p-3">
          <span className="block text-xs font-semibold text-slate-500">距离</span>
          <strong>{getDistanceText(race, category)}</strong>
        </div>
        <div className="rounded-md bg-stone-50 p-3">
          <span className="block text-xs font-semibold text-slate-500">累计爬升</span>
          <strong>{getElevationText(race, category)}</strong>
        </div>
        <div className="rounded-md bg-stone-50 p-3">
          <span className="block text-xs font-semibold text-slate-500">比赛日期</span>
          <strong>{formatRaceDate(race)}</strong>
        </div>
        <div className="rounded-md bg-stone-50 p-3">
          <span className="block text-xs font-semibold text-slate-500">距离开赛</span>
          <strong>{formatRaceCountdownOnly(race)}</strong>
        </div>
      </div>

      <p className={`${compact ? "mt-4" : "mt-5"} border-t border-stone-100 pt-4 text-sm leading-6 text-slate-600`}>
        {race.summary}
      </p>
    </div>
  );
}
