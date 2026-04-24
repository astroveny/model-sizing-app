import type { LlmProvider } from "./provider";
import { LlmFatalError } from "./provider";
import type { LlmFeatureId } from "@/lib/settings/feature-ids";

let _instance: LlmProvider | null = null;

/** @deprecated Use getLlmProviderForFeature() instead. Falls back to .env config. */
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

type ProviderConfigInput = {
  provider: "anthropic" | "openai-compatible";
  apiKey?: string;
  baseUrl?: string;
  model: string;
};

/**
 * Creates a provider instance from an explicit config object.
 * Used by testModel() and getLlmProviderForFeature().
 */
export function getLlmProviderFromConfig(config: ProviderConfigInput): LlmProvider {
  if (config.provider === "anthropic") {
    const { AnthropicProvider } = require("./anthropic") as typeof import("./anthropic");
    return new AnthropicProvider(config.apiKey, config.model);
  } else if (config.provider === "openai-compatible") {
    const { OpenAiCompatibleProvider } = require("./openai-compatible") as typeof import("./openai-compatible");
    return new OpenAiCompatibleProvider(config.baseUrl, config.apiKey, config.model);
  }
  throw new LlmFatalError(`Unknown provider: "${config.provider}"`);
}

/**
 * Returns the LlmProvider assigned to a feature, or null if unassigned.
 * Callers must handle null — the feature is disabled.
 */
export function getLlmProviderForFeature(feature: LlmFeatureId): LlmProvider | null {
  try {
    // Dynamic import to avoid circular deps at module load time
    const { getAssignedModelId } = require("@/lib/settings/routing") as typeof import("@/lib/settings/routing");
    const { getModelConfig } = require("@/lib/settings/models") as typeof import("@/lib/settings/models");

    const modelId = getAssignedModelId(feature);
    if (!modelId) return null;

    const config = getModelConfig(modelId);
    if (!config) return null;

    return getLlmProviderFromConfig({
      provider: config.provider as "anthropic" | "openai-compatible",
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
    });
  } catch {
    return null;
  }
}
