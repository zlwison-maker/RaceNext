type AnalyticsValue = string | number | boolean;

export function trackEvent(eventName: string, data: Record<string, AnalyticsValue>): void {
  try {
    wx.reportEvent(eventName, data);
  } catch (error: unknown) {
    console.error(`RaceNext 埋点失败：${eventName}`, error);
  }
}
