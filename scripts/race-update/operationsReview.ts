import { createHash } from "node:crypto";
import type { SanitizedRaceUpdateReport } from "./productionWorkflow.ts";
export type OperationsReviewState = {
  schemaVersion: "operations-review-state-v1";
  alerts: Array<{ alertId: string; signature: string }>;
};
export function assertOperationsReviewState(
  value: unknown,
): asserts value is OperationsReviewState {
  const state = value as OperationsReviewState;
  if (
    !state ||
    state.schemaVersion !== "operations-review-state-v1" ||
    !Array.isArray(state.alerts) ||
    state.alerts.length > 5_000
  )
    throw new Error("INVALID_OPERATIONS_REVIEW_STATE");
  const ids = new Set<string>();
  for (const alert of state.alerts) {
    if (
      !alert ||
      !/^va-[a-f0-9]{16}$/.test(alert.alertId) ||
      !/^[a-f0-9]{64}$/.test(alert.signature) ||
      ids.has(alert.alertId)
    )
      throw new Error("INVALID_OPERATIONS_REVIEW_ALERT");
    ids.add(alert.alertId);
  }
}
export function buildOperationalReview(
  report: Pick<
    SanitizedRaceUpdateReport,
    "verification" | "newPending" | "discovery"
  >,
  previous?: OperationsReviewState,
) {
  if (previous) assertOperationsReviewState(previous);
  const known = new Map(
    previous?.alerts.map((a) => [a.alertId, a.signature]) ?? [],
  );
  const alerts = report.verification.alerts.map((a) => ({
    alertId: a.alertId,
    signature: createHash("sha256")
      .update(
        JSON.stringify({
          severity: a.severity,
          reason: a.reasonCode,
          fields: a.affectedFields,
          sourceIds: a.sourceIds,
          trigger: a.triggerReason,
          missing: a.missingEvidence,
        }),
      )
      .digest("hex"),
  }));
  const newAlertIds = alerts
    .filter((a) => known.get(a.alertId) !== a.signature)
    .map((a) => a.alertId);
  const state: OperationsReviewState = {
    schemaVersion: "operations-review-state-v1",
    alerts,
  };
  assertOperationsReviewState(state);
  return {
    state,
    attention: {
      baseline: previous ? ("available" as const) : ("not_available" as const),
      newAlertIds,
      repeatedAlerts: alerts.length - newAlertIds.length,
      newFactPending: report.newPending.length,
      newSourceCandidates: report.discovery?.newSources ?? 0,
      changedSourceCandidates: report.discovery?.changedCandidates ?? 0,
    },
  };
}
