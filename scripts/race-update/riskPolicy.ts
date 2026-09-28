import type { RegistrationStatus } from "../../types/event.ts";
import type { RaceFieldDiff } from "../../types/raceUpdate.ts";
import { isAbnormalRegistrationTransition } from "./validation.ts";

const LOW_RISK_FIELDS = new Set([
  "Edition.registrationStatus",
  "Edition.registrationOpenDate",
  "Edition.registrationCloseDate",
  "Edition.registrationUrl",
]);

const HIGH_IMPACT_FIELDS = new Set([
  "Edition.raceDate",
  "Edition.endDate",
  "Category.startAt",
  "Category.startTimes",
  "Category.startLocation",
  "Category.finishLocation",
  "Category.distanceKm",
  "Category.elevationGain",
  "Category.elevationLoss",
  "Category.cutoffTimeHours",
]);

export const MIN_AUTO_APPLY_CONFIDENCE = 0.8;

export type StructuralChangeKind =
  | "new_event"
  | "new_edition"
  | "new_category"
  | "category_deletion"
  | "identity_conflict"
  | "unsupported_field"
  | "source_conflict";

export function classifyStructuralChange(kind: StructuralChangeKind): {
  risk: "structural";
  action: "needs_review";
  reason: string;
} {
  return {
    risk: "structural",
    action: "needs_review",
    reason: `Structural change (${kind}) requires explicit review.`,
  };
}

export function classifyRaceFieldDiff(
  diff: RaceFieldDiff,
  context: { autoApplyEligible: boolean; confidence: number },
): { risk: "low" | "high_impact" | "structural"; action: "auto_apply" | "pending_review" | "needs_review"; reason: string } {
  if (diff.status === "CONFLICT") {
    return { ...classifyStructuralChange("source_conflict"), reason: "Eligible sources disagree; source conflict blocks application." };
  }
  if (diff.status === "MISSING") {
    return { ...classifyStructuralChange(diff.entityType === "Category" ? "new_category" : "new_edition"), reason: "Target identity is missing from the current Race Graph." };
  }

  const key = `${diff.entityType}.${diff.field}`;
  if (HIGH_IMPACT_FIELDS.has(key)) {
    return { risk: "high_impact", action: "pending_review", reason: "High-impact race fact cannot be auto-applied in V1." };
  }
  if (!LOW_RISK_FIELDS.has(key)) {
    return { ...classifyStructuralChange("unsupported_field"), reason: "Field has no V1 application policy." };
  }

  if (diff.field === "registrationStatus"
    && isAbnormalRegistrationTransition({
      from: diff.oldValue as RegistrationStatus,
      to: diff.newValue as RegistrationStatus,
    })) {
    return { risk: "low", action: "pending_review", reason: "Abnormal reverse registration transition requires review." };
  }
  if (!context.autoApplyEligible) {
    return { risk: "low", action: "needs_review", reason: "Source is extractable but not eligible for automatic application." };
  }
  if (!Number.isFinite(context.confidence) || context.confidence < MIN_AUTO_APPLY_CONFIDENCE) {
    return { risk: "low", action: "needs_review", reason: "Candidate confidence is below the V1 auto-apply threshold." };
  }
  return { risk: "low", action: "auto_apply", reason: "Validated low-risk change from an eligible, conflict-free source." };
}

export const RACE_UPDATE_RISK_POLICY = {
  lowRiskFields: [...LOW_RISK_FIELDS],
  highImpactFields: [...HIGH_IMPACT_FIELDS],
} as const;
