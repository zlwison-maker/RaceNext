import { createHash } from "node:crypto";

import type {
  CriticalFactVerification,
  RealExtractionReport,
  RealExtractionSourceReport,
  VerificationAlert,
} from "../../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshot, RaceGraphSnapshotRecord, RaceSourceRegistry } from "../../types/raceUpdate.ts";
import { activeFreshnessSources } from "./sourceRegistry.ts";

const CRITICAL_EDITION_FIELDS = [
  "registrationStatus", "registrationOpenDate", "registrationCloseDate", "raceDate",
] as const;
const IMMINENT_DAYS = 14;

export function evaluateVerificationAlerts(input: {
  snapshot: RaceGraphSnapshot;
  registry: RaceSourceRegistry;
  extraction: RealExtractionReport;
}): { criticalFactVerification: CriticalFactVerification[]; verificationAlerts: VerificationAlert[] } {
  const asOf = new Date(input.extraction.finishedAt);
  if (Number.isNaN(asOf.getTime())) throw new Error("Invalid daily check finish time for verification alerts.");
  const checks: CriticalFactVerification[] = [];
  const alerts = new Map<string, VerificationAlert>();

  for (const record of input.snapshot.records) {
    const { edition } = record;
    const sourceReports = input.extraction.sources.filter((source) => source.editionId === edition.editionId);
    const officialRegistrySources = activeFreshnessSources(input.registry, edition.editionId)
      .filter((source) => source.tier === "primary_official");
    const officialIds = new Set(officialRegistrySources.map(({ sourceId }) => sourceId));
    const effectiveOfficial = sourceReports.filter((source) => officialIds.has(source.sourceId)
      && source.identity?.status === "matched"
      && ["success", "unchanged"].includes(source.extractionStatus));
    const effectiveOfficialIds = new Set(effectiveOfficial.map(({ sourceId }) => sourceId));
    const add = (alert: Omit<VerificationAlert, "alertId">) => {
      const affectedFields = [...new Set(alert.affectedFields)].sort();
      const alertId = stableAlertId(edition.editionId, alert.reasonCode, affectedFields);
      alerts.set(alertId, { ...alert, alertId, affectedFields, sourceIds: [...new Set(alert.sourceIds)].sort() });
    };

    for (const field of CRITICAL_EDITION_FIELDS) {
      checks.push(checkField(record, field, null, sourceReports, officialIds, effectiveOfficialIds.size));
    }
    for (const category of record.categories) {
      checks.push(checkField(record, "startAt", category.categoryId, sourceReports, officialIds, effectiveOfficialIds.size));
      if (category.startTimes?.length) {
        checks.push(checkField(record, "startTimes", category.categoryId, sourceReports, officialIds, effectiveOfficialIds.size));
      }
    }

    // Past editions have no actionable daily lifecycle or source-health review.
    if (editionFinished(record, asOf)) continue;

    if (officialRegistrySources.length === 0) {
      add({
        editionId: edition.editionId,
        affectedFields: ["registrationStatus", "raceDate", "startAt/startTimes"],
        reasonCode: "OFFICIAL_SOURCE_NOT_REGISTERED",
        severity: "HIGH",
        triggerReason: "No eligible official source is registered for this Edition.",
        availableEvidence: [],
        sourceIds: [],
        missingEvidence: "An approved Edition-scoped official source and current direct field evidence.",
        humanReviewAction: "Review official source coverage and approve a source before relying on current facts.",
      });
    } else if (effectiveOfficialIds.size === 0) {
      add({
        editionId: edition.editionId,
        affectedFields: ["registrationStatus", "raceDate", "startAt/startTimes"],
        reasonCode: "OFFICIAL_SOURCE_UNAVAILABLE",
        severity: "HIGH",
        triggerReason: `0/${officialRegistrySources.length} registered official sources were effectively processed this run.`,
        availableEvidence: sourceReports.filter((source) => !officialIds.has(source.sourceId)
          && ["success", "unchanged"].includes(source.extractionStatus))
          .map((source) => `Auxiliary source processed: ${source.sourceId}`).sort(),
        sourceIds: officialRegistrySources.map(({ sourceId }) => sourceId),
        missingEvidence: "Current Edition-matched official processing and direct critical-fact evidence.",
        humanReviewAction: "Check official sources manually; do not promote auxiliary sources or infer new values.",
      });
    } else {
      const failedPrimary = officialRegistrySources.filter((source) => source.isPrimary
        && !effectiveOfficialIds.has(source.sourceId));
      if (failedPrimary.length > 0) {
        add({
          editionId: edition.editionId,
          affectedFields: ["official_source_health"],
          reasonCode: "OFFICIAL_SOURCE_DEGRADED",
          severity: "REVIEW",
          triggerReason: `${failedPrimary.length} primary official source(s) did not complete effective processing.`,
          availableEvidence: effectiveOfficial.map((source) => `Official source processed: ${source.sourceId}`).sort(),
          sourceIds: failedPrimary.map(({ sourceId }) => sourceId),
          missingEvidence: "Effective processing of the primary official source(s).",
          humanReviewAction: "Inspect the failed primary source and confirm critical facts using direct official evidence.",
        });
      }
    }

    const uncertain = sourceReports.filter((source) => officialIds.has(source.sourceId)
      && source.extractionStatus === "identity_uncertain");
    if (uncertain.length > 0) {
      add({
        editionId: edition.editionId,
        affectedFields: ["edition_identity"],
        reasonCode: "EDITION_IDENTITY_UNCERTAIN",
        severity: "REVIEW",
        triggerReason: `${uncertain.length} official source(s) were fetched but the target Edition could not be confirmed.`,
        availableEvidence: uncertain.map((source) => `Fetched source: ${source.sourceId}`).sort(),
        sourceIds: uncertain.map(({ sourceId }) => sourceId),
        missingEvidence: "Unambiguous target-Edition identity in the fetched official content.",
        humanReviewAction: "Check the source's Edition scope; do not accept its facts until identity passes.",
      });
    }

    const statusCheck = checks.find((check) => check.editionId === edition.editionId
      && check.categoryId === null && check.field === "registrationStatus")!;
    const closePassed = isPastBoundary(edition.registrationCloseDate, edition.timezone, asOf);
    const lotteryPassed = isPastBoundary(edition.lotteryResultDate, edition.timezone, asOf);
    const passedBoundaries = [
      ...(closePassed ? [edition.registrationCloseDate!] : []),
      ...(lotteryPassed ? [edition.lotteryResultDate!] : []),
    ];
    const confirmedAfterBoundaries = sourceReports.some((source) => {
      if (!statusCheck.directOfficialEvidenceSourceIds.includes(source.sourceId)) return false;
      if (!source.candidates.some((candidate) => candidate.action === "no_change"
        && candidate.authority === "authoritative" && candidate.field === "registrationStatus"
        && candidate.editionId === edition.editionId && candidate.categoryId === null
        && candidate.sourceId === source.sourceId
        && candidate.candidateValue === edition.registrationStatus)) return false;
      const fetched = source.fetchedAt ? new Date(source.fetchedAt) : null;
      return fetched && !Number.isNaN(fetched.getTime())
        && passedBoundaries.every((boundary) => isPastBoundary(boundary, edition.timezone, fetched));
    });
    const days = daysUntilRace(record, asOf);
    const nearingRaceWithoutStatusEvidence = days !== null && days >= 0 && days <= IMMINENT_DAYS
      && statusCheck.status !== "VERIFIED_THIS_RUN";
    if ((passedBoundaries.length > 0 && !confirmedAfterBoundaries)
      || (passedBoundaries.length === 0 && nearingRaceWithoutStatusEvidence)) {
      const openLike = ["registration_open", "upcoming", "lottery", "waiting_list"].includes(edition.registrationStatus);
      add({
        editionId: edition.editionId,
        affectedFields: ["registrationStatus"],
        reasonCode: "REGISTRATION_LIFECYCLE_REVIEW",
        severity: openLike ? "HIGH" : "REVIEW",
        triggerReason: closePassed
          ? "The recorded registration close boundary has passed without direct official status confirmation this run."
          : lotteryPassed
            ? "The recorded lottery result boundary has passed without direct official status confirmation this run."
            : `Race is within ${IMMINENT_DAYS} calendar days without direct official registration-status confirmation this run.`,
        availableEvidence: [
          `Canonical registrationStatus: ${edition.registrationStatus}`,
          ...(closePassed ? [`Canonical registrationCloseDate: ${edition.registrationCloseDate}`] : []),
          ...(lotteryPassed ? [`Canonical lotteryResultDate: ${edition.lotteryResultDate}`] : []),
        ],
        sourceIds: officialRegistrySources.map(({ sourceId }) => sourceId),
        missingEvidence: "An accepted, Edition-matched official statement of the current registration status after the lifecycle boundary.",
        humanReviewAction: "Verify the current registration stage with the organizer; do not derive a new status from time alone.",
      });
    }

    if (days !== null && days >= 0 && days <= IMMINENT_DAYS) {
      const unverified = checks.filter((check) => check.editionId === edition.editionId
        && check.canonicalValuePresent && check.status !== "VERIFIED_THIS_RUN"
        && (check.field === "raceDate" || check.field === "startAt" || check.field === "startTimes"));
      if (unverified.length > 0) {
        add({
          editionId: edition.editionId,
          affectedFields: [...new Set(unverified.map((check) => check.categoryId
            ? `Category.${check.field}:${check.categoryId}` : `Edition.${check.field}`))],
          reasonCode: "CRITICAL_FACT_UNVERIFIED",
          severity: "REVIEW",
          triggerReason: `Race is within ${IMMINENT_DAYS} calendar days; listed start/date facts lack direct official confirmation this run.`,
          availableEvidence: [`Canonical raceDate: ${edition.raceDate ?? "UNKNOWN"}`],
          sourceIds: officialRegistrySources.map(({ sourceId }) => sourceId),
          missingEvidence: "Accepted current-run official evidence matching each affected Canonical field.",
          humanReviewAction: "Review the current official schedule and start times; keep high-impact changes in Pending.",
        });
      }
    }
  }

  return {
    criticalFactVerification: checks,
    verificationAlerts: [...alerts.values()].sort((a, b) => a.editionId.localeCompare(b.editionId)
      || a.reasonCode.localeCompare(b.reasonCode) || a.alertId.localeCompare(b.alertId)),
  };
}

