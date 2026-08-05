import racesData from "@/data/races.json";
import type { DifficultyLevel, Race, RaceRegion, RaceTag, RaceType } from "@/types/race";

export const races = racesData as Race[];

export const raceTypeLabels: Record<RaceType, string> = {
  marathon: "马拉松",
  half_marathon: "半马",
  road_running: "路跑",
  trail: "越野",
  ultra_trail: "超级越野",
  utmb: "UTMB",
  triathlon: "铁三",
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
  asia: "亚洲",
  europe: "欧洲",
  north_america: "北美",
  other_overseas: "其他海外",
};

export const difficultyLabels: Record<DifficultyLevel, string> = {
  L1: "L1 完全新手",
  L2: "L2 入门",
  L3: "L3 首个半马",
  L4: "L4 首马 / 首越预备",
  L5: "L5 首越",
  L6: "L6 进阶越野",
  L7: "L7 挑战级",
  L8: "L8 硬核级",
  L9: "L9 超长距离",
  L10: "L10 大神级",
};

export const statusLabels = {
  registration_open: "报名中",
  upcoming: "即将开放",
  lottery: "抽签中",
  closed: "报名已截止",
  finished: "已结束",
  cancelled: "已取消",
  unknown: "报名信息待更新",
} as const;

export const statusBadgeClasses = {
  registration_open: "border-emerald-100 bg-emerald-50 text-emerald-800",
  upcoming: "border-sky-100 bg-sky-50 text-sky-800",
  lottery: "border-violet-100 bg-violet-50 text-violet-800",
  closed: "border-stone-200 bg-stone-100 text-slate-600",
  finished: "border-stone-200 bg-stone-100 text-slate-600",
  cancelled: "border-red-100 bg-red-50 text-red-700",
  unknown: "border-stone-200 bg-stone-50 text-slate-500",
} as const;

export const tagLabels: Record<RaceTag, string> = {
  MARATHON: "马拉松",
  HALF_MARATHON: "半马",
  ROAD_RUNNING: "路跑",
  TRAIL: "越野",
  ULTRA_TRAIL: "超级越野",
  UTMB: "UTMB",
  TRIATHLON: "铁三",
  EAST_CHINA: "华东",
  SOUTH_CHINA: "华南",
  NORTH_CHINA: "华北",
  CENTRAL_CHINA: "华中",
  SOUTHWEST_CHINA: "西南",
  NORTHWEST_CHINA: "西北",
  NORTHEAST_CHINA: "东北",
  HONGKONG_MACAO_TAIWAN: "港澳台",
  ASIA: "亚洲",
  EUROPE: "欧洲",
  NORTH_AMERICA: "北美",
  OVERSEAS: "海外",
  SPRING: "春季",
  SUMMER: "夏季",
  AUTUMN: "秋季",
  WINTER: "冬季",
  FIRST_5K: "首个 5K",
  FIRST_10K: "首个 10K",
  FIRST_HALF: "首半马",
  FIRST_MARATHON: "首马",
  FIRST_TRAIL: "首越",
  FIRST_50K: "首个 50K",
  BEGINNER: "新手",
  INTERMEDIATE: "进阶",
  ADVANCED: "高级",
  ELITE: "精英",
  CITY_ROUTE: "城市路线",
  MOUNTAIN_ROUTE: "山地路线",
  FOREST_ROUTE: "森林路线",
  SEA_ROUTE: "海滨路线",
  LAKE_ROUTE: "湖景路线",
  DESERT_ROUTE: "沙漠路线",
  GRASSLAND_ROUTE: "草甸路线",
  STAIRS_HEAVY: "台阶多",
  TECHNICAL_ROUTE: "技术路线",
  FAST_ROUTE: "快速路线",
  CITY_VIEW: "城市景观",
  MOUNTAIN_VIEW: "山景",
  FOREST_VIEW: "森林景观",
  SEA_VIEW: "海景",
  LAKE_VIEW: "湖景",
  SNOW_MOUNTAIN_VIEW: "雪山景观",
  SUNRISE_VIEW: "日出景观",
  SUNSET_VIEW: "日落景观",
  EASY: "简单",
  MODERATE: "中等",
  HARD: "困难",
  EXTREME: "极限",
  HIGH_SPEED_RAIL_FRIENDLY: "高铁友好",
  AIRPORT_FRIENDLY: "机场友好",
  SELF_DRIVE_FRIENDLY: "自驾友好",
  TRANSPORT_CHALLENGE: "交通挑战",
  POPULAR_RACE: "热门赛事",
  CLASSIC_RACE: "经典赛事",
  UTMB_QUALIFIER: "UTMB 积分赛",
  ITRA_CERTIFIED: "ITRA 认证",
  WORLD_CLASS_EVENT: "世界级赛事",
  HOT_RACE: "高热度赛事",
  LOTTERY_REQUIRED: "需要抽签",
  CROWD_FAVORITE: "大众喜爱",
  FAMILY_FRIENDLY: "家庭友好",
  HARDCORE_RUNNERS: "硬核跑者",
  SOCIAL_FRIENDLY: "社交友好",
  INTERNATIONAL_FIELD: "国际化参赛者",
  HIGH_ALTITUDE: "高海拔",
  HOT_WEATHER: "炎热天气",
  COLD_WEATHER: "寒冷天气",
  HUMID_WEATHER: "潮湿天气",
  SUMMER_ESCAPE: "避暑",
};

export function getRaceBySlug(slug: string) {
  return races.find((race) => race.slug === slug);
}

export function formatDistance(distanceKm: number) {
  return Number.isInteger(distanceKm) ? `${distanceKm}KM` : `${distanceKm.toFixed(1)}KM`;
}

export function formatMonth(month: number) {
  return `${month}月`;
}

function parseRaceDate(date?: string) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRaceDate(race: Race) {
  const exactDate = parseRaceDate(race.date);
  if (exactDate) {
    const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][exactDate.getDay()];
    return `${exactDate.getFullYear()}.${String(exactDate.getMonth() + 1).padStart(2, "0")}.${String(exactDate.getDate()).padStart(2, "0")} ${weekday}`;
  }
  if (race.year && race.month) {
    return `${race.year}年${race.month}月`;
  }
  return "比赛日期待更新";
}

export function formatRaceCountdownOnly(race: Race) {
  const raceDate = parseRaceDate(race.date);
  if (!raceDate) return "具体日期待更新";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(raceDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays > 0) return `距离开赛 ${diffDays} 天`;
  if (diffDays === 0) return "今日开赛";
  return "已结束";
}

export function getRaceCta(race: Race) {
  if (race.registrationUrl) {
    return { label: "去报名", href: race.registrationUrl, disabled: false };
  }
  if (race.officialUrl) {
    return { label: "查看官网", href: race.officialUrl, disabled: false };
  }
  return { label: "信息待更新", href: undefined, disabled: true };
}
