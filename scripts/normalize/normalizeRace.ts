import type {
  DataQuality,
  RaceCategory,
  RaceDecision,
  RaceRegion,
  RaceStatus,
  RaceType,
} from "../../types/race.ts";
import type { RawRace, RawRaceSource } from "../../types/rawRace.ts";

export type NormalizedRace = {
  id: string;
  name: string;
  slug: string;
  type: RaceType;
  status: RaceStatus;
  summary: string;
  officialUrl?: string;
  registrationUrl?: string;
  year: number | null;
  month: number | null;
  date: string | null;
  country: string;
  province: string;
  city: string;
  region: RaceRegion | "unknown";
  categories: RaceCategory[];
  tags: [];
  decision: RaceDecision;
  source: RawRaceSource;
  sourcePriority: number;
  sourceUrl?: string;
  sourceRawId?: string;
  fieldSources: Record<string, RawRaceSource | "placeholder">;
  confidence: number;
  missingFields: string[];
  lastUpdatedAt: string;
  dataQuality: DataQuality;
  verified: boolean;
  notes: string[];
  possibleDuplicate?: boolean;
};

const MUNICIPALITIES = ["北京", "上海", "天津", "重庆"];

const PROVINCE_REGION: Record<string, RaceRegion> = {
  上海: "east_china",
  江苏: "east_china",
  浙江: "east_china",
  安徽: "east_china",
  福建: "east_china",
  江西: "east_china",
  山东: "east_china",
  广东: "south_china",
  广西: "south_china",
  海南: "south_china",
  香港: "hongkong_macao_taiwan",
  澳门: "hongkong_macao_taiwan",
  台湾: "hongkong_macao_taiwan",
  北京: "north_china",
  天津: "north_china",
  河北: "north_china",
  山西: "north_china",
  内蒙古: "north_china",
  河南: "central_china",
  湖北: "central_china",
  湖南: "central_china",
  重庆: "southwest_china",
  四川: "southwest_china",
  贵州: "southwest_china",
  云南: "southwest_china",
  西藏: "southwest_china",
  陕西: "northwest_china",
  甘肃: "northwest_china",
  青海: "northwest_china",
  宁夏: "northwest_china",
  新疆: "northwest_china",
  辽宁: "northeast_china",
  吉林: "northeast_china",
  黑龙江: "northeast_china",
};

const PROVINCES = Object.keys(PROVINCE_REGION).sort((a, b) => b.length - a.length);

const CITY_SUFFIX = /市|自治州|地区|盟|县|区$/;

export function normalizeRaces(rawRaces: RawRace[]): NormalizedRace[] {
  return rawRaces.map(normalizeRace);
}

export function normalizeRace(raw: RawRace): NormalizedRace {
  const notes: string[] = [`source=${raw.source}`];
  const name = normalizeRaceName(raw.rawName);
  if (!raw.rawName) notes.push("missing rawName; used placeholder name");

  const dateParts = normalizeDate(raw.rawDate);
  if (!raw.rawDate) notes.push("missing date");
  if (raw.rawDate && !dateParts.date) notes.push("date not precise to day");

  const location = normalizeLocation(raw);
  if (location.province === "unknown") notes.push("missing or unparsed province");
  if (location.city === "unknown") notes.push("missing or unparsed city");

  const raceType = normalizeRaceType(raw);
  const distance = normalizeDistance(raw.rawDistance ?? raw.rawType ?? raw.rawName);
  const elevationGain = normalizeElevationGain(raw.rawElevationGain ?? raw.rawDifficulty);
  if (distance === null) notes.push("missing distance; category uses placeholder distance 0");
  if (elevationGain === null && (raceType === "trail" || raceType === "ultra_trail" || raceType === "utmb")) {
    notes.push("missing elevation gain for trail race");
  }

  const status = normalizeRaceStatus(raw.rawRegistrationStatus, dateParts.date, dateParts.year);
  const slug = buildSlug(name, dateParts.year, location.city, raw.source, raw.rawId);
  const missingFields = buildMissingFields(raw, dateParts, location, distance, elevationGain);
  const fieldSources = buildFieldSources(raw, dateParts, location, distance, elevationGain);
  const placeholderNote = "generated placeholder, should be enriched by tag/difficulty/recommendation engine";
  notes.push(placeholderNote);

  return {
    id: `race-${slug}`,
    name,
    slug,
    type: raceType,
    status,
    summary: "placeholder",
    officialUrl: raw.rawOfficialUrl,
    registrationUrl: raw.rawRegistrationUrl,
    year: dateParts.year,
    month: dateParts.month,
    date: dateParts.date,
    country: inferCountry(location.province, raw.source),
    province: location.province,
    city: location.city,
    region: location.region,
    categories: [
      {
        id: `${slug}-main`,
        name: buildCategoryName(distance, raceType),
        distanceKm: distance ?? 0,
        elevationGain: elevationGain ?? 0,
        difficultyLevel: "L1",
        difficultyScore: 0,
        beginnerFriendly: false,
      },
    ],
    tags: [],
    decision: buildDefaultDecision(),
    source: raw.source,
    sourcePriority: sourcePriority(raw.source),
    sourceUrl: raw.sourceUrl,
    sourceRawId: raw.rawId,
    fieldSources,
    confidence: calculateConfidence(raw, dateParts.date, location.city, distance),
    missingFields,
    lastUpdatedAt: new Date().toISOString(),
    dataQuality: assessDataQuality(raw, dateParts.date, location.city),
    verified: raw.source === "runchina" && Boolean(raw.rawName),
    notes,
  };
}

