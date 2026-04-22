// Ref: PRD §6.4 (revised) — Build Report data extractor

import type { Project } from "@/lib/store";
import type { SizingInput } from "@/lib/sizing/types";
import { computeSizing } from "@/lib/sizing/index";
import { buildBom } from "@/lib/sizing/bom";
import { getGpuById, modelCatalog } from "@/lib/sizing/catalog";
import {
  BUILD_REPORT_VERSION,
  type BuildReport,
  type BuildReportAssumption,
  type BuildReportBomRow,
} from "./build-report-spec";

const BOM_PRICE_PREFIX = "bom:price:";

function toSizingInput(project: Project): SizingInput | null {
  const { discovery } = project;
  const { model, load, hardware, modelPlatform } = discovery;
  if (!model.params || !load.concurrentUsers) return null;

  const gpuId = hardware.preferredGpu ?? (hardware.preferredVendor === "amd" ? "mi300x" : "h100-sxm");
  const gpu = getGpuById(gpuId) ?? getGpuById("h100-sxm");
  if (!gpu) return null;

  const catalogMatch = modelCatalog.reduce<typeof modelCatalog[0] | null>(
    (best, m) =>
      !best || Math.abs(m.params_b - model.params) < Math.abs(best.params_b - model.params) ? m : best,
    null
  );

  return {
    paramsB: model.params,
    activeParamsB:
      model.architecture === "moe" && model.moeActiveParams ? model.moeActiveParams : model.params,
    numLayers:  catalogMatch?.layers       ?? 80,
    numKvHeads: catalogMatch?.num_kv_heads ?? 8,
    headDim:    catalogMatch?.head_dim     ?? 128,
    architecture: model.architecture,
    quantization: model.quantization.toLowerCase(),
    contextLength:       model.contextLength,
    avgInputTokens:      load.avgInputTokens  || 512,
    avgOutputTokens:     load.avgOutputTokens || 256,
    concurrentUsers:     load.concurrentUsers,
    targetEndToEndMs:    load.targetLatencyP95Ms || 8000,
    peakBurstMultiplier: load.peakBurstMultiplier || 1.5,
    gpu,
    fp8KvCache:          modelPlatform.optimizations.fp8KvCache,
    speculativeDecoding: modelPlatform.optimizations.speculativeDecoding,
    prefixCaching:       modelPlatform.optimizations.prefixCaching,
    continuousBatching:  modelPlatform.optimizations.continuousBatching,
    flashAttention:      modelPlatform.optimizations.flashAttention,
    chunkedPrefill:      modelPlatform.optimizations.chunkedPrefill,
    deploymentPattern:
      project.deploymentPattern === "gpuaas-multi-tenant" ? "gpuaas"
      : project.deploymentPattern === "saas-product" ? "saas"
      : project.deploymentPattern === "external-api" ? "external-api"
      : "internal-tool",
    networkingPreference: hardware.networking ?? undefined,
  };
}

function buildAssumptions(input: SizingInput, project: Project): BuildReportAssumption[] {
  const overrides = project.build.overrides as Record<string, unknown>;
  const hasOverride = (k: string) => k in overrides;

  return [
    { label: "Quantization",              value: input.quantization.toUpperCase(), source: "derived" },
    { label: "Avg input tokens",           value: input.avgInputTokens,            source: "derived" },
    { label: "Avg output tokens",          value: input.avgOutputTokens,           source: "derived" },
    { label: "Concurrent users",           value: input.concurrentUsers,           source: "derived" },
    { label: "Target P95 latency (ms)",    value: input.targetEndToEndMs,          source: "derived" },
    { label: "Peak burst multiplier",      value: input.peakBurstMultiplier,       source: hasOverride("peakBurstMultiplier") ? "override" : "default" },
    { label: "Context length",             value: input.contextLength,             source: "derived" },
    { label: "Architecture",              value: input.architecture,              source: "derived" },
    { label: "FP8 KV cache",             value: input.fp8KvCache ? "enabled" : "disabled", source: "derived" },
    { label: "Speculative decoding",     value: input.speculativeDecoding ? "enabled" : "disabled", source: "derived" },
    { label: "Prefix caching",           value: input.prefixCaching ? "enabled" : "disabled", source: "derived" },
    { label: "Continuous batching",      value: input.continuousBatching ? "enabled" : "disabled", source: "derived" },
  ];
}

