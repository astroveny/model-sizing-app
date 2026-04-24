export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getLlmProvider, getLlmProviderForFeature } from "@/lib/llm/factory";
import { withRetry } from "@/lib/llm/retry";
import type { LlmCompleteParams } from "@/lib/llm/provider";
import { LlmFatalError } from "@/lib/llm/provider";
import { writeAudit } from "@/lib/db/audit";
import type { LlmFeatureId } from "@/lib/settings/routing";

type LlmRequestBody = LlmCompleteParams & { feature?: LlmFeatureId };

export async function POST(req: NextRequest) {
  let body: LlmRequestBody;
  try {
    body = (await req.json()) as LlmRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.messages?.length) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  const { feature, ...params } = body;
  const projectId = req.headers.get("x-project-id") ?? undefined;

  // Resolve provider: feature-routed if feature specified, else legacy .env fallback
  let provider;
  if (feature) {
    const routed = getLlmProviderForFeature(feature);
    if (!routed) {
      return NextResponse.json(
        { error: `Feature "${feature}" has no model configured. Go to Settings to assign one.`, code: "FEATURE_UNASSIGNED" },
        { status: 503 }
      );
    }
    provider = routed;
  } else {
    provider = getLlmProvider();
  }

  try {
    const result = await withRetry(() => provider.complete(params));
    writeAudit("llm.call", { feature, inputTokens: result.inputTokens, outputTokens: result.outputTokens }, projectId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LlmFatalError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[/api/llm] error:", err);
    return NextResponse.json({ error: "LLM request failed" }, { status: 500 });
  }
}
