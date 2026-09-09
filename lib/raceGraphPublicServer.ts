import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createPublicRaceDetailResult, createPublicRaceListResult } from "./raceGraphPublic.ts";

const CANONICAL_RACE_GRAPH_PATH = join(process.cwd(), "data", "canonical", "race-graph-v1.json");

type CanonicalReader = () => Promise<string>;

export async function loadPublicRaceListResult(
  readCanonical: CanonicalReader = () => readFile(CANONICAL_RACE_GRAPH_PATH, "utf8"),
) {
  return createPublicRaceListResult(await readCanonicalJson(readCanonical));
}

export async function loadPublicRaceDetailResult(
  editionId: string,
  readCanonical: CanonicalReader = () => readFile(CANONICAL_RACE_GRAPH_PATH, "utf8"),
) {
  return createPublicRaceDetailResult(await readCanonicalJson(readCanonical), editionId);
}

async function readCanonicalJson(readCanonical: CanonicalReader): Promise<unknown> {
  try {
    return JSON.parse(await readCanonical()) as unknown;
  } catch {
    return null;
  }
}
