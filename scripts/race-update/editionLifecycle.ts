import type { RaceGraphSnapshotRecord } from "../../types/raceUpdate.ts";

/** Scheduling only: never archives Canonical, changes publication, or resolves historical Pending. */
export function isCompletedEdition(record: RaceGraphSnapshotRecord, checkedAt: string): boolean {
  const { event, edition } = record;
  const gate = edition.governance.publicationGate;
  if (edition.lifecycleStatus === "uncertain"
    || edition.eventId !== event.eventId || edition.editionId !== `${event.eventId}-${edition.editionYear}`
    || gate?.dateEvidenceStatus !== "verified" || gate.conflictStatus !== "none"
    || gate.requestedEditionYear !== edition.editionYear
    || gate.latestRelevantOfficialEditionYear !== edition.editionYear
    || !calendarDate(edition.raceDate) || Number(edition.raceDate.slice(0, 4)) !== edition.editionYear) return false;
  const lastDay = edition.endDate ?? edition.raceDate;
  if (!calendarDate(lastDay) || lastDay < edition.raceDate || !edition.timezone) return false;
  const asOf = new Date(checkedAt);
  if (!Number.isFinite(asOf.getTime())) throw new Error("INVALID_MONITORING_TIME");
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: edition.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(asOf);
    const today = ["year", "month", "day"].map(type => parts.find(p => p.type === type)?.value).join("-");
    return lastDay < today; // Include the entire final local calendar day, including multi-day races.
  } catch { return false; } // Unknown/invalid timezone must not silently remove an Edition.
}

export function isDailyMonitoringEdition(record: RaceGraphSnapshotRecord, checkedAt: string): boolean {
  return !["archived", "cancelled"].includes(record.edition.lifecycleStatus) && !isCompletedEdition(record, checkedAt);
}

function calendarDate(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
