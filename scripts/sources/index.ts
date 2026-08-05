import type { RawRaceSource } from "../../types/rawRace.ts";
import { fetchItraSample } from "./itra.ts";
import { fetchRunchinaSample } from "./runchina.ts";
import type { SourceFetchResult } from "./shared.ts";
import { fetchZuicoolSample } from "./zuicool.ts";

export type SourceScore = {
  dataCompleteness: number;
  updateFrequency: number;
  officialTrust: number;
  crawlStability: number;
  requiresJsRendering: "是" | "否" | "未知";
  hasPublicApi: "是" | "否" | "未知";
  requiresLogin: "是" | "否" | "未知";
  antiCrawlRisk: "低" | "中" | "高";
  commercialSustainability: number;
  mvpRecommendationLevel: "A" | "B" | "C" | "D";
};

export type SourceRegistryItem = {
  source: RawRaceSource;
  label: string;
  enabled: boolean;
  fetchSample: (limit: number) => Promise<SourceFetchResult>;
  sampleLimit: number;
  rawSamplePath: string;
  recommendedUse: string[];
  updateStrategy: "日更" | "周更" | "月更" | "手动确认" | "暂不自动更新";
  score: SourceScore;
};

export const sourceRegistry: SourceRegistryItem[] = [
  {
    source: "runchina",
    label: "中国马拉松信息平台 / 田协",
    enabled: true,
    fetchSample: fetchRunchinaSample,
    sampleLimit: 20,
    rawSamplePath: "data/raw/runchina_sample.json",
    recommendedUse: ["官方赛事基准源", "用于认证赛事、赛事名录、权威校验"],
    updateStrategy: "手动确认",
    score: {
      dataCompleteness: 1,
      updateFrequency: 4,
      officialTrust: 5,
      crawlStability: 1,
      requiresJsRendering: "未知",
      hasPublicApi: "未知",
      requiresLogin: "未知",
      antiCrawlRisk: "高",
      commercialSustainability: 3,
      mvpRecommendationLevel: "D",
    },
  },
  {
    source: "zuicool",
    label: "最酷 Zuicool",
    enabled: true,
    fetchSample: fetchZuicoolSample,
    sampleLimit: 20,
    rawSamplePath: "data/raw/zuicool_sample.json",
    recommendedUse: ["公开网页补充源", "用于赛事名称、链接、部分距离信息验证"],
    updateStrategy: "周更",
    score: {
      dataCompleteness: 2,
      updateFrequency: 4,
      officialTrust: 3,
      crawlStability: 4,
      requiresJsRendering: "否",
      hasPublicApi: "未知",
      requiresLogin: "否",
      antiCrawlRisk: "中",
      commercialSustainability: 4,
      mvpRecommendationLevel: "B",
    },
  },
  {
    source: "itra",
    label: "ITRA",
    enabled: true,
    fetchSample: fetchItraSample,
    sampleLimit: 20,
    rawSamplePath: "data/raw/itra_sample.json",
    recommendedUse: ["越野难度和积分体系源", "用于未来越野赛事难度模型"],
    updateStrategy: "暂不自动更新",
    score: {
      dataCompleteness: 1,
      updateFrequency: 4,
      officialTrust: 5,
      crawlStability: 1,
      requiresJsRendering: "是",
      hasPublicApi: "未知",
      requiresLogin: "未知",
      antiCrawlRisk: "中",
      commercialSustainability: 3,
      mvpRecommendationLevel: "D",
    },
  },
];

export function getSourceConfig(source: RawRaceSource): SourceRegistryItem {
  const config = sourceRegistry.find((item) => item.source === source);
  if (!config) throw new Error(`Unknown source: ${source}`);
  return config;
}
