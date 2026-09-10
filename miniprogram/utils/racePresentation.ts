import type { RaceListItem } from "../types/races";

type CalendarDate = {
  year: number;
  month: number;
  day: number;
  iso: string;
};

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;
const WEEKDAY_MONTH_OFFSETS = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4] as const;
const MUNICIPALITIES = new Set(["北京市", "上海市", "天津市", "重庆市"]);
const PROVINCE_LABELS: Record<string, string> = {
  内蒙古自治区: "内蒙古",
  广西壮族自治区: "广西",
  西藏自治区: "西藏",
  宁夏回族自治区: "宁夏",
  新疆维吾尔自治区: "新疆",
};

export function sortUpcomingRaces(
  races: RaceListItem[],
  today: string = getLocalToday(),
): RaceListItem[] {
  return races
    .filter((race) => {
      const lastRaceDay = parseCalendarDate(race.endDate)?.iso ?? parseCalendarDate(race.raceDate)?.iso;
      return !lastRaceDay || lastRaceDay >= today;
    })
    .slice()
    .sort((left, right) => {
      const leftDate = parseCalendarDate(left.raceDate)?.iso;
      const rightDate = parseCalendarDate(right.raceDate)?.iso;

      if (!leftDate && !rightDate) return left.editionId.localeCompare(right.editionId);
      if (!leftDate) return 1;
      if (!rightDate) return -1;
      return leftDate.localeCompare(rightDate) || left.editionId.localeCompare(right.editionId);
    });
}

export function formatRaceMeta(race: RaceListItem): string {
  return `${formatRaceDate(race.raceDate, race.endDate)} · ${formatRaceLocation(race)}`;
}

export function formatRaceDate(raceDate: string | null, endDate: string | null): string {
  const start = parseCalendarDate(raceDate);
  if (!start) return "日期待公布";

  const end = parseCalendarDate(endDate);
  if (end && end.iso > start.iso) {
    const endLabel = end.year === start.year
      ? `${pad(end.month)}.${pad(end.day)}`
      : `${end.year}.${pad(end.month)}.${pad(end.day)}`;
    return `${start.year}.${pad(start.month)}.${pad(start.day)}–${endLabel}`;
  }

  return `${start.year}.${pad(start.month)}.${pad(start.day)} ${getWeekdayLabel(start)}`;
}

export function formatRaceLocation(race: RaceListItem, includeVenue = false): string {
  const { country, province, city, district } = race.location;
  const isHongKong = [country, province, city].some((value) => value?.includes("香港"));

  if (isHongKong) {
    const parts = ["中国香港"];
    if (district && !district.includes("香港")) parts.push(district);
    if (includeVenue) appendVenue(parts, race.location.venue, [province, city, district]);
    return parts.join(" · ");
  }

  const municipality = [province, city].find((value) => value && MUNICIPALITIES.has(value));
  if (municipality) {
    const parts = [municipality];
    if (includeVenue) appendVenue(parts, race.location.venue, [province, city, district]);
    return parts.join(" · ");
  }

  const locationParts = [formatProvince(province), city]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index);

  if (includeVenue) appendVenue(locationParts, race.location.venue, [province, city, district]);

  return locationParts.join(" · ") || race.locationDisplay || "地点待公布";
}

function appendVenue(parts: string[], venue: string | null, prefixes: Array<string | null>): void {
  if (!venue) return;
  let naturalVenue = venue.trim();
  for (const prefix of prefixes) {
    if (prefix && naturalVenue.startsWith(prefix)) naturalVenue = naturalVenue.slice(prefix.length);
  }
  if (naturalVenue && !parts.includes(naturalVenue)) parts.push(naturalVenue);
}

function formatProvince(province: string | null): string | null {
  if (!province) return null;
  if (PROVINCE_LABELS[province]) return PROVINCE_LABELS[province];
  return province.endsWith("省") ? province.slice(0, -1) : province;
}

function getWeekdayLabel(date: CalendarDate): (typeof WEEKDAY_LABELS)[number] {
  let year = date.year;
  if (date.month < 3) year -= 1;
  const weekday = (
    year
    + Math.floor(year / 4)
    - Math.floor(year / 100)
    + Math.floor(year / 400)
    + WEEKDAY_MONTH_OFFSETS[date.month - 1]
    + date.day
  ) % 7;
  return WEEKDAY_LABELS[weekday];
}

function parseCalendarDate(value: string | null): CalendarDate | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > getDaysInMonth(year, month)) return null;

  return { year, month, day, iso: value as string };
}

function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leapYear ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function getLocalToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
