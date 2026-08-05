import { mkdir, writeFile } from "node:fs/promises";
import { mergeRaces, type MergeReviewItem, type MergeSummary } from "./merge/mergeRaces.ts";
import { dedupeRaces, type DedupeSummary, type DuplicateGroup } from "./normalize/dedupeRace.ts";
import { normalizeRaces, type NormalizedRace } from "./normalize/normalizeRace.ts";
import { getSourceConfig, sourceRegistry, type SourceRegistryItem } from "./sources/index.ts";
import { logError, logInfo, type SourceFetchResult } from "./sources/shared.ts";
import type { RawRace, RawRaceSource } from "../types/rawRace.ts";

const RAW_DIR = "data/raw";
const NORMALIZED_DIR = "data/normalized";
const REPORT_PATH = "docs/DATA_SOURCE_POC.md";
const JSON_REPORT_PATH = `${NORMALIZED_DIR}/data_source_poc_report.json`;
const NORMALIZED_SAMPLE_PATH = `${NORMALIZED_DIR}/races_sample.json`;
const CANONICAL_SAMPLE_PATH = `${NORMALIZED_DIR}/canonical_races_sample.json`;
const PIPELINE_VERSION = "data-poc-v0.3";

type FieldCoverageItem = {
  field: keyof RawRace;
  totalPresent: number;
  total: number;
  bySource: Record<RawRaceSource, { present: number; total: number }>;
  primarySources: RawRaceSource[];
  missingReason: string;
  manualAction: string;
};

type DataQualitySummary = Record<string, number>;

type JsonReport = {
  generatedAt: string;
  pipelineVersion: string;
  sourceResults: Array<{
    source: RawRaceSource;
    label: string;
    enabled: boolean;
    sampleLimit: number;
    sampleCount: number;
    durationMs: number;
    candidatePages: string[];
    accessiblePages: string[];
    failedPages: SourceFetchResult["failedPages"];
    failureCategories: string[];
    notes: string[];
    score: SourceRegistryItem["score"];
    recommendedUse: string[];
    updateStrategy: SourceRegistryItem["updateStrategy"];
  }>;
  fieldCoverage: FieldCoverageItem[];
  dataQuality: DataQualitySummary;
  dedupeSummary: DedupeSummary;
  duplicateGroups: DuplicateGroup[];
  mergeSummary: MergeSummary;
  mergeReviewList: MergeReviewItem[];
  recommendations: Array<{
    source: RawRaceSource;
    label: string;
    recommendation: string;
    updateStrategy: SourceRegistryItem["updateStrategy"];
    mvpRecommendationLevel: SourceRegistryItem["score"]["mvpRecommendationLevel"];
  }>;
};

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(NORMALIZED_DIR, { recursive: true });
  await mkdir("docs", { recursive: true });

  logInfo("RaceNext data POC started", { pipelineVersion: PIPELINE_VERSION });
  const generatedAt = new Date().toISOString();
  const sourceResults = await runSources();
  for (const result of sourceResults) {
    await writeJson(getSourceConfig(result.source).rawSamplePath, result.races);
  }

  const rawRaces = sourceResults.flatMap((result) => result.races);
  const normalized = normalizeRaces(rawRaces);
  const { races, dedupeSummary, duplicateGroups } = dedupeRaces(normalized);
  const { canonicalRaces, mergeSummary, mergeReviewList } = mergeRaces(normalized, duplicateGroups);
  const fieldCoverage = buildFieldCoverage(sourceResults);
  const dataQuality = buildDataQuality(races);
  const jsonReport = buildJsonReport(
    generatedAt,
    sourceResults,
    fieldCoverage,
    dataQuality,
    dedupeSummary,
    duplicateGroups,
    mergeSummary,
    mergeReviewList,
  );

  await writeJson(NORMALIZED_SAMPLE_PATH, {
    pipelineVersion: PIPELINE_VERSION,
    generatedAt,
    races,
    dedupeSummary,
    duplicateGroups,
  });
  await writeJson(CANONICAL_SAMPLE_PATH, {
    pipelineVersion: PIPELINE_VERSION,
    generatedAt,
    canonicalRaces,
    mergeSummary,
    mergeReviewList,
  });
  await writeJson(JSON_REPORT_PATH, jsonReport);
  await writeFile(REPORT_PATH, buildMarkdownReport(jsonReport, races), "utf8");

  logInfo("RaceNext data POC finished", {
    rawSamples: sourceRegistry.map((source) => source.rawSamplePath),
    normalizedSample: NORMALIZED_SAMPLE_PATH,
    canonicalSample: CANONICAL_SAMPLE_PATH,
    report: REPORT_PATH,
    jsonReport: JSON_REPORT_PATH,
    rawTotal: dedupeSummary.rawTotal,
    dedupedTotal: dedupeSummary.dedupedTotal,
    possibleDuplicates: dedupeSummary.possibleDuplicateTotal,
  });
}