export function normalizeRaceName(rawName?: string): string {
  if (!rawName) return "unknown";
  return rawName
    .replace(/[【】\[\]()（）]/g, " ")
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/20\d{2}\s*年?/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^第[一二三四五六七八九十\d]+届\s*/, "")
    .replace(/赛$/, "")
    .trim();
}

export function normalizeDate(rawDate?: string): { year: number | null; month: number | null; date: string | null } {
  if (!rawDate) return { year: null, month: null, date: null };
  const normalized = rawDate.replace(/[年月/.]/g, "-").replace(/日/g, "").replace(/\s+/g, "");
  const full = normalized.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (full) {
    const [, year, month, day] = full;
    return {
      year: Number(year),
      month: Number(month),
      date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    };
  }
  const yearMonth = normalized.match(/(20\d{2})-(\d{1,2})/);
  if (yearMonth) {
    const [, year, month] = yearMonth;
    return { year: Number(year), month: Number(month), date: null };
  }
  const year = rawDate.match(/20\d{2}/)?.[0];
  return { year: year ? Number(year) : null, month: null, date: null };
}

export function normalizeLocation(raw: RawRace): { province: string; city: string; region: RaceRegion | "unknown" } {
  const text = [raw.rawProvince, raw.rawCity, raw.rawLocation, raw.rawName].filter(Boolean).join(" ");
  const province = raw.rawProvince || PROVINCES.find((item) => text.includes(item)) || "unknown";
  let city = raw.rawCity || "unknown";

  if (city === "unknown") {
    if (MUNICIPALITIES.includes(province)) {
      city = province;
    } else {
      const cityMatch = text.match(/([\u4e00-\u9fa5]{2,8}(?:市|自治州|地区|盟|县))/);
      city = cityMatch ? cityMatch[1].replace(CITY_SUFFIX, "") : "unknown";
    }
  }

  return {
    province,
    city,
    region: PROVINCE_REGION[province] ?? inferOverseasRegion(text),
  };
}

export function normalizeRaceType(raw: RawRace): RaceType {
  const text = `${raw.rawType ?? ""} ${raw.rawName ?? ""} ${raw.rawDistance ?? ""} ${(raw.rawTags ?? []).join(" ")}`.toLowerCase();
  if (/utmb/.test(text)) return "utmb";
  if (/triathlon|铁人三项/.test(text)) return "triathlon";
  if (/ultra|100\s?km|百公里|超级|超马/.test(text) && /trail|越野|山/.test(text)) return "ultra_trail";
  if (/trail|越野|山地/.test(text)) return "trail";
  if (/半程马拉松|半马|21\.?1/.test(text)) return "half_marathon";
  if (/马拉松|全马|42\.?2|42\.195|marathon/.test(text)) return "marathon";
  if (/跑|run|running|km|公里/.test(text)) return "road_running";
  return "other";
}

export function normalizeDistance(rawDistance?: string): number | null {
  if (!rawDistance) return null;
  const text = rawDistance.toLowerCase();
  if (/半程马拉松|半马|21\.0975\s?(?:km|公里)?|21\.1\s?(?:km|公里)?/.test(text)) return 21.1;
  if (/全马|马拉松|42\.195\s?(?:km|公里)?|42\.2\s?(?:km|公里)?/.test(text) && !/半/.test(text)) return 42.2;
  const mile = text.match(/(\d+(?:\.\d+)?)\s?(?:mile|miles|英里)/i)?.[1];
  if (mile) return Number((Number(mile) * 1.60934).toFixed(1));
  const km = text.match(/(\d+(?:\.\d+)?)\s?(?:km|公里|k\b)/i)?.[1];
  if (km) return Number(Number(km).toFixed(1));
  return null;
}

export function normalizeElevationGain(rawElevationGain?: string): number | null {
  if (!rawElevationGain) return null;
  const match = rawElevationGain.match(/(?:D\+|爬升|累计爬升)?\s*(\d{2,5})\s?(?:m|米)?/i);
  return match ? Number(match[1]) : null;
}

export function normalizeRaceStatus(rawStatus?: string, date?: string | null, year?: number | null): RaceStatus {
  const text = rawStatus ?? "";
  if (/报名中|开放|registration open/i.test(text)) return "registration_open";
  if (/抽签|lottery/i.test(text)) return "lottery";
  if (/已截止|截止|closed/i.test(text)) return "closed";
  if (/取消|cancel/i.test(text)) return "cancelled";
  if (/结束|完赛|finished/i.test(text)) return "finished";
  if (date && new Date(date).getTime() < Date.now()) return "finished";
  if (year && year < new Date().getFullYear()) return "finished";
  if (year && year >= new Date().getFullYear()) return "upcoming";
  return "unknown";
}

