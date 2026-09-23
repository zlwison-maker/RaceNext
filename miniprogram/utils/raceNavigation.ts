import type { RaceAnalyticsSource } from "./analytics";

export function buildRaceDetailUrl(
  editionId: string,
  source: RaceAnalyticsSource = "direct",
): string {
  const normalizedEditionId = editionId.trim();
  if (!normalizedEditionId) throw new Error("editionId 不能为空");
  return `/pages/races/detail/index?editionId=${encodeURIComponent(normalizedEditionId)}&source=${source}`;
}

type NavigateTo = (options: { url: string }) => void;

export function navigateToRaceDetail(
  editionId: string,
  source: RaceAnalyticsSource,
  navigateTo: NavigateTo,
): void {
  navigateTo({ url: buildRaceDetailUrl(editionId, source) });
}
