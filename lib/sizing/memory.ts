// Ref: [4] Kwon et al. 2023 — PagedAttention memory management
// Ref: [7] HF "Making LLMs Go Brrr"

import type { SizingInput, MemoryResult } from "./types";

const BYTES_PER_PARAM: Record<string, number> = {
  fp32: 4,
  fp16: 2,
  bf16: 2,
  fp8: 1,
  int8: 1,
  int4: 0.5,
};

function bytesPerParam(quantization: string): number {
  return BYTES_PER_PARAM[quantization.toLowerCase()] ?? 2;
}

/**
 * Model weight VRAM in GB.
 * For MoE: uses total params (all experts must be resident).
 * Ref: [1] §2.1
 */
export function vramModelGb(paramsB: number, quantization: string): number {
  return (paramsB * 1e9 * bytesPerParam(quantization)) / 1e9;
}

/**
 * KV cache VRAM per concurrent request in GB.
 * Uses GQA-aware formula: 2 × layers × (kv_heads × head_dim) × bytes × context_length.
 * Ref: [4] §2.2; [7]
 */
export function kvCachePerRequestGb(
  numLayers: number,
  numKvHeads: number,
  headDim: number,
  contextLength: number,
  fp8KvCache: boolean
): number {
  const bytesKv = fp8KvCache ? 1 : 2; // FP8 KV halves cache size
  const bytesPerToken = 2 * numLayers * numKvHeads * headDim * bytesKv;
  return (bytesPerToken * contextLength) / 1e9;
}

/**
 * Total VRAM needed for one replica:
 *   vram_model + kv_cache_total + 15% overhead (PagedAttention; Ref: [4])
 */
export function computeMemory(input: SizingInput): MemoryResult {
  const vramModel = vramModelGb(input.paramsB, input.quantization);

  const kvPerRequest = kvCachePerRequestGb(
    input.numLayers,
    input.numKvHeads,
    input.headDim,
    input.contextLength,
    input.fp8KvCache
  );

  // PagedAttention reduces worst-case fragmentation; we size for actual concurrent load
  const kvTotal = kvPerRequest * input.concurrentUsers;

  // 15% overhead: activations, CUDA context, framework, fragmentation (Ref: [4])
  const vramOverhead = 0.15 * (vramModel + kvTotal);
  const vramTotal = vramModel + kvTotal + vramOverhead;

  return {
    vramModelGb: vramModel,
    kvCachePerRequestGb: kvPerRequest,
    kvCacheTotalGb: kvTotal,
    vramOverheadGb: vramOverhead,
    vramTotalGb: vramTotal,
  };
}
