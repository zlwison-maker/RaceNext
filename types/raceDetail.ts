export type RaceEditorialParagraph = {
  text: string;
  emphasis?: boolean;
  emphasisText?: string;
};

export type RaceGuideSection = {
  title: string;
  paragraphs: RaceEditorialParagraph[];
};

export type RaceGuideExperience = {
  number: string;
  title: string;
  paragraphs: string[];
  emphasis: string;
};

export type RaceGuideFitItem = {
  title: string;
  paragraphs: RaceEditorialParagraph[];
};

export type RaceStrategyContent = {
  eyebrow: string;
  title: string;
  scopeNote: string;
  sections: Array<{
    number: string;
    title: string;
    paragraphs: RaceEditorialParagraph[];
  }>;
  closing?: string;
};

export type RaceEditorialContent = {
  impression: RaceGuideSection & {
    eyebrow: string;
  };
  viewpoint: RaceGuideSection;
  evidence: {
    title: string;
    sections: RaceGuideExperience[];
  };
  suitability: {
    title: string;
    introduction: string;
    items: RaceGuideFitItem[];
  };
  transition?: string;
  raceStrategy?: RaceStrategyContent;
};
