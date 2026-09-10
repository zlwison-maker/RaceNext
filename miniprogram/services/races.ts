import type { PublicRaceDetailResponse, PublicRaceListResponse } from "../types/races";
import { get } from "./api";
import { buildRaceDetailApiPath } from "./racePaths";

export function getRaces(): Promise<PublicRaceListResponse> {
  return get<PublicRaceListResponse>("/api/races");
}

export function getRace(editionId: string): Promise<PublicRaceDetailResponse> {
  try {
    return get<PublicRaceDetailResponse>(buildRaceDetailApiPath(editionId));
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}
