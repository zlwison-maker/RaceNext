import type { OfficialDocumentSnapshot, EditionIdentityResult } from "../../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshotRecord, RaceSourceRegistrySource } from "../../types/raceUpdate.ts";
import { normalizeDomain } from "./sourceRegistry.ts";

/** Deterministic fail-closed Edition identity check; it never infers facts from identity evidence. */
export function checkEditionDocumentIdentity(input: {
  record: RaceGraphSnapshotRecord;
  source: RaceSourceRegistrySource;
  document: OfficialDocumentSnapshot;
}): EditionIdentityResult {
  const haystack = normalizeIdentityText(`${input.document.title}\n${input.document.text}\n${input.document.url}`);
  const names = [
    input.record.event.canonicalName,
    input.record.edition.editionName,
    ...input.record.event.aliases,
  ]
    .map(normalizeIdentityText)
    .filter((value) => value.length >= 3);
  const eventIdentityMatched = names.some((name) => haystack.includes(name));
  const targetYear = String(input.record.edition.editionYear);
  const editionYearMatched = haystack.includes(targetYear);
  const domainMatched = normalizeDomain(new URL(input.document.url).hostname) === normalizeDomain(input.source.domain);
  const evidence: string[] = [];
  if (eventIdentityMatched) evidence.push("event_name_or_alias_matched");
  else evidence.push("event_name_or_alias_missing");
  if (editionYearMatched) evidence.push("edition_year_matched");
  else evidence.push("edition_year_missing");
  if (domainMatched) evidence.push("approved_domain_matched");
  else evidence.push("approved_domain_mismatch");

  if (!eventIdentityMatched || !domainMatched) {
    return {
      status: "rejected",
      eventIdentityMatched,
      editionYearMatched,
      domainMatched,
      evidence,
    };
  }
  if (input.document.structuredCategory) {
    const group = input.document.structuredCategory;
    const filename = decodeURIComponent(new URL(group.linkedGpxUrl).pathname.split("/").at(-1) ?? "");
    const years = [...filename.matchAll(/(?<!\d)20\d{2}(?!\d)/g)].map(([year]) => year);
    const categoryMatched = filename.includes(group.name) && filename.includes("宁海")
      && input.record.categories.some((category) => category.shortName === group.name || category.categoryName === group.name);
    if (!categoryMatched || years.some((year) => year !== targetYear)) {
      return { status: "rejected", eventIdentityMatched, editionYearMatched: false, domainMatched,
        evidence: [...evidence, "structured_category_or_edition_conflict"] };
    }
    if (years.length !== 1) {
      return { status: "uncertain", eventIdentityMatched, editionYearMatched: false, domainMatched,
        evidence: [...evidence, "structured_edition_year_not_unique"] };
    }
  }
  if (!editionYearMatched) {
    return {
      status: "uncertain",
      eventIdentityMatched,
      editionYearMatched,
      domainMatched,
      evidence,
    };
  }
  return {
    status: "matched",
    eventIdentityMatched,
    editionYearMatched,
    domainMatched,
    evidence,
  };
}

function normalizeIdentityText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}
