import { fetchJsonWithPolicy, fetchTextWithPolicy, firstMatch, stripHtml, writeJson } from "../connectors/shared.ts";

const TODAY = startOfDay(new Date());
const OUTPUT_PATH = "data/seed/future_top100_seed.json";
const DOC_PATH = "docs/engineering/FUTURE_TOP100_SEED_V1.md";
const RUNCHINA_LIST_URL =
  "https://api-changzheng.chinaath.com/changzheng-content-center-api/api/homePage/official/searchCompetitionMls";
const ZUICOOL_LIST_URL = "https://zuicool.com/events";

type SourceId = "runchina" | "zuicool";
type RegistrationStatus = "registration_open" | "lottery" | "upcoming" | "closed" | "finished" | "unknown";
type RaceType = "marathon" | "half_marathon" | "trail" | "ultra_trail" | "other";

type SeedCategory = {
  categoryName: string | null;
  distanceKm: number | null;
  elevationGain: number | null;
  registrationFee: number | null;
  cutoffTime?: string | null;
  categoryRegistrationUrl?: string | null;
};

type FutureTop100SeedRecord = {
  id: string;
  name: string | null;
  type: RaceType;
  province: string | null;
  city: string | null;
  district: string | null;
  raceDate: string | null;
  registrationStatus: RegistrationStatus;
  registrationUrl: string | null;
  sourceUrl: string | null;
  coverImage?: string | null;
  categories: SeedCategory[];
  sourceIds: SourceId[];
  confidence: number;
  missingFields: string[];
};

type CandidateRecord = FutureTop100SeedRecord & {
  sourcePriority: number;
  popularityScore: number;
};

type RunchinaListItem = {
  raceId: number | string;
  raceName?: string;
  raceGrade?: string;
  raceTime?: string;
  raceAddress?: string;
  raceItem?: string;
  raceScale?: number | string | null;
};

type RunchinaListResponse = {
  success: boolean;
  code: number;
  msg?: string;
  data?: {
    results?: RunchinaListItem[];
  };
};

type ZuicoolCard = {
  eventId: string;
  name: string;
  detailUrl: string;
  dateLocation: string | null;
  statusText: string | null;
  registrationDeadline: string | null;
  coverImage: string | null;
  shortDescription: string | null;
};

type BuildSummary = {
  total: number;
  runchinaSourceCount: number;
  zuicoolSourceCount: number;
  mergedCount: number;
  duplicateGroupCount: number;
  fetched: {
    runchina: number;
    zuicool: number;
  };
  statusCounts: Record<"registration_open" | "lottery" | "upcoming" | "unknown", number>;
  missingFieldCounts: Record<string, number>;
  warnings: string[];
};

export async function buildFutureTop100Seed() {
  const warnings: string[] = [];
  const runchina = await fetchRunchinaCandidates(warnings);
  const zuicool = await fetchZuicoolCandidates(warnings);
  const candidates = [...runchina, ...zuicool].filter(isValuableFutureCandidate);
  const { records, mergedCount, duplicateGroupCount } = selectTopRecords(mergeDuplicates(candidates), 100);
  const summary = summarize(records, {
    warnings,
    fetched: {
      runchina: runchina.length,
      zuicool: zuicool.length,
    },
    mergedCount,
    duplicateGroupCount,
  });
  const output = {
    generatedAt: new Date().toISOString(),
    sourcePolicy: {
      sources: ["runchina", "zuicool"],
      maxRecords: 100,
      futureOnly: true,
      noLogin: true,
      noImageDownload: true,
    },
    summary,
    records,
  };

  await writeJson(OUTPUT_PATH, output);
  await writeJson("data/seed/future_top100_seed_summary.json", summary);
  await writeFutureTop100Doc(summary);
  console.log(`[future-top100] seed records written ${records.length}`);
  console.log(`[future-top100] RunChina source records ${summary.runchinaSourceCount}`);
  console.log(`[future-top100] Zuicool source records ${summary.zuicoolSourceCount}`);
  console.log(`[future-top100] duplicate groups merged ${summary.duplicateGroupCount}`);
  return output;
}

