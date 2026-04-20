export const PROMPT_VERSION = "extract-rfp-v1";

export const EXTRACT_RFP_SYSTEM = `You are an expert ML infrastructure architect analyzing an RFP or RFI document.
Extract structured requirements. Return ONLY valid JSON — no markdown fences, no commentary.`;

export function buildExtractRfpPrompt(rfpText: string): string {
  return `Analyze the following RFP/RFI text and extract all requirements relevant to an LLM/AI inference deployment.

Return a JSON object with this exact structure:
{
  "requirements": [
    {
      "id": "r1",
      "text": "exact or paraphrased requirement text",
      "layer": "hardware" | "infra" | "model-platform" | "application" | "general",
      "mandatory": true | false,
      "mapsToDiscoveryField": "discovery field path or null",
      "extractedValue": "the specific value if numeric/categorical, or null"
    }
  ],
  "timelines": [
    { "milestone": "milestone name", "date": "YYYY-MM-DD or relative description" }
  ],
  "evaluationCriteria": ["criterion 1", "criterion 2"],
  "mandatoryItems": ["mandatory item 1"]
}

Discovery field paths (for mapsToDiscoveryField):
- model.params, model.quantization, model.contextLength, model.architecture
- load.concurrentUsers, load.avgInputTokens, load.avgOutputTokens
- load.targetLatencyP95Ms, load.targetTTFTMs, load.targetITLMs
- hardware.preferredVendor, hardware.preferredGpu, hardware.powerBudgetKw
- infra.orchestrator, infra.airGapped
- modelPlatform.inferenceServer, modelPlatform.optimizations.fp8KvCache
- application.apiGateway, application.auth, application.rateLimiting, application.auditLogging

RFP/RFI TEXT:
${rfpText}`;
}
