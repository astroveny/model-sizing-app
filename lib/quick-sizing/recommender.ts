import modelsData from "@/data/models.json";

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

interface ModelEntry {
  id: string;
  name: string;
  params_b: number;
  architecture: "dense" | "moe";
}

const ALL_MODELS = (modelsData.models as ModelEntry[]);

export function recommend(input: QuickSizingInput): ModelCandidate[] {
  // If user specified a known model, return it directly
  if (input.knownModelId) {
    const m = ALL_MODELS.find((m) => m.id === input.knownModelId);
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

  // TODO: LLM-assist hook (v0.4b) — currently returns rule-based recommendations
  const { concurrentUsers, latency } = input;

  let minParams = 0;
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
    // High concurrency
    maxParams = 13;
    rationale = "High concurrency (500+) → smaller models favour throughput and replica scaling.";
  }

  if (latency === "batch") {
    maxParams = Infinity;
    minParams = 0;
    rationale = "Batch workload — model size not latency-constrained; larger models acceptable.";
  }

  const candidates = ALL_MODELS
    .filter((m) => m.params_b >= minParams && m.params_b <= maxParams)
    .sort((a, b) => b.params_b - a.params_b)
    .slice(0, 3);

  return candidates.map((m) => ({
    modelId: m.id,
    name: m.name,
    paramsB: m.params_b,
    architecture: m.architecture,
    rationale,
  }));
}
