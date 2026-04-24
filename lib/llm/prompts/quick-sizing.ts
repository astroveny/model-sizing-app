export const PROMPT_VERSION = "1.0.0";

export const QUICK_SIZING_SYSTEM = `You are an expert ML infrastructure architect. Given a brief workload description, recommend up to 3 open-source LLM candidates from the provided catalog that best fit the requirements. Be concise and practical.

Respond ONLY with valid JSON in this exact shape:
{
  "candidates": [
    {
      "modelId": "<id from catalog>",
      "rationale": "<one sentence why this model fits>"
    }
  ]
}

Rules:
- Only use modelIds that appear in the provided catalog.
- Order by best fit first.
- Return 1–3 candidates; do not pad with poor fits.
- Rationale must reference the workload specifics (latency, concurrency, deployment).`;

export interface QuickSizingPromptCtx {
  objective: string;
  concurrentUsers: number;
  latency: string;
  deploymentPattern: string;
  deploymentTarget: string;
  modelCatalog: Array<{ id: string; name: string; params_b: number; architecture: string }>;
}

export function buildQuickSizingPrompt(ctx: QuickSizingPromptCtx): string {
  return `Workload:
- Objective: ${ctx.objective}
- Concurrent users: ${ctx.concurrentUsers}
- Latency requirement: ${ctx.latency}
- Deployment pattern: ${ctx.deploymentPattern}
- Deployment target: ${ctx.deploymentTarget}

Available models:
${ctx.modelCatalog.map((m) => `- id="${m.id}" name="${m.name}" params=${m.params_b}B arch=${m.architecture}`).join("\n")}

Recommend the best 1–3 models for this workload.`;
}
