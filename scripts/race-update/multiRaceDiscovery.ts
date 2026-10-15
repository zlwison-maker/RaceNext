import { createHash } from "node:crypto";
import { decodeHtml, stripHtml } from "../connectors/shared.ts";
import type {
  RaceGraphSnapshot,
  RaceSourceRegistry,
} from "../../types/raceUpdate.ts";
import {
  activeFreshnessSources,
  assertRaceSourceRegistry,
} from "./sourceRegistry.ts";
import { assertRaceGraphSnapshot } from "./validation.ts";
import {
  classifyEditionIdentity,
  normalizeCandidateUrl,
} from "./sourceDiscovery.ts";
import {
  assertPublicDiscoveryUrl,
  DISCOVERY_LIMITS,
  fetchDiscoveryText,
} from "./discoveryFetch.ts";

export type OfficialSourceCandidate = {
  candidateId: string;
  targetEditionId: string;
  candidateUrl: string;
  title: string;
  discoveredAt: string;
  discoveryEntry: string;
  discoverySourceId: string;
  discoveryMethod: "html_link" | "rss" | "sitemap";
  eventIdentityStatus: "title_match" | "needs_review";
  editionIdentityStatus: "title_year_match" | "needs_review" | "year_conflict";
  sourceAuthorityStatus:
    | "official_site_unapproved"
    | "external_link_unverified";
  categoryScope: "unknown";
  reviewStatus: "needs_review";
  reasons: string[];
  evidence: {
    listingUrl: string;
    listingHash: string;
    locator: string;
    excerpt: string;
  };
};
export type DiscoveryLedger = {
  schemaVersion: "source-discovery-ledger-v1";
  candidates: OfficialSourceCandidate[];
};
export type EditionDiscovery = {
  editionId: string;
  status:
    | "CANDIDATES_FOUND"
    | "NO_NEW_SOURCES"
    | "NOT_COVERED"
    | "FAILED"
    | "PARTIAL";
  entriesChecked: number;
  listingsChecked: number;
  linksExamined: number;
  relevantLinksExamined: number;
  coverage: "bounded_static_links" | "not_covered";
  errors: string[];
  warnings: string[];
  candidates: OfficialSourceCandidate[];
  newCandidateIds: string[];
};
export type MultiRaceDiscoveryReport = {
  schemaVersion: "multi-race-discovery-v1";
  checkedAt: string;
  durationMs: number;
  editions: EditionDiscovery[];
  summary: {
    editionsChecked: number;
    newSources: number;
    candidates: number;
    unresolvedReview: number;
    changedCandidates: number;
    failed: number;
    notCovered: number;
  };
  factPendingWrites: 0;
  registryWrites: 0;
  modelCalls: 0;
};
export const emptyDiscoveryLedger = (): DiscoveryLedger => ({
  schemaVersion: "source-discovery-ledger-v1",
  candidates: [],
});
export function normalizeDiscoveryUrl(value: string): string {
  const url = assertPublicDiscoveryUrl(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    if (/^(?:token|access_token|api_key|password|secret)$/i.test(key))
      throw new Error("DISCOVERY_SENSITIVE_URL");
  }
  return normalizeCandidateUrl(url.toString());
}
export function assertDiscoveryLedger(
  value: unknown,
): asserts value is DiscoveryLedger {
  const ledger = value as DiscoveryLedger;
  if (
    !ledger ||
    ledger.schemaVersion !== "source-discovery-ledger-v1" ||
    !Array.isArray(ledger.candidates) ||
    ledger.candidates.length > 5_000
  )
    throw new Error("INVALID_DISCOVERY_LEDGER");
  const seen = new Set<string>();
  for (const c of ledger.candidates) {
    if (
      !c ||
      typeof c.targetEditionId !== "string" ||
      !c.targetEditionId ||
      typeof c.title !== "string" ||
      c.title.length > 300 ||
      !Number.isFinite(Date.parse(c.discoveredAt)) ||
      c.reviewStatus !== "needs_review" ||
      c.categoryScope !== "unknown" ||
      !["title_match", "needs_review"].includes(c.eventIdentityStatus) ||
      !["title_year_match", "needs_review", "year_conflict"].includes(
        c.editionIdentityStatus,
      ) ||
      !["official_site_unapproved", "external_link_unverified"].includes(
        c.sourceAuthorityStatus,
      ) ||
      !["html_link", "rss", "sitemap"].includes(c.discoveryMethod) ||
      !Array.isArray(c.reasons) ||
      c.reasons.some((r) => typeof r !== "string") ||
      typeof c.discoverySourceId !== "string" ||
      !c.discoverySourceId ||
      !c.evidence ||
      !/^[a-f0-9]{64}$/.test(c.evidence.listingHash) ||
      typeof c.evidence.locator !== "string" ||
      typeof c.evidence.excerpt !== "string" ||
      c.evidence.excerpt.length > 500
    )
      throw new Error("INVALID_DISCOVERY_CANDIDATE");
    const url = normalizeDiscoveryUrl(c.candidateUrl);
    normalizeDiscoveryUrl(c.discoveryEntry);
    normalizeDiscoveryUrl(c.evidence.listingUrl);
    if (
      url !== c.candidateUrl ||
      c.candidateUrl.length > 2048 ||
      c.candidateId !== candidateId(c.targetEditionId, url) ||
      seen.has(c.candidateId)
    )
      throw new Error("INVALID_DISCOVERY_CANDIDATE_ID");
    seen.add(c.candidateId);
  }
}
export async function discoverOfficialSources(input: {
  snapshot: RaceGraphSnapshot;
  registry: RaceSourceRegistry;
  ledger?: DiscoveryLedger;
  checkedAt?: string;
  fetcher?: typeof fetch;
}): Promise<{ report: MultiRaceDiscoveryReport; ledger: DiscoveryLedger }> {
  const started=performance.now();
  assertRaceGraphSnapshot(input.snapshot);
  assertRaceSourceRegistry(input.registry);
  const previous = input.ledger ?? emptyDiscoveryLedger();
  assertDiscoveryLedger(previous);
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(checkedAt)))
    throw new Error("INVALID_DISCOVERY_TIME");
  const all = new Map(previous.candidates.map((c) => [c.candidateId, c]));
  const records = input.snapshot.records.filter(
    ({ edition }) =>
      !["archived", "cancelled"].includes(edition.lifecycleStatus),
  );
  const editions: EditionDiscovery[] = [];
  const dailyReviewEditionIds = new Set<string>();
  let changedCandidates = 0;
  // Small fixed batches bound concurrent requests independently of race count.
  for (let offset = 0; offset < records.length; offset += 3) {
    const batch = await Promise.all(
      records.slice(offset, offset + 3).map(async (record) => {
        const editionId = record.edition.editionId;
        const result: EditionDiscovery = {
          editionId,
          status: "NOT_COVERED",
          entriesChecked: 0,
          listingsChecked: 0,
          linksExamined: 0,
          relevantLinksExamined: 0,
          coverage: "not_covered",
          errors: [],
          warnings: [],
          candidates: [],
          newCandidateIds: [],
        };
        // Old Editions remain historical; no daily discovery review tasks after their full local end day.
        const lastDay = record.edition.endDate ?? record.edition.raceDate;
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: record.edition.timezone ?? "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date(checkedAt));
        const today = ["year", "month", "day"]
          .map((type) => parts.find((p) => p.type === type)?.value)
          .join("-");
        if (lastDay && lastDay.slice(0, 10) < today) {
          result.warnings.push("ENDED_EDITION_DAILY_DISCOVERY_SKIPPED");
          return result;
        }
        dailyReviewEditionIds.add(editionId);
        const entries = activeFreshnessSources(input.registry, editionId)
          .filter(
            (s) =>
              s.tier === "primary_official" &&
              [
                "event_home",
                "notice",
                "registration_notice",
                "regulations",
              ].includes(s.sourceType),
          )
          .sort(
            (a, b) =>
              Number(b.isPrimary) - Number(a.isPrimary) ||
              Number(b.sourceType === "event_home") -
                Number(a.sourceType === "event_home"),
          )
          .slice(0, DISCOVERY_LIMITS.entriesPerEdition);
        if (!entries.length) {
          result.warnings.push("NO_APPROVED_OFFICIAL_DISCOVERY_ENTRY");
          return result;
        }
        const approved = new Set(
          (
            input.registry.editions.find((e) => e.editionId === editionId)
              ?.sources ?? []
          ).map((s) => normalizeDiscoveryUrl(s.url)),
        );
        const seenPages = new Set<string>();
        const found = new Map<string, OfficialSourceCandidate>();
        let successes = 0;
        let followed = 0;
        const scan = async (
          url: string,
          entry: (typeof entries)[number],
          follow: boolean,
        ) => {
          const normalized = normalizeDiscoveryUrl(url);
          if (seenPages.has(normalized)) return;
          seenPages.add(normalized);
          try {
            const page = await fetchDiscoveryText({
              url: normalized,
              approvedHost: new URL(entry.url).hostname,
              fetcher: input.fetcher,
            });
            successes++;
            result.listingsChecked++;
            const links = listingLinks(page.text, page.url, page.contentType);
            result.linksExamined += links.length;
            const hash = createHash("sha256").update(page.text).digest("hex");
            const followUrls: string[] = [];
            for (const link of links) {
              let candidateUrl: string;
              try {
                candidateUrl = normalizeDiscoveryUrl(link.url);
              } catch {
                continue;
              }
              const sameHost =
                new URL(candidateUrl).hostname === new URL(entry.url).hostname;
              const listing =
                /^(?:(?:赛事)?(?:新闻|公告|通知)|通知公告|新闻公告|news(?: & media)?|event news|race announcement|notices?|rss|sitemap)$/i.test(
                  link.title.trim(),
                ) ||
                /\/(?:news|notices?|articles|rss|sitemap)(?:\.xml|\.html|\/)?(?:\?.*)?$/i.test(
                  candidateUrl,
                );
              if (follow && sameHost && listing) {
                if (
                  new URL(entry.url).protocol === "https:" &&
                  new URL(candidateUrl).protocol !== "https:"
                )
                  result.warnings.push(
                    "HTTP_LISTING_REQUIRES_SEPARATE_APPROVAL",
                  );
                else followUrls.push(candidateUrl);
              }
              // Domain names and /News paths alone are not evidence of an actionable announcement.
              const relevant =
                /(?:马拉松|越野|报名|规程|竞赛|抽签|赛道|参赛|公告|通知|marathon|trail|race|regulation|registration|entry|notice|course map|package pick.up|application form)/i.test(
                  link.title,
                );
              if (relevant || listing) result.relevantLinksExamined++;
              if (
                approved.has(candidateUrl) ||
                !relevant ||
                listing ||
                /^(?:首页|主页|报名|新闻公告|赛事新闻|赛事公告|通知公告|news|home|register|rss|sitemap)$/i.test(
                  link.title.trim(),
                )
              )
                continue;
              const status = classifyEditionIdentity({
                title: link.title,
                targetYear: record.edition.editionYear,
              });
              const editionIdentityStatus =
                status === "title_year_match" || status === "year_conflict"
                  ? status
                  : "needs_review";
              const eventMatch = [
                record.event.canonicalName,
                ...record.event.aliases,
              ]
                .filter(
                  (n) =>
                    n.length >= 3 ||
                    (n.length >= 2 && /[\u4e00-\u9fff]/.test(n)),
                )
                .some((n) =>
                  link.title.toLowerCase().includes(n.toLowerCase()),
                );
              const host = new URL(entry.url).hostname;
              const sharedHost =
                host.endsWith(".gov.cn") ||
                input.registry.editions.filter((e) =>
                  e.sources.some((s) => new URL(s.url).hostname === host),
                ).length > 1;
              if (
                (sharedHost && !eventMatch) ||
                /\/(?:cdn-cgi|label|privacy|contact|legal|cookies)(?:[/.?-]|$)/i.test(
                  candidateUrl,
                )
              )
                continue;
              const id = candidateId(editionId, candidateUrl);
              if (
                found.has(id) ||
                found.size >= DISCOVERY_LIMITS.candidatesPerEdition
              )
                continue;
              found.set(id, {
                candidateId: id,
                targetEditionId: editionId,
                candidateUrl,
                title: link.title.slice(0, 300),
                discoveredAt: checkedAt,
                discoveryEntry: normalizeDiscoveryUrl(entry.url),
                discoverySourceId: entry.sourceId,
                discoveryMethod: link.method,
                eventIdentityStatus: eventMatch
                  ? "title_match"
                  : "needs_review",
                editionIdentityStatus,
                sourceAuthorityStatus: sameHost
                  ? "official_site_unapproved"
                  : "external_link_unverified",
                categoryScope: "unknown",
                reviewStatus: "needs_review",
                reasons: [
                  "SOURCE_APPROVAL_REQUIRED",
                  "LISTING_ONLY_NOT_FACT_EVIDENCE",
                  ...(sameHost ? [] : ["CROSS_DOMAIN_REVIEW_REQUIRED"]),
                  ...(editionIdentityStatus === "year_conflict"
                    ? ["HISTORICAL_OR_OTHER_EDITION"]
                    : editionIdentityStatus === "needs_review"
                      ? ["EDITION_UNCONFIRMED"]
                      : []),
                  ...(eventMatch ? [] : ["EVENT_UNCONFIRMED"]),
                ],
                evidence: {
                  listingUrl: page.url,
                  listingHash: hash,
                  locator: link.locator,
                  excerpt: link.excerpt.slice(0, 500),
                },
              });
            }
            for (const next of [...new Set(followUrls)]) {
              if (seenPages.has(normalizeDiscoveryUrl(next))) continue;
              if (followed >= DISCOVERY_LIMITS.listingsPerEdition) break;
              followed++;
              await scan(next, entry, false);
            }
          } catch (error) {
            result.errors.push(
              error instanceof Error
                ? error.message.slice(0, 160)
                : "DISCOVERY_FAILED",
            );
          }
        };
        for (const entry of entries) {
          result.entriesChecked++;
          await scan(entry.url, entry, true);
        }
        result.candidates = [...found.values()].sort((a, b) =>
          a.candidateId.localeCompare(b.candidateId),
        );
        if (result.relevantLinksExamined > 0)
          result.coverage = "bounded_static_links";
        result.status = !successes
          ? "FAILED"
          : result.candidates.some((c) => !all.has(c.candidateId))
            ? "CANDIDATES_FOUND"
            : result.relevantLinksExamined
              ? "NO_NEW_SOURCES"
              : "NOT_COVERED";
        if (successes && result.errors.length) {
          result.status = "PARTIAL";
          result.warnings.push("DISCOVERY_COVERAGE_INCOMPLETE");
        }
        if (result.status === "NOT_COVERED")
          result.warnings.push(
            "NO_STATIC_LISTING_LINKS_SPA_OR_FORMAT_NOT_COVERED",
          );
        for (const c of result.candidates)
          if (!all.has(c.candidateId))
            result.newCandidateIds.push(c.candidateId);
        return result;
      }),
    );
    for (const e of batch) {
      editions.push(e);
      for (const c of e.candidates) {
        const prior = all.get(c.candidateId);
        if (
          prior &&
          [
            "title",
            "eventIdentityStatus",
            "editionIdentityStatus",
            "sourceAuthorityStatus",
          ].some(
            (k) =>
              prior[k as keyof OfficialSourceCandidate] !==
              c[k as keyof OfficialSourceCandidate],
          )
        )
          changedCandidates++;
        all.set(
          c.candidateId,
          prior ? { ...c, discoveredAt: prior.discoveredAt } : c,
        );
      }
    }
  }
  const ledger: DiscoveryLedger = {
    schemaVersion: "source-discovery-ledger-v1",
    candidates: [...all.values()].sort((a, b) =>
      a.candidateId.localeCompare(b.candidateId),
    ),
  };
  assertDiscoveryLedger(ledger);
  const unresolved = ledger.candidates.filter(
    (c) =>
      dailyReviewEditionIds.has(c.targetEditionId) &&
      c.editionIdentityStatus !== "year_conflict" &&
      !input.registry.editions
        .find((e) => e.editionId === c.targetEditionId)
        ?.sources.some((s) => normalizeDiscoveryUrl(s.url) === c.candidateUrl),
  ).length;
  return {
    ledger,
    report: {
      schemaVersion: "multi-race-discovery-v1",
      checkedAt,
      durationMs:Math.round(performance.now()-started),
      editions,
      summary: {
        editionsChecked: editions.length,
        newSources: editions.reduce((n, e) => n + e.newCandidateIds.length, 0),
        candidates: editions.reduce((n, e) => n + e.candidates.length, 0),
        unresolvedReview: unresolved,
        changedCandidates,
        failed: editions.filter((e) => e.errors.length > 0).length,
        notCovered: editions.filter((e) => e.status === "NOT_COVERED").length,
      },
      factPendingWrites: 0,
      registryWrites: 0,
      modelCalls: 0,
    },
  };
}
function candidateId(editionId: string, url: string): string {
  return `sc-${createHash("sha256").update(`${editionId}\n${url}`).digest("hex").slice(0, 20)}`;
}
function listingLinks(
  text: string,
  base: string,
  type: string,
): Array<{
  url: string;
  title: string;
  method: OfficialSourceCandidate["discoveryMethod"];
  locator: string;
  excerpt: string;
}> {
  const links: ReturnType<typeof listingLinks> = [];
  const add = (
    url: string,
    title: string,
    method: OfficialSourceCandidate["discoveryMethod"],
    index: number,
    excerpt: string,
  ) => {
    try {
      links.push({
        url: new URL(decodeHtml(url), base).toString(),
        title: decodeHtml(stripHtml(title)).trim(),
        method,
        locator: `listing:${index}`,
        excerpt,
      });
    } catch {}
  };
  if (/xml/i.test(type) || /^\s*<\?xml/.test(text)) {
    for (const m of text.matchAll(
      /<(?:item|entry|url)\b[^>]*>([\s\S]*?)<\/(?:item|entry|url)>/gi,
    )) {
      const body = m[1];
      const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
      const loc =
        body.match(/<(?:loc|link)[^>]*>([\s\S]*?)<\/(?:loc|link)>/i)?.[1] ??
        body.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1];
      if (loc)
        add(
          loc,
          (title ?? decodeURIComponent(new URL(loc, base).pathname)).replace(
            /<!\[CDATA\[([\s\S]*?)\]\]>/g,
            "$1",
          ),
          body.includes("<loc") ? "sitemap" : "rss",
          m.index!,
          body.slice(0, 500),
        );
      if (links.length >= 200) break;
    }
  } else {
    const html = text.replace(
      /<!--[\s\S]*?-->|<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,
      (m) => " ".repeat(m.length),
    );
    for (const m of html.matchAll(
      /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    )) {
      const title = m[2].replace(
        /<img\b[^>]*alt=["']([^"']+)["'][^>]*>/gi,
        "$1",
      );
      add(m[1], title, "html_link", m.index!, m[0].slice(0, 500));
      if (links.length >= 200) break;
    }
    for (const m of html.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi))
      if (/(?:rss|atom|sitemap)/i.test(m[0]))
        add(m[1], "rss", "html_link", m.index!, m[0]);
  }
  return links;
}
