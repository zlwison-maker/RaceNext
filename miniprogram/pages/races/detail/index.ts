import { getApiBaseUrl } from "../../../utils/config";
import { getRace } from "../../../services/races";
import {
  createRaceDetailViewModel,
  selectRaceCategory,
  type AccommodationRecommendationViewModel,
  type RaceDetailViewModel,
} from "../../../utils/raceDetailPresentation";
import { loadRaceDetail } from "./loadRaceDetail";
import {
  ANALYTICS_VIEWPORT_THRESHOLD,
  createRaceAnalyticsData,
  markViewportExposureOnce,
  normalizeRaceAnalyticsSource,
  trackEvent,
  type RaceAnalyticsSource,
} from "../../../utils/analytics";
import { openHotelMiniProgram } from "../../../services/accommodation";
import {
  SHARE_ACTION_RESTORE_DELAY_MS,
  createRaceShareAnalyticsData,
  createRaceShareConfig,
  getShareActionVisibilityUpdate,
} from "../../../utils/raceShare";

type DetailPageData = {
  loadState: "loading" | "success" | "error";
  detail: RaceDetailViewModel | null;
  heroImageFailed: boolean;
  activeGuideTab: "race" | "accommodation";
  shareActionVisible: boolean;
};

type CategoryTapEvent = WechatMiniprogram.TouchEvent<
  Record<never, never>,
  Record<never, never>,
  { categoryId: string }
>;

type GuideTabTapEvent = WechatMiniprogram.TouchEvent<
  Record<never, never>, Record<never, never>, { tab: "race" | "accommodation" }
>;

type HotelTapEvent = WechatMiniprogram.TouchEvent<
  Record<never, never>, Record<never, never>, { recommendationId: string }
>;

type DetailPageCustom = {
  editionId: string;
  entrySource: RaceAnalyticsSource;
  detailViewTracked: boolean;
  raceGuideTracked: boolean;
  accommodationTracked: boolean;
  hotelImpressionTracked: Set<string>;
  raceGuideImpressionObserver: WechatMiniprogram.IntersectionObserver | null;
  hotelImpressionObserver: WechatMiniprogram.IntersectionObserver | null;
  shareActionRestoreTimer: ReturnType<typeof setTimeout> | null;
  loadDetail(): void;
  handleRetry(): void;
  handleCategoryTap(event: CategoryTapEvent): void;
  handleHeroImageError(): void;
  handleGuideTabTap(event: GuideTabTapEvent): void;
  trackAccommodationView(): void;
  handleHotelTap(event: HotelTapEvent): void;
  trackRaceDetailView(): void;
  setupRaceGuideImpressionObserver(): void;
  setupHotelImpressionObserver(): void;
  disconnectRaceGuideImpressionObserver(): void;
  disconnectHotelImpressionObserver(): void;
  updateShareActionVisibility(visible: boolean): void;
  clearShareActionRestoreTimer(): void;
};

