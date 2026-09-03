import { beijingMarathonRaceGuide } from "@/data/race-guides/beijing-marathon";
import { hk100RaceGuide } from "@/data/race-guides/hk100";
import { kailasGongga100RaceGuide } from "@/data/race-guides/kailas-gongga-100";
import { shanghaiMarathonRaceGuide } from "@/data/race-guides/shanghai-marathon";
import { xiamenMarathonRaceGuide } from "@/data/race-guides/xiamen-marathon";
import type { RaceEditorialContent } from "@/types/raceDetail";

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
