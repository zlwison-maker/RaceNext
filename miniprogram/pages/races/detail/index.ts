import { getApiBaseUrl } from "../../../utils/config";
import { getRace } from "../../../services/races";
import {
  createRaceDetailViewModel,
  selectRaceCategory,
  type RaceDetailViewModel,
} from "../../../utils/raceDetailPresentation";
import { loadRaceDetail } from "./loadRaceDetail";

type DetailPageData = {
  loadState: "loading" | "success" | "error";
  detail: RaceDetailViewModel | null;
  heroImageFailed: boolean;
};

type CategoryTapEvent = WechatMiniprogram.TouchEvent<
  Record<never, never>,
  Record<never, never>,
  { categoryId: string }
>;

type DetailPageCustom = {
  editionId: string;
  loadDetail(): void;
  handleRetry(): void;
  handleCategoryTap(event: CategoryTapEvent): void;
  handleHeroImageError(): void;
};

Page<DetailPageData, DetailPageCustom>({
  editionId: "",

  data: {
    loadState: "loading",
    detail: null,
    heroImageFailed: false,
  },

  onLoad(options: Record<string, string | undefined>) {
    this.editionId = decodeURIComponent(options.editionId ?? "").trim();
    if (!this.editionId) {
      this.setData({ loadState: "error", detail: null, heroImageFailed: false });
      return;
    }
    this.loadDetail();
  },

  loadDetail() {
    this.setData({ loadState: "loading", detail: null, heroImageFailed: false });

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
});

function resolveAssetUrl(value: string | null): string | null {
  if (!value || /^https?:\/\//i.test(value)) return value;
  return `${getApiBaseUrl()}${value.startsWith("/") ? value : `/${value}`}`;
}
