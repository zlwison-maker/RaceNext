import { lookup, resolve4, resolve6 } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { connect as connectTls } from "node:tls";

import type { RaceSourceRegistry } from "../../types/raceUpdate.ts";
import { CONNECTOR_USER_AGENT, detectRestriction } from "../connectors/shared.ts";
import { fetchOfficialDocument, OFFICIAL_FETCH_LIMITS } from "./officialDocument.ts";

const EDITION_ID = "hk100-2027";
const REPRESENTATIVE_SOURCE_IDS = new Set([
  "hk100-official-home",
  "hk100-official-the-half-2027",
  "hk100-official-entry-2027",
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

type SafeError = {
  name: string;
  message: string;
  causeName: string | null;
  causeCode: string | null;
  causeMessage: string | null;
  syscall: string | null;
  addressFamily: string | null;
};

function safeError(error: unknown): SafeError {
  const top = error instanceof Error ? error : new Error(String(error));
  const cause = top.cause && typeof top.cause === "object"
    ? top.cause as Record<string, unknown>
    : null;
  return {
    name: top.name,
    message: top.message,
    causeName: typeof cause?.name === "string" ? cause.name : null,
    causeCode: typeof cause?.code === "string" ? cause.code : null,
    causeMessage: typeof cause?.message === "string" ? cause.message : null,
    syscall: typeof cause?.syscall === "string" ? cause.syscall : null,
    addressFamily: typeof cause?.address === "string"
      ? (cause.address.includes(":") ? "IPv6" : "IPv4")
      : null,
  };
}

async function inspectTls(hostname: string) {
  return await new Promise<Record<string, unknown>>((resolve) => {
    const socket = connectTls({ host: hostname, port: 443, servername: hostname });
    const finish = (result: Record<string, unknown>) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(OFFICIAL_FETCH_LIMITS.timeoutMs, () => finish({ ok: false, classification: "timeout" }));
    socket.once("secureConnect", () => finish({
      ok: true,
      authorized: socket.authorized,
      authorizationError: socket.authorizationError ?? null,
      protocol: socket.getProtocol(),
      cipher: socket.getCipher()?.standardName ?? socket.getCipher()?.name ?? null,
    }));
    socket.once("error", (error) => finish({ ok: false, error: safeError(error) }));
  });
}

async function inspectFetch(sourceId: string, sourceUrl: string, approvedDomain: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFFICIAL_FETCH_LIMITS.timeoutMs);
  const redirectDomains: string[] = [];
  const startedAt = Date.now();
  try {
    let currentUrl = sourceUrl;
    for (let redirects = 0; redirects <= OFFICIAL_FETCH_LIMITS.maxRedirects; redirects += 1) {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": CONNECTOR_USER_AGENT,
          Accept: "text/html,text/plain,application/pdf;q=0.9",
        },
      });
      const body = new Uint8Array(await response.arrayBuffer());
      const preview = new TextDecoder().decode(body.slice(0, 20_000));
      const location = response.headers.get("location");
      const targetDomain = location ? new URL(location, currentUrl).hostname : null;
      if (targetDomain) redirectDomains.push(targetDomain);
      const result = {
        sourceId,
        hostname: new URL(sourceUrl).hostname,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
        contentEncoding: response.headers.get("content-encoding"),
        responseBytes: body.byteLength,
        server: response.headers.get("server"),
        cloudflareMitigation: response.headers.get("cf-mitigated"),
        cloudflareRayPresent: response.headers.has("cf-ray"),
        restriction: detectRestriction(response.status, preview),
        redirectTargetDomain: targetDomain,
        redirectDomains,
        approvedDomainMatch: new URL(currentUrl).hostname.replace(/^www\./, "") === approvedDomain.replace(/^www\./, ""),
        elapsedMs: Date.now() - startedAt,
      };
      if (!REDIRECT_STATUSES.has(response.status) || !location) return result;
      currentUrl = new URL(location, currentUrl).toString();
    }
    return {
      sourceId,
      hostname: new URL(sourceUrl).hostname,
      classification: "redirect_limit",
      redirectDomains,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      sourceId,
      hostname: new URL(sourceUrl).hostname,
      classification: (error as Error).name === "AbortError" ? "timeout" : "network_error",
      error: safeError(error),
      redirectDomains,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

const registry = JSON.parse(
  await readFile("data/sources/race-source-registry.json", "utf8"),
) as RaceSourceRegistry;
const edition = registry.editions.find(({ editionId }) => editionId === EDITION_ID);
if (!edition) throw new Error(`Registry entry missing: ${EDITION_ID}`);

const hostname = new URL(edition.sources[0].url).hostname;
const [lookupResults, ipv4, ipv6, tls] = await Promise.all([
  lookup(hostname, { all: true }).then(
    (results) => ({ ok: true, families: results.map(({ family }) => `IPv${family}`) }),
    (error) => ({ ok: false, error: safeError(error) }),
  ),
  resolve4(hostname).then(
    (results) => ({ ok: true, count: results.length }),
    (error) => ({ ok: false, error: safeError(error) }),
  ),
  resolve6(hostname).then(
    (results) => ({ ok: true, count: results.length }),
    (error) => ({ ok: false, error: safeError(error) }),
  ),
  inspectTls(hostname),
]);

console.log(JSON.stringify({
  diagnostic: "hk100-runner-fetch-v1",
  node: process.version,
  platform: process.platform,
  editionId: EDITION_ID,
  sourceCount: edition.sources.length,
  hostname,
  dns: { lookup: lookupResults, ipv4, ipv6 },
  tls,
}));

for (const source of edition.sources) {
  console.log(JSON.stringify(await inspectFetch(source.sourceId, source.url, source.domain)));
  if (!REPRESENTATIVE_SOURCE_IDS.has(source.sourceId)) continue;
  const result = await fetchOfficialDocument({
    source,
    editionId: EDITION_ID,
    fetchedAt: new Date().toISOString(),
  });
  console.log(JSON.stringify(result.ok ? {
    sourceId: source.sourceId,
    projectFetcher: {
      ok: true,
      httpStatus: result.document.httpStatus,
      contentType: result.document.contentType,
      responseBytes: result.document.responseBytes,
      finalDomain: new URL(result.document.url).hostname,
    },
  } : {
    sourceId: source.sourceId,
    projectFetcher: { ok: false, status: result.status, detail: result.detail },
  }));
}
