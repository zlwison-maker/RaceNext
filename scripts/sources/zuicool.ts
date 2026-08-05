import type { RawRace } from "../../types/rawRace.ts";
import {
  extractJsonLdEvents,
  extractRaceLinks,
  fetchHtml,
  inferDistanceText,
  pickFirstDate,
  REQUEST_DELAY_MS,
  uniqueByNameAndUrl,
  type SourceFetchResult,
} from "./shared.ts";

const SOURCE = "zuicool" as const;
const CANDIDATE_PAGES = [
  "https://www.zuicool.com",
  "https://www.zuicool.com/event",
  "https://www.zuicool.com/events",
  "https://www.zuicool.com/marathon",
  "https://www.zuicool.com/trail",
];

export async function fetchZuicoolSample(limit = 20): Promise<SourceFetchResult> {
  const startedAt = Date.now();
  const result: SourceFetchResult = {
    source: SOURCE,
    races: [],
    candidatePages: CANDIDATE_PAGES,
    accessiblePages: [],
    failedPages: [],
    notes: [],
    durationMs: 0,
  };

  for (const url of CANDIDATE_PAGES) {
    if (result.races.length >= limit) break;
    try {
      const page = await fetchHtml(url, { requestDelayMs: REQUEST_DELAY_MS });
      if (!page.ok) {
        result.failedPages.push({ url, reason: `HTTP ${page.status}` });
        continue;
      }

      result.accessiblePages.push(page.finalUrl);
      const extracted = [...extractJsonLdEvents(page.text, SOURCE, page.finalUrl), ...extractRaceLinks(page.text, SOURCE, page.finalUrl)]
        .map(enrichZuicoolRace)
        .filter((race) => isLikelyZuicoolRace(race.rawName));
      result.races.push(...extracted);
      result.races = uniqueByNameAndUrl(result.races).slice(0, limit);
    } catch (error) {
      result.failedPages.push({ url, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  if (result.races.length === 0) {
    result.notes.push("未从最酷候选公开页面解析到赛事样本，可能页面依赖前端渲染或列表入口已变更。");
  }

  result.durationMs = Date.now() - startedAt;
  return result;
}

function enrichZuicoolRace(race: RawRace): RawRace {
  const text = `${race.rawName ?? ""} ${race.rawLocation ?? ""}`;
  return {
    ...race,
    rawDate: race.rawDate ?? pickFirstDate(text),
    rawDistance: race.rawDistance ?? inferDistanceText(text),
    rawData: {
      ...race.rawData,
      sourceKind: "registration_or_event_platform_public_page",
    },
  };
}

function isLikelyZuicoolRace(name?: string): boolean {
  if (!name) return false;
  if (/^(路跑报名|越野报名|赛事报名|报名|更多|全部赛事)$/i.test(name.trim())) return false;
  if (/平台|系统|登录|注册|训练|装备|照片|成绩查询/.test(name)) return false;
  return /20\d{2}|马拉松|半程|半马|越野|百公里|百英里|trail|marathon|ultra|\d+\s?(?:km|公里)/i.test(name);
}
