import type { DiscoveryState } from "@/lib/store";

/**
 * Default values for every skippable Discovery field (PRD §6.1 table v0.4a).
 * Used by Quick Sizing flow and the "Use default" toggle on skippable fields.
 */
export const DISCOVERY_DEFAULTS = {
  // Model
  "model.contextLength": 4096,
  "model.architecture": "dense" as DiscoveryState["model"]["architecture"],
  "model.moeActiveParams": 0,

  // Load
  "load.requestsPerSecond": 10,
  "load.targetLatencyP50Ms": 5000,
  "load.targetLatencyP95Ms": 10000,
  "load.targetTTFTMs": 500,
  "load.targetITLMs": 50,
  "load.peakBurstMultiplier": 2,
  "load.uptimeSla": 99.9,
  "load.streaming": true,

  // Constraints (all optional)
  "constraints.budgetCapex": undefined,
  "constraints.budgetOpexMonthly": undefined,
  "constraints.powerBudgetKw": undefined,
  "constraints.rackUnitsAvailable": undefined,
  "constraints.region": undefined,
  "constraints.compliance": [] as string[],

  // Hardware
  "hardware.preferredVendor": "either" as DiscoveryState["hardware"]["preferredVendor"],
  "hardware.cooling": "either" as DiscoveryState["hardware"]["cooling"],
  "hardware.networking": "100G" as DiscoveryState["hardware"]["networking"],

  // Infra
  "infra.orchestrator": "kubernetes" as DiscoveryState["infra"]["orchestrator"],
  "infra.existingCluster": false,
  "infra.airGapped": false,
  "infra.gitops": "none" as DiscoveryState["infra"]["gitops"],
  "infra.observability": ["prometheus", "grafana"] as string[],

  // Model Platform
  "modelPlatform.inferenceServer": "vllm" as DiscoveryState["modelPlatform"]["inferenceServer"],
  "modelPlatform.modelRegistry": "huggingface" as DiscoveryState["modelPlatform"]["modelRegistry"],
  "modelPlatform.multiModelServing": false,
  "modelPlatform.caching": "none" as DiscoveryState["modelPlatform"]["caching"],
  "modelPlatform.abTesting": false,
  "modelPlatform.optimizations.speculativeDecoding": false,
  "modelPlatform.optimizations.prefixCaching": true,
  "modelPlatform.optimizations.fp8KvCache": false,
  "modelPlatform.optimizations.chunkedPrefill": true,
  "modelPlatform.optimizations.continuousBatching": true,
  "modelPlatform.optimizations.flashAttention": true,

  // Application
  "application.apiGateway": "none" as DiscoveryState["application"]["apiGateway"],
  "application.auth": "apikey" as DiscoveryState["application"]["auth"],
  "application.rateLimiting": true,
  "application.uiRequired": false,
  "application.auditLogging": true,
  "application.metering": false,
} as const satisfies Record<string, unknown>;

export type DiscoveryDefaultKey = keyof typeof DISCOVERY_DEFAULTS;
