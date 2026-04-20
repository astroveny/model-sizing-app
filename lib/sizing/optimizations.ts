// Ref: [6] vLLM docs — speculative decoding; prefix caching
// Ref: [4] Kwon et al. 2023 — PagedAttention / FP8 KV cache

import type { SizingInput, MemoryResult, DecodeResult, PrefillResult, OptimizationsResult } from "./types";

/**
 * Speculative decoding: typical 1.5–2× decode throughput boost.
 * Conservative 1.6× to account for draft mismatch rate.
 * Ref: [6]
 */
const SPEC_DECODE_THROUGHPUT_FACTOR = 1.6;

/**
 * Prefix caching hit rate assumption for repetitive workloads.
 * Reduces effective prefill FLOPS by this fraction of avg input tokens.
 */
const PREFIX_CACHE_HIT_RATE = 0.40;

/**
 * Chunked prefill reduces head-of-line blocking; conservative 10% TTFT improvement
 * for long-context workloads only (avgInputTokens > 1000).
 */
const CHUNKED_PREFILL_TTFT_FACTOR = 0.90;

export function applyOptimizations(
  input: SizingInput,
  memory: MemoryResult,
  prefill: PrefillResult,
  decode: DecodeResult
): OptimizationsResult {
  let adjustedKvCacheTotalGb = memory.kvCacheTotalGb;
  let adjustedTtftMs = prefill.ttftMs;
  let adjustedItlMs = decode.itlMs;
  let adjustedDecodeTokensPerSecPerReplica = decode.decodeTokensPerSecPerReplica;
  const notes: string[] = [];

  // FP8 KV cache halves KV VRAM (bytes_kv: 2→1)
  // Already factored into memory.ts when fp8KvCache=true; no double-adjustment needed.
  // We just note it.
  if (input.fp8KvCache) {
    notes.push("FP8 KV cache is enabled — KV VRAM is halved vs BF16 baseline.");
  }

  // Speculative decoding boosts decode throughput
  if (input.speculativeDecoding) {
    adjustedDecodeTokensPerSecPerReplica *= SPEC_DECODE_THROUGHPUT_FACTOR;
    adjustedItlMs = adjustedItlMs / SPEC_DECODE_THROUGHPUT_FACTOR;
    notes.push(
      `Speculative decoding applied: ~${SPEC_DECODE_THROUGHPUT_FACTOR}× decode throughput boost (draft model assumed in-memory).`
    );
  }

  // Prefix caching: fraction of prefill work saved
  if (input.prefixCaching) {
    const savedFraction = PREFIX_CACHE_HIT_RATE;
    adjustedTtftMs = adjustedTtftMs * (1 - savedFraction);
    notes.push(
      `Prefix caching: assumed ${(savedFraction * 100).toFixed(0)}% hit rate → TTFT reduced proportionally.`
    );
  }

  // Chunked prefill: TTFT improvement for long inputs
  if (input.chunkedPrefill && input.avgInputTokens > 1000) {
    adjustedTtftMs = adjustedTtftMs * CHUNKED_PREFILL_TTFT_FACTOR;
    notes.push("Chunked prefill: ~10% TTFT improvement for long-context input.");
  }

  // Continuous batching is always on in vLLM/TRT-LLM; noted, no separate multiplier
  if (input.continuousBatching) {
    notes.push("Continuous batching is enabled — throughput capacity calculation assumes dynamic batching.");
  }

  return {
    adjustedKvCacheTotalGb,
    adjustedTtftMs,
    adjustedItlMs,
    adjustedDecodeTokensPerSecPerReplica,
    notes,
  };
}
