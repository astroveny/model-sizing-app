// Ref: docs/llm-provider-guide.md §3.2
// Supports any OpenAI-compatible endpoint: Ollama, vLLM, TGI, Together, Groq, LM Studio, etc.

import type { LlmProvider, LlmCompleteParams, LlmCompleteResult } from "./provider";
import { LlmTransientError, LlmRateLimitError, LlmFatalError } from "./provider";

type OpenAiMessage = { role: string; content: string };
type OpenAiResponse = {
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export class OpenAiCompatibleProvider implements LlmProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(baseUrl?: string, apiKey?: string, model?: string) {
    const url   = baseUrl ?? process.env.OPENAI_COMPATIBLE_BASE_URL;
    const key   = apiKey  ?? process.env.OPENAI_COMPATIBLE_API_KEY ?? "none";
    const mdl   = model   ?? process.env.OPENAI_COMPATIBLE_MODEL;
    if (!url) throw new LlmFatalError("OPENAI_COMPATIBLE_BASE_URL is not set");
    if (!mdl) throw new LlmFatalError("OPENAI_COMPATIBLE_MODEL is not set");
    this.baseUrl = url.replace(/\/$/, "");
    this.apiKey  = key;
    this.model   = mdl;
  }

  async complete(params: LlmCompleteParams): Promise<LlmCompleteResult> {
    const { messages, system, maxTokens = 4096, temperature = 0.3 } = params;

    const apiMessages: OpenAiMessage[] = [];
    const systemPrompt = system ?? messages.find((m) => m.role === "system")?.content;
    if (systemPrompt) apiMessages.push({ role: "system", content: systemPrompt });
    for (const m of messages.filter((m) => m.role !== "system")) {
      apiMessages.push({ role: m.role, content: m.content });
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: apiMessages,
          max_completion_tokens: maxTokens,
          temperature,
        }),
      });
    } catch (err) {
      throw new LlmTransientError("Network error calling OpenAI-compatible endpoint", err);
    }

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") ?? "60", 10) * 1000;
      throw new LlmRateLimitError(retryAfter);
    }
    if (res.status >= 500) {
      throw new LlmTransientError(`OpenAI-compatible server error ${res.status}`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LlmFatalError(`OpenAI-compatible API error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as OpenAiResponse;
    const text = json.choices?.[0]?.message?.content ?? "";

    return {
      text,
      inputTokens:  json.usage?.prompt_tokens,
      outputTokens: json.usage?.completion_tokens,
    };
  }
}
