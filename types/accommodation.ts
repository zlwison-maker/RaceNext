export type HotelAction = {
  web?: { type: "affiliate_url"; url: string };
  wechat?: { type: "mini_program"; appId: string; path: string };
};

export type Hotel = {
  hotelId: string;
  hotelName: string;
  actions: HotelAction;
};

export type AccommodationReasonType =
  | "start_proximity"
  | "finish_proximity"
  | "transport"
  | "runner_feedback"
  | "race_service"
  | "value"
  | "other";

export type AccommodationEvidenceBasis =
  | "official_fact"
  | "runner_feedback"
  | "racenext_judgment"
  | "mixed";

export type RaceAccommodationRecommendation = {
  recommendationId: string;
  editionId: string;
  hotelId: string;
  reasonType: AccommodationReasonType;
  recommendationTitle: string;
  recommendationReason: string;
  evidenceBasis: AccommodationEvidenceBasis;
  evidenceRefs: string[];
  displayOrder: number;
};
