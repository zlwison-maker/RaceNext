import { normalizeRaceName, type NormalizedRace } from "./normalizeRace.ts";

export type DedupeMatchedFields = {
  name: boolean;
  city: boolean;
  year: boolean;
  date: boolean;
  distance: boolean;
};

export type DuplicateGroup = {
  key: string;
  type: "exact" | "possible";
  raceIds: string[];
  confidence: number;
  matchedFields: DedupeMatchedFields;
  reason: string;
};

export type DedupeSummary = {
  rawTotal: number;
  dedupedTotal: number;
  possibleDuplicateTotal: number;
  duplicateRaces: Array<{
    key: string;
    keptId: string;
    duplicateIds: string[];
    confidence: number;
    matchedFields: DedupeMatchedFields;
    reason: string;
  }>;
  possibleDuplicateRaces: Array<{
    key: string;
    raceIds: string[];
    dates: Array<string | null>;
    confidence: number;
    matchedFields: DedupeMatchedFields;
    reason: string;
  }>;
};

export function dedupeRaces(races: NormalizedRace[]): {
  races: NormalizedRace[];
  dedupeSummary: DedupeSummary;
  duplicateGroups: DuplicateGroup[];
} {
  const exactSeen = new Map<string, NormalizedRace>();
  const deduped: NormalizedRace[] = [];
  const duplicateRaces: DedupeSummary["duplicateRaces"] = [];
  const duplicateGroups: DuplicateGroup[] = [];

  for (const race of races) {
    const key = exactKey(race);
    const existing = exactSeen.get(key);
    if (existing) {
      const matchedFields = compareMatchedFields(existing, race);
      const confidence = scoreMatch(matchedFields);
      const reason = buildReason(matchedFields, "exact duplicate");
      duplicateRaces.push({
        key,
        keptId: existing.id,
        duplicateIds: [race.id],
        confidence,
        matchedFields,
        reason,
      });
      duplicateGroups.push({
        key,
        type: "exact",
        raceIds: [existing.id, race.id],
        confidence,
        matchedFields,
        reason,
      });
      continue;
    }
    exactSeen.set(key, race);
    deduped.push(race);
  }

  const possibleDuplicateRaces = findPossibleDuplicates(deduped);
  duplicateGroups.push(
    ...possibleDuplicateRaces.map((item): DuplicateGroup => ({
      key: item.key,
      type: "possible",
      raceIds: item.raceIds,
      confidence: item.confidence,
      matchedFields: item.matchedFields,
      reason: item.reason,
    })),
  );
  const possibleIds = new Set(possibleDuplicateRaces.flatMap((item) => item.raceIds));
  const marked = deduped.map((race) =>
    possibleIds.has(race.id)
      ? { ...race, possibleDuplicate: true, notes: [...race.notes, "possible duplicate: same normalized name/city/year but different or missing date"] }
      : race,
  );

  return {
    races: marked,
    dedupeSummary: {
      rawTotal: races.length,
      dedupedTotal: marked.length,
      possibleDuplicateTotal: possibleDuplicateRaces.length,
      duplicateRaces,
      possibleDuplicateRaces,
    },
    duplicateGroups,
  };
}

function exactKey(race: NormalizedRace): string {
  return [identityKey(race), race.date ?? "date_unknown", mainDistance(race) ?? "distance_unknown"].join("|");
}

function identityKey(race: NormalizedRace): string {
  return [
    normalizeRaceName(race.name),
    race.year ?? "year_unknown",
    race.city || "city_unknown",
  ]
    .join("|")
    .toLowerCase();
}

function findPossibleDuplicates(races: NormalizedRace[]): DedupeSummary["possibleDuplicateRaces"] {
  const groups = new Map<string, NormalizedRace[]>();
  for (const race of races) {
    const key = identityKey(race);
    groups.set(key, [...(groups.get(key) ?? []), race]);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .filter(([, group]) => new Set(group.map((race) => race.date ?? "date_unknown")).size > 1)
    .map(([key, group]) => {
      const matchedFields = compareGroupMatchedFields(group);
      return {
        key,
        raceIds: group.map((race) => race.id),
        dates: group.map((race) => race.date),
        confidence: scoreMatch(matchedFields),
        matchedFields,
        reason: buildReason(matchedFields, "possible duplicate; date differs or is missing"),
      };
    });
}

function compareMatchedFields(a: NormalizedRace, b: NormalizedRace): DedupeMatchedFields {
  return {
    name: normalizeRaceName(a.name) === normalizeRaceName(b.name),
    city: a.city === b.city && a.city !== "unknown",
    year: a.year !== null && a.year === b.year,
    date: a.date !== null && a.date === b.date,
    distance: mainDistance(a) !== null && mainDistance(a) === mainDistance(b),
  };
}

function compareGroupMatchedFields(group: NormalizedRace[]): DedupeMatchedFields {
  const first = group[0];
  return {
    name: group.every((race) => normalizeRaceName(race.name) === normalizeRaceName(first.name)),
    city: first.city !== "unknown" && group.every((race) => race.city === first.city),
    year: first.year !== null && group.every((race) => race.year === first.year),
    date: first.date !== null && group.every((race) => race.date === first.date),
    distance: mainDistance(first) !== null && group.every((race) => mainDistance(race) === mainDistance(first)),
  };
}

function scoreMatch(fields: DedupeMatchedFields): number {
  let score = 0;
  if (fields.name) score += 35;
  if (fields.city) score += 20;
  if (fields.year) score += 15;
  if (fields.date) score += 20;
  if (fields.distance) score += 10;
  return score;
}

function buildReason(fields: DedupeMatchedFields, suffix: string): string {
  const matched = [
    fields.name ? "same normalized name" : null,
    fields.city ? "same city" : "city missing or different",
    fields.year ? "same year" : "year missing or different",
    fields.date ? "same date" : "date missing or different",
    fields.distance ? "same distance" : "distance missing or different",
  ].filter(Boolean);
  return `${matched.join(" + ")}, ${suffix}`;
}

function mainDistance(race: NormalizedRace): number | null {
  const distance = race.categories[0]?.distanceKm;
  return distance && distance > 0 ? distance : null;
}
