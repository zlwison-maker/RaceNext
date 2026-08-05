import type { ConnectorOutput, SourceRecord } from "../../types/sourceRecord.ts";
import { CONNECTOR_PIPELINE_VERSION, ConnectorStopError, fetchJsonWithPolicy, logStep, writeJson } from "./shared.ts";

const SOURCE_ID = "runchina" as const;
const SOURCE_NAME = "中国马拉松信息平台";
const SOURCE_TYPE = "Aggregator" as const;
const LIST_URL =
  "https://api-changzheng.chinaath.com/changzheng-content-center-api/api/homePage/official/searchCompetitionMls";
const DETAIL_URL =
  "https://api-changzheng.chinaath.com/changzheng-content-center-api/api/homePage/official/searchById";
const OUTPUT_PATH = "data/raw/runchina_sample.json";

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
    totalCount?: number;
    pageNo?: number;
  };
};

type RunchinaDetailResponse = {
  success: boolean;
  code: number;
  msg?: string;
  data?: {
    type?: string;
    ssdetails?: Record<string, unknown>;
    xwggdetails?: Record<string, unknown> | null;
  };
};

export async function fetchRunchinaConnectorSample(options: { pageSize?: number; detailLimit?: number } = {}): Promise<ConnectorOutput> {
  const startedAt = new Date().toISOString();
  const pageSize = Math.min(options.pageSize ?? 20, 20);
  const detailLimit = Math.min(options.detailLimit ?? 5, 5);
  const warnings: string[] = [];
  let stoppedReason: string | null = null;
  let detailCount = 0;

  logStep("RunChina list fetch started", { pageSize });
  const records: SourceRecord[] = [];

  try {
    const listResult = await postJson<RunchinaListResponse>(LIST_URL, { pageNo: 1, pageSize });
    if (!listResult.data.success || listResult.data.code !== 0) {
      throw new Error(`RunChina list API failed: code=${listResult.data.code} msg=${listResult.data.msg ?? ""}`);
    }

    const items = (listResult.data.data?.results ?? []).slice(0, pageSize);
    const detailByRaceId = new Map<string, RunchinaDetailResponse["data"]>();

    for (const item of items.slice(0, detailLimit)) {
      const rawId = String(item.raceId);
      try {
        logStep("RunChina detail fetch", { rawId });
        const detailResult = await postJson<RunchinaDetailResponse>(DETAIL_URL, {
          id: item.raceId,
          type: "SS",
          pageTitleLevelTwo: "",
        });
        if (detailResult.data.success && detailResult.data.code === 0) {
          detailByRaceId.set(rawId, detailResult.data.data);
          detailCount += 1;
        } else {
          warnings.push(`detail failed for ${rawId}: code=${detailResult.data.code} msg=${detailResult.data.msg ?? ""}`);
        }
      } catch (error) {
        if (error instanceof ConnectorStopError) throw error;
        warnings.push(`detail request failed for ${rawId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    for (const item of items) {
      const rawId = String(item.raceId);
      const detail = detailByRaceId.get(rawId);
      const ssdetails = detail?.ssdetails ?? {};
      const extractedFields = extractListFields(item, ssdetails);
      records.push({
        sourceId: SOURCE_ID,
        sourceName: SOURCE_NAME,
        sourceType: SOURCE_TYPE,
        sourceUrl: `https://www.runchina.org.cn/#/race/v/detail/${rawId}`,
        rawId,
        fetchedAt: new Date().toISOString(),
        rawData: {
          listItem: item,
          detail,
          listApi: LIST_URL,
          detailApi: detail ? DETAIL_URL : null,
        },
        extractedFields,
        dataQuality: detail ? "high" : "medium",
        warnings: buildRecordWarnings(extractedFields, Boolean(detail)),
      });
    }
  } catch (error) {
    stoppedReason = error instanceof Error ? error.message : String(error);
    warnings.push(stoppedReason);
  }

  const output: ConnectorOutput = {
    pipelineVersion: CONNECTOR_PIPELINE_VERSION,
    summary: {
      sourceId: SOURCE_ID,
      sourceName: SOURCE_NAME,
      startedAt,
      finishedAt: new Date().toISOString(),
      listCount: records.length,
      detailCount,
      recordsCount: records.length,
      warnings,
      stoppedReason,
    },
    records,
  };

  await writeJson(OUTPUT_PATH, output);
  logStep("RunChina connector finished", output.summary);
  return output;
}

