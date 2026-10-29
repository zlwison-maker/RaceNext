import { createHash } from "node:crypto";
import type { OfficialDocumentSnapshot, OfficialSourceIngestionState, FactExtractionProvider } from "../../types/officialSourceIngestion.ts";
import type { PendingChange, PendingChangeStore, RaceGraphSnapshot, RaceSourceRegistry } from "../../types/raceUpdate.ts";
import { runRealExtractionDryRun } from "../../scripts/race-update/realExtraction.ts";

// Exact public record from PR #46 head 2b46abd99eca1836c47090ed94c72ba377106371.
// Preserves the original unresolved conflict; this fixture does not approve either value.
export const hengqinConflict = {
  "changeId": "chg-9834639d42eb109c8315f709",
  "eventId": "hengqin-marathon",
  "editionId": "hengqin-marathon-2026",
  "categoryId": null,
  "entityType": "Edition",
  "field": "registrationOpenDate",
  "currentValue": "2026-08-18T10:00:00+08:00",
  "sourceId": "hengqin-marathon-official-2026::announcement:7549c4f386ca39f947307b61",
  "sourceUrl": "https://www.hengqinmarathon.com/news_detail-280.html",
  "evidenceText": "从8月18日10:00报名启动",
  "evidenceLocator": "text:129-144; untrustedDocumentText:paragraph_1",
  "confidence": 0.95,
  "fetchedAt": "2026-10-22T05:04:53.360Z",
  "contentHash": "c3f36ea23bd56061669fe67ee14543f052b156c3ac8a8bb203398d02e12f4590",
  "extractionMethod": "aliyun-qwen-structured-output",
  "provider": "aliyun-model-studio",
  "model": "qwen3.8-flash",
  "promptVersion": "race-fact-extraction-v1.4",
  "evidence": [
    {
      "sourceId": "hengqin-marathon-official-2026::announcement:7549c4f386ca39f947307b61",
      "sourceUrl": "https://www.hengqinmarathon.com/news_detail-280.html",
      "evidenceText": "从8月18日10:00报名启动",
      "evidenceLocator": "text:129-144; untrustedDocumentText:paragraph_1",
      "confidence": 0.95,
      "fetchedAt": "2026-10-22T05:04:53.360Z",
      "contentHash": "c3f36ea23bd56061669fe67ee14543f052b156c3ac8a8bb203398d02e12f4590",
      "extractionMethod": "aliyun-qwen-structured-output"
    },
    {
      "sourceId": "hengqin-marathon-result-2026",
      "sourceUrl": "https://www.hengqinmarathon.com/news_detail-285.html",
      "evidenceText": "今日（9月21日）10:00起 抽签结果查询与缴费通道同步开放",
      "evidenceLocator": "text:209-240; untrustedDocumentText",
      "confidence": 0.95,
      "fetchedAt": "2026-10-22T05:10:14.235Z",
      "contentHash": "f83e87616bec448ac22d4945025538c7222a44449b8fc3961c9e0196fd44cd59",
      "extractionMethod": "aliyun-qwen-structured-output"
    }
  ],
  "conflict": true,
  "candidateOptions": [
    {
      "value": "2026-08-18T10:00:00+08:00",
      "sourceIds": [
        "hengqin-marathon-official-2026::announcement:7549c4f386ca39f947307b61"
      ],
      "evidence": [
        {
          "sourceId": "hengqin-marathon-official-2026::announcement:7549c4f386ca39f947307b61",
          "sourceUrl": "https://www.hengqinmarathon.com/news_detail-280.html",
          "evidenceText": "从8月18日10:00报名启动",
          "evidenceLocator": "text:129-144; untrustedDocumentText:paragraph_1",
          "confidence": 0.95,
          "fetchedAt": "2026-10-22T05:04:53.360Z",
          "contentHash": "c3f36ea23bd56061669fe67ee14543f052b156c3ac8a8bb203398d02e12f4590",
          "extractionMethod": "aliyun-qwen-structured-output"
        }
      ]
    },
    {
      "value": "2026-09-21T10:00:00+08:00",
      "sourceIds": [
        "hengqin-marathon-result-2026"
      ],
      "evidence": [
        {
          "sourceId": "hengqin-marathon-result-2026",
          "sourceUrl": "https://www.hengqinmarathon.com/news_detail-285.html",
          "evidenceText": "今日（9月21日）10:00起 抽签结果查询与缴费通道同步开放",
          "evidenceLocator": "text:209-240; untrustedDocumentText",
          "confidence": 0.95,
          "fetchedAt": "2026-10-22T05:10:14.235Z",
          "contentHash": "f83e87616bec448ac22d4945025538c7222a44449b8fc3961c9e0196fd44cd59",
          "extractionMethod": "aliyun-qwen-structured-output"
        }
      ]
    }
  ],
  "applyBlocked": true,
  "risk": "low",
  "reason": "source_value_conflict Phase 3/4 safe baseline requires durable human review and forbids auto-apply.",
  "status": "pending",
  "createdAt": "2026-10-22T05:10:53.063Z",
  "reviewedAt": null,
  "reviewReason": null,
  "appliedAt": null
} satisfies PendingChange;

