// Ref: [2] Shoeybi et al. 2019 — Megatron-LM (TP)
// Ref: [3] Huang et al. 2018 — GPipe (PP)
// Ref: [5] NVIDIA Blog — inference optimisation

import type { SizingInput, ShardingResult, MemoryResult } from "./types";

const GPUS_PER_NODE = 8; // standard server node size

function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * TP overhead: ~8% throughput penalty per doubling of TP size.
 * Ref: [2] §5.1
 */
export function tpOverheadFactor(tp: number): number {
  return 1 - 0.08 * Math.log2(tp);
}

/**
 * PP overhead: ~5% per additional pipeline stage.
 * Ref: [3] §5.2
 */
export function ppOverheadFactor(pp: number): number {
  return 1 - 0.05 * (pp - 1);
}

function inferIntraNodeInterconnect(
  gpuInterconnect: string
): "nvlink" | "infinity-fabric" | "pcie" {
  if (gpuInterconnect.startsWith("nvlink")) return "nvlink";
  if (gpuInterconnect === "infinity-fabric") return "infinity-fabric";
  return "pcie";
}

/**
 * Sharding decision logic per §5.5 of sizing-math.md.
 * Determines TP/PP/EP and minimum GPU count per replica.
 */
export function computeSharding(
  input: SizingInput,
  memory: MemoryResult
): ShardingResult {
  const gpuVram = input.gpu.vram_gb;
  const minGpus = Math.ceil(memory.vramTotalGb / gpuVram);
  const notes: string[] = [];

  let tp: number;
  let pp: number;
  const ep = input.architecture === "moe" ? 1 : 1; // EP advanced; not auto-set in v1

  if (minGpus <= 1) {
    tp = 1;
    pp = 1;
    notes.push(`Model fits on a single ${input.gpu.model} (${gpuVram} GB VRAM needed: ${memory.vramTotalGb.toFixed(1)} GB).`);
  } else if (minGpus <= GPUS_PER_NODE) {
    tp = nextPowerOf2(minGpus);
    pp = 1;
    notes.push(
      `Model requires ${minGpus} GPUs; using TP=${tp} within one node over ${inferIntraNodeInterconnect(input.gpu.interconnect.intra_node)}.`
    );
  } else {
    // Spans multiple nodes
    tp = GPUS_PER_NODE;
    pp = Math.ceil(minGpus / GPUS_PER_NODE);
    notes.push(
      `Model requires ${minGpus} GPUs across ${pp} nodes. TP=${tp} intra-node, PP=${pp} inter-node. Requires high-bandwidth inter-node fabric.`
    );
  }

  if (input.architecture === "moe") {
    notes.push(
      "MoE model: expert parallelism (EP) not auto-configured. Consider vLLM or SGLang for EP support."
    );
  }

  const intraNode = inferIntraNodeInterconnect(input.gpu.interconnect.intra_node);

  let interNode: string = "none";
  if (pp > 1) {
    const userNet = input.networkingPreference;
    if (userNet && userNet !== "none") {
      // Honour the user's choice; warn if it may be undersized for the scale
      interNode = userNet;
      const isHighBandwidth =
        userNet.includes("infiniband") || userNet.includes("400g") || userNet.includes("800g");
      if (!isHighBandwidth) {
        notes.push(
          `[WARNING] Inter-node fabric '${userNet}' may be undersized for PP=${pp} — InfiniBand 400G or equivalent is recommended for large-model inference. Verify bandwidth requirements before deploying.`
        );
      } else {
        notes.push(
          `Inter-node: using '${userNet}' as specified in hardware preferences.`
        );
      }
    } else {
      interNode = "infiniband-400g";
      notes.push(
        "Inter-node: defaulting to InfiniBand 400G for multi-node deployment. Set a networking preference in Discovery to override."
      );
    }
  }

  // Warn if PCIe and TP > 2
  if (intraNode === "pcie" && tp > 2) {
    notes.push(
      `Warning: TP=${tp} over PCIe is not recommended — consider NVLink/Infinity Fabric GPUs or reduce TP.`
    );
  }

  return {
    tensorParallelism: tp,
    pipelineParallelism: pp,
    expertParallelism: ep,
    gpusPerReplica: tp * pp,
    interconnectRecommendation: { intraNode, interNode },
    notes,
  };
}
