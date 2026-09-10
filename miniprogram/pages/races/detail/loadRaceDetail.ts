import type { PublicRaceDetail, PublicRaceDetailResponse } from "../../../types/races";

type RaceDetailRequest = (editionId: string) => Promise<PublicRaceDetailResponse>;

export type RaceDetailLoadResult =
  | { loadState: "success"; race: PublicRaceDetail; error: null }
  | { loadState: "error"; race: null; error: unknown };

export async function loadRaceDetail(
  editionId: string,
  request: RaceDetailRequest,
): Promise<RaceDetailLoadResult> {
  try {
    const response = await request(editionId);
    return { loadState: "success", race: response.race, error: null };
  } catch (error: unknown) {
    return { loadState: "error", race: null, error };
  }
}
