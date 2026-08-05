import { mkdir, writeFile } from "node:fs/promises";

export const CONNECTOR_PIPELINE_VERSION = "connector-poc-v1" as const;
export const CONNECTOR_DELAY_MS = 1_500;
export const CONNECTOR_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 RaceNextDataPOC/1.0";

export type HttpResult = {
  ok: boolean;
  status: number;
  finalUrl: string;
  text: string;
  headers: Headers;
};

export class ConnectorStopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectorStopError";
  }
}

export function sleep(ms = CONNECTOR_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTextWithPolicy(
  url: string,
  init: RequestInit = {},
  options: { retries?: number; delayMs?: number; timeoutMs?: number } = {},
): Promise<HttpResult> {
  const retries = options.retries ?? 2;
  const delayMs = options.delayMs ?? CONNECTOR_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? 15_000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": CONNECTOR_USER_AGENT,
          Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7",
          ...(init.headers ?? {}),
        },
      });
      const text = await response.text();
      const result = {
        ok: response.ok,
        status: response.status,
        finalUrl: response.url,
        text,
        headers: response.headers,
      };
      const restriction = detectRestriction(result.status, result.text);
      if (restriction) throw new ConnectorStopError(restriction);
      if (response.ok || attempt === retries || !shouldRetry(response.status)) {
        await sleep(delayMs);
        return result;
      }
      await sleep(delayMs);
    } catch (error) {
      lastError = error;
      if (error instanceof ConnectorStopError) {
        await sleep(delayMs);
        throw error;
      }
      if (attempt === retries) break;
      await sleep(delayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function fetchJsonWithPolicy<T>(
  url: string,
  init: RequestInit = {},
  options: { retries?: number; delayMs?: number; timeoutMs?: number } = {},
): Promise<HttpResult & { data: T }> {
  const result = await fetchTextWithPolicy(
    url,
    {
      ...init,
      headers: {
        Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
        ...(init.headers ?? {}),
      },
    },
    options,
  );
  try {
    return { ...result, data: JSON.parse(result.text) as T };
  } catch (error) {
    throw new Error(`JSON parse failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function detectRestriction(status: number, text: string): string | null {
  if ([401, 403, 407, 429, 451, 567].includes(status)) return `restricted response: HTTP ${status}`;
  if (/Access Restricted|EdgeOne|WAF|无权限访问|访问过于频繁|请求已被拦截/i.test(text)) {
    return "restricted response body detected";
  }
  return null;
}

export function stripHtml(value: string): string {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&rarr;/g, "→")
    .trim();
}

export function absolutizeUrl(url: string | undefined, baseUrl: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return undefined;
  }
}

export function firstMatch(value: string, pattern: RegExp): string | null {
  return value.match(pattern)?.[1]?.trim() ?? null;
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(path.split("/").slice(0, -1).join("/"), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function logStep(message: string, meta?: Record<string, unknown>) {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[connector-poc] ${message}${suffix}`);
}

function shouldRetry(status: number): boolean {
  return status >= 500 && status !== 567;
}
