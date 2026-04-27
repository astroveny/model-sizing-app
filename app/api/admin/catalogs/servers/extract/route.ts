export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { fetchSpecPage, UrlFetchError } from "@/lib/catalogs/url-fetch";
import { getLlmProviderForFeature } from "@/lib/llm/factory";
import {
  CATALOG_EXTRACT_SERVER_SYSTEM,
  buildCatalogExtractServerPrompt,
} from "@/lib/llm/prompts/catalog-extract-server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { url?: string } | null;
  const url = body?.url?.trim();
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const provider = getLlmProviderForFeature("catalog-extract");
  if (!provider) {
    return NextResponse.json(
      { error: "catalog-extract feature has no model assigned. Configure one in Settings → LLM." },
      { status: 503 }
    );
  }

  let page;
  try {
    page = await fetchSpecPage(url);
  } catch (err) {
    const msg = err instanceof UrlFetchError ? err.message : String(err);
    return NextResponse.json({ error: `Failed to fetch URL: ${msg}` }, { status: 422 });
  }

  let result;
  try {
    result = await provider.complete({
      system: CATALOG_EXTRACT_SERVER_SYSTEM,
      messages: [{ role: "user", content: buildCatalogExtractServerPrompt(page.url, page.text) }],
      maxTokens: 1200,
      json: true,
    });
  } catch (err) {
    return NextResponse.json({ error: `LLM extraction failed: ${String(err)}` }, { status: 502 });
  }

  let extracted: unknown;
  try {
    extracted = JSON.parse(result.text);
  } catch {
    return NextResponse.json({ error: "LLM returned non-JSON response", raw: result.text }, { status: 502 });
  }

  return NextResponse.json({ extracted });
}
