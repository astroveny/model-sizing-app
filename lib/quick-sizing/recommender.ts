import {
  QUICK_SIZING_SYSTEM,
  buildQuickSizingPrompt,
  PROMPT_VERSION as _PROMPT_VERSION,
} from "@/lib/llm/prompts/quick-sizing";

export type LatencySensitivity = "realtime" | "responsive" | "batch" | "none";
export type DeploymentPattern = "internal-inference" | "external-api" | "gpuaas-multi-tenant" | "saas-product";

export interface QuickSizingInput {
  objective: string;
  concurrentUsers: number;
  latency: LatencySensitivity;
  deploymentPattern: DeploymentPattern;
  deploymentTarget: "on-prem" | "cloud" | "hybrid";
  knownModelId?: string;
}

export interface ModelCandidate {
  modelId: string;
  name: string;
  paramsB: number;
  architecture: "dense" | "moe";
  rationale: string;
}

export interface ModelEntry {
  id: string;
  name: string;
  params_b: number;
  architecture: "dense" | "moe";
  family?: string;
}

function ruleBased(input: QuickSizingInput, models: ModelEntry[]): ModelCandidate[] {
  const { concurrentUsers, latency } = input;

  let maxParams = Infinity;
  let rationale = "";

  if (concurrentUsers < 50) {
    if (latency === "realtime") {
      maxParams = 13;
      rationale = "Low concurrency + real-time latency → small model for fast decode.";
    } else {
      maxParams = 70;
      rationale = "Low concurrency — any model up to 70B is viable.";
    }
  } else if (concurrentUsers <= 500) {
    if (latency === "realtime") {
      maxParams = 13;
      rationale = "Moderate concurrency + real-time latency → favour 7–13B for TTFT.";
    } else {
      maxParams = 70;
      rationale = "Moderate concurrency — 7–70B based on latency target.";
    }
  } else {
    maxParams = 13;
    rationale = "High concurrency (500+) → smaller models favour throughput and replica scaling.";
  }

  if (latency === "batch") {
    maxParams = Infinity;
    rationale = "Batch workload — model size not latency-constrained; larger models acceptable.";
  }

  return models
    .filter((m) => m.params_b <= maxParams)
    .sort((a, b) => b.params_b - a.params_b)
    .slice(0, 3)
    .map((m) => ({
      modelId: m.id,
      name: m.name,
      paramsB: m.params_b,
      architecture: m.architecture,
      rationale,
    }));
}

/** Synchronous rule-based recommendation — always available. */
export function recommend(input: QuickSizingInput, models: ModelEntry[]): ModelCandidate[] {
  if (input.knownModelId) {
    const m = models.find((m) => m.id === input.knownModelId);
    if (m) {
      return [{
        modelId: m.id,
        name: m.name,
        paramsB: m.params_b,
        architecture: m.architecture,
        rationale: "Model selected by user.",
      }];
    }
  }
  return ruleBased(input, models);
}

/** LLM-assisted recommendation — calls /api/llm server-side. Falls back to rule-based on any failure. */
export async function recommendWithLlm(input: QuickSizingInput, models: ModelEntry[]): Promise<ModelCandidate[]> {
  if (input.knownModelId) return recommend(input, models);

  try {
    const { llmComplete, LlmFeatureUnassignedError } = await import("@/lib/llm/client");

    const catalog = models.map(({ id, name, params_b, architecture }) => ({
      id, name, params_b, architecture,
    }));

    const result = await llmComplete({
      system: QUICK_SIZING_SYSTEM,
      messages: [{
        role: "user",
        content: buildQuickSizingPrompt({
          objective: input.objective,
          concurrentUsers: input.concurrentUsers,
          latency: input.latency,
          deploymentPattern: input.deploymentPattern,
          deploymentTarget: input.deploymentTarget,
          modelCatalog: catalog,
        }),
      }],
      maxTokens: 600,
      json: true,
    }, "quick-sizing-assist");

    const parsed = JSON.parse(result.text) as {
      candidates?: Array<{ modelId: string; rationale: string }>;
    };

    if (!parsed.candidates?.length) return ruleBased(input, models);

    const out: ModelCandidate[] = [];
    for (const c of parsed.candidates) {
      const m = models.find((m) => m.id === c.modelId);
      if (m) out.push({ modelId: m.id, name: m.name, paramsB: m.params_b, architecture: m.architecture, rationale: c.rationale });
    }
    return out.length ? out : ruleBased(input, models);
  } catch {
    return ruleBased(input, models);
  }
}
