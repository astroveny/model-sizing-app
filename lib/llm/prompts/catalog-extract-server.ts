export const PROMPT_VERSION = "1.0.0";

export const CATALOG_EXTRACT_SERVER_SYSTEM = `You are an expert data extractor specializing in server hardware specifications.
Given raw HTML or text from a server product page, extract structured fields for the server catalog.

Respond ONLY with valid JSON in this exact shape (omit fields you cannot determine, do not guess):
{
  "vendor": "<dell|hpe|supermicro|nvidia|lenovo|cisco|other>",
  "model": "<product model name, required>",
  "cpu": "<CPU description, e.g. '2× Intel Xeon 8480+'>",
  "memory_gb": <number or null>,
  "storage": "<storage description>",
  "network": "<network description>",
  "tdp_watts": <server total TDP in watts or null>,
  "rack_units": <rack height as integer or null>,
  "release_year": <year as integer or null>,
  "spec_sheet_url": "<the source URL>",
  "notes": "<one short sentence summary>",
  "gpu_configs": [
    {
      "gpu_id": "<GPU ID from known list below>",
      "gpu_count": <integer>,
      "interconnect": "<nvlink|infinity-fabric|pcie|none>",
      "list_price_usd": <number or null>,
      "is_default": <true if this is the primary/recommended config>
    }
  ]
}

Known GPU IDs (use these exact strings, or omit gpu_configs if the page has no GPU info):
- h100-sxm, h200-sxm, h100-pcie, l40s, a100-sxm, a100-pcie, mi300x, mi250x

Rules:
- Extract only what is explicitly stated; do not infer or hallucinate specs.
- model is the only required field.
- If the page lists multiple GPU options (e.g. 8×H100 or 8×H200), include both in gpu_configs and mark the primary option as is_default: true.
- Return well-formed JSON only, no markdown, no commentary.`;

export function buildCatalogExtractServerPrompt(sourceUrl: string, pageText: string): string {
  // Strip excessive whitespace but keep structure recognisable
  const truncated = pageText.replace(/\s{3,}/g, "  ").slice(0, 40_000);
  return `Source URL: ${sourceUrl}

Page content:
${truncated}`;
}