/** Replay the actual conflicting assertions with deterministic provider output, never a live model.
 * The document text is a reconstruction from durable evidence, not a recovered failed-run response.
 * All registry/document additions are isolated clones of the trusted official source scope.
 */
export async function replayHengqinConflict(input: {
  snapshot: RaceGraphSnapshot; registry: RaceSourceRegistry;
  pendingStore: PendingChangeStore; state: OfficialSourceIngestionState;
  checkedAt: string; forceExtract?: boolean;
}) {
  const registry = structuredClone(input.registry);
  const entry = registry.editions.find(({ editionId }) => editionId === hengqinConflict.editionId)!;
  const official = entry.sources.find(({ sourceId }) => sourceId === "hengqin-marathon-official-2026")!;
  const record = input.snapshot.records.find(({ edition }) => edition.editionId === hengqinConflict.editionId)!;
  const documents: OfficialDocumentSnapshot[] = hengqinConflict.evidence.map((evidence) => {
    if (!entry.sources.some(({ sourceId }) => sourceId === evidence.sourceId)) {
      entry.sources.push({ ...official, sourceId: evidence.sourceId, url: evidence.sourceUrl, isPrimary: false });
    }
    const text = `2026 ${record.event.canonicalName}\n${evidence.evidenceText}`;
    return {
      sourceId: evidence.sourceId, editionId: hengqinConflict.editionId, url: evidence.sourceUrl,
      title: `2026 ${record.event.canonicalName}`, contentType: "text/html", httpStatus: 200,
      charset: "utf-8", responseBytes: Buffer.byteLength(text), fetchedAt: input.checkedAt,
      text, links: [], contentHash: createHash("sha256").update(text).digest("hex"), extractionMethod: "html_text",
    };
  });
  let modelCalls = 0;
  const provider: FactExtractionProvider = {
    id: "fixture-provider", model: "fixture-model", promptVersion: "fixture-prompt", configured: true,
    async extract({ document }) {
      modelCalls++;
      const option = hengqinConflict.candidateOptions.find(({ sourceIds }) => sourceIds.includes(document.sourceId))!;
      const evidence = option.evidence[0];
      return {
        provider: this.id, model: this.model, promptVersion: this.promptVersion,
        protocol: "openai-compatible-chat-completions", reasoningMode: "none", structuredOutputMode: "strict_json_schema",
        latencyMs: 0, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        output: { contractVersion: "official-fact-extraction-v1", facts: [{
          eventId: hengqinConflict.eventId, editionId: hengqinConflict.editionId, categoryId: null,
          entityType: "Edition", field: "registrationOpenDate", candidateValue: option.value,
          ...evidence, sourceUrl: document.url, contentHash: document.contentHash, fetchedAt: document.fetchedAt,
          evidenceLocator: "fixture:durable-evidence-text", extractionMethod: "fixture-structured-output",
        }] },
      };
    },
  };
  const prepared = await runRealExtractionDryRun({
    ...input, registry, provider, now: () => input.checkedAt, documents, autoApplyLowRisk: false,
    targets: [{ editionId: hengqinConflict.editionId, sourceIds: documents.map(({ sourceId }) => sourceId) }],
    fetcher: (async () => { throw new Error("Replay must not use the network"); }) as typeof fetch,
  });
  return { prepared, modelCalls };
}
