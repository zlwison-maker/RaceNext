import { stripHtml } from "../connectors/shared.ts";
import { createHash } from "node:crypto";
import type { OfficialDocumentSnapshot } from "../../types/officialSourceIngestion.ts";
import type { RaceGraphSnapshot, RaceSourceRegistry } from "../../types/raceUpdate.ts";
import { assertDiscoveryLedger, type DiscoveryLedger } from "./multiRaceDiscovery.ts";
import { fetchDiscoveryText } from "./discoveryFetch.ts";
import { checkEditionDocumentIdentity } from "./identity.ts";
import { extractDocumentSnapshot } from "./officialDocument.ts";
import { officialAnnouncementSource } from "./sourceRegistry.ts";
import { classifyEditionIdentity } from "./sourceDiscovery.ts";

export type AnnouncementDecision = {
  candidateId: string; editionId: string; url: string; sourceId: string | null;
  status: "eligible" | "processed" | "needs_review" | "historical" | "ended" | "deferred";
  reason: string; contentHash: string | null;
  pageHash?: string;
};

/** Reuse approved site identity; fetching the actual article and field validation are still mandatory. */
export async function prepareOfficialAnnouncements(input: {
  snapshot: RaceGraphSnapshot; registry: RaceSourceRegistry; ledger: DiscoveryLedger;
  checkedAt: string; fetcher?: typeof fetch;
}) {
  assertDiscoveryLedger(input.ledger);
  const registry = structuredClone(input.registry);
  const documents: OfficialDocumentSnapshot[] = [];
  const decisions: AnnouncementDecision[] = [];
  const counts = new Map<string, number>();
  for (const c of input.ledger.candidates) {
    const decision: AnnouncementDecision = { candidateId: c.candidateId, editionId: c.targetEditionId,
      url: c.candidateUrl, sourceId: null, status: "needs_review", reason: "OFFICIAL_IDENTITY_REVIEW", contentHash: null };
    decisions.push(decision);
    const record = input.snapshot.records.find(r => r.edition.editionId === c.targetEditionId);
    if (!record) continue;
    const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: record.edition.timezone ?? "UTC", year:"numeric",month:"2-digit",day:"2-digit" }).formatToParts(new Date(input.checkedAt));
    const today=["year","month","day"].map(type=>dateParts.find(p=>p.type===type)?.value).join("-");
    if (["archived", "cancelled"].includes(record.edition.lifecycleStatus) || (record.edition.endDate ?? record.edition.raceDate ?? "9999").slice(0,10) < today) {
      decision.status = "ended"; decision.reason = "HISTORICAL_LEDGER_RETAINED"; continue;
    }
    if (classifyEditionIdentity({ title:c.title, targetYear:record.edition.editionYear }) === "year_conflict") {
      decision.status = "historical"; decision.reason = "EDITION_YEAR_CONFLICT"; continue;
    }
    const registered=input.registry.editions.find(e=>e.editionId===c.targetEditionId)?.sources.find(s=>s.url===c.candidateUrl);
    if (registered) {
      if (registered.status==="active" && registered.tier==="primary_official") {
        decision.status="processed"; decision.sourceId=registered.sourceId; decision.reason="ALREADY_REGISTERED_USE_EXISTING_MONITORING";
      }
      continue;
    }
    const source = officialAnnouncementSource(input.registry, c.targetEditionId, c.discoverySourceId, c.candidateUrl);
    if (!source) continue;
    if ((counts.get(c.targetEditionId) ?? 0) >= 10) { decision.status = "deferred"; decision.reason = "BOUNDED_ARTICLE_FETCH_LIMIT"; continue; }
    counts.set(c.targetEditionId, (counts.get(c.targetEditionId) ?? 0) + 1);
    try {
      const page = await fetchDiscoveryText({ url:c.candidateUrl, approvedHost:new URL(source.url).hostname, fetcher:input.fetcher });
      decision.pageHash=createHash("sha256").update(page.text).digest("hex");
      if (page.url !== c.candidateUrl || !/^(?:text\/html|text\/plain|application\/xhtml\+xml)(?:;|$)/i.test(page.contentType)) throw new Error("ARTICLE_URL_OR_FORMAT_REVIEW");
      const article = articleHtml(page.text);
      const articleOffset=page.text.indexOf(article);
      const localHeading=article.match(/<h[123]\b[^>]*>([\s\S]*?)<\/h[123]>/i)?.[1];
      const precedingHeadings=articleOffset>=0 ? [...page.text.slice(0,articleOffset).matchAll(/<h[123]\b[^>]*>([\s\S]*?)<\/h[123]>/gi)] : [];
      const heading=localHeading ?? precedingHeadings.at(-1)?.[1];
      const headline = stripHtml(heading ?? page.text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
      const titleIdentity = classifyEditionIdentity({ title:headline, targetYear:record.edition.editionYear });
      if (titleIdentity === "year_conflict") throw new Error("ARTICLE_YEAR_CONFLICT");
      const body = stripHtml(article);
      const scope = `${headline}\n${body.slice(0, 1000)}`;
      const years = [...scope.matchAll(/(?<!\d)20\d{2}(?!\d)/g)].map(m=>Number(m[0]));
      // A current-edition heading may legitimately cite past rulebooks/results. Those are not article identity.
      const articleHeading = /(?:规程|公告|通知|须知|报名|新闻|赛道|registration|regulations|notice|announcement|guidelines?)/i.test(headline);
      if (!(articleHeading && titleIdentity === "title_year_match") && (!years.includes(record.edition.editionYear) || years.some(y=>y!==record.edition.editionYear))) throw new Error("ARTICLE_EDITION_APPLICABILITY_UNCLEAR");
      const fetched = await extractDocumentSnapshot({ sourceId:source.sourceId, editionId:c.targetEditionId,
        url:c.candidateUrl, contentType:"text/html", body:Buffer.from(`<title>${headline}</title>${article}`), fetchedAt:input.checkedAt });
      if (!fetched.ok) throw new Error(fetched.detail);
      if (checkEditionDocumentIdentity({record,source,document:fetched.document}).status !== "matched") throw new Error("ARTICLE_EVENT_IDENTITY_UNCLEAR");
      if (/<img\b/i.test(article) && body.trim().length < 60) throw new Error("ARTICLE_IMAGE_EVIDENCE_NOT_READABLE");
      if (body.trim().length < 20) throw new Error("ARTICLE_BODY_EVIDENCE_MISSING");
      registry.editions.find(e=>e.editionId===c.targetEditionId)!.sources.push(source);
      documents.push(fetched.document);
      decision.sourceId=source.sourceId; decision.status="eligible"; decision.reason="OFFICIAL_ARTICLE_IDENTITY_MATCHED_FIELD_VALIDATION_REQUIRED";
      decision.contentHash=fetched.document.contentHash;
    } catch (error) { decision.reason=error instanceof Error ? error.message : "ARTICLE_FETCH_FAILED"; }
  }
  return { registry, documents, decisions };
}

/** Generic semantic/article content boundary; navigation/footer is never field evidence. */
function articleHtml(html: string): string {
  const semantic = /<(article|main)\b[^>]*>/i.exec(html);
  const content = /<div\b[^>]*class=["'](?:[^"']*\s)?content(?:\s[^"']*)?["'][^>]*>/i.exec(html);
  const start = semantic ?? content;
  if (start) {
    const tag = semantic ? semantic[1] : "div";
    const rest = html.slice(start.index + start[0].length);
    const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
    let depth=1;
    for (const m of rest.matchAll(tags)) { depth += m[0].startsWith("</") ? -1 : 1; if (depth===0) return rest.slice(0,m.index); }
    throw new Error("ARTICLE_BOUNDARY_UNCLOSED");
  }
  return html.replace(/<(nav|header|footer|aside|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .split(/<div\b[^>]*class=["'][^"']*\bfooter\b/i)[0];
}
