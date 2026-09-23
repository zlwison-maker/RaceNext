import { getRaces } from "../../services/races";
import type { RaceListItem } from "../../types/races";
import { getApiBaseUrl } from "../../utils/config";
import { navigateToRaceDetail } from "../../utils/raceNavigation";
import { formatRaceMeta, sortUpcomingRaces } from "../../utils/racePresentation";
import {
  ANALYTICS_VIEWPORT_THRESHOLD,
  createRaceAnalyticsData,
  markViewportExposureOnce,
  trackEvent,
} from "../../utils/analytics";

type RaceCardViewModel = {
  eventId: string;
  editionId: string;
  position: number;
  name: string;
  meta: string;
  coverImage: string | null;
  imageFailed: boolean;
};

type IndexPageData = {
  loadState: "loading" | "success" | "error";
  races: RaceCardViewModel[];
};

type RaceCardTapEvent = WechatMiniprogram.TouchEvent<
  Record<never, never>,
  Record<never, never>,
  { editionId: string }
>;

type RaceImageErrorEvent = WechatMiniprogram.BaseEvent<
  Record<never, never>,
  { index: number }
>;

type IndexPageCustom = {
  raceCardImpressionObserver: WechatMiniprogram.IntersectionObserver | null;
  raceCardImpressionTracked: Set<string>;
  loadRaces(): void;
  handleRetry(): void;
  handleRaceTap(event: RaceCardTapEvent): void;
  handleImageError(event: RaceImageErrorEvent): void;
  setupRaceCardImpressionObserver(): void;
  disconnectRaceCardImpressionObserver(): void;
};

Page<IndexPageData, IndexPageCustom>({
  raceCardImpressionObserver: null,
  raceCardImpressionTracked: new Set<string>(),

  data: {
    loadState: "loading",
    races: [],
  },

  onLoad() {
    this.raceCardImpressionTracked.clear();
    this.loadRaces();
  },

  onUnload() {
    this.disconnectRaceCardImpressionObserver();
  },

  loadRaces() {
    this.disconnectRaceCardImpressionObserver();
    this.setData({
      loadState: "loading",
      races: [],
    });

    getRaces()
      .then((response) => {
        this.setData({
          loadState: "success",
          races: sortUpcomingRaces(response.races).map((race, index) => toRaceCardViewModel(race, index)),
        }, () => this.setupRaceCardImpressionObserver());
      })
      .catch((error: unknown) => {
        console.error("RaceNext 赛事数据加载失败", error);
        this.setData({
          loadState: "error",
          races: [],
        });
      });
  },

  handleRetry() {
    this.loadRaces();
  },

  handleRaceTap(event: RaceCardTapEvent) {
    const { editionId } = event.currentTarget.dataset;
    const race = this.data.races.find((item) => item.editionId === editionId);
    if (!race) return;
    trackEvent("race_card_click", createRaceAnalyticsData(race, "home", {
      position: race.position,
    }));
    navigateToRaceDetail(editionId, "home", (options) => wx.navigateTo(options));
  },

  handleImageError(event: RaceImageErrorEvent) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || !this.data.races[index]) return;

    this.setData({
      races: this.data.races.map((race, raceIndex) =>
        raceIndex === index ? { ...race, imageFailed: true } : race,
      ),
    });
  },

  setupRaceCardImpressionObserver() {
    this.disconnectRaceCardImpressionObserver();
    if (!this.data.races.length) return;

    const observer = this.createIntersectionObserver({
      observeAll: true,
      initialRatio: 0,
      thresholds: [ANALYTICS_VIEWPORT_THRESHOLD],
    });
    this.raceCardImpressionObserver = observer;
    observer.relativeToViewport().observe(".race-card", (result) => {
      const editionId = String(result.dataset.editionId ?? "");
      const race = this.data.races.find((item) => item.editionId === editionId);
      if (!race || !markViewportExposureOnce(
        this.raceCardImpressionTracked,
        editionId,
        result.intersectionRatio,
      )) return;

      trackEvent("race_card_impression", createRaceAnalyticsData(race, "home", {
        position: race.position,
      }));
      if (this.raceCardImpressionTracked.size >= this.data.races.length) {
        this.disconnectRaceCardImpressionObserver();
      }
    });
  },

  disconnectRaceCardImpressionObserver() {
    this.raceCardImpressionObserver?.disconnect();
    this.raceCardImpressionObserver = null;
  },
});

function toRaceCardViewModel(race: RaceListItem, index: number): RaceCardViewModel {
  return {
    eventId: race.eventId,
    editionId: race.editionId,
    position: index + 1,
    name: race.name,
    meta: formatRaceMeta(race),
    coverImage: resolveAssetUrl(race.coverImage),
    imageFailed: false,
  };
}

function resolveAssetUrl(value: string | null): string | null {
  if (!value || /^https?:\/\//i.test(value)) return value;
  return `${getApiBaseUrl()}${value.startsWith("/") ? value : `/${value}`}`;
}