async function postJson<T>(url: string, body: Record<string, unknown>) {
  return fetchJsonWithPolicy<T>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      Origin: "https://www.runchina.org.cn",
      Referer: "https://www.runchina.org.cn/",
      osId: "1006",
      terminalType: "3",
      machineCode: "racenext-connector-poc",
    },
    body: JSON.stringify(body),
  });
}

function extractListFields(item: RunchinaListItem, detail: Record<string, unknown>): Record<string, unknown> {
  const detailName = typeof detail.name === "string" ? detail.name : undefined;
  const gameDate = typeof detail.gameDate === "string" ? detail.gameDate : undefined;
  const province = typeof detail.province === "string" ? detail.province : undefined;
  const city = typeof detail.city === "string" ? detail.city : undefined;
  const area = typeof detail.area === "string" ? detail.area : undefined;
  const project = typeof detail.project === "string" ? detail.project : undefined;

  return {
    name: detailName ?? item.raceName ?? null,
    raceDate: normalizeDate(gameDate ?? item.raceTime),
    rawDate: gameDate ?? item.raceTime ?? null,
    province: province ?? splitAddress(item.raceAddress)[0] ?? null,
    city: city ?? splitAddress(item.raceAddress)[1] ?? null,
    district: area ?? splitAddress(item.raceAddress)[2] ?? null,
    venue: null,
    raceGrade: detail.raceGrade ?? item.raceGrade ?? null,
    categories: parseRaceItems(project ?? item.raceItem),
    registrationStatus: normalizeShowStatus(detail.showStatus),
    registrationUrl: typeof detail.joinUrl === "string" ? detail.joinUrl : null,
    officialWebsite: typeof detail.webUrl === "string" ? detail.webUrl : null,
    capacity: detail.scale ?? item.raceScale ?? null,
    organizer: detail.compNameOrganizer ?? null,
  };
}

function splitAddress(address?: string): string[] {
  return (address ?? "").split("/").map((part) => part.trim()).filter(Boolean);
}

function parseRaceItems(value?: string): Array<{ categoryName: string | null; distanceKm: number | null }> {
  if (!value) return [];
  let items: string[] = [value];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) items = parsed.map(String);
  } catch {
    items = value.split(/[、,，/]/).map((part) => part.trim()).filter(Boolean);
  }
  return items.map((categoryName) => ({
    categoryName,
    distanceKm: inferDistance(categoryName),
  }));
}

function inferDistance(value: string): number | null {
  if (/半程|半马/.test(value)) return 21.1;
  if (/全程|全马|马拉松/.test(value)) return 42.2;
  const match = value.match(/(\d+(?:\.\d+)?)\s?(?:km|KM|公里)/);
  return match ? Number(match[1]) : null;
}

function normalizeDate(value?: string): string | null {
  if (!value) return null;
  const match = value.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function normalizeShowStatus(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function buildRecordWarnings(extractedFields: Record<string, unknown>, hasDetail: boolean): string[] {
  const warnings: string[] = [];
  if (!hasDetail) warnings.push("detail_not_fetched");
  if (!extractedFields.registrationUrl) warnings.push("registration_url_missing");
  if (!extractedFields.venue) warnings.push("venue_missing");
  return warnings;
}

if (process.argv[1]?.endsWith("runchinaConnector.ts")) {
  fetchRunchinaConnectorSample().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
