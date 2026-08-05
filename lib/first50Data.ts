import first50RacesData from "@/data/first50/first50_races.json";
import type {
  First50DecisionContent,
  First50MergedData,
  First50RaceEnrichment,
  First50RaceFile,
} from "@/types/first50";

const first50RaceFile = first50RacesData as First50RaceFile;

export function getFirst50Race(raceId: string): First50RaceEnrichment | null {
  return first50RaceFile.records.find((record) => record.raceId === raceId) ?? null;
}

export async function getFirst50DecisionContent(raceId: string): Promise<First50DecisionContent | null> {
  try {
    const content = await import(`@/data/first50/content/${raceId}.json`);
    return (content.default ?? content) as First50DecisionContent;
  } catch {
    return null;
  }
}

export async function mergeFirst50Data(raceId: string): Promise<First50MergedData> {
  const enrichment = getFirst50Race(raceId);
  const decisionContent = await getFirst50DecisionContent(raceId);

  return {
    raceId,
    enrichment,
    decisionContent,
  };
}
