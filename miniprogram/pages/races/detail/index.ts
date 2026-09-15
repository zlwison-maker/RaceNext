import { getApiBaseUrl } from "../../../utils/config";
import { getRace } from "../../../services/races";
import {
  createRaceDetailViewModel,
  selectRaceCategory,
  type AccommodationRecommendationViewModel,
  type RaceDetailViewModel,
} from "../../../utils/raceDetailPresentation";
import { loadRaceDetail } from "./loadRaceDetail";
import { trackEvent } from "../../../utils/analytics";
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
  accommodationTracked: boolean;
  shareActionRestoreTimer: ReturnType<typeof setTimeout> | null;
  loadDetail(): void;
  handleRetry(): void;
  handleCategoryTap(event: CategoryTapEvent): void;
  handleHeroImageError(): void;
  handleGuideTabTap(event: GuideTabTapEvent): void;
  trackAccommodationView(): void;
  handleHotelTap(event: HotelTapEvent): void;
  updateShareActionVisibility(visible: boolean): void;
  clearShareActionRestoreTimer(): void;
};

Page<DetailPageData, DetailPageCustom>({
  editionId: "",
  accommodationTracked: false,
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
    const source = options.from === "button" ? "bottom_action" : "native_menu";
    trackEvent(
      "race_share_initiated",
      createRaceShareAnalyticsData(detail, "app_message", source),
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
      "race_share_initiated",
      createRaceShareAnalyticsData(detail, "timeline", "native_menu"),
    );
    return createRaceShareConfig({
      ...detail,
      heroImage: this.data.heroImageFailed ? null : detail.heroImage,
    }).timeline;
  },

  loadDetail() {
    this.accommodationTracked = false;
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
    this.setData({ activeGuideTab: tab });
    if (tab === "accommodation") this.trackAccommodationView();
  },

  trackAccommodationView() {
    const detail = this.data.detail;
    if (!detail || this.accommodationTracked) return;
    this.accommodationTracked = true;
    trackEvent("accommodation_view", { editionId: detail.editionId });
    detail.accommodationRecommendations.forEach((recommendation) => {
      trackHotelEvent("hotel_card_impression", detail.editionId, recommendation);
    });
  },

  handleHotelTap(event: HotelTapEvent) {
    const detail = this.data.detail;
    if (!detail) return;
    const recommendation = detail.accommodationRecommendations.find(
      ({ recommendationId }) => recommendationId === event.currentTarget.dataset.recommendationId,
    );
    if (!recommendation?.wechatAction) return;

    const attribution = { channel: "wechat", partner: "ctrip" };
    trackHotelEvent("hotel_click", detail.editionId, recommendation, attribution);
    openHotelMiniProgram(recommendation.wechatAction, {
      success: () => trackHotelEvent("hotel_jump_success", detail.editionId, recommendation, attribution),
      fail: (error) => {
        console.error("RaceNext 酒店小程序跳转失败", error);
        trackHotelEvent("hotel_jump_fail", detail.editionId, recommendation, attribution);
        wx.showToast({ title: "暂时无法打开酒店", icon: "none" });
      },
    });
  },
});

function trackHotelEvent(
  eventName: string,
  editionId: string,
  recommendation: AccommodationRecommendationViewModel,
  extra: Record<string, string> = {},
): void {
  trackEvent(eventName, {
    editionId,
    hotelId: recommendation.hotelId,
    recommendationId: recommendation.recommendationId,
    reasonType: recommendation.reasonType,
    displayOrder: recommendation.displayOrder,
    ...extra,
  });
}

function resolveAssetUrl(value: string | null): string | null {
  if (!value || /^https?:\/\//i.test(value)) return value;
  return `${getApiBaseUrl()}${value.startsWith("/") ? value : `/${value}`}`;
}
