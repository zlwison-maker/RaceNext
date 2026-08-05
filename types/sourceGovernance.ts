import type { LifecycleStatus } from "./event.ts";

/** Source Registry / SOURCE_REGISTRY.md */
export type SourceType = "Official" | "Aggregator" | "International" | "Community" | "Map" | "Commercial" | "Internal";

/** Source Registry / SOURCE_REGISTRY.md */
export type SourceStatus = "Planned" | "Researching" | "Developing" | "Active" | "Deprecated" | "Disabled";

/** Source Registry / SOURCE_REGISTRY.md. Must be lowercase snake_case. */
export type SourceId =
  | "official"
  | "official_registration"
  | "official_wechat"
  | "runchina"
  | "zuicool"
  | "iranshao"
  | "gudong"
  | "joyrun"
  | "itra"
  | "utmb"
  | "ultrasignup"
  | "xiaohongshu"
  | "bilibili"
  | "douyin"
  | "strava"
  | "amap"
  | "baidu_map"
  | "ctrip"
  | "fliggy"
  | "jd_union"
  | "taobao_union"
  | "pdd_union"
  | "racenext_ai"
  | "racenext_manual";

export interface SourceRegistryItem {
  /** SOURCE_REGISTRY.md */
  id: SourceId;
  displayName: string;
  type: SourceType;
  coverage: string;
  authorityLevel: 1 | 2 | 3 | 4 | 5;
  mvp: boolean;
  status: SourceStatus;
  description: string;
}

/** FIELD_OWNERSHIP.md */
export type FieldOwner = "Official" | "Aggregator" | "International" | "Community" | "Map" | "Commercial" | "RaceNext";

/** FIELD_OWNERSHIP.md */
export type FieldContributor = FieldOwner | SourceId | "Weather API" | "GPX";

/** FIELD_PRIORITY_MATRIX.md / MERGE_RULES.md */
export type ResolutionStrategy =
  | "First Available"
  | "Merge All"
  | "Latest Timestamp Wins"
  | "Highest Confidence"
  | "Manual Review"
  | "Ignore External"
  | "Derived";

export interface FieldPriorityRule {
  /** FIELD_PRIORITY_MATRIX.md */
  field: string;
  owner: FieldOwner;
  contributors: FieldContributor[];
  priority: FieldContributor[];
  strategy: ResolutionStrategy;
  derived: boolean;
}

/** MERGE_RULES.md. Operational trace used by the merge engine. */
export interface MergeTrace {
  field: string;
  selectedSource: SourceId | "merged" | "manual" | "placeholder";
  selectedSourceName?: string;
  reason: string;
  candidates?: Array<{
    source: SourceId;
    value: unknown;
    confidence?: number;
  }>;
  source: SourceId | "merged" | "manual" | "placeholder";
  previousValue?: unknown;
  newValue?: unknown;
  strategy: ResolutionStrategy;
  timestamp: string;
  operator: "Merge Engine" | "Manual" | "System";
}

/** MERGE_RULES.md conflict queue item. */
export interface MergeConflict {
  field: string;
  sources: SourceId[];
  values: Record<string, unknown>;
  strategy: ResolutionStrategy;
  reason: string;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

/** SYNC_POLICY.md */
export type SyncType = "Full Sync" | "Incremental Sync" | "Manual Sync" | "Emergency Sync";

/** SYNC_POLICY.md */
export type SyncHealthStatus = "Healthy" | "Warning" | "Error" | "Disabled";

export interface SyncPolicy {
  /** SYNC_POLICY.md */
  sourceType: SourceType;
  defaultSyncType: SyncType;
  defaultFrequency: string;
  retryScheduleMinutes: number[];
  healthStatus: SyncHealthStatus;
  ttlHours?: number;
}

export interface AuditLog {
  /** SYNC_POLICY.md */
  source: SourceId;
  syncType: SyncType;
  startTime: string;
  endTime?: string | null;
  records: number;
  updated: number;
  failed: number;
  durationMs?: number | null;
  operator: "Scheduler" | "Manual" | "System";
  metadata?: Record<string, unknown>;
}

export type SyncLifecycleStatus = LifecycleStatus | "upcoming" | "registration" | "countdown" | "race_day" | "finished" | "archived";
