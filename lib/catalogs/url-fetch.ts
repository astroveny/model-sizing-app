const MAX_BODY_BYTES = 512 * 1024; // 500 KB
const TIMEOUT_MS = 10_000;
const USER_AGENT = "MLSizer/1.0 (spec-sheet-fetcher; +https://github.com/anthropics/claude-code)";

export interface FetchedPage {
  url: string;
  contentType: string;
  text: string;
}

export class UrlFetchError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "UrlFetchError";
  }
}

/**
 * Server-side fetch of a spec-sheet URL.
 * Enforces timeout, size cap, and user-agent.
 * Returns the truncated text body.
 */
export async function fetchSpecPage(rawUrl: string): Promise<FetchedPage> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UrlFetchError(`Invalid URL: ${rawUrl}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UrlFetchError("Only http/https URLs are supported");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9" },
    });

    if (!res.ok) {
      throw new UrlFetchError(`HTTP ${res.status} from ${url.hostname}`);
    }

    const contentType = res.headers.get("content-type") ?? "text/html";
    const reader = res.body?.getReader();
    if (!reader) throw new UrlFetchError("No response body");

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        reader.cancel().catch(() => undefined);
        break;
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total > MAX_BODY_BYTES ? MAX_BODY_BYTES : total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const text = new TextDecoder().decode(bytes);
    return { url: url.toString(), contentType, text };
  } catch (err) {
    if (err instanceof UrlFetchError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new UrlFetchError(`Fetch failed: ${msg}`, err);
  } finally {
    clearTimeout(timer);
  }
}