/**
 * Pure function: extracts a complete BuildReport from a Project.
 * Returns null when Discovery is incomplete (no model params / no concurrent users).
 */
export function extractBuildReport(project: Project): BuildReport | null {
  const input = toSizingInput(project);
  if (!input) return null;

  const sizing = computeSizing(input);
  const bomItems = buildBom(input, sizing.capacity);

  // Read per-item price overrides from build.overrides
  const rawOverrides = project.build.overrides as Record<string, unknown>;
  const priceOverrides: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawOverrides)) {
    if (k.startsWith(BOM_PRICE_PREFIX) && typeof v === "number") {
      priceOverrides[k.slice(BOM_PRICE_PREFIX.length)] = v;
    }
  }

  const hasOverrides = Object.keys(rawOverrides).length > 0;

  const bom: BuildReportBomRow[] = bomItems.map((item) => {
    const override = priceOverrides[item.name];
    if (override !== undefined) {
      return {
        category: item.category,
        name: item.name,
        quantity: item.quantity,
        unitPriceUsd: override,
        totalPriceUsd: override * item.quantity,
        vendor: item.vendor,
        overridden: true,
      };
    }
    return {
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      unitPriceUsd: item.unitPriceUsd,
      totalPriceUsd: item.totalPriceUsd,
      vendor: item.vendor,
      overridden: false,
    };
  });

  const capexUsd = bom.reduce((s, r) => s + (r.totalPriceUsd ?? 0), 0);

  const { hardware: hw, infra, modelPlatform: mp, application: app } = project.build.final;

  return {
    version: BUILD_REPORT_VERSION,
    generatedAt: new Date().toISOString(),

    project: {
      id:          project.id,
      name:        project.name,
      customer:    project.customer,
      description: project.description,
      deploymentPattern: project.deploymentPattern,
    },

    totals: {
      totalGpus:      sizing.capacity.totalGpus,
      serverCount:    sizing.capacity.serverCount,
      powerKw:        sizing.capacity.powerKw,
      rackUnits:      sizing.capacity.rackUnits,
      replicas:       sizing.capacity.replicas,
      capexUsd,
      opexMonthlyUsd: sizing.capacity.opexMonthlyUsd ?? 0,
    },

    hardware: {
      gpuModel:        hw.gpu.model,
      gpuCount:        hw.gpu.count,
      vramPerGpuGb:    hw.gpu.vramPerGpuGb,
      serverModel:     hw.server.model,
      serverCount:     hw.server.count,
      gpusPerServer:   hw.server.gpusPerServer,
      networkFabric:   hw.networking.fabric,
      storageType:     hw.storage.type,
      storageCapacityTb: hw.storage.capacityTb,
    },

    infra: {
      orchestrator: infra.orchestrator,
      nodePools:    infra.nodePools,
      loadBalancer: infra.loadBalancer,
      monitoring:   infra.monitoring,
    },

    modelPlatform: {
      inferenceServer:    mp.server,
      replicas:           mp.replicas,
      tensorParallelism:  mp.tensorParallelism,
      pipelineParallelism: mp.pipelineParallelism,
      expertParallelism:  mp.expertParallelism,
      kvCacheGb:          mp.kvCacheGb,
      maxBatchSize:       mp.maxBatchSize,
      ttftMs:             mp.latencyEstimates.ttftMs,
      itlMs:              mp.latencyEstimates.itlMs,
      endToEndMs:         mp.latencyEstimates.endToEndMs,
      decodeTokensPerSec: mp.latencyEstimates.decodeTokensPerSec,
      intraNodeFabric:    mp.interconnectRecommendation.intraNode,
      interNodeFabric:    mp.interconnectRecommendation.interNode,
    },

    application: {
      gateway:       app.gateway,
      authMethod:    app.authMethod,
      rateLimitRps:  app.rateLimits.rps,
      metering:      app.metering,
    },

    assumptions: buildAssumptions(input, project),

    bom,

    engineNotes: project.build.notes ?? sizing.notes,

    hasOverrides,
  };
}
