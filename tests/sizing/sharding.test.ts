/**
 * P8.1 — Interconnect preference bug — reproduce
 * When Discovery sets hardware.networking to a RoCE fabric, the sizing engine
 * must not silently overwrite interNode with 'infiniband-400g'. Either it
 * preserves the user's choice, or it flags an engine note if the choice is
 * undersized — but it never silently replaces it.
 */

import { describe, it, expect } from "vitest";
import { computeSharding } from "@/lib/sizing/sharding";
import { computeMemory } from "@/lib/sizing/memory";
import { getGpuById } from "@/lib/sizing/catalog";
import type { SizingInput, Gpu } from "@/lib/sizing/types";

function gpu(id: string): Gpu {
  const g = getGpuById(id);
  if (!g) throw new Error(`GPU not found: ${id}`);
  return g;
}

// Llama 405B on H100-SXM — requires PP > 1, so inter-node fabric kicks in
const INPUT_405B_ROCE: SizingInput = {
  paramsB: 405,
  activeParamsB: 405,
  numLayers: 126,
  numKvHeads: 8,
  headDim: 128,
  architecture: "dense",
  quantization: "fp16",
  contextLength: 4096,
  avgInputTokens: 512,
  avgOutputTokens: 256,
  concurrentUsers: 10,
  targetEndToEndMs: 30000,
  peakBurstMultiplier: 1.5,
  gpu: gpu("h100-sxm"),
  fp8KvCache: false,
  speculativeDecoding: false,
  prefixCaching: false,
  continuousBatching: true,
  flashAttention: false,
  chunkedPrefill: false,
  deploymentPattern: "internal-inference",
  // User has specified RoCE as their networking preference
  networkingPreference: "roce-100g",
};

describe("P8.1 — Interconnect preference bug", () => {
  const memory = computeMemory(INPUT_405B_ROCE);
  const sharding = computeSharding(INPUT_405B_ROCE, memory);

  it("405B on H100 requires PP > 1 (confirms multi-node path is taken)", () => {
    expect(sharding.pipelineParallelism).toBeGreaterThan(1);
  });

  it("interNode should NOT be silently overwritten with infiniband-400g when user chose RoCE", () => {
    // BUG: currently this will be 'infiniband-400g' regardless of user preference
    expect(sharding.interconnectRecommendation.interNode).not.toBe("infiniband-400g");
  });

  it("when user choice is preserved, engine note warns if undersized", () => {
    // After fix: either interNode === 'roce-100g' and a note warns about bandwidth,
    // or the logic rejects it with a clear note. Either way a note must exist.
    const hasNote = sharding.notes.some(
      (n) => n.toLowerCase().includes("roce") || n.toLowerCase().includes("inter-node")
    );
    expect(hasNote).toBe(true);
  });
});
