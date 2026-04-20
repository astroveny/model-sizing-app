import type { LlmProvider } from "./provider";
import { LlmFatalError } from "./provider";

let _instance: LlmProvider | null = null;

export function getLlmProvider(): LlmProvider {
  if (_instance) return _instance;

  const provider = process.env.LLM_PROVIDER ?? "anthropic";

  if (provider === "anthropic") {
    const { AnthropicProvider } = require("./anthropic") as typeof import("./anthropic");
    _instance = new AnthropicProvider();
  } else if (provider === "openai-compatible") {
    const { OpenAiCompatibleProvider } = require("./openai-compatible") as typeof import("./openai-compatible");
    _instance = new OpenAiCompatibleProvider();
  } else {
    throw new LlmFatalError(`Unknown LLM_PROVIDER: "${provider}". Valid options: anthropic, openai-compatible`);
  }

  return _instance;
}

/** Reset the singleton (for testing). */
export function resetLlmProvider(): void {
  _instance = null;
}
