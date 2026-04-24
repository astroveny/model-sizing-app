// Browser-side helper — calls the server-side /api/llm proxy.
// Never imports provider code directly (keys stay server-side).

import type { LlmCompleteParams, LlmCompleteResult } from "./provider";
import type { LlmFeatureId } from "@/lib/settings/feature-ids";
export type { LlmFeatureId };

export class LlmFeatureUnassignedError extends Error {
  constructor(public readonly feature: LlmFeatureId) {
    super(`Feature "${feature}" has no model configured.`);
    this.name = "LlmFeatureUnassignedError";
  }
}

export async function llmComplete(
  params: LlmCompleteParams,
  feature?: LlmFeatureId
): Promise<LlmCompleteResult> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, feature }),
  });

  if (res.status === 503) {
    const body = await res.json().catch(() => ({ code: "FEATURE_UNASSIGNED" })) as { code?: string; error?: string };
    if (body.code === "FEATURE_UNASSIGNED" && feature) {
      throw new LlmFeatureUnassignedError(feature);
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<LlmCompleteResult>;
}
