import type { RaceType } from "./event";

export type First50CandidateStatus = "candidate" | "selected" | "rejected" | "deferred";
export type First50ReviewStatus = "pending" | "reviewed" | "published";
export type First50ContentStatus = "draft" | "ai_generated" | "human_reviewed" | "published";
export type First50RaceReviewStatus = "draft" | "reviewed" | "published";

export type First50ScoreBreakdown = {
  runnerAttention: number;
  searchValue: number;
  commercialValue: number;
  decisionComplexity: number;
  dataCompleteness: number;
  contentDifficulty: number;
};

export type First50Candidate = {
  raceId: string;
  sourceRecordId?: string | null;
  name: string;
  raceName: string;
  raceType: RaceType;
  location: {
    province: string | null;
    city: string | null;
    district: string | null;
    text: string | null;
  };
  raceDate: string | null;
  categoryCount: number;
  existingDataCompleteness: {
    p0: number;
    p1: number;
    p2: number;
    summary: string;
  };
  sourceQuality: {
    sourceIds: string[];
    confidence: number | null;
    summary: string;
  };
  status: First50CandidateStatus;
  scoreBreakdown: First50ScoreBreakdown;
  scores: First50ScoreBreakdown;
  totalScore: number;
  reason?: string | null;
  biggestGap?: string | null;
  estimatedCompletionCost?: "low" | "medium" | "high";
  owner?: string | null;
  reviewStatus: First50ReviewStatus;
  updatedAt?: string | null;
};

export type First50CandidateFile = {
  version: "first50-candidates-v1";
  updatedAt: string;
  records: First50Candidate[];
};

export type First50SourceReference = {
  sourceName: string;
  sourceUrl?: string | null;
  checkedAt?: string | null;
  note?: string | null;
};

export type First50RaceEnrichment = {
  raceId: string;
  sourceRecordId: string;
  race: {
    raceType?: RaceType | null;
    officialWebsite?: string | null;
    officialRegistrationUrl?: string | null;
    registrationOpenDate?: string | null;
    registrationCloseDate?: string | null;
    organizer?: string | null;
    introduction?: string | null;
    sourceNotes?: First50SourceReference[];
  };
  categories: First50CategoryEnrichment[];
  review: {
    status: First50RaceReviewStatus;
    reviewer?: string | null;
    updatedAt: string;
    notes?: string | null;
  };
};

export type First50CategoryEnrichment = {
  categoryName: string;
  registrationStatus?: string | null;
  courseMapUrl?: string | null;
  courseDescription?: string | null;
  gpxUrl?: string | null;
  elevationChartUrl?: string | null;
  aidStations?: string[] | null;
  mandatoryGear?: string[] | null;
  qualificationRules?: string | null;
  sourceNote?: string | null;
};

export type First50RaceFile = {
  version: "first50-races-v1";
  updatedAt: string;
  records: First50RaceEnrichment[];
};

export type First50DecisionContent = {
  raceId: string;
  primaryCategory: string;
  contentStatus: First50ContentStatus;
  oneLineVerdict?: string | null;
  raceNextAdvice?: string | null;
  recommendedFor?: string[];
  notRecommendedFor?: string[];
  aiGuide?: {
    level?: string | null;
    preparation?: string | null;
    gear?: string | null;
    caution?: string | null;
    finish?: string | null;
  } | null;
  courseHighlights?: string[];
  travelTips?: {
    accommodation?: string | null;
    transportation?: string | null;
    packetPickup?: string | null;
    parking?: string | null;
    dining?: string | null;
  } | null;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  reviewer?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
};

export type First50MergedData = {
  raceId: string;
  enrichment: First50RaceEnrichment | null;
  decisionContent: First50DecisionContent | null;
};
