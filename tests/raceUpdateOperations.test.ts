import { deepEqual, equal, throws } from "node:assert/strict";
import { test } from "node:test";
import {
  assertOperationsReviewState,
  buildOperationalReview,
} from "../scripts/race-update/operationsReview.ts";
import type { SanitizedRaceUpdateReport } from "../scripts/race-update/productionWorkflow.ts";
const report = {
  verification: {
    alerts: [
      {
        alertId: "va-0123456789abcdef",
        severity: "HIGH",
        reasonCode: "OFFICIAL_SOURCE_UNAVAILABLE",
        affectedFields: ["raceDate"],
        sourceIds: ["official"],
        triggerReason: "Source unavailable",
        missingEvidence: "Direct official evidence",
      },
    ],
  },
  newPending: [],
} as unknown as SanitizedRaceUpdateReport;
test("same alerts are not new tasks; recovery and changed severity re-open review without suppressing Fact Pending", () => {
  const first = buildOperationalReview(report);
  equal(first.attention.newAlertIds.length, 1);
  equal(first.attention.baseline, "not_available");
  const before = structuredClone(first.state);
  const repeat = buildOperationalReview(report, first.state);
  equal(repeat.attention.newAlertIds.length, 0);
  equal(repeat.attention.repeatedAlerts, 1);
  deepEqual(first.state, before);
  const recovery = buildOperationalReview(
    { ...report, verification: { ...report.verification, alerts: [] } },
    repeat.state,
  );
  equal(
    buildOperationalReview(report, recovery.state).attention.newAlertIds.length,
    1,
  );
  const changed = structuredClone(report);
  changed.verification.alerts[0].severity = "REVIEW";
  changed.newPending = [{ changeId: "fixture" }] as typeof changed.newPending;
  const result = buildOperationalReview(changed, repeat.state);
  equal(result.attention.newAlertIds.length, 1);
  equal(result.attention.newFactPending, 1);
});
test("bad/duplicate review history fails validation and cannot silently hide alerts", () => {
  throws(() =>
    assertOperationsReviewState({ schemaVersion: "bad", alerts: [] }),
  );
  const first = buildOperationalReview(report);
  throws(() =>
    assertOperationsReviewState({
      ...first.state,
      alerts: [...first.state.alerts, ...first.state.alerts],
    }),
  );
});
