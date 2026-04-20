import type { Project } from "@/lib/store";
import type { BomExport } from "./bom-schema";
import { BOM_SCHEMA_VERSION } from "./bom-schema";
import { buildBom } from "@/lib/sizing/bom";
import { computeSizing } from "@/lib/sizing/index";
import { getGpuById, modelCatalog } from "@/lib/sizing/catalog";
import type { SizingInput } from "@/lib/sizing/types";

function toSizingInput(project: Project): SizingInput | null {
  const { discovery } = project;
  const { model, load, hardware, modelPlatform } = discovery;
  if (!model.params || !load.concurrentUsers) return null;

  let gpuId = hardware.preferredGpu ?? (hardware.preferredVendor === "amd" ? "mi300x" : "h100-sxm");
  const gpu = getGpuById(gpuId) ?? getGpuById("h100-sxm");
  if (!gpu) return null;

  const catalogMatch = modelCatalog.reduce<typeof modelCatalog[0] | null>((best, m) =>
    !best || Math.abs(m.params_b - model.params) < Math.abs(best.params_b - model.params) ? m : best, null);

  const numLayers  = catalogMatch?.layers       ?? 80;
  const numKvHeads = catalogMatch?.num_kv_heads ?? 8;
  const headDim    = catalogMatch?.head_dim     ?? 128;

  return {
    paramsB: model.params,
    activeParamsB: model.architecture === "moe" && model.moeActiveParams ? model.moeActiveParams : model.params,
    numLayers, numKvHeads, headDim,
    architecture: model.architecture,
    quantization: model.quantization.toLowerCase(),
    contextLength: model.contextLength,
    avgInputTokens:  load.avgInputTokens  || 512,
    avgOutputTokens: load.avgOutputTokens || 256,
    concurrentUsers: load.concurrentUsers,
    targetEndToEndMs: load.targetLatencyP95Ms || 8000,
    peakBurstMultiplier: load.peakBurstMultiplier || 1.5,
    gpu,
    fp8KvCache:         modelPlatform.optimizations.fp8KvCache,
    speculativeDecoding: modelPlatform.optimizations.speculativeDecoding,
    prefixCaching:       modelPlatform.optimizations.prefixCaching,
    continuousBatching:  modelPlatform.optimizations.continuousBatching,
    flashAttention:      modelPlatform.optimizations.flashAttention,
    chunkedPrefill:      modelPlatform.optimizations.chunkedPrefill,
    deploymentPattern: project.deploymentPattern === "gpuaas-multi-tenant" ? "gpuaas"
      : project.deploymentPattern === "saas-product" ? "saas"
      : project.deploymentPattern === "external-api" ? "external-api"
      : "internal-tool",
  };
}

export function buildBomExport(project: Project): BomExport {
  const input = toSizingInput(project);
  let items: BomExport["items"] = [];
  let sizing: BomExport["sizing"] | undefined;

  if (input) {
    const result = computeSizing(input);
    const bomItems = buildBom(input, result.capacity);
    items = bomItems.map((item) => ({
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      unitPriceUsd: item.unitPriceUsd,
      totalPriceUsd: item.totalPriceUsd,
      vendor: item.vendor,
      notes: item.notes,
    }));
    sizing = {
      totalGpus:    result.capacity.totalGpus,
      serverCount:  result.capacity.serverCount,
      replicas:     result.capacity.replicas,
      powerKw:      result.capacity.powerKw,
      rackUnits:    result.capacity.rackUnits,
      ttftMs:       result.optimizations.adjustedTtftMs,
      itlMs:        result.optimizations.adjustedItlMs,
      endToEndMs:   result.endToEndMs,
      gpuModel:     input.gpu.model,
      inferenceServer: project.discovery.modelPlatform.inferenceServer,
    };
  }

  const capexUsd = items.reduce((sum, i) => sum + (i.totalPriceUsd ?? 0), 0);

  return {
    schemaVersion: BOM_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    project: {
      id:          project.id,
      name:        project.name,
      customer:    project.customer,
      description: project.description,
    },
    sizing,
    items,
    totals: { itemCount: items.length, capexUsd },
  };
}
