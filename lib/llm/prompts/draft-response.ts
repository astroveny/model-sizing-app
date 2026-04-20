export const PROMPT_VERSION = "draft-response-v1";

export const DRAFT_RESPONSE_SYSTEM = `You are a senior ML infrastructure solutions architect writing a formal RFP response.
Write in professional, concise prose. Be specific about technical choices — avoid vague statements.
Structure the response with clear section headers.`;

type DraftContext = {
  rfpSummary: string;
  requirements: { text: string; layer: string; mandatory: boolean }[];
  projectName: string;
  hardware: string;
  inferenceServer: string;
  replicas: number;
  totalGpus: number;
  ttftMs: number;
  endToEndMs: number;
  deploymentPattern: string;
};

export function buildDraftResponsePrompt(ctx: DraftContext): string {
  const mandatoryReqs = ctx.requirements.filter((r) => r.mandatory).map((r) => `- ${r.text}`).join("\n");
  const allReqs = ctx.requirements.map((r) => `[${r.layer}] ${r.mandatory ? "MANDATORY" : "optional"}: ${r.text}`).join("\n");

  return `Write a formal RFP response for project "${ctx.projectName}".

PROPOSED SOLUTION SUMMARY:
- Hardware: ${ctx.hardware}
- GPU count: ${ctx.totalGpus}
- Inference server: ${ctx.inferenceServer}
- Replicas: ${ctx.replicas}
- TTFT: ~${ctx.ttftMs.toFixed(0)} ms
- End-to-end P95 latency: ~${ctx.endToEndMs.toFixed(0)} ms
- Deployment pattern: ${ctx.deploymentPattern}

MANDATORY REQUIREMENTS TO ADDRESS:
${mandatoryReqs || "None specified"}

ALL REQUIREMENTS:
${allReqs}

RFP SUMMARY:
${ctx.rfpSummary}

Write sections:
1. Executive Summary (2-3 paragraphs)
2. Hardware Architecture
3. Inference Platform
4. Infrastructure & Operations
5. Application Integration
6. Compliance & Security
7. Next Steps

Be specific and reference the requirements. Use the solution summary numbers directly.`;
}
