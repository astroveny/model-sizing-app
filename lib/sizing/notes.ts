// Ref: PRD §6.3 — engine notes surfaced in the Build section

import type {
  SizingInput,
  MemoryResult,
  ShardingResult,
  PrefillResult,
  DecodeResult,
  OptimizationsResult,
  CapacityResult,
} from "./types";
import type { CatalogSnapshot } from "./catalog";

/**
 * Generates human-readable sizing notes for the Build section.
 * Each note has a category and message.
 */
export type EngineNote = {
  category: "info" | "warning" | "recommendation";
  message: string;
};

export function generateNotes(
  input: SizingInput,
  memory: MemoryResult,
  sharding: ShardingResult,
  prefill: PrefillResult,
  decode: DecodeResult,
  optimizations: OptimizationsResult,
  capacity: CapacityResult,
  catalog?: CatalogSnapshot
): EngineNote[] {
  const notes: EngineNote[] = [];

  // --- Sharding notes ---
  for (const msg of sharding.notes) {
    notes.push({ category: "info", message: msg });
  }

  // --- Latency vs target ---
  const estimatedEndToEndMs = optimizations.adjustedTtftMs + optimizations.adjustedItlMs * input.avgOutputTokens;
  if (estimatedEndToEndMs > input.targetEndToEndMs) {
    notes.push({
      category: "warning",
      message:
        `Estimated end-to-end latency (~${estimatedEndToEndMs.toFixed(0)} ms) exceeds target ` +
        `(${input.targetEndToEndMs} ms). Consider increasing TP, enabling FlashAttention-3, or reducing context length.`,
    });
  } else {
    notes.push({
      category: "info",
      message:
        `Estimated end-to-end latency ~${estimatedEndToEndMs.toFixed(0)} ms — within target of ${input.targetEndToEndMs} ms.`,
    });
  }

  // --- FP8 KV cache recommendation ---
  if (!input.fp8KvCache && memory.kvCacheTotalGb > memory.vramModelGb * 0.5) {
    notes.push({
      category: "recommendation",
      message:
        `KV cache (${memory.kvCacheTotalGb.toFixed(1)} GB) is >50% of model weight size. ` +
        `Enabling FP8 KV cache would halve this, potentially reducing GPU count.`,
    });
  }

  // --- Speculative decoding recommendation ---
  if (!input.speculativeDecoding && decode.itlMs > 20) {
    notes.push({
      category: "recommendation",
      message:
        `ITL is ${decode.itlMs.toFixed(1)} ms. Speculative decoding (e.g., Medusa or Eagle) ` +
        `could improve throughput by ~1.6× if a suitable draft model is available.`,
    });
  }

  // --- MI300X alternative ---
  if (catalog && input.gpu.vendor === "nvidia" && sharding.tensorParallelism >= 4) {
    const mi300x = catalog.getGpuById("mi300x");
    if (mi300x) {
      const mi300xMinGpus = Math.ceil(memory.vramTotalGb / mi300x.vram_gb);
      if (mi300xMinGpus < sharding.gpusPerReplica) {
        notes.push({
          category: "recommendation",
          message:
            `MI300X (192 GB VRAM) would require ${mi300xMinGpus} GPU(s) per replica vs ` +
            `${sharding.gpusPerReplica} with ${input.gpu.model}. Consider AMD for lower GPU count.`,
        });
      }
    }
  }

  // --- Decode confidence warning ---
  if (decode.confidence === "low") {
    notes.push({
      category: "warning",
      message:
        `Decode throughput is analytically estimated (no empirical data for ${input.gpu.model} at this model size). ` +
        `Treat ITL and replica count as directional only.`,
    });
  }

  // --- High replica count ---
  if (capacity.replicas > 8) {
    notes.push({
      category: "info",
      message:
        `${capacity.replicas} replicas required. At this scale, consider a distributed KV cache ` +
        `(e.g., LMCache or Mooncake) to share prompt cache across replicas.`,
    });
  }

  // --- Optimizations notes ---
  for (const msg of optimizations.notes) {
    notes.push({ category: "info", message: msg });
  }

  return notes;
}
