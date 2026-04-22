// Ref: PRD §6.4 (revised) — Build Report content spec

export const BUILD_REPORT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export type BuildReportAssumption = {
  label: string;
  value: string | number;
  source: "derived" | "override" | "default";
};

export type BuildReportBomRow = {
  category: string;
  name: string;
  quantity: number;
  unitPriceUsd?: number;
  totalPriceUsd?: number;
  vendor?: string;
  overridden?: boolean;
};

export type BuildReportHardware = {
  gpuModel: string;
  gpuCount: number;
  vramPerGpuGb: number;
  serverModel: string;
  serverCount: number;
  gpusPerServer: number;
  networkFabric: string;
  storageType: string;
  storageCapacityTb: number;
};

export type BuildReportInfra = {
  orchestrator: string;
  // TODO: restore when node pool rendering is fixed
  loadBalancer: string;
  airGapped: boolean;
  gitops: string;
  monitoring: string[];
};

export type BuildReportModelPlatform = {
  inferenceServer: string;
  replicas: number;
  tensorParallelism: number;
  pipelineParallelism: number;
  expertParallelism: number;
  kvCacheGb: number;
  maxBatchSize: number;
  ttftMs: number;
  itlMs: number;
  endToEndMs: number;
  decodeTokensPerSec: number;
  intraNodeFabric: string;
  interNodeFabric: string;
};

export type BuildReportApplication = {
  gateway: string;
  authMethod: string;
  rateLimitRps: number;
  metering: boolean;
};

export type BuildReportTotals = {
  totalGpus: number;
  serverCount: number;
  powerKw: number;
  rackUnits: number;
  replicas: number;
  capexUsd: number;
  opexMonthlyUsd: number;
};

// ---------------------------------------------------------------------------
// Root type
// ---------------------------------------------------------------------------

export type BuildReport = {
  version: string;
  generatedAt: string;                 // ISO-8601

  // Cover
  project: {
    id: string;
    name: string;
    customer?: string;
    description?: string;
    deploymentPattern: string;
  };

  // Summary totals (top of report)
  totals: BuildReportTotals;

  // Per-layer panels
  hardware: BuildReportHardware;
  infra: BuildReportInfra;
  modelPlatform: BuildReportModelPlatform;
  application: BuildReportApplication;

  // Assumptions used during sizing
  assumptions: BuildReportAssumption[];

  // Bill of Materials
  bom: BuildReportBomRow[];

  // Engine notes (warnings, recommendations)
  engineNotes: string[];

  // Whether any field was manually overridden
  hasOverrides: boolean;
};

// ---------------------------------------------------------------------------
// Fixture example (used in tests and as documentation)
// ---------------------------------------------------------------------------

export const BUILD_REPORT_FIXTURE: BuildReport = {
  version: BUILD_REPORT_VERSION,
  generatedAt: "2026-04-22T09:00:00.000Z",
  project: {
    id: "fixture-001",
    name: "Acme LLM Platform",
    customer: "Acme Corp",
    description: "Internal GenAI inference platform for Llama 3.1 70B",
    deploymentPattern: "internal-tool",
  },
  totals: {
    totalGpus: 8,
    serverCount: 1,
    powerKw: 10.2,
    rackUnits: 10,
    replicas: 2,
    capexUsd: 350000,
    opexMonthlyUsd: 0,
  },
  hardware: {
    gpuModel: "H100 SXM5",
    gpuCount: 8,
    vramPerGpuGb: 80,
    serverModel: "DGX H100",
    serverCount: 1,
    gpusPerServer: 8,
    networkFabric: "infiniband-400g",
    storageType: "nvme",
    storageCapacityTb: 30,
  },
  infra: {
    orchestrator: "kubernetes",
    loadBalancer: "K8s Service + Ingress",
    airGapped: false,
    gitops: "argocd",
    monitoring: ["prometheus", "grafana"],
  },
  modelPlatform: {
    inferenceServer: "vllm",
    replicas: 2,
    tensorParallelism: 4,
    pipelineParallelism: 1,
    expertParallelism: 1,
    kvCacheGb: 24,
    maxBatchSize: 256,
    ttftMs: 180,
    itlMs: 17,
    endToEndMs: 3580,
    decodeTokensPerSec: 420,
    intraNodeFabric: "nvlink",
    interNodeFabric: "infiniband-400g",
  },
  application: {
    gateway: "kong",
    authMethod: "oidc",
    rateLimitRps: 50,
    metering: false,
  },
  assumptions: [
    { label: "Quantization", value: "FP16", source: "derived" },
    { label: "Avg input tokens", value: 512, source: "derived" },
    { label: "Avg output tokens", value: 256, source: "derived" },
    { label: "Concurrent users", value: 50, source: "derived" },
    { label: "Target P95 latency (ms)", value: 8000, source: "derived" },
    { label: "Peak burst multiplier", value: 1.5, source: "default" },
    { label: "MFU", value: "0.38", source: "derived" },
    { label: "MBU", value: "0.72", source: "derived" },
    { label: "Overhead multiplier", value: "1.0×", source: "derived" },
  ],
  bom: [
    { category: "gpu",     name: "NVIDIA H100 SXM5",  quantity: 8, unitPriceUsd: 30000, totalPriceUsd: 240000, vendor: "NVIDIA" },
    { category: "server",  name: "NVIDIA DGX H100",   quantity: 1, unitPriceUsd: 350000, totalPriceUsd: 350000, vendor: "NVIDIA" },
    { category: "network", name: "InfiniBand HDR 400G Switch", quantity: 1, vendor: "NVIDIA / Mellanox" },
    { category: "storage", name: "NVMe SSD Array 30TB", quantity: 1, vendor: "OEM" },
  ],
  engineNotes: [
    "TP=4 chosen: model VRAM (140 GB) exceeds single H100 80 GB; 4 GPUs required per replica.",
    "FP16 KV cache: consider enabling FP8 KV cache to double concurrent capacity.",
    "2 replicas needed to serve 50 concurrent users at target latency.",
  ],
  hasOverrides: false,
};