function checkField(
  record: RaceGraphSnapshotRecord,
  field: CriticalFactVerification["field"],
  categoryId: string | null,
  reports: RealExtractionSourceReport[],
  officialIds: Set<string>,
  officialSourcesEffectivelyProcessed: number,
): CriticalFactVerification {
  const category = categoryId ? record.categories.find((entry) => entry.categoryId === categoryId) : null;
  const value = category ? category[field as "startAt" | "startTimes"] : record.edition[field as keyof typeof record.edition];
  const canonicalValuePresent = value !== null && value !== undefined && value !== ""
    && (!Array.isArray(value) || value.length > 0) && value !== "unknown";
  const directOfficialEvidenceSourceIds = reports.filter((source) => officialIds.has(source.sourceId)
    && source.sourceTier === "primary_official"
    && source.extractionStatus === "success" && source.identity?.status === "matched"
    && source.requestStatus === "success"
    && source.candidates.some((candidate) => candidate.action === "no_change"
      && candidate.authority === "authoritative" && candidate.field === field
      && candidate.editionId === record.edition.editionId
      && candidate.sourceId === source.sourceId
      && candidate.categoryId === categoryId
      && JSON.stringify(candidate.candidateValue) === JSON.stringify(value))).map(({ sourceId }) => sourceId).sort();
  return {
    editionId: record.edition.editionId,
    categoryId,
    field,
    canonicalValuePresent,
    officialSourcesEffectivelyProcessed,
    status: !canonicalValuePresent ? "UNKNOWN"
      : directOfficialEvidenceSourceIds.length > 0 ? "VERIFIED_THIS_RUN" : "NOT_VERIFIED_THIS_RUN",
    directOfficialEvidenceSourceIds: [...new Set(directOfficialEvidenceSourceIds)],
  };
}