async function fetchRunchinaCandidates(warnings: string[]): Promise<CandidateRecord[]> {
  const records: CandidateRecord[] = [];
  const pageSize = 20;
  const maxPages = 5;

  for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
    try {
      const result = await postRunchina<RunchinaListResponse>({ pageNo, pageSize });
      if (!result.data.success || result.data.code !== 0) {
        warnings.push(`RunChina page ${pageNo} failed: code=${result.data.code} msg=${result.data.msg ?? ""}`);
        break;
      }
      const items = result.data.data?.results ?? [];
      if (!items.length) break;
      records.push(...items.map(runchinaItemToCandidate));
    } catch (error) {
      warnings.push(`RunChina fetch failed on page ${pageNo}: ${error instanceof Error ? error.message : String(error)}`);
      break;
    }
  }

  return records;
}

async function postRunchina<T>(body: Record<string, unknown>) {
  return fetchJsonWithPolicy<T>(
    RUNCHINA_LIST_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Origin: "https://www.runchina.org.cn",
        Referer: "https://www.runchina.org.cn/",
        osId: "1006",
        terminalType: "3",
        machineCode: "racenext-future-top100-seed",
      },
      body: JSON.stringify(body),
    },
    { retries: 1, delayMs: 1_500 },
  );
}

function runchinaItemToCandidate(item: RunchinaListItem): CandidateRecord {
  const location = splitRunchinaAddress(item.raceAddress);
  const name = cleanName(item.raceName ?? null);
  const categories = parseCategories(item.raceItem);
  const raceDate = normalizeDate(item.raceTime);
  const sourceUrl = `https://www.runchina.org.cn/#/race/v/detail/${item.raceId}`;
  const type = inferRaceType(name, categories);
  const record: CandidateRecord = {
    id: `future-runchina-${item.raceId}`,
    name,
    type,
    province: location.province,
    city: location.city,
    district: location.district,
    raceDate,
    registrationStatus: "unknown",
    registrationUrl: null,
    sourceUrl,
    categories,
    sourceIds: ["runchina"],
    confidence: computeConfidence({
      sourceIds: ["runchina"],
      raceDate,
      sourceUrl,
      registrationUrl: null,
      categories,
      province: location.province,
      city: location.city,
    }),
    missingFields: [],
    sourcePriority: 9,
    popularityScore: computePopularityScore(name, location.city, type),
  };
  record.missingFields = findMissingFields(record);
  return record;
}

