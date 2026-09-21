import { beijingMarathonRaceGuide } from "./beijing-marathon.ts";
import { chengduMarathonRaceGuide } from "./chengdu-marathon.ts";
import { chongqingMarathonRaceGuide } from "./chongqing-marathon.ts";
import { guangzhouMarathonRaceGuide } from "./guangzhou-marathon.ts";
import { hk100RaceGuide } from "./hk100.ts";
import { kailasGongga100RaceGuide } from "./kailas-gongga-100.ts";
import { ninghaiUltraTrailRaceGuide } from "./ninghai-ultra-trail.ts";
import { shanghaiMarathonRaceGuide } from "./shanghai-marathon.ts";
import { shenzhen100RaceGuide } from "./shenzhen-100.ts";
import { tsaiguKuocangRaceGuide } from "./tsaigu-kuocang.ts";
import { xianMarathonRaceGuide } from "./xian-marathon.ts";
import { xiamenMarathonRaceGuide } from "./xiamen-marathon.ts";
import { getRaceStrategyContent } from "../race-strategies/index.ts";
import type { RaceEditorialContent } from "../../types/raceDetail.ts";

const raceGuidesByEventId = {
  "beijing-marathon": beijingMarathonRaceGuide,
  "chengdu-marathon": chengduMarathonRaceGuide,
  "chongqing-marathon": chongqingMarathonRaceGuide,
  "guangzhou-marathon": guangzhouMarathonRaceGuide,
  hk100: hk100RaceGuide,
  "kailas-gongga-100": kailasGongga100RaceGuide,
  "ninghai-ultra-trail": ninghaiUltraTrailRaceGuide,
  "shanghai-marathon": shanghaiMarathonRaceGuide,
  "shenzhen-100": shenzhen100RaceGuide,
  "tsaigu-kuocang": tsaiguKuocangRaceGuide,
  "xian-marathon": xianMarathonRaceGuide,
  "xiamen-marathon": xiamenMarathonRaceGuide,
} satisfies Record<string, RaceEditorialContent>;

export function getRaceEditorialContent(eventId: string): RaceEditorialContent | null {
  const raceGuide = raceGuidesByEventId[eventId as keyof typeof raceGuidesByEventId] ?? null;
  if (!raceGuide) return null;

  const raceStrategy = getRaceStrategyContent(eventId);
  return raceStrategy ? { ...raceGuide, raceStrategy } : raceGuide;
}
