import { getRaces } from "../../services/races";
import type { RaceListItem } from "../../types/races";
import { getApiBaseUrl } from "../../utils/config";
import { navigateToRaceDetail } from "../../utils/raceNavigation";
import { formatRaceMeta, sortUpcomingRaces } from "../../utils/racePresentation";

type RaceCardViewModel = {
  editionId: string;
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
  loadRaces(): void;
  handleRetry(): void;
  handleRaceTap(event: RaceCardTapEvent): void;
  handleImageError(event: RaceImageErrorEvent): void;
};

Page<IndexPageData, IndexPageCustom>({
  data: {
    loadState: "loading",
    races: [],
  },

  onLoad() {
    this.loadRaces();
  },

  loadRaces() {
    this.setData({
      loadState: "loading",
      races: [],
    });

    getRaces()
      .then((response) => {
        this.setData({
          loadState: "success",
          races: sortUpcomingRaces(response.races).map(toRaceCardViewModel),
        });
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
    navigateToRaceDetail(editionId, (options) => wx.navigateTo(options));
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
});

function toRaceCardViewModel(race: RaceListItem): RaceCardViewModel {
  return {
    editionId: race.editionId,
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
