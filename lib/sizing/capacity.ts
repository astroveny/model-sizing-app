// Ref: docs/sizing-math.md §6 — replica and totals calculation
// Ref: [4] Kwon et al. 2023 — throughput-driven capacity planning

import type { SizingInput, ShardingResult, OptimizationsResult, PatternResult, CapacityResult } from "./types";
import { resolveServer } from "./catalog";

/**
 * Number of replicas required to meet end-to-end throughput target.
 *
 * Required output token throughput = concurrentUsers × avgOutputTokens / targetEndToEndSec
 * Replicas = ceil(required_tps / tpsPerReplica) × burstMultiplier
 * Ref: docs/sizing-math.md §6.1
 */
export function computeCapacity(
  input: SizingInput,
  sharding: ShardingResult,
  optimizations: OptimizationsResult,
  pattern: PatternResult
): CapacityResult {
  const targetEndToEndSec = input.targetEndToEndMs / 1000;

  // Required aggregate output token throughput
  const requiredTps =
    (input.concurrentUsers * input.avgOutputTokens) / targetEndToEndSec;

  const tpsPerReplica = optimizations.adjustedDecodeTokensPerSecPerReplica;
  const baseReplicas = tpsPerReplica > 0 ? Math.ceil(requiredTps / tpsPerReplica) : 1;

  // Apply burst multiplier and pattern overhead
  const replicas = Math.max(
    1,
    Math.ceil(baseReplicas * input.peakBurstMultiplier * pattern.overheadMultiplier)
  );

  const gpusPerReplica = sharding.gpusPerReplica;
  const totalGpus = replicas * gpusPerReplica;

  // Server sizing — respect preferredServerId if GPU-compatible
  const { server } = resolveServer(input.gpu.id, input.preferredServerId);
  const gpusPerServer = server?.max_gpus ?? 8;
  const serverCount = Math.ceil(totalGpus / gpusPerServer);
  const rackUnitsPerServer = server?.rack_units ?? 4;
  const rackUnits = serverCount * rackUnitsPerServer;

  // Power: GPU TDP × totalGpus, converted to kW, +20% for infra overhead
  const gpuTdpKw = (input.gpu.tdp_watts * totalGpus) / 1000;
  const powerKw = gpuTdpKw * 1.2;

  // Capex estimate: GPU list price × totalGpus + server chassis cost
  const gpuUnitPrice = input.gpu.list_price_usd ?? 0;
  const serverUnitPrice = server?.list_price_usd ?? 0;
  const capexUsd = gpuUnitPrice * totalGpus + serverUnitPrice * serverCount;

  return {
    replicas,
    totalGpus,
    serverCount,
    rackUnits,
    powerKw,
    capexUsd,
  };
}
