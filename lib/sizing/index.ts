// Ref: PRD §7.1 — sizing engine orchestration
// Ref: docs/sizing-math.md §1 (pipeline order)

import type { SizingInput, SizingEngineResult } from "./types";
import { computeMemory } from "./memory";
import { computeSharding } from "./sharding";
import { computePrefill } from "./prefill";
import { computeDecode } from "./decode";
import { applyOptimizations } from "./optimizations";
import { applyDeploymentPattern } from "./patterns";
import { computeCapacity } from "./capacity";
import { generateNotes } from "./notes";
import { resolveServer } from "./catalog";

/**
 * Full sizing pipeline: memory → sharding → prefill → decode →
 * optimizations → patterns → capacity → notes.
 *
 * All functions are pure; no I/O, no randomness.
 * Ref: PRD §7.1
 */
export function computeSizing(input: SizingInput): SizingEngineResult {
  const memory = computeMemory(input);
  const sharding = computeSharding(input, memory);
  const prefill = computePrefill(input, sharding);
  const decode = computeDecode(input, sharding);
  const optimizations = applyOptimizations(input, memory, prefill, decode);
  const pattern = applyDeploymentPattern(input);
  const capacity = computeCapacity(input, sharding, optimizations, pattern);

  const engineNotes = generateNotes(input, memory, sharding, prefill, decode, optimizations, capacity);
  const { incompatibilityNote } = resolveServer(input.gpu.id, input.preferredServerId);
  const noteMessages = [
    ...(incompatibilityNote ? [`[WARNING] ${incompatibilityNote}`] : []),
    ...engineNotes.map((n) => `[${n.category.toUpperCase()}] ${n.message}`),
    ...pattern.notes,
  ];

  // End-to-end latency: TTFT + ITL × output tokens
  const endToEndMs =
    optimizations.adjustedTtftMs + optimizations.adjustedItlMs * input.avgOutputTokens;

  // Overall confidence: min of prefill/decode confidences
  const confidenceRank: Record<string, number> = { high: 2, medium: 1, low: 0 };
  const minConfidence =
    confidenceRank[prefill.confidence] <= confidenceRank[decode.confidence]
      ? prefill.confidence
      : decode.confidence;

  return {
    memory,
    sharding,
    prefill,
    decode,
    optimizations,
    capacity,
    endToEndMs,
    notes: noteMessages,
    confidence: minConfidence,
  };
}