async function fetchZuicoolCandidates(warnings: string[]): Promise<CandidateRecord[]> {
  const cards: ZuicoolCard[] = [];
  const maxPages = 4;

  for (let page = 1; page <= maxPages; page += 1) {
    try {
      const url = `${ZUICOOL_LIST_URL}?page=${page}&per-page=100`;
      const result = await fetchTextWithPolicy(url, {
        headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
      }, { retries: 1, delayMs: 1_500 });
      const pageCards = parseZuicoolCards(result.text, result.finalUrl);
      if (!pageCards.length) break;
      cards.push(...pageCards);
    } catch (error) {
      warnings.push(`Zuicool list fetch failed on page ${page}: ${error instanceof Error ? error.message : String(error)}`);
      break;
    }
  }

  const uniqueCards = uniqueBy(cards, (card) => card.eventId).slice(0, 120);
  const detailLimit = 35;
  const detailByEventId = new Map<string, Partial<CandidateRecord>>();

  for (const card of uniqueCards.slice(0, detailLimit)) {
    try {
      const result = await fetchTextWithPolicy(card.detailUrl, {
        headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
      }, { retries: 1, delayMs: 1_500 });
      detailByEventId.set(card.eventId, parseZuicoolDetail(result.text, result.finalUrl));
    } catch (error) {
      warnings.push(`Zuicool detail fetch failed for ${card.eventId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return uniqueCards.map((card) => zuicoolCardToCandidate(card, detailByEventId.get(card.eventId)));
}

function parseZuicoolCards(html: string, baseUrl: string): ZuicoolCard[] {
  const matches = [
    ...html.matchAll(
      /<div class="event" style="padding-bottom: 10px">([\s\S]*?)(?=<div class="event" style="padding-bottom: 10px">|<nav class="pagination-wrap">)/g,
    ),
  ];
  const cards: ZuicoolCard[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const block = match[1];
    const eventId = block.match(/zuicool\.com\/event\/(\d+)/)?.[1];
    if (!eventId || seen.has(eventId)) continue;
    seen.add(eventId);
    const name = stripHtml(block.match(/<h4 class="name">([\s\S]*?)<\/h4>/)?.[1] ?? "");
    if (!name) continue;
    const info = stripHtml(block.match(/<div class="info">([\s\S]*?)<\/div>/)?.[1] ?? "");
    cards.push({
      eventId,
      name,
      detailUrl: `https://zuicool.com/event/${eventId}`,
      dateLocation: info || null,
      statusText: stripHtml(block.match(/class="status_bth[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "") || null,
      registrationDeadline: block.match(/报名截止：([^<]+)/)?.[1]?.trim() ?? null,
      coverImage: absolutize(block.match(/<img src="([^"]+)" class="logo"/)?.[1], baseUrl),
      shortDescription: stripHtml(block.match(/<p style="font-size: 12px;[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "") || null,
    });
  }

  return cards;
}

function parseZuicoolDetail(html: string, baseUrl: string): Partial<CandidateRecord> {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const registrationUrl = absolutize(
    html.match(/href=["'](https:\/\/reg\.zuicool\.com\/\d+)["'][^>]*>\s*点此报名\s*<\/a>/i)?.[1] ??
      html.match(/href=["'](https:\/\/reg\.zuicool\.com\/\d+)["']/i)?.[1],
    baseUrl,
  );
  const coverImage = absolutize(
    firstMatch(html, /<meta[^>]+(?:name|property)=["']og:image["'][^>]+content=["']([^"']*)["']/i) ?? undefined,
    baseUrl,
  );
  return {
    name: title ? cleanName(stripHtml(title)) : null,
    registrationUrl,
    coverImage,
    categories: parseZuicoolCategories(html, baseUrl),
  };
}

function parseZuicoolCategories(html: string, baseUrl: string): SeedCategory[] {
  const blocks = [...html.matchAll(/<div class="pkg2">([\s\S]*?)(?=<div class="pkg2">|<div class="clearfix">)/g)];
  return blocks.map((match) => categoryFromHtml(match[1], baseUrl)).filter((category) => Boolean(category.categoryName));
}

function categoryFromHtml(block: string, baseUrl: string): SeedCategory {
  const categoryName = stripHtml(block.match(/<h[45][^>]*>([\s\S]*?)<\/h[45]>/)?.[1] ?? "") || null;
  const rawText = stripHtml(block) || "";
  const feeText = block.match(/<div class="price">\s*([\d.]+)/)?.[1] ?? null;
  return {
    categoryName,
    distanceKm: inferDistance(`${categoryName ?? ""} ${rawText}`),
    elevationGain: inferElevation(rawText),
    registrationFee: feeText ? Number(feeText) : null,
    cutoffTime: inferCutoff(rawText),
    categoryRegistrationUrl: absolutize(block.match(/href=["'](https:\/\/reg\.zuicool\.com\/\d+\/\d+)["']/i)?.[1], baseUrl),
  };
}

function zuicoolCardToCandidate(card: ZuicoolCard, detail?: Partial<CandidateRecord>): CandidateRecord {
  const location = parseZuicoolDateLocation(card.dateLocation);
  const name = cleanName(detail?.name ?? card.name);
  const categories = detail?.categories?.length ? detail.categories : parseCategories(name ?? "");
  const registrationUrl = detail?.registrationUrl ?? null;
  const status = normalizeStatus(card.statusText, registrationUrl, location.date);
  const type = inferRaceType(name, categories);
  const record: CandidateRecord = {
    id: `future-zuicool-${card.eventId}`,
    name,
    type,
    province: location.province,
    city: location.city,
    district: location.district,
    raceDate: location.date,
    registrationStatus: status,
    registrationUrl,
    sourceUrl: card.detailUrl,
    coverImage: detail?.coverImage ?? card.coverImage,
    categories,
    sourceIds: ["zuicool"],
    confidence: computeConfidence({
      sourceIds: ["zuicool"],
      raceDate: location.date,
      sourceUrl: card.detailUrl,
      registrationUrl,
      categories,
      province: location.province,
      city: location.city,
    }),
    missingFields: [],
    sourcePriority: 8,
    popularityScore: computePopularityScore(name, location.city, type),
  };
  record.missingFields = findMissingFields(record);
  return record;
}

function mergeDuplicates(records: CandidateRecord[]): CandidateRecord[] {
  const groups = new Map<string, CandidateRecord[]>();
  for (const record of records) {
    const key = `${normalizeDedupeName(record.name ?? record.id)}|${record.city ?? ""}|${record.raceDate?.slice(0, 4) ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.values()].map(mergeGroup);
}

function mergeGroup(records: CandidateRecord[]): CandidateRecord {
  if (records.length === 1) return records[0];
  const runchina = records.find((record) => record.sourceIds.includes("runchina"));
  const zuicool = records.find((record) => record.sourceIds.includes("zuicool"));
  const base = runchina ?? zuicool ?? records[0];
  const categories = mergeCategories(records.flatMap((record) => record.categories));
  const registrationUrl = zuicool?.registrationUrl ?? runchina?.registrationUrl ?? firstValue(records, "registrationUrl");
  const sourceUrl = zuicool?.sourceUrl ?? runchina?.sourceUrl ?? firstValue(records, "sourceUrl");
  const sourceIds = unique(records.flatMap((record) => record.sourceIds));
  const merged: CandidateRecord = {
    ...base,
    id: `future-merged-${normalizeDedupeName(base.name ?? base.id)}-${base.city ?? "unknown"}-${base.raceDate?.slice(0, 4) ?? "unknown"}`,
    name: base.name ?? firstValue(records, "name"),
    province: base.province ?? firstValue(records, "province"),
    city: base.city ?? firstValue(records, "city"),
    district: base.district ?? firstValue(records, "district"),
    raceDate: base.raceDate ?? firstValue(records, "raceDate"),
    registrationStatus: normalizeMergedStatus(records, registrationUrl),
    registrationUrl,
    sourceUrl,
    coverImage: zuicool?.coverImage ?? firstValue(records, "coverImage"),
    categories,
    sourceIds,
    confidence: Number(Math.min(0.98, records.reduce((sum, record) => sum + record.confidence, 0) / records.length + 0.06).toFixed(2)),
    missingFields: [],
    sourcePriority: Math.max(...records.map((record) => record.sourcePriority)),
    popularityScore: Math.max(...records.map((record) => record.popularityScore)),
  };
  merged.type = inferRaceType(merged.name, merged.categories);
  merged.missingFields = findMissingFields(merged);
  return merged;
}

function selectTopRecords(records: CandidateRecord[], limit: number) {
  const duplicateGroupCount = records.filter((record) => record.sourceIds.length > 1).length;
  const sorted = records.sort((a, b) => scoreTopCandidate(b) - scoreTopCandidate(a) || datePriority(a) - datePriority(b));
  const selected: CandidateRecord[] = [];
  const targetMix: Record<RaceType, number> = {
    marathon: 24,
    half_marathon: 18,
    trail: 18,
    ultra_trail: 18,
    other: 8,
  };

  for (const type of Object.keys(targetMix) as RaceType[]) {
    for (const record of sorted.filter((item) => item.type === type)) {
      if (selected.length >= limit) break;
      if (selected.filter((item) => item.type === type).length >= targetMix[type]) break;
      if (!selected.some((item) => item.id === record.id)) selected.push(record);
    }
  }

  for (const record of sorted) {
    if (selected.length >= limit) break;
    if (!selected.some((item) => item.id === record.id)) selected.push(record);
  }

  return {
    records: selected.sort((a, b) => datePriority(a) - datePriority(b)).map(stripCandidateMeta),
    mergedCount: selected.filter((record) => record.sourceIds.length > 1).length,
    duplicateGroupCount,
  };
}

function scoreTopCandidate(record: CandidateRecord): number {
  let score = record.popularityScore + record.sourcePriority;
  if (record.registrationStatus === "registration_open") score += 30;
  if (record.registrationStatus === "lottery") score += 28;
  if (record.registrationStatus === "upcoming") score += 18;
  if (record.registrationUrl) score += 24;
  if (record.sourceUrl) score += 12;
  if (record.raceDate) score += 12;
  if (record.categories.length) score += 10;
  if (record.type === "marathon" || record.type === "half_marathon") score += 6;
  if (record.type === "trail" || record.type === "ultra_trail") score += 8;
  score += Math.max(0, 12 - Math.floor(datePriority(record) / 45));
  return score;
}

function isValuableFutureCandidate(record: CandidateRecord): boolean {
  if (!record.sourceUrl) return false;
  if (!record.raceDate) return record.registrationStatus !== "closed" && record.registrationStatus !== "finished";
  if (isBeforeToday(record.raceDate)) return false;
  if (record.registrationStatus === "finished") return false;
  if (record.registrationStatus === "closed" && !record.registrationUrl) return false;
  return true;
}

function summarize(
  records: FutureTop100SeedRecord[],
  meta: {
    warnings: string[];
    fetched: BuildSummary["fetched"];
    mergedCount: number;
    duplicateGroupCount: number;
  },
): BuildSummary {
  const missingFieldCounts: Record<string, number> = {};
  for (const record of records) {
    for (const field of record.missingFields) {
      missingFieldCounts[field] = (missingFieldCounts[field] ?? 0) + 1;
    }
  }
  return {
    total: records.length,
    runchinaSourceCount: records.filter((record) => record.sourceIds.includes("runchina")).length,
    zuicoolSourceCount: records.filter((record) => record.sourceIds.includes("zuicool")).length,
    mergedCount: meta.mergedCount,
    duplicateGroupCount: meta.duplicateGroupCount,
    fetched: meta.fetched,
    statusCounts: {
      registration_open: records.filter((record) => record.registrationStatus === "registration_open").length,
      lottery: records.filter((record) => record.registrationStatus === "lottery").length,
      upcoming: records.filter((record) => record.registrationStatus === "upcoming").length,
      unknown: records.filter((record) => record.registrationStatus === "unknown").length,
    },
    missingFieldCounts,
    warnings: meta.warnings,
  };
}

async function writeFutureTop100Doc(summary: BuildSummary) {
  const content = `# Future Top100 Seed V1

Date: ${new Date().toISOString().slice(0, 10)}

## 1. 本轮目标

建立第一版未来赛事数据池 \`future_top100_seed\`，只处理数据，不修改 RaceNext 前端 UI。

## 2. 数据来源

- RunChina：中国马拉松信息平台公开赛事列表，用于赛事身份、日期、城市、路跑认证赛事。
- Zuicool：最酷公开赛事列表和公开赛事详情页，用于报名链接、费用、组别、越野赛事、图片 URL 字段保存。

本轮未接入 Official、ITRA、数据库或任何需要登录的数据源。

## 3. 获取方法

- RunChina：公开 API 有限分页抓取，pageSize=20，最多 5 页。
- Zuicool：公开 HTML 列表有限分页抓取，最多 4 页；详情页最多 35 条，用于补充报名链接和组别。
- 请求使用现有 Connector policy，包含 User-Agent、重试和 1.5 秒级低频间隔。

## 4. 筛选规则

保留未来赛事、报名中、抽签中、即将开放、以及信息待更新但有 sourceUrl 的赛事。

过滤已结束赛事、明显早于今天的赛事、无 sourceUrl 的记录、以及已截止且无报名链接的低价值记录。

## 5. Top100 选择规则

排序优先考虑报名中 / 抽签中、有 registrationUrl、有 sourceUrl、有明确 raceDate、有组别距离、热门城市 / 热门赛事、类型覆盖均衡、日期从近到远。

## 6. 输出字段

\`data/seed/future_top100_seed.json\` 每条记录包含：

- id
- name
- type
- province / city / district
- raceDate
- registrationStatus
- registrationUrl
- sourceUrl
- coverImage
- categories
- sourceIds
- confidence
- missingFields

缺失字段使用 \`null\`，不编造。

## 7. 实际生成数量

- 总数：${summary.total}
- RunChina 来源：${summary.runchinaSourceCount}
- Zuicool 来源：${summary.zuicoolSourceCount}
- 去重合并：${summary.mergedCount}
- 疑似重复组：${summary.duplicateGroupCount}

## 8. 缺失字段情况

\`\`\`json
${JSON.stringify(summary.missingFieldCounts, null, 2)}
\`\`\`

## 9. 风险

- RunChina 列表对报名链接覆盖较弱，更多适合作为路跑身份和日期基准。
- Zuicool 列表可补充报名与组别，但部分赛事详情或报名页可能缺字段。
- 当前去重仍是规则去重，同名同城同年可能覆盖大多数情况，但跨城市命名和延期赛事需要后续人工复核。
- 本轮没有下载图片，只保存公开图片 URL 字段。

## 10. 下一步建议

- 对热门城市马拉松建立人工白名单，提高 Top100 排序稳定性。
- 为 Zuicool 详情页解析补充更多组别结构识别。
- 在不改变 UI 的前提下继续提升 adapter 对低字段完整度记录的兼容。

## Warnings

${summary.warnings.length ? summary.warnings.map((warning) => `- ${warning}`).join("\n") : "- None"}
`;
  await writeJson(DOC_PATH.replace(/\.md$/, ".json"), { generatedAt: new Date().toISOString(), summary });
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir("docs/engineering", { recursive: true });
  await writeFile(DOC_PATH, content, "utf8");
}

function stripCandidateMeta(record: CandidateRecord): FutureTop100SeedRecord {
  const { sourcePriority: _sourcePriority, popularityScore: _popularityScore, ...seed } = record;
  return seed;
}

function splitRunchinaAddress(address?: string) {
  const parts = (address ?? "").split("/").map((part) => part.trim()).filter(Boolean);
  return {
    province: parts[0] ?? null,
    city: parts[1] ?? null,
    district: parts[2] ?? null,
  };
}

function parseZuicoolDateLocation(value: string | null) {
  if (!value) return { date: null, province: null, city: null, district: null };
  const [dateText, locationText = ""] = value.split("·").map((part) => part.trim());
  const parts = locationText.split(/\s+/).filter(Boolean);
  return {
    date: normalizeDate(dateText),
    province: parts[0] ?? null,
    city: parts[1] ?? null,
    district: parts[2] ?? null,
  };
}

function parseCategories(value?: string | null): SeedCategory[] {
  if (!value) return [];
  let items = [value];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) items = parsed.map(String);
  } catch {
    items = value.split(/[、,，/]/).map((part) => part.trim()).filter(Boolean);
  }
  return unique(items).map((categoryName) => ({
    categoryName,
    distanceKm: inferDistance(categoryName),
    elevationGain: inferElevation(categoryName),
    registrationFee: null,
    cutoffTime: inferCutoff(categoryName),
    categoryRegistrationUrl: null,
  }));
}

function mergeCategories(categories: SeedCategory[]): SeedCategory[] {
  const byKey = new Map<string, SeedCategory>();
  for (const category of categories) {
    const key = `${category.categoryName ?? ""}|${category.distanceKm ?? ""}`;
    if (!key.trim()) continue;
    const existing = byKey.get(key);
    byKey.set(key, {
      ...existing,
      ...category,
      registrationFee: category.registrationFee ?? existing?.registrationFee ?? null,
      elevationGain: category.elevationGain ?? existing?.elevationGain ?? null,
      cutoffTime: category.cutoffTime ?? existing?.cutoffTime ?? null,
      categoryRegistrationUrl: category.categoryRegistrationUrl ?? existing?.categoryRegistrationUrl ?? null,
    });
  }
  return [...byKey.values()];
}

function normalizeStatus(value: string | null, registrationUrl: string | null, raceDate: string | null): RegistrationStatus {
  if (raceDate && isBeforeToday(raceDate)) return "finished";
  if (registrationUrl) return "registration_open";
  if (!value) return "unknown";
  if (/抽签|摇号|lottery/i.test(value)) return "lottery";
  if (/报名|点此|一键报名|open/i.test(value)) return "registration_open";
  if (/即将|预告|upcoming/i.test(value)) return "upcoming";
  if (/截止|关闭|closed/i.test(value)) return "closed";
  if (/结束|已结束|finished/i.test(value)) return "finished";
  return "unknown";
}

function normalizeMergedStatus(records: CandidateRecord[], registrationUrl: string | null): RegistrationStatus {
  if (registrationUrl) return "registration_open";
  if (records.some((record) => record.registrationStatus === "lottery")) return "lottery";
  if (records.some((record) => record.registrationStatus === "upcoming")) return "upcoming";
  if (records.some((record) => record.registrationStatus === "registration_open")) return "registration_open";
  return records[0].registrationStatus;
}

function normalizeDate(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(20\d{2})[./\-年](\d{1,2})(?:[./\-月](\d{1,2}))?/);
  if (!match || !match[3]) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function inferRaceType(name: string | null, categories: SeedCategory[]): RaceType {
  const text = `${name ?? ""} ${categories.map((category) => category.categoryName ?? "").join(" ")}`;
  const max = Math.max(...categories.map((category) => category.distanceKm ?? 0), 0);
  if (/越野|跑山|山径|trail|FUGA|贡嘎|柴古|UTMB/i.test(text)) return max >= 50 ? "ultra_trail" : "trail";
  if (categories.some((category) => category.distanceKm && category.distanceKm >= 40 && category.distanceKm < 50)) return "marathon";
  if (categories.length && Math.max(...categories.map((category) => category.distanceKm ?? 0)) <= 22) return "half_marathon";
  if (/半程|半马/.test(text)) return "half_marathon";
  if (/马拉松/.test(text)) return "marathon";
  return "other";
}

function inferDistance(value: string): number | null {
  if (/半程|半马/.test(value)) return 21.1;
  if (/全程|全马|马拉松/.test(value) && !/半程|半马/.test(value)) return 42.2;
  const match = value.match(/(\d+(?:\.\d+)?)\s?(?:km|KM|公里|K)/);
  return match ? Number(match[1]) : null;
}

function inferElevation(value: string): number | null {
  const match = value.match(/(?:累计爬升|爬升|D\+)\s*(\d{3,5})\s*(?:米|m)?/i);
  return match ? Number(match[1]) : null;
}

function inferCutoff(value: string): string | null {
  return value.match(/关门时间([^，。；;]+)/)?.[0] ?? null;
}

function computeConfidence(input: {
  sourceIds: SourceId[];
  raceDate: string | null;
  sourceUrl: string | null;
  registrationUrl: string | null;
  categories: SeedCategory[];
  province: string | null;
  city: string | null;
}) {
  let confidence = input.sourceIds.includes("runchina") ? 0.68 : 0.62;
  if (input.sourceIds.length > 1) confidence += 0.12;
  if (input.raceDate) confidence += 0.08;
  if (input.sourceUrl) confidence += 0.04;
  if (input.registrationUrl) confidence += 0.08;
  if (input.categories.length) confidence += 0.06;
  if (input.province && input.city) confidence += 0.04;
  return Number(Math.min(0.96, confidence).toFixed(2));
}

function findMissingFields(record: FutureTop100SeedRecord): string[] {
  const missing: string[] = [];
  for (const field of ["name", "province", "city", "raceDate", "registrationUrl", "sourceUrl"] as const) {
    if (!record[field]) missing.push(field);
  }
  if (!record.categories.length) missing.push("categories");
  return missing;
}

function computePopularityScore(name: string | null, city: string | null, type: RaceType): number {
  const text = `${name ?? ""} ${city ?? ""}`;
  let score = 0;
  if (/北京|上海|广州|深圳|杭州|南京|成都|重庆|武汉|西安|厦门|苏州|无锡|长沙|郑州|青岛|兰州|太原/.test(text)) score += 18;
  if (/马拉松|半程马拉松|越野|UTMB|贡嘎|柴古|崇礼|江南|黄山|莫干山|四姑娘山/.test(text)) score += 12;
  if (type === "marathon") score += 8;
  if (type === "half_marathon") score += 6;
  if (type === "trail" || type === "ultra_trail") score += 8;
  return score;
}

function cleanName(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/- 最酷ZUICOOL.*$/i, "")
    .replace(/报名.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDedupeName(value: string): string {
  return value
    .replace(/^\s*20\d{2}\s*/g, "")
    .replace(/\s*20\d{2}\s*$/g, "")
    .replace(/[·・\-—“”"']/g, "")
    .replace(/（.*?）|\(.*?\)/g, "")
    .replace(/赛$/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

function datePriority(record: Pick<FutureTop100SeedRecord, "raceDate">): number {
  if (!record.raceDate) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.round((new Date(`${record.raceDate}T00:00:00+08:00`).getTime() - TODAY.getTime()) / 86_400_000));
}

function isBeforeToday(date: string): boolean {
  return new Date(`${date}T23:59:59+08:00`).getTime() < TODAY.getTime();
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function firstValue<K extends keyof CandidateRecord>(records: CandidateRecord[], key: K): CandidateRecord[K] | null {
  return records.find((record) => Boolean(record[key]))?.[key] ?? null;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function absolutize(url: string | undefined, baseUrl: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
}

if (process.argv[1]?.endsWith("buildFutureTop100Seed.ts")) {
  buildFutureTop100Seed().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
