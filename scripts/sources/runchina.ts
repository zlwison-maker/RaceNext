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

const SOURCE = "runchina" as const;
const CANDIDATE_PAGES = [
  "https://www.runchina.org.cn/#/race/v/list",
  "https://www.runchina.org.cn",
  "https://www.runchina.org.cn/portal.php?mod=list&catid=2",
  "https://www.runchina.org.cn/portal.php?mod=list&catid=3",
  "https://www.athletics.org.cn",
  "https://www.athletics.org.cn/marathon/",
];

export async function fetchRunchinaSample(limit = 20): Promise<SourceFetchResult> {
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
        result.failedPages.push({ url, reason: describeFailedPage(page.status, page.text) });
        continue;
      }

      result.accessiblePages.push(page.finalUrl);
      const extracted = [...extractJsonLdEvents(page.text, SOURCE, page.finalUrl), ...extractRaceLinks(page.text, SOURCE, page.finalUrl)]
        .map(enrichRunchinaRace)
        .filter((race) => isLikelyRunchinaRace(race.rawName));
      result.races.push(...extracted);
      result.races = uniqueByNameAndUrl(result.races).slice(0, limit);
    } catch (error) {
      result.failedPages.push({ url, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  if (result.races.length === 0) {
    result.notes.push("未从候选公开页面解析到可用赛事条目，可能需要 JS 渲染、页面结构变化或公开列表入口调整。");
  }

  result.durationMs = Date.now() - startedAt;
  return result;
}

function describeFailedPage(status: number, text: string): string {
  if (status === 567 && /EdgeOne|Access Restricted|请求已被拦截/i.test(text)) {
    return "HTTP 567 / Tencent Cloud EdgeOne access restricted";
  }
  return `HTTP ${status}`;
}

function enrichRunchinaRace(race: RawRace): RawRace {
  const text = `${race.rawName ?? ""} ${race.rawLocation ?? ""}`;
  return {
    ...race,
    rawType: race.rawType ?? "marathon",
    rawDate: race.rawDate ?? pickFirstDate(text),
    rawDistance: race.rawDistance ?? inferDistanceText(text),
    rawData: {
      ...race.rawData,
      sourceKind: "official_or_association_public_page",
    },
  };
}

function isLikelyRunchinaRace(name?: string): boolean {
  if (!name) return false;
  if (/系统|平台|公告|通知|征集|协会|服务|申报|监管|博览会/.test(name)) return false;
  return /20\d{2}|马拉松|半程|半马|越野|跑/i.test(name) && /马拉松|半程|半马|越野|跑/i.test(name);
}
