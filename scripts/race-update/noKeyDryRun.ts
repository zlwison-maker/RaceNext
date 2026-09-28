import { randomUUID } from "node:crypto";

import type {
  NoKeyDryRunReport,
  NoKeyDryRunSourceReport,
  OfficialIngestionStatus,
  OfficialSourceIngestionState,
  OfficialSourceIngestionStateEntry,
} from "../../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshot, RaceSourceRegistry } from "../../types/raceUpdate.ts";
import { checkEditionDocumentIdentity } from "./identity.ts";
import {
  shouldExtractDocument,
  transitionFetchFailureState,
  transitionIngestionState,
} from "./ingestionState.ts";
import { fetchOfficialDocument } from "./officialDocument.ts";
import { evaluateFreshnessSourceEligibility, findRegistrySource } from "./sourceRegistry.ts";

export const NO_KEY_DRY_RUN_TARGETS = [
  {
    editionId: "beijing-marathon-2026",
    sourceIds: [
      "beijing-marathon-official-registration-guidelines-2026",
      "beijing-marathon-official-registration-portal-2026",
    ],
  },
  {
    editionId: "xiamen-marathon-2027",
    sourceIds: [
      "xiamen-marathon-official-home",
      "xiamen-marathon-aims-2027",
      "xiamen-marathon-china-marathon-2027",
    ],
  },
] as const;

export async function runNoKeyDryRunPass(input: {
  snapshot: RaceGraphSnapshot;
  registry: RaceSourceRegistry;
  state: OfficialSourceIngestionState;
  pass: number;
  now?: () => string;
  fetcher?: typeof fetch;
}): Promise<{ report: NoKeyDryRunReport; state: OfficialSourceIngestionState }> {
  const now = input.now ?? (() => new Date().toISOString());
  const startedAt = now();
  const state = structuredClone(input.state);
  const reports: NoKeyDryRunSourceReport[] = [];

  for (const target of NO_KEY_DRY_RUN_TARGETS) {
    const record = input.snapshot.records.find(({ edition }) => edition.editionId === target.editionId);
    if (!record) throw new Error(`No-key dry run target Edition is missing: ${target.editionId}`);
    for (const sourceId of target.sourceIds) {
      const fetchedAt = now();
      const source = findRegistrySource(input.registry, target.editionId, sourceId);
      if (!source) {
        reports.push(failedReport({
          editionId: target.editionId,
          sourceId,
          sourceUrl: "",
          fetchedAt,
          fetchStatus: "fetch_error",
          error: "Approved source is missing from the current Registry.",
        }));
        continue;
      }
      const eligibility = evaluateFreshnessSourceEligibility({
        registryEditionId: target.editionId,
        targetEditionId: target.editionId,
        source,
      });
      if (!eligibility.eligible) {
        reports.push({
          ...failedReport({
            editionId: target.editionId,
            sourceId,
            sourceUrl: source.url,
            fetchedAt,
            fetchStatus: "fetch_error",
            error: eligibility.reason,
          }),
          eligibility,
        });
        continue;
      }

      const previous = findState(state, target.editionId, sourceId);
      const fetched = await fetchOfficialDocument({
        source,
        editionId: target.editionId,
        fetchedAt,
        fetcher: input.fetcher,
      });
      if (!fetched.ok) {
        const fetchState = toFetchState(fetched.status);
        upsertState(state, transitionFetchFailureState({
          previous,
          sourceId,
          editionId: target.editionId,
          checkedAt: fetchedAt,
          status: fetchState,
        }));
        reports.push({
          ...failedReport({
            editionId: target.editionId,
            sourceId,
            sourceUrl: source.url,
            fetchedAt,
            fetchStatus: fetched.status,
            error: fetched.detail,
          }),
          eligibility,
        });
        continue;
      }

      const document = fetched.document;
      const observedComparison = previous?.lastObservedContentHash === null || !previous
        ? "first_observation"
        : previous.lastObservedContentHash === document.contentHash ? "unchanged" : "changed";
      const identity = checkEditionDocumentIdentity({ record, source, document });
      const extractionRequired = shouldExtractDocument(previous, document.contentHash);
      let extractionStatus: OfficialIngestionStatus;
      const errors: string[] = [];
      const warnings: string[] = [];

      if (identity.status !== "matched") {
        extractionStatus = identity.status === "uncertain" ? "identity_uncertain" : "identity_mismatch";
        errors.push(`FAIL_CLOSED:${identity.evidence.join(",")}`);
      } else if (!extractionRequired) {
        extractionStatus = "unchanged";
      } else {
        extractionStatus = "fact_extraction_provider_unconfigured";
        warnings.push("EXTRACTION_REQUIRED: provider is intentionally unconfigured in Phase 2.");
      }

      upsertState(state, transitionIngestionState({
        previous,
        document,
        outcome: extractionStatus,
        checkedAt: fetchedAt,
      }));
      reports.push({
        editionId: target.editionId,
        sourceId,
        sourceUrl: source.url,
        eligibility,
        fetchStatus: "success",
        httpStatus: document.httpStatus,
        finalUrl: document.url,
        contentType: document.contentType,
        charset: document.charset,
        responseBytes: document.responseBytes,
        fetchedAt,
        contentHash: document.contentHash,
        documentTextLength: document.text.length,
        documentSample: document.text.slice(0, 360),
        identity,
        providerStatus: "unconfigured",
        extractionStatus,
        extractionRequired,
        observedComparison,
        candidateCount: 0,
        changeCount: 0,
        pendingCount: 0,
        canonicalWritten: false,
        errors,
        warnings,
      });
    }
  }

  state.sources.sort((left, right) => stateKey(left).localeCompare(stateKey(right)));
  const successful = reports.filter(({ fetchStatus, identity }) => fetchStatus === "success" && identity?.status === "matched");
  const finishedAt = now();
  return {
    state,
    report: {
      schemaVersion: "race-no-key-dry-run-v1",
      runId: randomUUID(),
      pass: input.pass,
      startedAt,
      finishedAt,
      editions: NO_KEY_DRY_RUN_TARGETS.map(({ editionId }) => editionId),
      sources: reports,
      summary: {
        sources_checked: reports.length,
        sources_succeeded: successful.length,
        sources_failed: reports.length - successful.length,
        documents_changed: reports.filter(({ observedComparison }) => (
          observedComparison === "first_observation" || observedComparison === "changed"
        )).length,
        documents_unchanged: reports.filter(({ observedComparison }) => observedComparison === "unchanged").length,
        model_calls: 0,
        fact_candidates: 0,
        changes: 0,
        pending_facts: 0,
        canonical_writes: 0,
      },
    },
  };
}

