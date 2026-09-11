import { beijingMarathonRaceGuide } from "./beijing-marathon.ts";
import { hk100RaceGuide } from "./hk100.ts";
import { kailasGongga100RaceGuide } from "./kailas-gongga-100.ts";
import { shanghaiMarathonRaceGuide } from "./shanghai-marathon.ts";
import { xiamenMarathonRaceGuide } from "./xiamen-marathon.ts";
import type { RaceEditorialContent } from "../../types/raceDetail.ts";

const raceGuidesByEventId = {
  "beijing-marathon": beijingMarathonRaceGuide,
  hk100: hk100RaceGuide,
  "kailas-gongga-100": kailasGongga100RaceGuide,
  "shanghai-marathon": shanghaiMarathonRaceGuide,
  "xiamen-marathon": xiamenMarathonRaceGuide,
} satisfies Record<string, RaceEditorialContent>;

export function getRaceEditorialContent(eventId: string): RaceEditorialContent | null {
  return raceGuidesByEventId[eventId as keyof typeof raceGuidesByEventId] ?? null;
}
