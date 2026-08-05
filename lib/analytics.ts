type AnalyticsValue = string | number | boolean | undefined;

type AnalyticsParams = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, params?: AnalyticsParams) => void;
    _hmt?: {
      push: (args: unknown[]) => void;
    };
  }
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return;

  try {
    window.gtag?.("event", eventName, params);
  } catch {
    // Analytics should never affect the product experience.
  }

  try {
    window._hmt?.push(["_trackEvent", eventName, "event", serializeAnalyticsParams(params)]);
  } catch {
    // Analytics should never affect the product experience.
  }
}

export function getTrafficSource() {
  if (typeof window === "undefined") return "server";

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  if (utmSource) return utmSource;

  return document.referrer ? "referral" : "direct";
}

function serializeAnalyticsParams(params: AnalyticsParams) {
  const entries = Object.entries(params).filter((entry): entry is [string, Exclude<AnalyticsValue, undefined>] => entry[1] !== undefined);
  return JSON.stringify(Object.fromEntries(entries));
}