function failedReport(input: {
  editionId: string;
  sourceId: string;
  sourceUrl: string;
  fetchedAt: string;
  fetchStatus: OfficialIngestionStatus;
  error: string;
}): NoKeyDryRunSourceReport {
  return {
    editionId: input.editionId,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    eligibility: { eligible: false, autoApplyEligible: false, mode: "excluded", reason: input.error },
    fetchStatus: input.fetchStatus,
    httpStatus: null,
    finalUrl: null,
    contentType: null,
    charset: null,
    responseBytes: 0,
    fetchedAt: input.fetchedAt,
    contentHash: null,
    documentTextLength: 0,
    documentSample: null,
    identity: null,
    providerStatus: "unconfigured",
    extractionStatus: input.fetchStatus,
    extractionRequired: false,
    observedComparison: "not_observed",
    candidateCount: 0,
    changeCount: 0,
    pendingCount: 0,
    canonicalWritten: false,
    errors: [input.error],
    warnings: [],
  };
}

function findState(
  state: OfficialSourceIngestionState,
  editionId: string,
  sourceId: string,
): OfficialSourceIngestionStateEntry | null {
  return state.sources.find((entry) => entry.editionId === editionId && entry.sourceId === sourceId) ?? null;
}

function upsertState(state: OfficialSourceIngestionState, entry: OfficialSourceIngestionStateEntry): void {
  const index = state.sources.findIndex((candidate) => stateKey(candidate) === stateKey(entry));
  if (index === -1) state.sources.push(entry);
  else state.sources[index] = entry;
}

function stateKey(entry: Pick<OfficialSourceIngestionStateEntry, "editionId" | "sourceId">): string {
  return `${entry.editionId}:${entry.sourceId}`;
}

function toFetchState(status: OfficialIngestionStatus): Exclude<OfficialSourceIngestionStateEntry["lastFetchStatus"], "success"> {
  if (status === "parse_error" || status === "unsupported_content_type" || status === "unsupported_scanned_pdf") {
    return status;
  }
  return "fetch_error";
}
