import type {
  SourceType,
  SyncHealthStatus,
  SyncLifecycleStatus,
  SyncType,
} from "../../types/sourceGovernance.ts";

export type { SyncHealthStatus, SyncType } from "../../types/sourceGovernance.ts";

export function getDefaultSyncFrequency(sourceType: SourceType, lifecycleStatus: SyncLifecycleStatus): string {
  if (lifecycleStatus === "archived") return "manual_only";
  if (lifecycleStatus === "race_day") return "emergency_as_needed";
  if (lifecycleStatus === "registration") return "daily_with_2h_critical_fields";
  if (lifecycleStatus === "countdown") return "daily";
  if (lifecycleStatus === "finished") return "weekly";

  switch (sourceType) {
    case "Official":
      return "daily_before_race";
    case "Aggregator":
      return "daily";
    case "International":
      return "weekly";
    case "Community":
      return "daily";
    case "Commercial":
      return "daily";
    case "Internal":
      return "daily_recompute";
    case "Map":
      return "weekly";
  }
}

export function shouldTriggerEmergencySync(change: {
  field: string;
  previousValue?: unknown;
  newValue?: unknown;
  sourceType?: SourceType;
}): boolean {
  const emergencyFields = new Set(["raceDate", "registrationStatus", "remainingQuota", "rulebookUrl", "lifecycleStatus"]);
  if (!emergencyFields.has(change.field)) return false;
  if (change.field === "lifecycleStatus" && change.newValue === "cancelled") return true;
  if (change.field === "registrationStatus" && ["cancelled", "registration_closed"].includes(String(change.newValue))) return true;
  if (change.field === "raceDate" && change.previousValue !== change.newValue) return true;
  return change.sourceType === "Official";
}

export function nextHealthStatus(failedAttempts: number): SyncHealthStatus {
  if (failedAttempts <= 0) return "Healthy";
  if (failedAttempts < 3) return "Warning";
  return "Error";
}
