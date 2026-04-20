// Browser-side helper — calls the server-side /api/llm proxy.
// Never imports provider code directly (keys stay server-side).

import type { LlmCompleteParams, LlmCompleteResult } from "./provider";

export async function llmComplete(params: LlmCompleteParams): Promise<LlmCompleteResult> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<LlmCompleteResult>;
}
