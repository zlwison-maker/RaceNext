import { hk100RaceStrategy } from "./hk100.ts";
import { kailasGongga100RaceStrategy } from "./kailas-gongga-100.ts";
import type { RaceStrategyContent } from "../../types/raceDetail.ts";

const raceStrategiesByEventId = {
  hk100: hk100RaceStrategy,
  "kailas-gongga-100": kailasGongga100RaceStrategy,
} satisfies Record<string, RaceStrategyContent>;

export function getRaceStrategyContent(eventId: string): RaceStrategyContent | null {
  return raceStrategiesByEventId[eventId as keyof typeof raceStrategiesByEventId] ?? null;
}
