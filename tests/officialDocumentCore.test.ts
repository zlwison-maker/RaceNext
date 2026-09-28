import { deepEqual, equal, match, ok } from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import {
  extractDocumentSnapshot,
  fetchOfficialDocument,
  normalizeDocumentText,
} from "../scripts/race-update/officialDocument.ts";
import type { RaceSourceRegistrySource } from "../types/raceUpdate.ts";

const source: RaceSourceRegistrySource = {
  sourceId: "fixture-official-home",
  url: "https://race.example.test/2027",
  domain: "race.example.test",
  tier: "primary_official",
  sourceType: "event_home",
  status: "active",
  isPrimary: true,
  notes: null,
};

test("HTML extraction removes page noise, retains same-domain links and hashes normalized text", async () => {
  const html = `<!doctype html><html><head><title> Official Race </title><style>.x{}</style></head>
    <body><nav>Menu</nav><main><h1>Race 2027</h1><p>Start 06:00</p>
    <a href="/rules">Rules</a><a href="https://other.test/no">Other</a></main></body></html>`;
  const result = await extractDocumentSnapshot({
    sourceId: source.sourceId,
    editionId: "fixture-race-2027",
    url: source.url,
    contentType: "text/html",
    body: new TextEncoder().encode(html),
    fetchedAt: "2026-09-28T10:00:00+08:00",
  });
  equal(result.ok, true);
  if (!result.ok) return;
  match(result.document.text, /Race 2027/);
  equal(result.document.text.includes("Menu"), false);
  deepEqual(result.document.links, ["https://race.example.test/rules"]);
  equal(result.document.contentHash, createHash("sha256").update(result.document.text).digest("hex"));
});

test("plain-text normalization makes formatting-only whitespace stable", async () => {
  const first = normalizeDocumentText(" Race   2027\r\n\r\n Start  06:00 ");
  const second = normalizeDocumentText("Race 2027\nStart 06:00");
  equal(first, second);
  const [left, right] = await Promise.all([first, second].map((text) => extractDocumentSnapshot({
    sourceId: source.sourceId,
    editionId: "fixture-race-2027",
    url: source.url,
    contentType: "text/plain" as const,
    body: new TextEncoder().encode(text),
    fetchedAt: "2026-09-28T10:00:00+08:00",
  })));
  ok(left.ok && right.ok);
  if (left.ok && right.ok) equal(left.document.contentHash, right.document.contentHash);
});

test("fetch primitive uses an injected fetcher and rejects cross-domain redirects", async () => {
  const fetched = await fetchOfficialDocument({
    source,
    editionId: "fixture-race-2027",
    fetchedAt: "2026-09-28T10:00:00+08:00",
    fetcher: (async () => new Response("Race 2027", {
      status: 200,
      headers: { "content-type": "text/plain" },
    })) as typeof fetch,
  });
  equal(fetched.ok, true);

  const redirected = await fetchOfficialDocument({
    source,
    editionId: "fixture-race-2027",
    fetchedAt: "2026-09-28T10:00:00+08:00",
    fetcher: (async () => new Response(null, {
      status: 302,
      headers: { location: "https://evil.example.test/" },
    })) as typeof fetch,
  });
  equal(redirected.ok, false);
  if (!redirected.ok) equal(redirected.status, "identity_mismatch");
});
