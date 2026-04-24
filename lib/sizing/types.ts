// Ref: [1] Kaplan et al. 2020 — scaling laws; [4] Kwon et al. 2023 — PagedAttention
// Ref: [7] HF "Making LLMs Go Brrr"

// ---------------------------------------------------------------------------
// Catalog types (loaded from data/*.json)
// ---------------------------------------------------------------------------

export type Gpu = {
  id: string;
  vendor: "nvidia" | "amd" | "intel" | "google" | "aws";
  family: string;
  model: string;
  vram_gb: number;
  memory_type?: string;
  memory_bandwidth_gbps: number;
  fp32_tflops?: number;
  fp16_tflops: number;
  bf16_tflops?: number;
  fp8_tflops?: number;
  int8_tops?: number;
  int4_tops?: number;
  tdp_watts: number;
  interconnect: {
    intra_node: string;
    intra_node_bandwidth_gbps: number;
    form_factor: string;
  };
  supported_features: string[];
  list_price_usd?: number;
  availability?: "available" | "limited" | "announced";
  notes?: string;
};

export type Server = {
  id: string;
  vendor: string;
  model: string;
  max_gpus: number;
  supported_gpu_ids: string[];
  rack_units: number;
  tdp_watts: number;
  list_price_usd?: number;
  notes?: string;
};

export type CloudInstance = {
  id: string;
  provider: string;
  instance_type: string;
  gpu_id: string;
  gpu_count: number;
  vcpus: number;
  memory_gb: number;
  network_gbps?: number;
  on_demand_usd_per_hr: number;
  notes?: string;
};

export type ModelCatalogEntry = {
  id: string;
  family: string;
  name: string;
  params_b: number;
  active_params_b?: number;
  layers: number;
  hidden_size: number;
  num_heads: number;
  num_kv_heads: number;
  head_dim: number;
  architecture: "dense" | "moe";
  context_length_max: number;
  notes?: string;
};

export type ThroughputBatchRecord = {
  batch_1: number | null;
  batch_8: number | null;
  batch_32: number | null;
};

export type ThroughputTable = Record<
  string,
  Record<string, Record<string, ThroughputBatchRecord | null>>
>;

// ---------------------------------------------------------------------------
// Sizing engine input
// ---------------------------------------------------------------------------

export type SizingInput = {
  // Model
  paramsB: number;
  activeParamsB: number;        // = paramsB for dense; active params for MoE
  numLayers: number;
  numKvHeads: number;
  headDim: number;
  architecture: "dense" | "moe";
  quantization: string;         // FP16 | FP8 | INT8 | INT4 | BF16 | FP32

  // Context & load
  contextLength: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  concurrentUsers: number;
  targetEndToEndMs: number;     // P95 target
  peakBurstMultiplier: number;

  // Selected GPU
  gpu: Gpu;

  // Optimizations
  fp8KvCache: boolean;
  speculativeDecoding: boolean;
  prefixCaching: boolean;
  continuousBatching: boolean;
  flashAttention: boolean;
  chunkedPrefill: boolean;

  // Deployment
  deploymentPattern: string;

  // User networking preference (from Discovery hardware.networking).
  // When set, sharding respects it for inter-node fabric instead of defaulting
  // to infiniband-400g. An engine note is added when the preference may be
  // undersized for the required bandwidth.
  networkingPreference?: string;

  // User server preference (from Discovery hardware.preferredServer).
  // When set and GPU-compatible, the engine uses this server model for BoM
  // and capacity calculations. If incompatible, falls back to auto-select
  // and emits an engine note.
  preferredServerId?: string;
};

// ---------------------------------------------------------------------------
// Sizing engine outputs (per calculator)
// ---------------------------------------------------------------------------

export type MemoryResult = {
  vramModelGb: number;
  kvCachePerRequestGb: number;
  kvCacheTotalGb: number;
  vramOverheadGb: number;
  vramTotalGb: number;
};

export type ShardingResult = {
  tensorParallelism: number;
  pipelineParallelism: number;
  expertParallelism: number;
  gpusPerReplica: number;
  interconnectRecommendation: {
    intraNode: "nvlink" | "infinity-fabric" | "pcie";
    interNode: string; // "infiniband-400g" | "infiniband-200g" | "roce-100g" | "ethernet-100g" | "none" | user-specified
  };
  notes: string[];
};

export type PrefillResult = {
  prefillFlops: number;
  ttftMs: number;
  mfu: number;
  confidence: "high" | "medium" | "low";
};

export type DecodeResult = {
  itlMs: number;
  decodeTokensPerSecPerReplica: number;
  mbu: number;
  usedLookupTable: boolean;
  confidence: "high" | "medium" | "low";
};

export type OptimizationsResult = {
  adjustedKvCacheTotalGb: number;
  adjustedTtftMs: number;
  adjustedItlMs: number;
  adjustedDecodeTokensPerSecPerReplica: number;
  notes: string[];
};

export type PatternResult = {
  overheadMultiplier: number;
  extraSubsystems: string[];
  notes: string[];
};

export type CapacityResult = {
  replicas: number;
  totalGpus: number;
  serverCount: number;
  rackUnits: number;
  powerKw: number;
  capexUsd: number;
  opexMonthlyUsd?: number;
};

export type SizingEngineResult = {
  memory: MemoryResult;
  sharding: ShardingResult;
  prefill: PrefillResult;
  decode: DecodeResult;
  optimizations: OptimizationsResult;
  capacity: CapacityResult;
  endToEndMs: number;
  notes: string[];
  confidence: "high" | "medium" | "low";
};
