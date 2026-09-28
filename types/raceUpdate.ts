import type { Category, Edition, Event, RegistrationStatus } from "./event.ts";
import type {
  FactEvidence,
  OfficialFactCandidate,
  OfficialFactEntityType,
  OfficialFactField,
} from "./officialSourceIngestion.ts";

export type RaceGraphSnapshotRecord = {
  event: Event;
  edition: Edition;
  categories: Category[];
};

export type RaceGraphSnapshot = {
  schemaVersion: "race-graph-v1";
  generatedAt: string;
  records: RaceGraphSnapshotRecord[];
};

export type RaceSourceTier = "primary_official" | "trusted_structured" | "trusted_secondary";
export type RaceSourceStatus = "active" | "unavailable" | "pending_review";

export type RaceSourceType =
  | "event_home"
  | "notice"
  | "regulations"
  | "registration_notice"
  | "registration_platform"
  | "category_page"
  | "official_calendar"
  | "calendar"
  | "certification_platform"
  | "event_directory"
  | "official_partner_announcement"
  | "structured_connector"
  | "government_context"
  | "media_report"
  | "previous_edition_media"
  | "previous_edition_report"
  | "specialist_media";

export type RaceSourceRegistrySource = {
  sourceId: string;
  url: string;
  domain: string;
  tier: RaceSourceTier;
  sourceType: RaceSourceType;
  status: RaceSourceStatus;
  isPrimary: boolean;
  notes: string | null;
};

export type RaceSourceRegistryEntry = {
  editionId: string;
  sources: RaceSourceRegistrySource[];
};

export type RaceSourceRegistry = {
  schemaVersion: "race-source-registry-v1";
  editions: RaceSourceRegistryEntry[];
};

export type FreshnessEligibilityMode = "official_document" | "trusted_document" | "structured_connector" | "excluded";

export type FreshnessSourceEligibility = {
  eligible: boolean;
  autoApplyEligible: boolean;
  mode: FreshnessEligibilityMode;
  reason: string;
};

export type ValidationError = {
  eventId: string | null;
  editionId: string | null;
  categoryId: string | null;
  field: string;
  message: string;
  sourceId: string | null;
  sourceUrl: string | null;
};

export type RaceFieldTarget = {
  eventId: string;
  editionId: string;
  categoryId: string | null;
  entityType: OfficialFactEntityType;
  field: OfficialFactField;
};

export type RaceDiffStatus = "UNCHANGED" | "CHANGED" | "CONFLICT" | "MISSING" | "NO_CANDIDATE";

export type RaceFieldDiff = RaceFieldTarget & {
  status: RaceDiffStatus;
  oldValue: unknown;
  newValue: unknown;
  candidates: OfficialFactCandidate[];
};

export type ChangeRisk = "low" | "high_impact" | "structural";
export type ChangeAction = "auto_apply" | "pending_review" | "needs_review";

export type RaceFieldChange = RaceFieldTarget & {
  changeId: string;
  oldValue: unknown;
  newValue: unknown;
  sourceIds: string[];
  sourceUrls: string[];
  detectedAt: string;
  risk: ChangeRisk;
  action: ChangeAction;
  reason: string;
  evidence: FactEvidence[];
};

export type PendingChangeStatus = "pending" | "approved" | "rejected" | "applied";

export type PendingChange = RaceFieldTarget & {
  changeId: string;
  currentValue: unknown;
  candidateValue: unknown;
  sourceId: string;
  sourceUrl: string;
  evidenceText: string;
  evidenceLocator: string;
  confidence: number;
  fetchedAt: string;
  contentHash: string;
  extractionMethod: string;
  evidence: FactEvidence[];
  risk: ChangeRisk;
  reason: string;
  status: PendingChangeStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
  appliedAt: string | null;
};

export type PendingChangeStore = {
  schemaVersion: "race-update-pending-v1";
  changes: PendingChange[];
};

export type RaceUpdateCoreResult = {
  snapshot: RaceGraphSnapshot;
  diffs: RaceFieldDiff[];
  changes: RaceFieldChange[];
  pendingChanges: PendingChange[];
  validationErrors: ValidationError[];
  appliedChangeIds: string[];
};

export type RegistrationTransition = {
  from: RegistrationStatus;
  to: RegistrationStatus;
};