function editionFinished(record: RaceGraphSnapshotRecord, asOf: Date): boolean {
  const lastDay = record.edition.endDate ?? record.edition.raceDate;
  // With no timezone, a two-day UTC margin is safely beyond every local calendar day.
  const today = localDate(asOf, record.edition.timezone)
    ?? new Date(asOf.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
  return Boolean(lastDay && today && /^\d{4}-\d{2}-\d{2}/.test(lastDay) && lastDay.slice(0, 10) < today);
}

function isPastBoundary(value: string | null | undefined, timezone: string | null | undefined, asOf: Date): boolean {
  if (!value) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const today = localDate(asOf, timezone);
    return today !== null && value < today; // Date-only boundaries pass after the entire local day.
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  const instant = Date.parse(value);
  return Number.isFinite(instant) && instant < asOf.getTime();
}

function daysUntilRace(record: RaceGraphSnapshotRecord, asOf: Date): number | null {
  const day = record.edition.raceDate?.slice(0, 10);
  const today = localDate(asOf, record.edition.timezone);
  if (!day || !today || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

function localDate(asOf: Date, timezone: string | null | undefined): string | null {
  if (!timezone) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(asOf);
    const value = (type: string) => parts.find((part) => part.type === type)?.value;
    const year = value("year"), month = value("month"), day = value("day");
    return year && month && day ? `${year}-${month}-${day}` : null;
  } catch {
    return null;
  }
}

function stableAlertId(editionId: string, reasonCode: string, fields: string[]): string {
  return `va-${createHash("sha256").update(JSON.stringify([editionId, reasonCode, fields])).digest("hex").slice(0, 16)}`;
}