Page<DetailPageData, DetailPageCustom>({
  editionId: "",
  entrySource: "direct",
  detailViewTracked: false,
  raceGuideTracked: false,
  accommodationTracked: false,
  hotelImpressionTracked: new Set<string>(),
  raceGuideImpressionObserver: null,
  hotelImpressionObserver: null,
  shareActionRestoreTimer: null,

  data: {
    loadState: "loading",
    detail: null,
    heroImageFailed: false,
    activeGuideTab: "race",
    shareActionVisible: true,
  },

  onLoad(options: Record<string, string | undefined>) {
    wx.showShareMenu({
      menus: ["shareAppMessage", "shareTimeline"],
    });
    this.editionId = decodeURIComponent(options.editionId ?? "").trim();
    this.entrySource = normalizeRaceAnalyticsSource(options.source);
    this.detailViewTracked = false;
    this.raceGuideTracked = false;
    this.accommodationTracked = false;
    this.hotelImpressionTracked.clear();
    if (!this.editionId) {
      this.setData({ loadState: "error", detail: null, heroImageFailed: false });
      return;
    }
    this.loadDetail();
  },

  onHide() {
    this.clearShareActionRestoreTimer();
    this.updateShareActionVisibility(true);
  },

  onUnload() {
    this.clearShareActionRestoreTimer();
    this.disconnectRaceGuideImpressionObserver();
    this.disconnectHotelImpressionObserver();
  },

  onPageScroll() {
    this.updateShareActionVisibility(false);
    this.clearShareActionRestoreTimer();
    this.shareActionRestoreTimer = setTimeout(() => {
      this.shareActionRestoreTimer = null;
      this.updateShareActionVisibility(true);
    }, SHARE_ACTION_RESTORE_DELAY_MS);
  },

  onShareAppMessage(options: WechatMiniprogram.Page.IShareAppMessageOption) {
    const detail = this.data.detail;
    if (!detail) return {};
    const triggerSource = options.from === "button" ? "bottom_action" : "native_menu";
    trackEvent(
      "race_share",
      createRaceShareAnalyticsData(detail, "app_message", this.entrySource, triggerSource),
    );
    return createRaceShareConfig({
      ...detail,
      heroImage: this.data.heroImageFailed ? null : detail.heroImage,
    }).appMessage;
  },

  onShareTimeline() {
    const detail = this.data.detail;
    if (!detail) return {};
    trackEvent(
      "race_share",
      createRaceShareAnalyticsData(detail, "timeline", this.entrySource, "native_menu"),
    );
    return createRaceShareConfig({
      ...detail,
      heroImage: this.data.heroImageFailed ? null : detail.heroImage,
    }).timeline;
  },

  loadDetail() {
    this.disconnectRaceGuideImpressionObserver();
    this.disconnectHotelImpressionObserver();
    this.setData({ loadState: "loading", detail: null, heroImageFailed: false, activeGuideTab: "race" });

    loadRaceDetail(this.editionId, getRace).then((result) => {
      if (result.loadState === "error") {
        console.error("RaceNext 赛事详情加载失败", result.error);
        this.setData({ loadState: "error", detail: null, heroImageFailed: false });
        return;
      }

      const detail = createRaceDetailViewModel(result.race);
      this.setData({
        loadState: "success",
        detail: {
          ...detail,
          coverImage: resolveAssetUrl(detail.coverImage),
          heroImage: resolveAssetUrl(detail.heroImage),
        },
        heroImageFailed: false,
      }, () => {
        this.trackRaceDetailView();
        this.setupRaceGuideImpressionObserver();
      });
    });
  },

  handleRetry() {
    this.loadDetail();
  },

  handleCategoryTap(event: CategoryTapEvent) {
    if (!this.data.detail) return;
    const { categoryId } = event.currentTarget.dataset;
    this.setData({ detail: selectRaceCategory(this.data.detail, categoryId) });
  },

  handleHeroImageError() {
    this.setData({ heroImageFailed: true });
  },

  updateShareActionVisibility(visible: boolean) {
    const update = getShareActionVisibilityUpdate(this.data.shareActionVisible, visible);
    if (update === null) return;
    this.setData({ shareActionVisible: update });
  },

  clearShareActionRestoreTimer() {
    if (this.shareActionRestoreTimer === null) return;
    clearTimeout(this.shareActionRestoreTimer);
    this.shareActionRestoreTimer = null;
  },

  handleGuideTabTap(event: GuideTabTapEvent) {
    const { tab } = event.currentTarget.dataset;
    if (tab !== "race" && tab !== "accommodation") return;
    if (tab === "accommodation" && !this.data.detail?.hasAccommodation) return;
    this.setData({ activeGuideTab: tab }, () => {
      if (tab === "accommodation") {
        this.disconnectRaceGuideImpressionObserver();
        this.trackAccommodationView();
        this.setupHotelImpressionObserver();
        return;
      }
      this.disconnectHotelImpressionObserver();
      this.setupRaceGuideImpressionObserver();
    });
  },

  trackAccommodationView() {
    const detail = this.data.detail;
    if (!detail?.hasAccommodation || this.accommodationTracked) return;
    this.accommodationTracked = true;
    trackEvent("accommodation_view", createRaceAnalyticsData({
      eventId: detail.raceId,
      editionId: detail.editionId,
    }, this.entrySource));
  },

  handleHotelTap(event: HotelTapEvent) {
    const detail = this.data.detail;
    if (!detail) return;
    const recommendation = detail.accommodationRecommendations.find(
      ({ recommendationId }) => recommendationId === event.currentTarget.dataset.recommendationId,
    );
    if (!recommendation?.wechatAction) return;

    const attribution = { channel: "wechat", partner: "ctrip" };
    trackHotelEvent("hotel_click", detail, recommendation, this.entrySource, attribution);
    openHotelMiniProgram(recommendation.wechatAction, {
      success: () => trackHotelEvent("hotel_jump_success", detail, recommendation, this.entrySource, attribution),
      fail: (error) => {
        console.error("RaceNext 酒店小程序跳转失败", error);
        trackHotelEvent("hotel_jump_fail", detail, recommendation, this.entrySource, attribution);
        wx.showToast({ title: "暂时无法打开酒店", icon: "none" });
      },
    });
  },

  trackRaceDetailView() {
    const detail = this.data.detail;
    if (!detail || this.detailViewTracked) return;
    this.detailViewTracked = true;
    trackEvent("race_detail_view", createRaceAnalyticsData({
      eventId: detail.raceId,
      editionId: detail.editionId,
    }, this.entrySource));
  },

  setupRaceGuideImpressionObserver() {
    this.disconnectRaceGuideImpressionObserver();
    const detail = this.data.detail;
    if (!detail?.raceGuide || this.raceGuideTracked || this.data.activeGuideTab !== "race") return;

    const observer = this.createIntersectionObserver({
      initialRatio: 0,
      thresholds: [ANALYTICS_VIEWPORT_THRESHOLD],
    });
    this.raceGuideImpressionObserver = observer;
    observer.relativeToViewport().observe(".race-guide__header", (result) => {
      if (result.intersectionRatio < ANALYTICS_VIEWPORT_THRESHOLD || this.raceGuideTracked) return;
      const currentDetail = this.data.detail;
      if (!currentDetail?.raceGuide) return;
      this.raceGuideTracked = true;
      trackEvent("race_guide_view", createRaceAnalyticsData({
        eventId: currentDetail.raceId,
        editionId: currentDetail.editionId,
      }, this.entrySource));
      this.disconnectRaceGuideImpressionObserver();
    });
  },

  setupHotelImpressionObserver() {
    this.disconnectHotelImpressionObserver();
    const detail = this.data.detail;
    if (!detail?.hasAccommodation || this.data.activeGuideTab !== "accommodation") return;

    const observer = this.createIntersectionObserver({
      observeAll: true,
      initialRatio: 0,
      thresholds: [ANALYTICS_VIEWPORT_THRESHOLD],
    });
    this.hotelImpressionObserver = observer;
    observer.relativeToViewport().observe(".hotel-card", (result) => {
      const recommendationId = String(result.dataset.recommendationId ?? "");
      const currentDetail = this.data.detail;
      const recommendation = currentDetail?.accommodationRecommendations.find(
        (item) => item.recommendationId === recommendationId,
      );
      if (!currentDetail || !recommendation
        || !markViewportExposureOnce(
          this.hotelImpressionTracked,
          recommendationId,
          result.intersectionRatio,
        )) return;

      trackHotelEvent(
        "hotel_card_impression",
        currentDetail,
        recommendation,
        this.entrySource,
      );
      if (this.hotelImpressionTracked.size >= currentDetail.accommodationRecommendations.length) {
        this.disconnectHotelImpressionObserver();
      }
    });
  },

  disconnectRaceGuideImpressionObserver() {
    this.raceGuideImpressionObserver?.disconnect();
    this.raceGuideImpressionObserver = null;
  },

  disconnectHotelImpressionObserver() {
    this.hotelImpressionObserver?.disconnect();
    this.hotelImpressionObserver = null;
  },
});

function trackHotelEvent(
  eventName: "hotel_card_impression" | "hotel_click" | "hotel_jump_success" | "hotel_jump_fail",
  detail: RaceDetailViewModel,
  recommendation: AccommodationRecommendationViewModel,
  source: RaceAnalyticsSource,
  extra: Record<string, string> = {},
): void {
  trackEvent(eventName, createRaceAnalyticsData({
    eventId: detail.raceId,
    editionId: detail.editionId,
  }, source, {
    hotel_id: recommendation.hotelId,
    recommendation_id: recommendation.recommendationId,
    reason_type: recommendation.reasonType,
    position: recommendation.displayOrder,
    ...extra,
  }));
}

function resolveAssetUrl(value: string | null): string | null {
  if (!value || /^https?:\/\//i.test(value)) return value;
  return `${getApiBaseUrl()}${value.startsWith("/") ? value : `/${value}`}`;
}
