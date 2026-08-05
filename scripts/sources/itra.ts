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

const SOURCE = "itra" as const;
const CANDIDATE_PAGES = [
  "https://itra.run",
  "https://itra.run/Races/RaceCalendar",
  "https://itra.run/Races",
  "https://itra.run/Calendar",
];

export async function fetchItraSample(limit = 20): Promise<SourceFetchResult> {
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
        .map(enrichItraRace)
        .filter((race) => isLikelyItraRace(race.rawName));
      result.races.push(...extracted);
      result.races = uniqueByNameAndUrl(result.races).slice(0, limit);
    } catch (error) {
      result.failedPages.push({ url, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  if (result.races.length === 0) {
    result.notes.push("未从 ITRA 候选公开页面解析到赛事样本，Race Calendar 可能需要 JS/API 渲染。");
  }

  result.durationMs = Date.now() - startedAt;
  return result;
}

function enrichItraRace(race: RawRace): RawRace {
  const text = `${race.rawName ?? ""} ${race.rawLocation ?? ""}`;
  return {
    ...race,
    rawType: race.rawType ?? "trail",
    rawDate: race.rawDate ?? pickFirstDate(text),
    rawDistance: race.rawDistance ?? inferDistanceText(text),
    rawTags: [...(race.rawTags ?? []), "ITRA"],
    rawData: {
      ...race.rawData,
      sourceKind: "trail_rating_public_page",
    },
  };
}

function isLikelyItraRace(name?: string): boolean {
  if (!name) return false;
  if (/^(races?|race calendar|race results?|race map|events?|calendar)$/i.test(name.trim())) return false;
  if (/login|sign in|register|organization|runner|contact|about|discover trail-running/i.test(name)) return false;
  return /20\d{2}|\d+\s?(?:km|k\b)|trail|ultra|marathon|mountain/i.test(name);
}
