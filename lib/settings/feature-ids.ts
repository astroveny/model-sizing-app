// Client-safe constants — no DB imports. Used by both server routing logic and client components.

export type LlmFeatureId =
  | "rfp-extract"
  | "rfi-draft-response"
  | "explain-field"
  | "explain-sizing"
  | "build-report-summary"
  | "quick-sizing-assist";

export const ALL_FEATURES: LlmFeatureId[] = [
  "rfp-extract",
  "rfi-draft-response",
  "explain-field",
  "explain-sizing",
  "build-report-summary",
  "quick-sizing-assist",
];

export const FEATURE_LABELS: Record<LlmFeatureId, string> = {
  "rfp-extract": "RFP Extraction",
  "rfi-draft-response": "RFI Draft Response",
  "explain-field": "Explain Field (Ask Claude)",
  "explain-sizing": "Explain Sizing (Why this choice?)",
  "build-report-summary": "Build Report Summary",
  "quick-sizing-assist": "Quick Sizing Assist",
};
