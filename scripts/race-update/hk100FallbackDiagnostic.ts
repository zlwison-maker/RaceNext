import { readFile } from "node:fs/promises";

import type { RaceGraphSnapshot, RaceSourceRegistrySource } from "../../types/raceUpdate.ts";
import { CONNECTOR_USER_AGENT, detectRestriction } from "../connectors/shared.ts";
import { checkEditionDocumentIdentity } from "./identity.ts";
import { fetchOfficialDocument } from "./officialDocument.ts";

const EDITION_ID = "hk100-2027";
const candidates: RaceSourceRegistrySource[] = [
  {
    sourceId: "hk100-finishers-2027",
    url: "https://www.finishers.com/en/event/hong-kong-100",
    domain: "www.finishers.com",
    tier: "trusted_structured",
    sourceType: "event_directory",
    status: "active",
    isPrimary: false,
    notes: null,
  },
  {
    sourceId: "hk100-hkjogging-2027",
    url: "https://hkjogging.com/races/hong-kong-100-series-2027",
    domain: "hkjogging.com",
    tier: "trusted_structured",
    sourceType: "event_directory",
    status: "active",
    isPrimary: false,
    notes: null,
  },
];

const snapshot = JSON.parse(
  await readFile("data/canonical/race-graph-v1.json", "utf8"),
) as RaceGraphSnapshot;
const record = snapshot.records.find(({ edition }) => edition.editionId === EDITION_ID);
if (!record) throw new Error(`Missing Canonical Edition: ${EDITION_ID}`);

for (const source of candidates) {
  const response = await fetch(source.url, {
    redirect: "manual",
    headers: {
      "User-Agent": CONNECTOR_USER_AGENT,
      Accept: "text/html,text/plain,application/pdf;q=0.9",
    },
  });
  const body = new Uint8Array(await response.arrayBuffer());
  console.log(JSON.stringify({
    sourceId: source.sourceId,
    hostname: new URL(source.url).hostname,
    https: new URL(source.url).protocol === "https:",
    status: response.status,
    redirectTargetDomain: response.headers.get("location")
      ? new URL(response.headers.get("location")!, source.url).hostname
      : null,
    contentType: response.headers.get("content-type"),
    contentEncoding: response.headers.get("content-encoding"),
    responseBytes: body.byteLength,
    server: response.headers.get("server"),
    restriction: detectRestriction(response.status, new TextDecoder().decode(body.slice(0, 20_000))),
  }));

  const result = await fetchOfficialDocument({
    source,
    editionId: EDITION_ID,
    fetchedAt: new Date().toISOString(),
  });
  if (!result.ok) {
    console.log(JSON.stringify({ sourceId: source.sourceId, projectFetcher: result }));
    continue;
  }
  console.log(JSON.stringify({
    sourceId: source.sourceId,
    projectFetcher: {
      ok: true,
      httpStatus: result.document.httpStatus,
      contentType: result.document.contentType,
      responseBytes: result.document.responseBytes,
      textLength: result.document.text.length,
      linkCount: result.document.links.length,
      identity: checkEditionDocumentIdentity({ record, source, document: result.document }),
    },
  }));
}
