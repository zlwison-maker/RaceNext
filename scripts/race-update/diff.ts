import type { OfficialFactCandidate } from "../../types/officialSourceIngestion.ts";
import type { RaceFieldDiff, RaceFieldTarget, RaceGraphSnapshot } from "../../types/raceUpdate.ts";

export function diffRaceFactCandidates(input: {
  snapshot: RaceGraphSnapshot;
  candidates: OfficialFactCandidate[];
  expectedTargets?: RaceFieldTarget[];
}): RaceFieldDiff[] {
  const targetMap = new Map<string, RaceFieldTarget>();
  for (const target of input.expectedTargets ?? []) targetMap.set(targetKey(target), target);
  for (const candidate of input.candidates) targetMap.set(targetKey(candidate), candidate);

  const candidatesByTarget = new Map<string, OfficialFactCandidate[]>();
  for (const candidate of input.candidates) {
    const key = targetKey(candidate);
    candidatesByTarget.set(key, [...(candidatesByTarget.get(key) ?? []), candidate]);
  }

  return [...targetMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, target]) => diffTarget(input.snapshot, target, candidatesByTarget.get(key) ?? []));
}

export function sameFactValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function diffTarget(
  snapshot: RaceGraphSnapshot,
  target: RaceFieldTarget,
  candidates: OfficialFactCandidate[],
): RaceFieldDiff {
  const current = getCurrentValue(snapshot, target);
  if (!current.found) {
    const values = uniqueValues(candidates.map(({ candidateValue }) => candidateValue));
    return {
      ...target,
      status: "MISSING",
      oldValue: null,
      newValue: values.length === 1 ? values[0] : values,
      candidates,
    };
  }
  if (candidates.length === 0) {
    return { ...target, status: "NO_CANDIDATE", oldValue: current.value, newValue: null, candidates };
  }

  const values = uniqueValues(candidates.map(({ candidateValue }) => candidateValue));
  if (values.length > 1) {
    return { ...target, status: "CONFLICT", oldValue: current.value, newValue: values, candidates };
  }
  const [newValue] = values;
  return {
    ...target,
    status: sameFactValue(current.value, newValue) ? "UNCHANGED" : "CHANGED",
    oldValue: current.value ?? null,
    newValue,
    candidates,
  };
}

function getCurrentValue(
  snapshot: RaceGraphSnapshot,
  target: RaceFieldTarget,
): { found: true; value: unknown } | { found: false } {
  const record = snapshot.records.find(({ edition }) => edition.editionId === target.editionId);
  if (!record || record.event.eventId !== target.eventId || record.edition.eventId !== target.eventId) {
    return { found: false };
  }
  if (target.entityType === "Edition") {
    if (target.categoryId !== null) return { found: false };
    return { found: true, value: (record.edition as unknown as Record<string, unknown>)[target.field] ?? null };
  }
  if (!target.categoryId) return { found: false };
  const category = record.categories.find(({ categoryId }) => categoryId === target.categoryId);
  if (!category) return { found: false };
  return { found: true, value: (category as unknown as Record<string, unknown>)[target.field] ?? null };
}

function uniqueValues(values: unknown[]): unknown[] {
  const unique = new Map<string, unknown>();
  for (const value of values) unique.set(JSON.stringify(value), value);
  return [...unique.values()];
}

function targetKey(target: RaceFieldTarget): string {
  return [target.eventId, target.editionId, target.categoryId ?? "", target.entityType, target.field].join("|");
}
