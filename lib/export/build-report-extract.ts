// Ref: PRD §6.4 (revised) — Build Report data extractor

import type { Project } from "@/lib/store";
import type { SizingInput } from "@/lib/sizing/types";
import { computeSizing } from "@/lib/sizing/index";
import { buildBom } from "@/lib/sizing/bom";
import type { CatalogSnapshot } from "@/lib/sizing/catalog";
import {
  BUILD_REPORT_VERSION,
  type BuildReport,
  type BuildReportAssumption,
  type BuildReportBomRow,
} from "./build-report-spec";

const BOM_PRICE_PREFIX = "bom:price:";

function toSizingInput(project: Project, catalog: CatalogSnapshot): SizingInput | null {
  const { discovery } = project;
  const { model, load, hardware, modelPlatform } = discovery;
  if (!model.params || !load.concurrentUsers) return null;

  const gpuId = hardware.preferredGpu ?? (hardware.preferredVendor === "amd" ? "mi300x" : "h100-sxm");
  const gpu = catalog.getGpuById(gpuId) ?? catalog.getGpuById("h100-sxm");
  if (!gpu) return null;

  const catalogMatch = catalog.modelCatalog.reduce<typeof catalog.modelCatalog[0] | null>(
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
    preferredServerId: hardware.preferredServer ?? undefined,
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

export function extractBuildReport(project: Project, catalog: CatalogSnapshot): BuildReport | null {
  const input = toSizingInput(project, catalog);
  if (!input) return null;

  const sizing = computeSizing(input, catalog);
  const bomItems = buildBom(input, sizing.capacity, catalog);

  type BomPatch = { name?: string; vendor?: string; unitPriceUsd?: number; totalPriceUsd?: number; notes?: string };
  const bomOverrides = (project.build.bomOverrides ?? {}) as Record<string, BomPatch>;

  const legacyPrices: Record<string, number> = {};
  for (const [k, v] of Object.entries(project.build.overrides as Record<string, unknown>)) {
    if (k.startsWith(BOM_PRICE_PREFIX) && typeof v === "number") {
      legacyPrices[k.slice(BOM_PRICE_PREFIX.length)] = v;
    }
  }

  const hasOverrides = Object.keys(bomOverrides).length > 0 || Object.keys(legacyPrices).length > 0;

  const bom: BuildReportBomRow[] = bomItems.map((item) => {
    const key = `${item.category}:${item.name}`;
    const patch = bomOverrides[key];
    const legacyPrice = legacyPrices[item.name];

    if (patch && Object.keys(patch).length > 0) {
      const merged = { ...item, ...patch };
      if (patch.unitPriceUsd !== undefined && !patch.totalPriceUsd) {
        merged.totalPriceUsd = patch.unitPriceUsd * item.quantity;
      }
      return { category: merged.category, name: merged.name, quantity: item.quantity, unitPriceUsd: merged.unitPriceUsd, totalPriceUsd: merged.totalPriceUsd, vendor: merged.vendor, overridden: true };
    }
    if (legacyPrice !== undefined) {
      return { category: item.category, name: item.name, quantity: item.quantity, unitPriceUsd: legacyPrice, totalPriceUsd: legacyPrice * item.quantity, vendor: item.vendor, overridden: true };
    }
    return { category: item.category, name: item.name, quantity: item.quantity, unitPriceUsd: item.unitPriceUsd, totalPriceUsd: item.totalPriceUsd, vendor: item.vendor, overridden: false };
  });

  const capexUsd = bom.reduce((s, r) => s + (r.totalPriceUsd ?? 0), 0);

  const { discovery } = project;
  const { infra, modelPlatform: mp, application: app } = discovery;

  const { server } = catalog.resolveServer(input.gpu.id, input.preferredServerId);
  const gpusPerServer = server?.max_gpus ?? sizing.sharding.gpusPerReplica;
  const endToEndMs = sizing.optimizations.adjustedTtftMs + sizing.optimizations.adjustedItlMs * input.avgOutputTokens;

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
      gpuModel:          input.gpu.model,
      gpuCount:          sizing.capacity.totalGpus,
      vramPerGpuGb:      input.gpu.vram_gb,
      serverModel:       server?.model ?? "Best-match server",
      serverCount:       sizing.capacity.serverCount,
      gpusPerServer,
      networkFabric:     sizing.sharding.interconnectRecommendation.interNode,
      storageType:       "nvme",
      storageCapacityTb: Math.ceil(sizing.capacity.serverCount * 15),
    },

    infra: {
      orchestrator: infra.orchestrator,
      loadBalancer: infra.orchestrator === "kubernetes" ? "K8s Service + Ingress" : "Native LB",
      airGapped:    infra.airGapped,
      gitops:       infra.gitops && infra.gitops !== "none" ? infra.gitops : "Not configured",
      monitoring:   infra.observability,
    },

    modelPlatform: {
      inferenceServer:     mp.inferenceServer,
      replicas:            sizing.capacity.replicas,
      tensorParallelism:   sizing.sharding.tensorParallelism,
      pipelineParallelism: sizing.sharding.pipelineParallelism,
      expertParallelism:   sizing.sharding.expertParallelism,
      kvCacheGb:           sizing.optimizations.adjustedKvCacheTotalGb,
      maxBatchSize:        input.concurrentUsers,
      ttftMs:              sizing.optimizations.adjustedTtftMs,
      itlMs:               sizing.optimizations.adjustedItlMs,
      endToEndMs,
      decodeTokensPerSec:  sizing.optimizations.adjustedDecodeTokensPerSecPerReplica,
      intraNodeFabric:     sizing.sharding.interconnectRecommendation.intraNode,
      interNodeFabric:     sizing.sharding.interconnectRecommendation.interNode,
    },

    application: {
      gateway:      app.apiGateway,
      authMethod:   app.auth,
      rateLimitRps: discovery.load.requestsPerSecond || 0,
      metering:     app.metering,
    },

    assumptions: buildAssumptions(input, project),

    bom,

    engineNotes: sizing.notes,

    hasOverrides,
  };
}
