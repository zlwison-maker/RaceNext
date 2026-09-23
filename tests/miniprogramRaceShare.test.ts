import { deepEqual, equal, ok } from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  SHARE_ACTION_RESTORE_DELAY_MS,
  createRaceShareAnalyticsData,
  createRaceShareConfig,
  getShareActionVisibilityUpdate,
} from "../miniprogram/utils/raceShare.ts";

const pageScript = readFileSync(
  new URL("../miniprogram/pages/races/detail/index.ts", import.meta.url),
  "utf8",
);
const pageTemplate = readFileSync(
  new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url),
  "utf8",
);

test("share config uses the current race title and editionId", () => {
  const cases = [
    ["2026 北京马拉松", "beijing-marathon-2026"],
    ["2026 凯乐石贡嘎100冰川极限挑战赛", "kailas-gongga-100-2026"],
    ["2027 香港HK100越野赛", "hk100-2027"],
  ] as const;

  for (const [name, editionId] of cases) {
    const config = createRaceShareConfig({
      editionId,
      raceId: editionId.replace(/-20\d{2}$/, ""),
      name,
      coverImage: null,
      heroImage: null,
    });
    equal(config.appMessage.title, `${name}｜下一场参赛指南`);
    equal(config.appMessage.path, `/pages/races/detail/index?editionId=${editionId}&source=share`);
    equal(config.timeline.title, `${name}｜下一场参赛指南`);
    equal(config.timeline.query, `editionId=${editionId}&source=share`);
  }
});

test("share config is generic and does not hardcode Beijing", () => {
  const source = readFileSync(
    new URL("../miniprogram/utils/raceShare.ts", import.meta.url),
    "utf8",
  );
  equal(source.includes("beijing-marathon"), false);
  equal(source.includes("北京马拉松"), false);
});

test("share image prefers the centered Cover derivative over Hero", () => {
  const config = createRaceShareConfig({
    editionId: "hk100-2027",
    raceId: "hk100",
    name: "2027 香港HK100越野赛",
    coverImage: "https://racenext.run/races/hk100/2027/cover-original.jpg",
    heroImage: "https://racenext.run/races/hk100/2027/hero-original.png",
  });
  equal(config.appMessage.imageUrl, "https://racenext.run/races/hk100/2027/share-cover-5x4.jpg");
  equal(config.timeline.imageUrl, "https://racenext.run/races/hk100/2027/share-cover-5x4.jpg");
});

test("RaceNext Cover formats are normalized to a JPEG share derivative", () => {
  const config = createRaceShareConfig({
    editionId: "beijing-marathon-2026",
    raceId: "beijing-marathon",
    name: "2026 北京马拉松",
    coverImage: "https://racenext.run/races/beijing-marathon/2026/cover-original.webp",
    heroImage: "https://racenext.run/races/beijing-marathon/2026/hero-original.jpeg",
  });
  equal(config.appMessage.imageUrl, "https://racenext.run/races/beijing-marathon/2026/share-cover-5x4.jpg");
  equal(config.timeline.imageUrl, "https://racenext.run/races/beijing-marathon/2026/share-cover-5x4.jpg");
});

test("share config leaves imageUrl unset when external Cover and Hero are incompatible", () => {
  const config = createRaceShareConfig({
    editionId: "beijing-marathon-2026",
    raceId: "beijing-marathon",
    name: "2026 北京马拉松",
    coverImage: "https://example.com/cover-original.webp",
    heroImage: null,
  });
  equal("imageUrl" in config.appMessage, false);
  equal("imageUrl" in config.timeline, false);
});

