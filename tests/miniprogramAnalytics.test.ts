import { deepEqual, doesNotThrow, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  ANALYTICS_VIEWPORT_THRESHOLD,
  createRaceAnalyticsData,
  markViewportExposureOnce,
  normalizeRaceAnalyticsSource,
  trackEvent,
} from "../miniprogram/utils/analytics.ts";

const homePage = readFileSync(
  new URL("../miniprogram/pages/index/index.ts", import.meta.url),
  "utf8",
);
const homeTemplate = readFileSync(
  new URL("../miniprogram/pages/index/index.wxml", import.meta.url),
  "utf8",
);
const detailPage = readFileSync(
  new URL("../miniprogram/pages/races/detail/index.ts", import.meta.url),
  "utf8",
);
const detailTemplate = readFileSync(
  new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url),
  "utf8",
);

test("Analytics source normalization supports only the frozen launch sources", () => {
  equal(normalizeRaceAnalyticsSource("home"), "home");
  equal(normalizeRaceAnalyticsSource("share"), "share");
  equal(normalizeRaceAnalyticsSource("direct"), "direct");
  equal(normalizeRaceAnalyticsSource(undefined), "direct");
  equal(normalizeRaceAnalyticsSource("native_menu"), "other");
  equal(normalizeRaceAnalyticsSource("campaign"), "other");
});

test("race Analytics payloads use snake_case identity fields", () => {
  deepEqual(
    createRaceAnalyticsData(
      { eventId: "hk100", editionId: "hk100-2027" },
      "home",
      { position: 2 },
    ),
    {
      event_id: "hk100",
      edition_id: "hk100-2027",
      source: "home",
      position: 2,
    },
  );
});

test("viewport exposure requires the threshold and dedupes per page Set", () => {
  const tracked = new Set<string>();
  equal(ANALYTICS_VIEWPORT_THRESHOLD, 0.25);
  equal(markViewportExposureOnce(tracked, "race-a", 0.24), false);
  equal(tracked.size, 0);
  equal(markViewportExposureOnce(tracked, "race-a", 0.25), true);
  equal(markViewportExposureOnce(tracked, "race-a", 1), false);
  equal(markViewportExposureOnce(tracked, "race-b", 1), true);
  deepEqual([...tracked], ["race-a", "race-b"]);
});

test("home race cards use viewport observation, one-based position and home click source", () => {
  for (const expected of [
    'trackEvent("race_card_impression"',
    'trackEvent("race_card_click"',
    "createIntersectionObserver",
    "observeAll: true",
    'observe(".race-card"',
    "raceCardImpressionTracked",
    "index + 1",
    'navigateToRaceDetail(editionId, "home"',
  ]) {
    ok(homePage.includes(expected), expected);
  }
  ok(homeTemplate.includes('data-edition-id="{{item.editionId}}"'));
  ok(homeTemplate.includes('data-position="{{item.position}}"'));
  ok(homePage.includes("onUnload()"));
  ok(homePage.includes("disconnectRaceCardImpressionObserver()"));
});

test("Detail view reports only from the successful render callback and once per page", () => {
  ok(detailPage.includes("detailViewTracked: boolean"));
  ok(detailPage.includes('trackEvent("race_detail_view"'));
  ok(/loadState:\s*"success"[\s\S]*?\}, \(\) => \{[\s\S]*?this\.trackRaceDetailView\(\)/.test(detailPage));
  ok(/if \(!detail \|\| this\.detailViewTracked\) return;[\s\S]*?this\.detailViewTracked = true;/.test(detailPage));
  equal(/onLoad[\s\S]*?trackEvent\("race_detail_view"/.test(detailPage.slice(0, detailPage.indexOf("loadDetail()"))), false);
});

test("Race Guide impression is viewport-based, optional and page-deduped", () => {
  ok(detailPage.includes('observe(".race-guide__header"'));
  ok(detailPage.includes("!detail?.raceGuide || this.raceGuideTracked"));
  ok(detailPage.includes('trackEvent("race_guide_view"'));
  ok(detailPage.includes("this.raceGuideTracked = true"));
  ok(detailPage.includes("disconnectRaceGuideImpressionObserver()"));
});

test("Accommodation view is guarded and hotel impressions are per-card viewport events", () => {
  ok(detailPage.includes("if (!detail?.hasAccommodation || this.accommodationTracked) return"));
  ok(detailPage.includes('trackEvent("accommodation_view"'));
  equal(/accommodationRecommendations\.forEach[\s\S]*?hotel_card_impression/.test(detailPage), false);
  ok(detailPage.includes('observe(".hotel-card"'));
  ok(detailPage.includes("hotelImpressionTracked"));
  ok(detailPage.includes('"hotel_card_impression"'));
  ok(detailTemplate.includes('data-recommendation-id="{{item.recommendationId}}"'));
});

test("hotel click and jump outcomes share the frozen snake_case payload", () => {
  for (const eventName of ["hotel_click", "hotel_jump_success", "hotel_jump_fail"]) {
    ok(detailPage.includes(`"${eventName}"`));
  }
  for (const field of [
    "event_id",
    "edition_id",
    "hotel_id",
    "recommendation_id",
    "reason_type",
    "position",
    "source",
    "channel",
    "partner",
  ]) {
    ok(`${detailPage}\n${readFileSync(new URL("../miniprogram/utils/analytics.ts", import.meta.url), "utf8")}`.includes(field), field);
  }
});

test("Analytics exceptions never escape into product actions", () => {
  const scope = globalThis as typeof globalThis & {
    wx?: { reportEvent(eventName: string, data: Record<string, string>): unknown };
  };
  const previousWx = scope.wx;
  const previousConsoleError = console.error;
  let logged = false;
  scope.wx = {
    reportEvent() {
      throw new Error("analytics unavailable");
    },
  };
  console.error = () => { logged = true; };
  try {
    doesNotThrow(() => trackEvent("race_card_click", { event_id: "hk100" }));
    equal(logged, true);
  } finally {
    console.error = previousConsoleError;
    if (previousWx) scope.wx = previousWx;
    else delete scope.wx;
  }
});

test("Detail observers disconnect on reload and unload", () => {
  ok(/loadDetail\(\) \{[\s\S]*?disconnectRaceGuideImpressionObserver\(\);[\s\S]*?disconnectHotelImpressionObserver\(\);/.test(detailPage));
  ok(/onUnload\(\) \{[\s\S]*?disconnectRaceGuideImpressionObserver\(\);[\s\S]*?disconnectHotelImpressionObserver\(\);/.test(detailPage));
});
