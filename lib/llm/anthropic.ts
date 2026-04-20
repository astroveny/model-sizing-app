// Ref: docs/llm-provider-guide.md §3.1

import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, LlmCompleteParams, LlmCompleteResult } from "./provider";
import { LlmTransientError, LlmRateLimitError, LlmFatalError } from "./provider";

export class AnthropicProvider implements LlmProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new LlmFatalError("ANTHROPIC_API_KEY is not set");
    this.client = new Anthropic({ apiKey });
    this.model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  }

  async complete(params: LlmCompleteParams): Promise<LlmCompleteResult> {
    const { messages, system, maxTokens = 4096, temperature = 0.3 } = params;

    // Filter out system messages from the array (Anthropic uses top-level system param)
    const userMessages = messages.filter((m) => m.role !== "system");
    const systemPrompt = system ?? messages.find((m) => m.role === "system")?.content;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: userMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      return {
        text,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 429) {
        const retryAfter = 60_000;
        throw new LlmRateLimitError(retryAfter, err);
      }
      if (e?.status && e.status >= 500) {
        throw new LlmTransientError(`Anthropic server error ${e.status}`, err);
      }
      throw new LlmFatalError(e?.message ?? "Anthropic API error", err);
    }
  }
}
