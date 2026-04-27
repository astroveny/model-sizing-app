import { useMemo } from "react";
import { useProjectStore } from "@/lib/store";
import { computeSizing } from "@/lib/sizing/index";
import { useCatalog } from "@/lib/catalogs/client";
import type { SizingInput, SizingEngineResult } from "@/lib/sizing/types";
import type { DiscoveryState, DeploymentPattern } from "@/lib/store";
import type { ClientCatalogSnapshot } from "@/lib/catalogs/client";

function inferArchParams(paramsB: number): { numLayers: number; numKvHeads: number; headDim: number } {
  if (paramsB <= 9)   return { numLayers: 32, numKvHeads: 8, headDim: 128 };
  if (paramsB <= 16)  return { numLayers: 40, numKvHeads: 8, headDim: 128 };
  if (paramsB <= 35)  return { numLayers: 48, numKvHeads: 8, headDim: 128 };
  if (paramsB <= 80)  return { numLayers: 80, numKvHeads: 8, headDim: 128 };
  if (paramsB <= 150) return { numLayers: 56, numKvHeads: 8, headDim: 128 };
  return { numLayers: 126, numKvHeads: 8, headDim: 128 };
}

function lookupModelParams(paramsB: number, architecture: "dense" | "moe", catalog: ClientCatalogSnapshot) {
  const candidates = catalog.modelCatalog.filter((m) => m.architecture === architecture);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, m) =>
    Math.abs(m.params_b - paramsB) < Math.abs(best.params_b - paramsB) ? m : best
  );
}

function mapPattern(pattern: DeploymentPattern): string {
  const map: Record<DeploymentPattern, string> = {
    "internal-inference": "internal-tool",
    "external-api":       "external-api",
    "gpuaas-multi-tenant": "gpuaas",
    "saas-product":        "saas",
  };
  return map[pattern] ?? "internal-tool";
}

function toSizingInput(
  discovery: DiscoveryState,
  deploymentPattern: DeploymentPattern,
  catalog: ClientCatalogSnapshot
): SizingInput | null {
  const { model, load, hardware, modelPlatform } = discovery;

  if (!model.params || !load.concurrentUsers) return null;

  let gpuId = hardware.preferredGpu ?? "";
  if (!gpuId) {
    gpuId = hardware.preferredVendor === "amd" ? "mi300x" : "h100-sxm";
  }
  const gpu = catalog.getGpuById(gpuId) ?? catalog.getGpuById("h100-sxm");
  if (!gpu) return null;

  const catalogMatch = lookupModelParams(model.params, model.architecture, catalog);
  const arch = catalogMatch ?? inferArchParams(model.params);

  const paramsB = model.params;
  const activeParamsB = model.architecture === "moe" && model.moeActiveParams
    ? model.moeActiveParams
    : paramsB;

  return {
    paramsB,
    activeParamsB,
    numLayers:  "layers"      in arch ? arch.layers      : (arch as ReturnType<typeof inferArchParams>).numLayers,
    numKvHeads: "num_kv_heads" in arch ? arch.num_kv_heads : (arch as ReturnType<typeof inferArchParams>).numKvHeads,
    headDim:    "head_dim"    in arch ? arch.head_dim    : (arch as ReturnType<typeof inferArchParams>).headDim,
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
    deploymentPattern: mapPattern(deploymentPattern),
    networkingPreference: hardware.networking ?? undefined,
    preferredServerId: hardware.preferredServer ?? undefined,
  };
}

export type BuildDerivedResult = SizingEngineResult & { input: SizingInput };

export function useBuildDerived(): BuildDerivedResult | null {
  const discovery = useProjectStore((s) => s.activeProject?.discovery);
  const deploymentPattern = useProjectStore((s) => s.activeProject?.deploymentPattern);
  const catalog = useCatalog();

  return useMemo(() => {
    if (!discovery || !deploymentPattern || !catalog) return null;
    const input = toSizingInput(discovery, deploymentPattern, catalog);
    if (!input) return null;
    const result = computeSizing(input);
    return { ...result, input };
  }, [discovery, deploymentPattern, catalog]);
}
