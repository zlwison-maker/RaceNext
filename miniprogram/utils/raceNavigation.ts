export function buildRaceDetailUrl(editionId: string): string {
  const normalizedEditionId = editionId.trim();
  if (!normalizedEditionId) throw new Error("editionId 不能为空");
  return `/pages/races/detail/index?editionId=${encodeURIComponent(normalizedEditionId)}`;
}

type NavigateTo = (options: { url: string }) => void;

export function navigateToRaceDetail(editionId: string, navigateTo: NavigateTo): void {
  navigateTo({ url: buildRaceDetailUrl(editionId) });
}
