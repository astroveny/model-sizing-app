import { NextRequest, NextResponse } from "next/server";
import { getLlmProvider } from "@/lib/llm/factory";
import { withRetry } from "@/lib/llm/retry";
import type { LlmCompleteParams } from "@/lib/llm/provider";
import { LlmFatalError } from "@/lib/llm/provider";

export async function POST(req: NextRequest) {
  let params: LlmCompleteParams;
  try {
    params = (await req.json()) as LlmCompleteParams;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!params.messages?.length) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  try {
    const provider = getLlmProvider();
    const result = await withRetry(() => provider.complete(params));
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LlmFatalError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[/api/llm] error:", err);
    return NextResponse.json({ error: "LLM request failed" }, { status: 500 });
  }
}
