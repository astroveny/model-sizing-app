// Ref: [4] Kwon et al. 2023 — batching amortises weight reads
// Ref: [8] HF — "A guide to LLM inference and performance"
// Ref: [10] vLLM docs — memory bandwidth sizing

import type { SizingInput, DecodeResult, ShardingResult } from "./types";
import { lookupThroughput, paramsToSizeBucket } from "./catalog";

/** Memory Bandwidth Utilization — achievable with vLLM/TRT-LLM on modern GPUs */
const DEFAULT_MBU = 0.70;

/**
 * Analytical ITL from memory bandwidth.
 * bytes_per_tok = (model_weights_bytes + avg_kv_bytes) / tp_gpus
 * itl = bytes_per_tok / (gpu_bw × mbu)
 * Ref: [8] §4.2
 */
function analyticalItlMs(input: SizingInput, sharding: ShardingResult): number {
  const bytesPerParam: Record<string, number> = {
    fp32: 4, fp16: 2, bf16: 2, fp8: 1, int8: 1, int4: 0.5,
  };
  const bpp = bytesPerParam[input.quantization.toLowerCase()] ?? 2;
  const bytesKv = input.fp8KvCache ? 1 : 2;

  // Weight bytes for this GPU's fraction (TP splits weights)
  const modelBytesPerGpu = (input.paramsB * 1e9 * bpp) / sharding.tensorParallelism;

  // KV bytes for avg context (half of max context as proxy for mid-decode)
  const avgContext = Math.min(input.avgInputTokens + input.avgOutputTokens / 2, input.contextLength);
  const kvBytesPerGpu =
    (2 * input.numLayers * input.numKvHeads * input.headDim * bytesKv * avgContext) /
    sharding.tensorParallelism;

  const totalBytesPerToken = modelBytesPerGpu + kvBytesPerGpu;

  // Effective BW across all TP GPUs
  const effectiveBwGbps =
    input.gpu.memory_bandwidth_gbps * DEFAULT_MBU * sharding.tensorParallelism;

  const itlSec = totalBytesPerToken / (effectiveBwGbps * 1e9);
  return itlSec * 1000;
}

/**
 * Decode calculator.
 * Prefers empirical throughput lookup; falls back to analytical estimate.
 * Ref: [4] §4, [8]
 */
export function computeDecode(
  input: SizingInput,
  sharding: ShardingResult
): DecodeResult {
  const bucket = paramsToSizeBucket(input.paramsB);
  const batchSize = Math.min(32, Math.max(1, input.concurrentUsers)) as 1 | 8 | 32;
  const nearestBatch = batchSize >= 16 ? 32 : batchSize >= 4 ? 8 : 1;

  const lookupTps = lookupThroughput(
    input.gpu.id,
    bucket,
    input.quantization,
    nearestBatch as 1 | 8 | 32
  );

  let itlMs: number;
  let tpsPerReplica: number;
  let usedLookup = false;
  let confidence: DecodeResult["confidence"] = "medium";

  if (lookupTps !== null) {
    // Empirical path: derive ITL from throughput
    tpsPerReplica = lookupTps;
    itlMs = 1000 / tpsPerReplica;
    usedLookup = true;
    confidence = "high";
  } else {
    // Analytical fallback
    itlMs = analyticalItlMs(input, sharding);
    tpsPerReplica = itlMs > 0 ? 1000 / itlMs : 1;
    confidence = "low";
  }

  return {
    itlMs,
    decodeTokensPerSecPerReplica: tpsPerReplica,
    mbu: DEFAULT_MBU,
    usedLookupTable: usedLookup,
    confidence,
  };
}
