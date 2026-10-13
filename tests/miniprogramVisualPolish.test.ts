import { equal, match, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const homeTemplate = readFileSync(new URL("../miniprogram/pages/index/index.wxml", import.meta.url), "utf8");
const homeStyles = readFileSync(new URL("../miniprogram/pages/index/index.wxss", import.meta.url), "utf8");
const detailTemplate = readFileSync(new URL("../miniprogram/pages/races/detail/index.wxml", import.meta.url), "utf8");
const detailStyles = readFileSync(new URL("../miniprogram/pages/races/detail/index.wxss", import.meta.url), "utf8");
const detailConfig = readFileSync(new URL("../miniprogram/pages/races/detail/index.json", import.meta.url), "utf8");

test("Homepage uses the launch-stage promise and one restrained bottom scrim", () => {
  ok(homeTemplate.includes("你的下一场参赛指南"));
  equal(homeTemplate.includes("决定你的下一场比赛"), false);
  equal((homeTemplate.match(/class="race-scrim"/g) ?? []).length, 1);
  match(homeStyles, /\.race-scrim\s*\{[\s\S]*?height:\s*58%;[\s\S]*?rgba\(0, 0, 0, 0\.78\)[\s\S]*?rgba\(0, 0, 0, 0\) 100%/);
});

test("Detail navigation and category control use the launch-ready hierarchy", () => {
  ok(detailConfig.includes('"navigationBarTitleText": "下一场参赛指南"'));
  match(detailStyles, /\.guide-tabs\s*\{[\s\S]*?border-bottom:\s*1rpx solid #e9e9e5/);
  const categorySelector = detailStyles.match(/\.category-selector\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const categoryScroll = detailStyles.match(/\.category-selector-scroll\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const coreFacts = detailStyles.match(/\.core-facts\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  equal(categorySelector.includes("border-"), false);
  equal(coreFacts.includes("border-"), false);
  match(detailTemplate, /<scroll-view[\s\S]*?class="category-selector-scroll"[\s\S]*?scroll-x[\s\S]*?show-scrollbar="\{\{false\}\}"/);
  match(categoryScroll, /white-space:\s*nowrap/);
  equal(categorySelector.includes("flex-wrap"), false);
  match(categorySelector, /display:\s*inline-flex/);
  match(categorySelector, /gap:\s*36rpx/);
  match(detailStyles, /\.category-option\s*\{[\s\S]*?border-bottom:\s*3rpx solid transparent/);
  match(detailStyles, /\.category-option--active\s*\{[\s\S]*?border-bottom-color:\s*#111111/);
  match(detailStyles, /\.execution-fact\s*\{[\s\S]*?border-bottom:\s*1rpx solid #f0f0ed/);
  match(detailStyles, /\.course-point\s*\{[\s\S]*?border-bottom:\s*1rpx solid #f0f0ed/);
});

test("Core Facts keep three columns and scroll one readable row when descent creates a fourth", () => {
  match(detailTemplate, /<scroll-view[\s\S]*?class="core-facts-scroll"[\s\S]*?scroll-x[\s\S]*?show-scrollbar="\{\{false\}\}"/);
  match(detailTemplate, /coreFacts\.length > 3 \? 'core-facts--scrollable' : ''/);
  match(detailStyles, /\.core-facts\s*\{[\s\S]*?display:\s*flex;[\s\S]*?white-space:\s*normal/);
  match(detailStyles, /\.core-facts--scrollable\s*\{[\s\S]*?min-width:\s*820rpx/);
  match(detailStyles, /\.core-facts--scrollable \.core-fact\s*\{[\s\S]*?min-width:\s*188rpx;[\s\S]*?flex:\s*1 0 188rpx/);
  equal(/\.core-facts\s*\{[\s\S]*?flex-wrap/.test(detailStyles), false);
});

test("Category selector visibility never gates the static name or Category facts", () => {
  equal(
    detailTemplate.includes('wx:if="{{detail.showCategorySelector}}" class="category-section"'),
    false,
  );
  match(
    detailTemplate,
    /<view wx:if="\{\{detail\.selectedCategory\}\}" class="category-facts">\s*<view class="category-section">\s*<text class="category-heading">组别<\/text>/,
  );
  match(
    detailTemplate,
    /<block wx:if="\{\{detail\.showCategorySelector\}\}">[\s\S]*?class="category-selector-scroll"[\s\S]*?<\/block>\s*<text wx:else class="category-static-name">\{\{detail\.selectedCategory\.name\}\}<\/text>\s*<scroll-view\s+wx:if="\{\{detail\.selectedCategory\.coreFacts\.length\}\}"/,
  );
  match(detailStyles, /\.category-static-name\s*\{[\s\S]*?margin-top:\s*16rpx;[\s\S]*?font-size:\s*32rpx;[\s\S]*?font-weight:\s*600/);
  match(detailStyles, /\.category-static-name \+ \.core-facts-scroll \.core-facts\s*\{[\s\S]*?padding-top:\s*24rpx/);
  equal(/class="category-static-name"[^>]*(bindtap|hover-class)/.test(detailTemplate), false);
  match(
    detailTemplate,
    /<view wx:if="\{\{detail\.selectedCategory\.executionFacts\.length\}\}" class="execution-facts">/,
  );
  match(
    detailStyles,
    /\.category-facts > \.course-points:first-child\s*\{[\s\S]*?margin-top:\s*64rpx/,
  );
});

test("public header is compact, city-level and contains no Category summary", () => {
  match(detailTemplate, /class="edition-meta__primary">\{\{detail\.dateDisplay\}\}<\/text>/);
  match(detailTemplate, /class="edition-meta__primary">\{\{detail\.headerLocationDisplay\}\}<\/text>/);
  match(detailTemplate, /class="edition-meta__registration">\{\{detail\.registrationDisplay\}\}<\/text>/);
  match(detailTemplate, /wx:if="\{\{detail\.dateDisplay && detail\.headerLocationDisplay\}\}" class="edition-meta__separator"> · <\/text>/);
  match(detailTemplate, /wx:if="\{\{detail\.registrationDisplay && \(detail\.dateDisplay \|\| detail\.headerLocationDisplay\)\}\}" class="edition-meta__separator"> · <\/text>/);
  equal(detailTemplate.includes("detail.summaryDisplay"), false);
  equal(detailTemplate.includes("detail.locationDisplay"), false);
  match(
    detailStyles,
    /\.edition-meta\s*\{[\s\S]*?font-size:\s*28rpx;[\s\S]*?font-weight:\s*400;[\s\S]*?line-height:\s*44rpx;[\s\S]*?white-space:\s*normal;[\s\S]*?word-break:\s*break-word/,
  );
  match(detailStyles, /\.edition-meta__primary\s*\{\s*color:\s*#111111;/);
  match(detailStyles, /\.edition-meta__separator,\s*\.edition-meta__registration\s*\{\s*color:\s*#8a8a8a;/);
});

test("Detail facts and editorial content use the frozen semantic typography", () => {
  match(detailStyles, /\.guide-tabs\s*\{[\s\S]*?margin-top:\s*66rpx/);
  match(detailStyles, /\.race-title\s*\{[\s\S]*?font-size:\s*44rpx;[\s\S]*?font-weight:\s*700;[\s\S]*?line-height:\s*60rpx/);
  match(detailStyles, /\.edition-meta\s*\{[\s\S]*?font-size:\s*28rpx;[\s\S]*?font-weight:\s*400;[\s\S]*?line-height:\s*44rpx/);
  match(detailStyles, /\.guide-tab\s*\{[\s\S]*?font-size:\s*34rpx;[\s\S]*?font-weight:\s*500;[\s\S]*?line-height:\s*48rpx/);
  match(detailStyles, /\.category-heading\s*\{[\s\S]*?font-size:\s*32rpx;[\s\S]*?font-weight:\s*600;[\s\S]*?line-height:\s*48rpx/);
  match(detailStyles, /\.core-fact__value\s*\{[\s\S]*?font-size:\s*40rpx;[\s\S]*?font-weight:\s*600;[\s\S]*?line-height:\s*56rpx/);
  match(detailStyles, /\.core-fact__label\s*\{[\s\S]*?color:\s*#8a8a8a;[\s\S]*?font-size:\s*28rpx;[\s\S]*?font-weight:\s*400;[\s\S]*?line-height:\s*44rpx/);
  match(detailStyles, /\.course-points__label\s*\{[\s\S]*?color:\s*#8a8a8a;[\s\S]*?font-size:\s*28rpx;[\s\S]*?font-weight:\s*400;[\s\S]*?line-height:\s*44rpx/);
  match(detailStyles, /\.execution-fact__label\s*\{[\s\S]*?font-size:\s*28rpx;[\s\S]*?font-weight:\s*400;[\s\S]*?line-height:\s*44rpx/);
  match(detailStyles, /\.execution-fact__value\s*\{[\s\S]*?font-size:\s*30rpx;[\s\S]*?font-weight:\s*400;[\s\S]*?line-height:\s*44rpx/);

  for (const selector of ["race-guide__title", "race-strategy__title"]) {
    match(detailStyles, new RegExp(`\\.${selector}\\s*\\{[\\s\\S]*?font-size:\\s*40rpx;[\\s\\S]*?font-weight:\\s*700;[\\s\\S]*?line-height:\\s*56rpx`));
  }
  for (const selector of ["race-guide__experience-title", "race-guide__fit-title", "race-strategy__item-title"]) {
    match(detailStyles, new RegExp(`\\.${selector}\\s*\\{[\\s\\S]*?font-size:\\s*32rpx;[\\s\\S]*?font-weight:\\s*600;[\\s\\S]*?line-height:\\s*48rpx`));
  }
  for (const selector of ["race-guide__body", "race-guide__fit-copy", "race-guide__closing", "race-strategy__paragraphs", "race-strategy__scope", "race-strategy__closing"]) {
    match(detailStyles, new RegExp(`\\.${selector}\\s*\\{[\\s\\S]*?color:\\s*#3b3b3b;[\\s\\S]*?font-size:\\s*30rpx;[\\s\\S]*?font-weight:\\s*400;[\\s\\S]*?line-height:\\s*50rpx`));
  }
  match(detailStyles, /\.race-guide__conclusion\s*\{[\s\S]*?color:\s*#2a2a2a;[\s\S]*?font-weight:\s*600/);
  match(detailStyles, /\.race-strategy__paragraph--emphasis\s*\{[\s\S]*?color:\s*#2a2a2a;[\s\S]*?font-weight:\s*600/);
});

test("Hotel cards own the single click path and Share changes only idle alpha", () => {
  equal((detailTemplate.match(/bindtap="handleHotelTap"/g) ?? []).length, 1);
  match(detailTemplate, /class="hotel-card"[\s\S]*?bindtap="handleHotelTap"[\s\S]*?hover-class="hotel-card--pressed"/);
  const ctaMarkup = detailTemplate.match(/<view\s+wx:if="\{\{item\.wechatAction\}\}"[\s\S]*?>查看酒店 →<\/view>/)?.[0] ?? "";
  equal(ctaMarkup.includes("bindtap="), false);
  match(detailStyles, /\.hotel-card__judgment\s*\{[\s\S]*?color:\s*#2f6b45;[\s\S]*?font-size:\s*28rpx;[\s\S]*?font-weight:\s*600;[\s\S]*?line-height:\s*40rpx/);
  match(detailStyles, /\.hotel-card__name\s*\{[\s\S]*?color:\s*#2a2a2a;[\s\S]*?font-size:\s*32rpx;[\s\S]*?font-weight:\s*600;[\s\S]*?line-height:\s*48rpx/);
  match(detailStyles, /\.hotel-card__cta\s*\{[\s\S]*?font-size:\s*28rpx;[\s\S]*?font-weight:\s*400/);
  match(detailStyles, /\.hotel-card--pressed\s*\{[\s\S]*?background:\s*#f7f7f4;[\s\S]*?opacity:\s*0\.92/);
  match(detailStyles, /\.share-action\s*\{[\s\S]*?background:\s*rgba\(0, 0, 0, 0\.82\)/);
});
