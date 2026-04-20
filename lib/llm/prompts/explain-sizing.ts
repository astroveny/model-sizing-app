export const PROMPT_VERSION = "explain-sizing-v1";

export const EXPLAIN_SIZING_SYSTEM = `You are an ML infrastructure architect. Given sizing results for a \
GenAI inference deployment, explain the key decisions in plain English for a technical audience. \
Be specific: reference the actual numbers, trade-offs considered, and why this configuration was chosen \
over alternatives. Keep it to 3-5 bullet points. Return plain text, not JSON.`;

export type ExplainSizingContext = {
  panel: "hardware" | "infra" | "model-platform" | "application" | "summary";
  modelName: string;
  paramsB: number;
  quantization: string;
  concurrentUsers: number;
  gpuModel: string;
  totalGpus: number;
  serverCount: number;
  replicas: number;
  tensorParallelism: number;
  pipelineParallelism: number;
  ttftMs: number;
  itlMs: number;
  endToEndMs: number;
  powerKw: number;
  capexUsd: number;
  deploymentPattern: string;
  inferenceServer: string;
};

export function buildExplainSizingPrompt(ctx: ExplainSizingContext): string {
  return `Panel focus: ${ctx.panel}

Model: ${ctx.modelName} (${ctx.paramsB}B params, ${ctx.quantization})
Concurrent users: ${ctx.concurrentUsers}
Deployment: ${ctx.deploymentPattern}

Sizing results:
- GPU: ${ctx.totalGpus}× ${ctx.gpuModel} across ${ctx.serverCount} servers
- Replicas: ${ctx.replicas} (TP=${ctx.tensorParallelism}, PP=${ctx.pipelineParallelism})
- Inference server: ${ctx.inferenceServer}
- Latency: TTFT=${ctx.ttftMs.toFixed(0)}ms, ITL=${ctx.itlMs.toFixed(0)}ms, E2E=${ctx.endToEndMs.toFixed(0)}ms
- Power: ${ctx.powerKw.toFixed(1)} kW
- Est. CapEx: $${ctx.capexUsd.toLocaleString()}

Explain the key decisions for the "${ctx.panel}" panel in 3-5 bullet points. \
Why these choices? What alternatives were considered? What are the main trade-offs?`;
}
