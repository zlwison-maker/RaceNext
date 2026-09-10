export function buildRaceDetailApiPath(editionId: string): string {
  const normalizedEditionId = editionId.trim();
  if (!normalizedEditionId) throw new Error("editionId 不能为空");
  return `/api/races/${encodeURIComponent(normalizedEditionId)}`;
}
