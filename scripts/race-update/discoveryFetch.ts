import { lookup } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { CONNECTOR_USER_AGENT } from "../connectors/shared.ts";

export const DISCOVERY_LIMITS = {
  timeoutMs: 8_000,
  maxBytes: 2_000_000,
  maxRedirects: 2,
  entriesPerEdition: 2,
  listingsPerEdition: 2,
  candidatesPerEdition: 100,
} as const;
export function assertPublicDiscoveryUrl(value: string): URL {
  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && url.port !== (url.protocol === "https:" ? "443" : "80")) ||
    !host.includes(".") ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host) ||
    (isIP(host) && !isPublicAddress(host))
  )
    throw new Error("DISCOVERY_UNSAFE_URL");
  return url;
}
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && [0, 168].includes(b)) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && [18, 19, 51].includes(b)) ||
      (a === 203 && b === 0)
    );
  }
  // Only globally routed IPv6 unicast; reject IPv4 mapped/compatible, ULA, link local and multicast.
  return (
    isIP(address) === 6 &&
    /^[23][0-9a-f]{3}:/i.test(address) &&
    !address.toLowerCase().startsWith("2001:db8:") &&
    !address.toLowerCase().startsWith("2002:") &&
    !address.toLowerCase().startsWith("2001:0:")
  );
}
export async function fetchDiscoveryText(input: {
  url: string;
  approvedHost: string;
  fetcher?: typeof fetch;
}): Promise<{ url: string; text: string; contentType: string }> {
  let url = assertPublicDiscoveryUrl(input.url);
  if (url.hostname !== input.approvedHost)
    throw new Error("DISCOVERY_DOMAIN_NOT_APPROVED");
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    DISCOVERY_LIMITS.timeoutMs,
  );
  try {
    for (
      let redirect = 0;
      redirect <= DISCOVERY_LIMITS.maxRedirects;
      redirect++
    ) {
      const result = input.fetcher
        ? await injectedRequest(url, input.fetcher, controller.signal)
        : await pinnedPublicRequest(url, controller.signal);
      if ([301, 302, 303, 307, 308].includes(result.status)) {
        if (!result.location || redirect === DISCOVERY_LIMITS.maxRedirects)
          throw new Error("DISCOVERY_REDIRECT_LIMIT");
        const next = assertPublicDiscoveryUrl(
          new URL(result.location, url).toString(),
        );
        if (
          next.hostname !== input.approvedHost ||
          (url.protocol === "https:" && next.protocol !== "https:")
        )
          throw new Error("DISCOVERY_REDIRECT_REJECTED");
        url = next;
        continue;
      }
      if (result.status !== 200)
        throw new Error(`DISCOVERY_HTTP_${result.status}`);
      if (
        !/^(?:text\/(?:html|plain|xml)|application\/(?:xhtml\+xml|xml|rss\+xml|atom\+xml))(?:;|$)/i.test(
          result.type,
        )
      )
        throw new Error("DISCOVERY_FORMAT_NOT_COVERED");
      return {
        url: url.toString(),
        text: new TextDecoder().decode(result.body),
        contentType: result.type,
      };
    }
    throw new Error("DISCOVERY_REDIRECT_LIMIT");
  } finally {
    clearTimeout(timer);
  }
}
type WireResponse = {
  status: number;
  location: string | null;
  type: string;
  body: Uint8Array;
};
async function injectedRequest(
  url: URL,
  fetcher: typeof fetch,
  signal: AbortSignal,
): Promise<WireResponse> {
  const r = await fetcher(url.toString(), {
    redirect: "manual",
    signal,
    headers: {
      Accept: "text/html,application/rss+xml,application/xml",
      "User-Agent": CONNECTOR_USER_AGENT,
    },
  });
  if (r.url && new URL(r.url).toString() !== url.toString())
    throw new Error("DISCOVERY_UNEXPECTED_FINAL_URL");
  if (Number(r.headers.get("content-length")) > DISCOVERY_LIMITS.maxBytes)
    throw new Error("DISCOVERY_RESPONSE_TOO_LARGE");
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (r.body)
    for await (const chunk of r.body as unknown as AsyncIterable<Uint8Array>) {
      length += chunk.byteLength;
      if (length > DISCOVERY_LIMITS.maxBytes) {
        await r.body.cancel().catch(() => {});
        throw new Error("DISCOVERY_RESPONSE_TOO_LARGE");
      }
      chunks.push(chunk);
    }
  return {
    status: r.status,
    location: r.headers.get("location"),
    type: r.headers.get("content-type") ?? "",
    body: Buffer.concat(chunks),
  };
}
function pinnedPublicRequest(
  url: URL,
  signal: AbortSignal,
): Promise<WireResponse> {
  return new Promise((resolve, reject) => {
    // Check and pin the address used by the socket. A separate preflight DNS lookup would permit rebinding.
    const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        signal,
        agent: false,
        headers: {
          Accept: "text/html,application/rss+xml,application/xml",
          "User-Agent": CONNECTOR_USER_AGENT,
        },
        lookup(hostname, options, callback) {
          lookup(
            hostname,
            { all: true, verbatim: true },
            (error, addresses) => {
              if (error) return callback(error, "", 4);
              if (
                !addresses.length ||
                addresses.some((a) => !isPublicAddress(a.address))
              )
                return callback(
                  new Error("DISCOVERY_PRIVATE_DNS_REJECTED"),
                  "",
                  4,
                );
              if (options.all)
                (
                  callback as unknown as (
                    err: Error | null,
                    results: typeof addresses,
                  ) => void
                )(null, addresses);
              else callback(null, addresses[0].address, addresses[0].family);
            },
          );
        },
      },
      (response) => {
        if (
          Number(response.headers["content-length"]) > DISCOVERY_LIMITS.maxBytes
        ) {
          response.destroy();
          reject(new Error("DISCOVERY_RESPONSE_TOO_LARGE"));
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > DISCOVERY_LIMITS.maxBytes) {
            response.destroy(new Error("DISCOVERY_RESPONSE_TOO_LARGE"));
          } else chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            location: response.headers.location ?? null,
            type: response.headers["content-type"] ?? "",
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}
