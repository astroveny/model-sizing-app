/**
 * Classification of every Discovery field (PRD §6.1 v0.4a).
 *
 * required   — must be filled before Build is accessible; no default
 * skippable  — has a sensible default via DISCOVERY_DEFAULTS; can be skipped
 * optional   — genuinely optional; no impact on Build gate
 */
export type FieldClass = "required" | "skippable" | "optional";

export const FIELD_META: Record<string, FieldClass> = {
  // Model — required core
  "model.name": "required",
  "model.params": "required",
  "model.quantization": "required",
  // Model — skippable with defaults
  "model.family": "skippable",
  "model.contextLength": "skippable",
  "model.architecture": "skippable",
  "model.moeActiveParams": "optional",

  // Load — required core
  "load.concurrentUsers": "required",
  "load.avgInputTokens": "required",
  "load.avgOutputTokens": "required",
  // Load — skippable
  "load.requestsPerSecond": "skippable",
  "load.targetLatencyP50Ms": "skippable",
  "load.targetLatencyP95Ms": "skippable",
  "load.targetTTFTMs": "skippable",
  "load.targetITLMs": "skippable",
  "load.peakBurstMultiplier": "skippable",
  "load.uptimeSla": "skippable",
  "load.streaming": "skippable",

  // Constraints — all optional
  "constraints.budgetCapex": "optional",
  "constraints.budgetOpexMonthly": "optional",
  "constraints.powerBudgetKw": "optional",
  "constraints.rackUnitsAvailable": "optional",
  "constraints.region": "optional",
  "constraints.compliance": "optional",

  // Hardware — skippable
  "hardware.preferredVendor": "skippable",
  "hardware.preferredGpu": "optional",
  "hardware.preferredServer": "optional",
  "hardware.cooling": "skippable",
  "hardware.networking": "skippable",

  // Infra — skippable
  "infra.orchestrator": "skippable",
  "infra.existingCluster": "skippable",
  "infra.airGapped": "skippable",
  "infra.gitops": "skippable",
  "infra.observability": "skippable",

  // Model Platform — skippable
  "modelPlatform.inferenceServer": "skippable",
  "modelPlatform.modelRegistry": "skippable",
  "modelPlatform.multiModelServing": "skippable",
  "modelPlatform.caching": "skippable",
  "modelPlatform.abTesting": "skippable",
  "modelPlatform.optimizations.speculativeDecoding": "skippable",
  "modelPlatform.optimizations.prefixCaching": "skippable",
  "modelPlatform.optimizations.fp8KvCache": "skippable",
  "modelPlatform.optimizations.chunkedPrefill": "skippable",
  "modelPlatform.optimizations.continuousBatching": "skippable",
  "modelPlatform.optimizations.flashAttention": "skippable",

  // Application — skippable
  "application.apiGateway": "skippable",
  "application.auth": "skippable",
  "application.rateLimiting": "skippable",
  "application.uiRequired": "skippable",
  "application.auditLogging": "skippable",
  "application.metering": "skippable",
} as const;

export const REQUIRED_FIELDS = Object.entries(FIELD_META)
  .filter(([, cls]) => cls === "required")
  .map(([id]) => id);

export const SKIPPABLE_FIELDS = Object.entries(FIELD_META)
  .filter(([, cls]) => cls === "skippable")
  .map(([id]) => id);