test("all current race Covers have deterministic centered 5:4 JPEG derivatives", () => {
  const projectRoot = fileURLToPath(new URL("..", import.meta.url));
  execFileSync(
    process.execPath,
    [fileURLToPath(new URL("../scripts/generateMiniShareImages.mjs", import.meta.url)), "--check"],
    { cwd: projectRoot, stdio: "pipe" },
  );

  const canonical = JSON.parse(readFileSync(
    new URL("../data/canonical/race-graph-v1.json", import.meta.url),
    "utf8",
  )) as { records: Array<{ edition: { coverImage: string; editionId: string } }> };
  equal(canonical.records.length, 12);
  for (const { edition } of canonical.records) {
    const derivative = new URL(
      `../public${edition.coverImage.replace(/\/[^/]+$/, "/share-cover-5x4.jpg")}`,
      import.meta.url,
    );
    ok(existsSync(derivative), `Missing share derivative for ${edition.editionId}`);
    const bytes = readFileSync(derivative);
    equal(bytes[0], 0xff);
    equal(bytes[1], 0xd8);
    equal(bytes[bytes.length - 2], 0xff);
    equal(bytes[bytes.length - 1], 0xd9);
  }
});

test("share config does not introduce a dedicated share image field", () => {
  const source = readFileSync(
    new URL("../miniprogram/utils/raceShare.ts", import.meta.url),
    "utf8",
  );
  equal(/\b(?:shareImage|shareCover|socialImage|wechatShareImage)\b/.test(source), false);
});

test("share analytics distinguishes bottom, menu and timeline triggers", () => {
  const context = { editionId: "hk100-2027", raceId: "hk100" };
  deepEqual(createRaceShareAnalyticsData(context, "app_message", "home", "bottom_action"), {
    event_id: "hk100",
    edition_id: "hk100-2027",
    channel: "app_message",
    source: "home",
    trigger_source: "bottom_action",
  });
  deepEqual(createRaceShareAnalyticsData(context, "app_message", "direct", "native_menu"), {
    event_id: "hk100",
    edition_id: "hk100-2027",
    channel: "app_message",
    source: "direct",
    trigger_source: "native_menu",
  });
  deepEqual(createRaceShareAnalyticsData(context, "timeline", "share", "native_menu"), {
    event_id: "hk100",
    edition_id: "hk100-2027",
    channel: "timeline",
    source: "share",
    trigger_source: "native_menu",
  });
  ok(pageScript.includes('trackEvent(\n      "race_share"'));
  equal(pageScript.includes("race_share_initiated"), false);
});

test("share action visibility avoids redundant updates and restores after 1200ms", () => {
  equal(SHARE_ACTION_RESTORE_DELAY_MS, 1200);
  equal(getShareActionVisibilityUpdate(true, false), false);
  equal(getShareActionVisibilityUpdate(false, false), null);
  equal(getShareActionVisibilityUpdate(false, true), true);
  equal(getShareActionVisibilityUpdate(true, true), null);
  ok(pageScript.includes("onPageScroll()"));
  ok(pageScript.includes("clearShareActionRestoreTimer()"));
  ok(pageScript.includes("onHide()"));
  ok(pageScript.includes("onUnload()"));
});

test("Detail exposes native menu sharing and a bottom native share button", () => {
  ok(pageScript.includes("wx.showShareMenu"));
  ok(pageScript.includes('"shareAppMessage", "shareTimeline"'));
  ok(pageScript.includes("onShareAppMessage"));
  ok(pageScript.includes("onShareTimeline"));
  ok(pageTemplate.includes('open-type="share"'));
  ok(pageTemplate.includes("分享给朋友"));
});

test("launch app config has no Bottom TabBar or mine route", () => {
  const appConfig = JSON.parse(readFileSync(
    new URL("../miniprogram/app.json", import.meta.url),
    "utf8",
  )) as { pages: string[]; tabBar?: unknown };
  equal("tabBar" in appConfig, false);
  equal(appConfig.pages.includes("pages/mine/index"), false);
  for (const fileName of ["index.ts", "index.json", "index.wxml", "index.wxss"]) {
    equal(
      existsSync(new URL(`../miniprogram/pages/mine/${fileName}`, import.meta.url)),
      false,
    );
  }
});
