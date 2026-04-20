export const PROMPT_VERSION = "explain-field-v1";

export const EXPLAIN_FIELD_SYSTEM = `You are an ML infrastructure expert helping a sales engineer explain \
technical concepts to a customer. Given a form field name and project context, write a concise, \
customer-tailored explanation (2-4 sentences) and a concrete example relevant to their use case. \
Respond with valid JSON matching exactly: {"explain": "...", "example": "..."}`;

export type ExplainFieldContext = {
  fieldId: string;
  fieldLabel: string;
  projectName: string;
  customer: string;
  modelName: string;
  concurrentUsers: number;
  deploymentPattern: string;
};

export function buildExplainFieldPrompt(ctx: ExplainFieldContext): string {
  return `Field: ${ctx.fieldLabel} (id: ${ctx.fieldId})

Project context:
- Customer: ${ctx.customer || "unknown"}
- Project: ${ctx.projectName}
- Model: ${ctx.modelName || "unknown"}
- Concurrent users: ${ctx.concurrentUsers || "unknown"}
- Deployment pattern: ${ctx.deploymentPattern}

Write a 2-4 sentence explanation of this field tailored to this customer's use case, \
then a concrete example specific to their scenario. Return JSON: {"explain": "...", "example": "..."}`;
}