function inferCountry(province: string, source: RawRaceSource): string {
  if (province !== "unknown") return "中国";
  return source === "itra" ? "unknown" : "中国";
}

function inferOverseasRegion(text: string): RaceRegion | "unknown" {
  if (/hong kong|macau|taiwan|香港|澳门|台湾/i.test(text)) return "hongkong_macao_taiwan";
  if (/japan|korea|thailand|singapore|asia/i.test(text)) return "asia";
  if (/france|italy|spain|switzerland|europe/i.test(text)) return "europe";
  if (/usa|canada|america|north america/i.test(text)) return "north_america";
  if (/[a-z]{3,}/i.test(text)) return "other_overseas";
  return "unknown";
}

function buildSlug(name: string, year: number | null, city: string, source: RawRaceSource, rawId?: string): string {
  const base = [name, year, city !== "unknown" ? city : undefined, rawId ?? source].filter(Boolean).join("-");
  return `${slugify(base)}-${shortHash(base)}`.replace(/^-+/, "");
}

function slugify(value: string): string {
  const ascii = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  if (ascii.replace(/-/g, "")) return ascii;
  return encodeURIComponent(value).replace(/%/g, "").toLowerCase().slice(0, 120);
}

function shortHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).slice(0, 6);
}

function buildCategoryName(distance: number | null, type: RaceType): string {
  if (distance === 42.2) return "全程马拉松";
  if (distance === 21.1) return "半程马拉松";
  if (distance) return `${distance}KM`;
  if (type === "trail" || type === "ultra_trail" || type === "utmb") return "越野组别待补全";
  return "组别待补全";
}

function buildDefaultDecision(): RaceDecision {
  return {
    popularityScore: 0,
    sceneryScore: 0,
    organizationScore: 0,
    transportScore: 0,
    technicalScore: 0,
  };
}

function sourcePriority(source: RawRaceSource): number {
  return {
    runchina: 100,
    itra: 90,
    zuicool: 70,
  }[source] ?? 0;
}

function buildFieldSources(
  raw: RawRace,
  dateParts: { year: number | null; month: number | null; date: string | null },
  location: { province: string; city: string; region: RaceRegion | "unknown" },
  distance: number | null,
  elevationGain: number | null,
): Record<string, RawRaceSource | "placeholder"> {
  return {
    name: raw.rawName ? raw.source : "placeholder",
    type: raw.rawType || raw.rawName ? raw.source : "placeholder",
    status: raw.rawRegistrationStatus ? raw.source : "placeholder",
    summary: "placeholder",
    year: dateParts.year ? raw.source : "placeholder",
    month: dateParts.month ? raw.source : "placeholder",
    date: dateParts.date ? raw.source : "placeholder",
    country: location.province !== "unknown" ? raw.source : "placeholder",
    province: location.province !== "unknown" ? raw.source : "placeholder",
    city: location.city !== "unknown" ? raw.source : "placeholder",
    region: location.region !== "unknown" ? raw.source : "placeholder",
    distanceKm: distance !== null ? raw.source : "placeholder",
    elevationGain: elevationGain !== null ? raw.source : "placeholder",
    officialUrl: raw.rawOfficialUrl ? raw.source : "placeholder",
    registrationUrl: raw.rawRegistrationUrl ? raw.source : "placeholder",
    categories: distance !== null || elevationGain !== null ? raw.source : "placeholder",
    tags: "placeholder",
    decision: "placeholder",
  };
}

function buildMissingFields(
  raw: RawRace,
  dateParts: { year: number | null; month: number | null; date: string | null },
  location: { province: string; city: string; region: RaceRegion | "unknown" },
  distance: number | null,
  elevationGain: number | null,
): string[] {
  return [
    !raw.rawName ? "name" : null,
    !dateParts.date ? "date" : null,
    location.province === "unknown" ? "province" : null,
    location.city === "unknown" ? "city" : null,
    distance === null ? "distanceKm" : null,
    elevationGain === null ? "elevationGain" : null,
    !raw.rawRegistrationUrl ? "registrationUrl" : null,
    !raw.rawOfficialUrl ? "officialUrl" : null,
  ].filter((field): field is string => Boolean(field));
}

function calculateConfidence(
  raw: RawRace,
  date: string | null,
  city: string,
  distance: number | null,
): number {
  let confidence = 0;
  if (raw.rawName) confidence += 20;
  if (date) confidence += 20;
  if (city !== "unknown") confidence += 15;
  if (distance !== null) confidence += 15;
  if (raw.rawRegistrationUrl || raw.rawOfficialUrl) confidence += 10;
  if (raw.source === "runchina" || raw.source === "itra") confidence += 20;
  return Math.min(confidence, 100);
}

function assessDataQuality(raw: RawRace, date: string | null, city: string): DataQuality {
  if (raw.rawName && date && city !== "unknown") return "partially_verified";
  if (raw.rawName) return "unverified";
  return "placeholder";
}
