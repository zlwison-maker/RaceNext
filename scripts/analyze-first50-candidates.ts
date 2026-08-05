import { readFile, writeFile } from "node:fs/promises";
import {
  FIRST50_SCORING_DATE,
  buildFirst50Candidate,
  type First50CandidateAnalysis,
  type First50SourceRace,
} from "../lib/first50Scoring.ts";

type SeedFile = {
  generatedAt?: string;
  records: First50SourceRace[];
};

const SEED_PATH = "data/seed/future_top100_seed.json";
const CANDIDATE_PATH = "data/first50/first50_candidates.json";
const SCORING_REPORT_PATH = "docs/data/FIRST5_CANDIDATE_SCORING.md";
const PILOT_REPORT_PATH = "docs/data/FIRST5_PILOT_RECOMMENDATION.md";

async function main() {
  const seed = JSON.parse(await readFile(SEED_PATH, "utf8")) as SeedFile;
  const analyses = seed.records.map(buildFirst50Candidate).sort((a, b) => b.candidate.totalScore - a.candidate.totalScore);
  const first5 = selectFirst5(analyses);

  await writeFile(
    CANDIDATE_PATH,
    `${JSON.stringify(
      {
        version: "first50-candidates-v1",
        updatedAt: FIRST50_SCORING_DATE,
        source: {
          seedPath: SEED_PATH,
          seedGeneratedAt: seed.generatedAt ?? null,
          scoringDate: FIRST50_SCORING_DATE,
          note: "Scores are heuristic proxy scores based only on current seed fields. They are not real popularity, search volume, or revenue data.",
        },
        records: analyses.map((analysis) => analysis.candidate),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await writeFile(SCORING_REPORT_PATH, buildScoringReport(analyses), "utf8");
  await writeFile(PILOT_REPORT_PATH, buildPilotReport(first5, analyses), "utf8");

  printCompletenessReport(analyses);
}

function selectFirst5(analyses: First50CandidateAnalysis[]) {
  const selected: First50CandidateAnalysis[] = [];
  const add = (analysis: First50CandidateAnalysis | undefined) => {
    if (analysis && !selected.some((item) => item.candidate.raceId === analysis.candidate.raceId)) selected.push(analysis);
  };
  const eligible = analyses.filter(isPilotEligible);

  add(eligible.find((item) => item.candidate.raceType === "ultra_trail" && item.candidate.scoreBreakdown.decisionComplexity >= 14));
  add(eligible.find((item) => item.candidate.raceType === "ultra_trail" && item.candidate.location.text?.includes("崇礼")));
  add(
    eligible.find(
      (item) =>
        item.candidate.raceType === "trail" &&
        item.candidate.estimatedCompletionCost === "low" &&
        Boolean(item.candidate.raceDate && item.candidate.raceDate >= FIRST50_SCORING_DATE),
    ),
  );
  add(eligible.find((item) => item.candidate.raceId === "future-merged-楚雄马拉松-楚雄彝族自治州-2026"));
  add(
    eligible.find(
      (item) =>
        item.candidate.raceType === "marathon" &&
        item.candidate.scoreBreakdown.commercialValue >= 16 &&
        !selected.some((selectedItem) => selectedItem.candidate.location.city === item.candidate.location.city),
    ),
  );

  for (const analysis of eligible) {
    if (selected.length >= 5) break;
    add(analysis);
  }

  return selected.slice(0, 5);
}

function isPilotEligible(analysis: First50CandidateAnalysis) {
  if (analysis.candidate.totalScore < 65) return false;
  if (/线上|亲子|青少年|培训|荧光|徒步/.test(analysis.candidate.raceName)) return false;
  return analysis.shouldEnterNextStage;
}

function buildScoringReport(analyses: First50CandidateAnalysis[]) {
  const top20 = analyses.slice(0, 20);
  return `# First5 Candidate Scoring

Last Updated: ${FIRST50_SCORING_DATE}

Source: \`${SEED_PATH}\`

## 1. 评分模型说明

本报告基于当前 seed 数据生成候选评分。

重要说明：

- 评分是启发式代理评分，不是真实搜索量、真实讨论量或真实商业收入。
- 不编造缺失字段。
- 不生成 RaceNext 决策内容。
- 当前候选池保留全部 seed 赛事，低分赛事也保留，方便后续排除和复核。

新评分维度：

| Dimension | Max | Input Signals |
|---|---:|---|
| Runner Attention | 30 | 赛事类型、名称中的知名赛事信号、多组别、是否明显训练/亲子/线上活动 |
| Search Value | 25 | 赛事名明确度、马拉松/越野/168/100/50K 等搜索词、是否适合 SEO |
| Commercial Value | 20 | 是否是线下赛事，是否涉及住宿、交通、装备、训练计划、赛事周边 |
| Decision Complexity | 15 | 用户报名前需要判断的因素数量：距离、爬升、关门、装备、补给、天气、住宿交通、完赛能力 |
| Data Completeness | 10 | P0 / P1 当前字段完整度，仅作为可执行性参考，不主导 First5 选择 |
| Content Difficulty | 0 | 本轮不因内容生产难易度加分，避免因为“好做”而选错样板 |

## 2. 候选赛事排名

候选池规模：${analyses.length}

Top20 如下。

## 3. Top20 候选列表

${top20.map(formatScoringItem).join("\n\n")}
`;
}

function formatScoringItem(analysis: First50CandidateAnalysis, index: number) {
  const score = analysis.candidate.scoreBreakdown;
  return `### ${index + 1}. ${analysis.candidate.raceName}

- Race ID: \`${analysis.candidate.raceId}\`
- 类型：${analysis.candidate.raceType}
- 地点：${analysis.candidate.location.text ?? "地点不足"}
- 比赛日期：${analysis.candidate.raceDate ?? "日期不足"}
- 总分：${analysis.candidate.totalScore}
- 评分：Runner Attention ${score.runnerAttention} / Search Value ${score.searchValue} / Commercial Value ${score.commercialValue} / Decision Complexity ${score.decisionComplexity} / Data Completeness ${score.dataCompleteness} / Content Difficulty ${score.contentDifficulty}
- 优势：${analysis.advantages.join("；") || "暂无明显优势"}
- 最大问题：${analysis.issues[0] ?? "待人工复核"}
- 适合作为 RaceNext 首批案例的原因：${inferFirstCaseValue(analysis)}
- 预计补全成本：${analysis.candidate.estimatedCompletionCost}`;
}

function buildPilotReport(first5: First50CandidateAnalysis[], analyses: First50CandidateAnalysis[]) {
  return `# First5 Pilot Recommendation

Last Updated: ${FIRST50_SCORING_DATE}

## 1. Selection Logic

First5 不简单选择最高分。

本次选择不追求赛事类型平均覆盖，而是优先验证 RaceNext 的核心价值：

- 至少 2-3 个高决策复杂度越野赛事。
- 至少 1 个大众搜索量高的赛事。
- 优先选择住宿、交通、装备、训练计划、赛事周边具备自然商业闭环的赛事。
- 不因为数据容易获取而选择赛事。

当前仍不代表上线名单。进入下一阶段前，需要人工复核官方来源和 P0 / P1 字段。

## 2. Recommended First5

${first5.map(formatPilotItem).join("\n\n")}

## 3. Current First5 Reassessment

${buildCurrentFirst5Reassessment(analyses, first5)}

## 4. Overall Recommendation

建议进入第三阶段，但第三阶段仍应只做 First5 数据补全验证，不应直接接入页面或批量生成 AI 内容。
`;
}

function formatPilotItem(analysis: First50CandidateAnalysis, index: number) {
  return `### ${index + 1}. ${analysis.candidate.raceName}

- Race ID: \`${analysis.candidate.raceId}\`
- 类型：${analysis.candidate.raceType}
- 地点：${analysis.candidate.location.text ?? "地点不足"}
- 比赛日期：${analysis.candidate.raceDate ?? "日期不足"}
- 当前总分：${analysis.candidate.totalScore}
- 核心用户：${inferCoreUser(analysis)}
- 用户为什么需要决策帮助：${inferDecisionNeed(analysis)}
- RaceNext 页面价值：${inferPageValue(analysis)}
- 商业化机会：${inferCommercialValue(analysis)}
- 预计数据补全成本：${analysis.candidate.estimatedCompletionCost}
- 主要缺口：${analysis.issues.join("；")}
- 是否建议进入下一阶段：${analysis.shouldEnterNextStage ? "建议进入" : "暂缓，除非有人工战略理由"}`;
}

function inferFirstCaseValue(analysis: First50CandidateAnalysis) {
  if (analysis.candidate.scoreBreakdown.decisionComplexity >= 14) return "决策复杂度高，能验证 RaceNext 是否能帮助用户判断适不适合跑。";
  if (analysis.candidate.scoreBreakdown.searchValue >= 22) return "搜索入口明确，能验证赛事决策页的 SEO 流量价值。";
  if (analysis.candidate.scoreBreakdown.commercialValue >= 17) return "商业闭环自然，适合验证住宿、交通、装备和训练计划转化。";
  return "具备一定样板价值，但进入 First5 前需要人工复核战略意义。";
}

function inferCoreUser(analysis: First50CandidateAnalysis) {
  if (analysis.candidate.raceType === "trail" || analysis.candidate.raceType === "ultra_trail") return "正在选择下一场越野赛、需要评估完赛能力和参赛成本的跑者。";
  if (analysis.candidate.raceType === "marathon") return "有明确报名意向、正在比较城市马拉松时间和出行成本的路跑用户。";
  return "对非标准赛事感兴趣、但需要判断是否值得投入时间和预算的运动用户。";
}

function inferDecisionNeed(analysis: First50CandidateAnalysis) {
  if (analysis.candidate.scoreBreakdown.decisionComplexity >= 14) return "报名前需要同时判断距离、爬升、关门、装备、天气、住宿交通和完赛能力。";
  if (analysis.candidate.raceType === "marathon") return "报名决策相对简单，但仍要判断报名窗口、组别、交通住宿和是否值得专程参赛。";
  return "需要 RaceNext 帮用户把赛事事实转成明确判断。";
}

function inferPageValue(analysis: First50CandidateAnalysis) {
  if (analysis.candidate.raceType === "trail" || analysis.candidate.raceType === "ultra_trail") return "Decision Card、赛道解析、AI 参赛指南和出行攻略能形成完整参赛判断。";
  if (analysis.candidate.raceType === "marathon") return "可验证报名指南、核心数据、出行攻略和 SEO 模板对大众赛事的转化价值。";
  return "可测试 RaceNext 是否能处理边界赛事，但不应作为核心样板。";
}

function inferCommercialValue(analysis: First50CandidateAnalysis) {
  if (analysis.candidate.scoreBreakdown.commercialValue >= 17) return "住宿、交通、装备、训练计划或周边旅行场景较强。";
  if (analysis.candidate.scoreBreakdown.commercialValue >= 12) return "有一定商业化空间，需补充出行和装备信息。";
  return "商业化价值偏弱，不适合作为优先样板。";
}

function buildCurrentFirst5Reassessment(analyses: First50CandidateAnalysis[], first5: First50CandidateAnalysis[]) {
  const lookup = new Map(analyses.map((analysis) => [analysis.candidate.raceId, analysis]));
  const selectedIds = new Set(first5.map((analysis) => analysis.candidate.raceId));
  const current = [
    { name: "2026凯乐石贡嘎100冰川极限挑战赛", raceId: "future-zuicool-86332", verdict: "保留" },
    { name: "户外特工第十一届崇礼翠云山50公里越野赛暨崇礼·她山径女子越野赛", raceId: "future-zuicool-75940", verdict: "保留" },
    { name: "2026楚雄马拉松", raceId: "future-merged-楚雄马拉松-楚雄彝族自治州-2026", verdict: "保留" },
    { name: "2026FUGA西湖青芝坞隆冬跑山赛", raceId: "future-zuicool-24150", verdict: "保留" },
    { name: "2026斯巴达勇士越野周末-崇礼站", raceId: "future-zuicool-18644", verdict: "替换" },
  ];

  return current
    .map((item) => {
      const analysis = lookup.get(item.raceId);
      if (analysis) {
        const isSelected = selectedIds.has(item.raceId);
        return `### ${item.name}

- 结论：${item.verdict}
- 为什么符合 RaceNext：${inferDecisionNeed(analysis)}
- 为什么不符合：${item.verdict === "替换" ? "更偏非标准障碍/品牌赛事，当前基础字段缺口较大，不如典型跑步赛事直接验证 RaceNext 的核心报名决策。" : analysis.issues.length ? analysis.issues.join("；") : "暂无明显问题，但仍需人工复核官方来源。"}
- 是否值得作为 MVP 首批案例：${isSelected ? "值得" : "不建议作为 First5，建议后移到边界赛事验证。"}`;
      }

      return `### ${item.name}

- 结论：${item.verdict}
- 为什么符合 RaceNext：品牌或搜索信号存在，但需要进一步确认是否属于跑者“下一场该跑什么”的典型决策。
- 为什么不符合：当前新 First5 未选择该赛事，主要因为它对 RaceNext 核心跑者决策验证不如高复杂度越野和大众马拉松直接。
- 是否值得作为 MVP 首批案例：${item.verdict === "保留" ? "值得" : "不建议作为 First5，建议后移到边界赛事验证。"}`;
    })
    .join("\n\n");
}

function printCompletenessReport(analyses: First50CandidateAnalysis[]) {
  console.log(`[first50] candidates: ${analyses.length}`);
  console.log("[first50] P0/P1/P2 completeness by race:");
  for (const analysis of analyses) {
    const c = analysis.candidate;
    console.log(
      `${c.raceId}\t${c.existingDataCompleteness.summary}\tP0 fields: ${formatP0Status(c)}\tP1/P2 gaps: ${analysis.issues.join(", ")}`,
    );
  }
}

function formatP0Status(candidate: First50CandidateAnalysis["candidate"]) {
  return [
    `name=${Boolean(candidate.raceName)}`,
    `date=${Boolean(candidate.raceDate)}`,
    `location=${Boolean(candidate.location.city || candidate.location.province)}`,
    `category=${candidate.categoryCount > 0}`,
    `distance=${candidate.existingDataCompleteness.p0 >= 6}`,
    `registrationStatus=true`,
  ].join(", ");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
