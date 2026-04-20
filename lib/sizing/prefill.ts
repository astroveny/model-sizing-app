// Ref: [1] Kaplan et al. 2020 — 2 FLOPs/param/token forward pass rule
// Ref: [5] NVIDIA Blog — MFU guidance
// Ref: [11] MLPerf Inference — published MFU numbers

import type { SizingInput, PrefillResult, ShardingResult } from "./types";

/** Default Model FLOPs Utilization — conservative H100/MI300X baseline */
const DEFAULT_MFU = 0.40;

/** FP8 kernel maturity penalty vs FP16 */
const FP8_MFU_FACTOR = 0.90;
const INT8_MFU_FACTOR = 0.85;
const INT4_MFU_FACTOR = 0.85;

function effectiveTflops(input: SizingInput, tp: number): number {
  const quant = input.quantization.toLowerCase();
  let peakTflops: number;

  if (quant === "fp8" && input.gpu.fp8_tflops) {
    peakTflops = input.gpu.fp8_tflops * FP8_MFU_FACTOR;
  } else if ((quant === "int8" || quant === "int4") && input.gpu.int8_tops) {
    const factor = quant === "int4" ? 2 : 1; // INT4 typically doubles INT8
    peakTflops = input.gpu.int8_tops * factor * INT8_MFU_FACTOR;
  } else {
    peakTflops = input.gpu.fp16_tflops;
  }

  // FlashAttention-3 MFU boost on supported GPUs
  const faBoost = input.flashAttention && input.gpu.supported_features.includes("flash-attention-3")
    ? 0.05
    : 0;

  return peakTflops * (DEFAULT_MFU + faBoost) * tp;
}

/**
 * Prefill TTFT calculator.
 * prefill_flops = 2 × active_params × input_tokens  (Ref: [1] §3.1)
 * ttft = prefill_flops / (effective_tflops × 1e12)
 */
export function computePrefill(
  input: SizingInput,
  sharding: ShardingResult
): PrefillResult {
  // Use active_params for MoE (compute-bound), total for dense
  const computeParamsB = input.architecture === "moe"
    ? input.activeParamsB
    : input.paramsB;

  // Ref: [1] — 2 FLOPs/param/token for decoder-only forward pass
  const prefillFlops = 2 * computeParamsB * 1e9 * input.avgInputTokens;

  const mfu = DEFAULT_MFU +
    (input.flashAttention && input.gpu.supported_features.includes("flash-attention-3") ? 0.05 : 0);

  const effectiveTflopsVal = effectiveTflops(input, sharding.tensorParallelism);
  const ttftSec = prefillFlops / (effectiveTflopsVal * 1e12);
  const ttftMs = ttftSec * 1000;

  const confidence: PrefillResult["confidence"] =
    input.gpu.fp8_tflops ? "high" : "medium";

  return {
    prefillFlops,
    ttftMs,
    mfu,
    confidence,
  };
}
