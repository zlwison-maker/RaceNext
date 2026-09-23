type AnalyticsValue = string | number | boolean;

declare const wx: {
  reportEvent(eventName: string, data: Record<string, AnalyticsValue>): unknown;
};

export type RaceAnalyticsSource = "home" | "share" | "direct" | "other";

export const ANALYTICS_VIEWPORT_THRESHOLD = 0.25;

export type RaceAnalyticsIdentity = {
  eventId: string;
  editionId: string;
};

export function trackEvent(eventName: string, data: Record<string, AnalyticsValue>): void {
  try {
    wx.reportEvent(eventName, data);
  } catch (error: unknown) {
    console.error(`RaceNext 埋点失败：${eventName}`, error);
  }
}

export function normalizeRaceAnalyticsSource(value: string | undefined): RaceAnalyticsSource {
  if (!value) return "direct";
  if (value === "home" || value === "share" || value === "direct") return value;
  return "other";
}

export function createRaceAnalyticsData(
  identity: RaceAnalyticsIdentity,
  source: RaceAnalyticsSource,
  extra: Record<string, AnalyticsValue> = {},
): Record<string, AnalyticsValue> {
  return {
    event_id: identity.eventId,
    edition_id: identity.editionId,
    source,
    ...extra,
  };
}

export function markExposureOnce(tracked: Set<string>, key: string): boolean {
  if (!key || tracked.has(key)) return false;
  tracked.add(key);
  return true;
}

export function markViewportExposureOnce(
  tracked: Set<string>,
  key: string,
  intersectionRatio: number,
): boolean {
  if (intersectionRatio < ANALYTICS_VIEWPORT_THRESHOLD) return false;
  return markExposureOnce(tracked, key);
}