async function runSources(): Promise<SourceFetchResult[]> {
  const results: SourceFetchResult[] = [];
  for (const config of sourceRegistry.filter((item) => item.enabled)) {
    const startedAt = Date.now();
    try {
      logInfo("Fetching source sample", { source: config.source, limit: config.sampleLimit });
      const result = await config.fetchSample(config.sampleLimit);
      results.push({
        ...result,
        durationMs: result.durationMs || Date.now() - startedAt,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logError("Source failed; pipeline continued", { source: config.source, reason });
      results.push({
        source: config.source,
        races: [],
        candidatePages: [],
        accessiblePages: [],
        failedPages: [{ url: "source runner", reason }],
        notes: ["source failed at runner level; pipeline continued"],
        durationMs: Date.now() - startedAt,
      });
    }
  }
  return results;
}

async function writeJson(path: string, data: unknown) {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildJsonReport(
  generatedAt: string,
  results: SourceFetchResult[],
  fieldCoverage: FieldCoverageItem[],
  dataQuality: DataQualitySummary,
  dedupeSummary: DedupeSummary,
  duplicateGroups: DuplicateGroup[],
  mergeSummary: MergeSummary,
  mergeReviewList: MergeReviewItem[],
): JsonReport {
  return {
    generatedAt,
    pipelineVersion: PIPELINE_VERSION,
    sourceResults: results.map((result) => {
      const config = getSourceConfig(result.source);
      return {
        source: result.source,
        label: config.label,
        enabled: config.enabled,
        sampleLimit: config.sampleLimit,
        sampleCount: result.races.length,
        durationMs: result.durationMs,
        candidatePages: result.candidatePages,
        accessiblePages: result.accessiblePages,
        failedPages: result.failedPages,
        failureCategories: classifyFailures(result),
        notes: result.notes,
        score: config.score,
        recommendedUse: config.recommendedUse,
        updateStrategy: config.updateStrategy,
      };
    }),
    fieldCoverage,
    dataQuality,
    dedupeSummary,
    duplicateGroups,
    mergeSummary,
    mergeReviewList,
    recommendations: results.map((result) => {
      const config = getSourceConfig(result.source);
      return {
        source: result.source,
        label: config.label,
        recommendation: recommendationFor(result, config),
        updateStrategy: config.updateStrategy,
        mvpRecommendationLevel: config.score.mvpRecommendationLevel,
      };
    }),
  };
}

function buildMarkdownReport(report: JsonReport, normalizedRaces: NormalizedRace[]): string {
  return `# RaceNext 数据源 POC

生成时间：${report.generatedAt}

pipelineVersion：${report.pipelineVersion}

## 1. 本轮验证目标

本轮只验证真实赛事数据源 POC，不做全量抓取，不接数据库，不接定时任务，不绕过登录或验证码。验证重点：

- 数据源是否可公开访问和低频抓取
- 字段是否足够支撑 RaceNext MVP 赛事库
- 原始字段是否能标准化为当前 Race 数据模型
- 多源去重是否可用规则完成
- 是否能支撑后续 Top100 / Top200 赛事库建设

## 2. 数据源评分体系

${report.sourceResults.map(buildSourceScoreSection).join("\n\n")}

## 3. 每个数据源抓取结果

${report.sourceResults.map(buildSourceResultSection).join("\n\n")}

## 4. 字段覆盖与来源说明

${buildCoverageMarkdown(report.fieldCoverage)}

## 5. 数据质量评估

${buildQualityMarkdown(report.dataQuality, normalizedRaces.length)}

## 6. 去重结果

- 原始数据总数：${report.dedupeSummary.rawTotal}
- 去重后数量：${report.dedupeSummary.dedupedTotal}
- 疑似重复组数：${report.dedupeSummary.possibleDuplicateTotal}
- 直接重复赛事：${report.dedupeSummary.duplicateRaces.length}
- duplicateGroups：${report.duplicateGroups.length}

${report.dedupeSummary.duplicateRaces.length ? report.dedupeSummary.duplicateRaces.map((item) => `- ${item.key}：保留 ${item.keptId}，重复 ${item.duplicateIds.join(", ")}；confidence=${item.confidence}；reason=${item.reason}`).join("\n") : "- 未发现直接重复赛事。"}

${report.dedupeSummary.possibleDuplicateRaces.length ? report.dedupeSummary.possibleDuplicateRaces.map((item) => `- 疑似重复 ${item.key}：${item.raceIds.join(", ")}，日期 ${item.dates.join(", ")}；confidence=${item.confidence}；reason=${item.reason}`).join("\n") : "- 未发现疑似重复赛事。"}

## 7. Canonical Merge 结果

- normalized race 数量：${report.mergeSummary.normalizedRaceTotal}
- canonical race 数量：${report.mergeSummary.canonicalRaceTotal}
- 自动合并组数：${report.mergeSummary.autoMergedGroups}
- 自动合并赛事数：${report.mergeSummary.autoMergedRaceCount}
- 待人工 review 数量：${report.mergeSummary.reviewRequiredTotal}

### Merge 规则说明

- exact duplicate group 自动合并为一个 CanonicalRecord。
- possible duplicate 只进入 mergeReviewList，不自动合并。
- 字段选择优先 sourcePriority 高的数据源；sourcePriority 相同时优先非空字段。
- URL 字段单独处理：registrationUrl 优先报名平台类来源，officialUrl 优先官方类来源。
- categories 按 distanceKm 合并去重。
- aliases 保留不同 source 的标准化名称。

### 字段可信度说明

- fieldSources 记录 canonical 字段来自哪个 source，多个来源参与时标记为 merged，缺失或占位时标记为 placeholder。
- confidence 是 normalized race 的 0-100 简单可信度评分，基于名称、日期、城市、距离、链接和权威源加权。
- missingFields 记录当前 normalized/canonical 仍缺失的关键字段，后续由人工、详情页或独立 enrichment engine 补齐。

## 8. 后续是否建议继续接入

${report.recommendations.map((item) => `- ${item.label}：${item.recommendation}`).join("\n")}

## 9. 下一步建议

- 继续保持每源小样本验证，先补齐稳定列表页 URL 和字段映射，再考虑 Top100 / Top200。
- 对公开列表页无法直接解析的源，优先确认是否存在官方公开 API、RSS、站点地图或静态 HTML 列表。
- 对 ITRA 这类越野数据源，重点验证距离、累计爬升、积分/难度字段，不建议在 MVP 阶段触碰登录会员数据。
- 去重规则下一步应加入人工 review 队列：同名同城同年但日期不同的赛事先标记 possibleDuplicate，不自动合并。

## 10. 输出文件

- Raw samples:
${sourceRegistry.map((source) => `  - \`${source.rawSamplePath}\``).join("\n")}
- Normalized sample: \`${NORMALIZED_SAMPLE_PATH}\`
- Canonical sample: \`${CANONICAL_SAMPLE_PATH}\`
- JSON report: \`${JSON_REPORT_PATH}\`
`;
}

function buildSourceScoreSection(result: JsonReport["sourceResults"][number]): string {
  return `### ${result.label}

- 数据完整度：${result.score.dataCompleteness}/5
- 更新频率：${result.score.updateFrequency}/5
- 官方可信度：${result.score.officialTrust}/5
- 抓取稳定性：${result.score.crawlStability}/5
- 是否需要 JS 渲染：${result.score.requiresJsRendering}
- 是否存在公开 API：${result.score.hasPublicApi}
- 是否需要登录：${result.score.requiresLogin}
- 反爬风险：${result.score.antiCrawlRisk}
- 商业可持续性：${result.score.commercialSustainability}/5
- MVP 推荐等级：${result.score.mvpRecommendationLevel}
- 推荐用途：${result.recommendedUse.join("；")}
- 建议更新频率：${result.updateStrategy}`;
}

function buildSourceResultSection(result: JsonReport["sourceResults"][number]): string {
  return `### ${result.label}

- 抓取样本数：${result.sampleCount}
- 运行耗时：${result.durationMs}ms
- 失败原因分级：${result.failureCategories.length ? result.failureCategories.join("、") : "无"}
- 候选页面：
${result.candidatePages.length ? result.candidatePages.map((url) => `  - ${url}`).join("\n") : "  - 无"}
- 可访问页面：
${result.accessiblePages.length ? result.accessiblePages.map((url) => `  - ${url}`).join("\n") : "  - 无"}
- 失败页面：
${result.failedPages.length ? result.failedPages.map((item) => `  - ${item.url}：${item.reason}`).join("\n") : "  - 无"}
- 成功 / 失败原因：${result.sampleCount ? "可从公开页面解析到赛事相关条目，但字段完整度仍需人工核验。" : "未解析到可用样本；失败原因见上方分级。"}
- 探索备注：${result.notes.length ? result.notes.join("；") : "无"}
- 最终使用页面：${result.accessiblePages[0] ?? "无稳定可用页面"}`;
}

function buildFieldCoverage(results: SourceFetchResult[]): FieldCoverageItem[] {
  const fields: Array<keyof RawRace> = [
    "rawName",
    "rawDate",
    "rawLocation",
    "rawCity",
    "rawProvince",
    "rawType",
    "rawDistance",
    "rawElevationGain",
    "rawRegistrationStatus",
    "rawRegistrationUrl",
    "rawOfficialUrl",
  ];
  const allRaces = results.flatMap((result) => result.races);
  return fields.map((field) => {
    const bySource = Object.fromEntries(
      sourceRegistry.map((config) => {
        const sourceRaces = results.find((result) => result.source === config.source)?.races ?? [];
        return [config.source, { present: sourceRaces.filter((race) => Boolean(race[field])).length, total: sourceRaces.length }];
      }),
    ) as FieldCoverageItem["bySource"];
    const maxPresent = Math.max(...Object.values(bySource).map((item) => item.present), 0);
    return {
      field,
      totalPresent: allRaces.filter((race) => Boolean(race[field])).length,
      total: allRaces.length,
      bySource,
      primarySources: sourceRegistry
        .filter((config) => bySource[config.source].present === maxPresent && maxPresent > 0)
        .map((config) => config.source),
      missingReason: inferMissingReason(field, results),
      manualAction: inferManualAction(field),
    };
  });
}

function buildCoverageMarkdown(coverage: FieldCoverageItem[]): string {
  if (!coverage.length) return "本次未生成字段覆盖数据。";
  return coverage
    .map((item) => {
      const sourceBreakdown = sourceRegistry
        .map((source) => `${source.source} ${item.bySource[source.source].present}/${item.bySource[source.source].total}`)
        .join("，");
      return `- ${item.field}: ${item.totalPresent}/${item.total}；主要来源：${item.primarySources.length ? item.primarySources.join(", ") : "无"}；分源覆盖：${sourceBreakdown}；缺失原因：${item.missingReason}；人工补全：${item.manualAction}`;
    })
    .join("\n");
}

function buildDataQuality(races: NormalizedRace[]): DataQualitySummary {
  return races.reduce<DataQualitySummary>((acc, race) => {
    acc[race.dataQuality] = (acc[race.dataQuality] ?? 0) + 1;
    return acc;
  }, {});
}

function buildQualityMarkdown(dataQuality: DataQualitySummary, total: number): string {
  if (total === 0) return "无 normalized 样本，质量评估为 placeholder。";
  return Object.entries(dataQuality)
    .map(([quality, count]) => `- ${quality}: ${count}`)
    .join("\n");
}

function classifyFailures(result: SourceFetchResult): string[] {
  const categories = new Set<string>();
  for (const failure of result.failedPages) {
    const text = `${failure.url} ${failure.reason}`;
    if (/HTTP|fetch failed|abort|timeout/i.test(text)) categories.add("HTTP 访问失败");
    if (/EdgeOne|access restricted|403|429|反爬|blocked/i.test(text)) categories.add("反爬限制");
    if (/JS|render/i.test(`${text} ${result.notes.join(" ")}`)) categories.add("页面需要 JS 渲染");
    if (/结构|structure|入口|列表页/i.test(`${text} ${result.notes.join(" ")}`)) categories.add("页面结构变化");
    if (/列表页|入口/i.test(`${text} ${result.notes.join(" ")}`)) categories.add("找不到稳定列表页");
    if (/首屏 HTML|HTML/i.test(`${text} ${result.notes.join(" ")}`)) categories.add("字段不在首屏 HTML");
    if (/login|登录/i.test(text)) categories.add("需要登录");
  }
  if (!result.races.length && !categories.size) categories.add("数据源本身不适合 POC");
  return [...categories];
}

function inferMissingReason(field: keyof RawRace, results: SourceFetchResult[]): string {
  const activeSources = results.filter((result) => result.races.length > 0).map((result) => result.source);
  const hasAny = results.some((result) => result.races.some((race) => Boolean(race[field])));
  if (hasAny) return "部分公开页面提供该字段，当前解析可覆盖一部分样本。";
  if (!activeSources.length) return "本轮未抓取到可用样本，无法判断字段是否存在。";
  if (["rawDate", "rawLocation", "rawCity", "rawProvince", "rawRegistrationStatus"].includes(String(field))) {
    return "字段未出现在已解析的公开列表文本中，可能需要详情页、JS/API 或人工补全。";
  }
  if (["rawOfficialUrl", "rawRegistrationUrl"].includes(String(field))) {
    return "当前仅解析到列表链接或锚文本，未能稳定区分官方链接和报名链接。";
  }
  return "页面没有提供稳定结构化字段，或当前解析规则未覆盖。";
}

function inferManualAction(field: keyof RawRace): string {
  if (["rawDate", "rawCity", "rawProvince"].includes(String(field))) return "进入详情页或人工校验赛事公告。";
  if (field === "rawElevationGain") return "越野赛事需人工或 ITRA/官方详情补充爬升。";
  if (field === "rawRegistrationStatus") return "需要结合报名页状态或官方公告人工确认。";
  if (["rawOfficialUrl", "rawRegistrationUrl"].includes(String(field))) return "需要人工区分官网链接与报名平台链接。";
  return "暂不强制补全，保留 rawData 供后续解析。";
}

function recommendationFor(result: SourceFetchResult, config: SourceRegistryItem): string {
  if (config.score.mvpRecommendationLevel === "A") return "建议作为 MVP 主数据源继续验证。";
  if (config.score.mvpRecommendationLevel === "B") return "建议作为补充数据源继续验证。";
  if (config.score.mvpRecommendationLevel === "C") return "仅建议作为人工补充或继续寻找更稳定列表页。";
  return "暂不建议继续自动接入，先人工确认公开入口、API 或白名单访问方式。";
}

main().catch((error) => {
  logError("RaceNext data POC failed", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
