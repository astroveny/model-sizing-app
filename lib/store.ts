import { create } from "zustand";

// ---------------------------------------------------------------------------
// Domain types (PRD §5.1)
// ---------------------------------------------------------------------------

export type Quantization = "FP32" | "FP16" | "BF16" | "FP8" | "INT8" | "INT4";
export type DeploymentPattern =
  | "internal-inference"
  | "external-api"
  | "gpuaas-multi-tenant"
  | "saas-product";
export type DeploymentTarget = "on-prem" | "cloud" | "hybrid";

export type DiscoveryState = {
  model: {
    family: string;
    name: string;
    params: number;
    quantization: Quantization;
    contextLength: number;
    architecture: "dense" | "moe";
    moeActiveParams?: number;
  };
  load: {
    concurrentUsers: number;
    requestsPerSecond: number;
    targetLatencyP50Ms: number;
    targetLatencyP95Ms: number;
    targetTTFTMs: number;
    targetITLMs: number;
    avgInputTokens: number;
    avgOutputTokens: number;
    peakBurstMultiplier: number;
    uptimeSla: number;
    streaming: boolean;
  };
  constraints: {
    budgetCapex?: number;
    budgetOpexMonthly?: number;
    powerBudgetKw?: number;
    rackUnitsAvailable?: number;
    region?: string;
    compliance: string[];
  };
  hardware: {
    preferredVendor: "nvidia" | "amd" | "either";
    preferredGpu?: string;
    cooling: "air" | "liquid" | "either";
    networking: "25G" | "100G" | "400G" | "infiniband";
  };
  infra: {
    orchestrator: "kubernetes" | "ray" | "slurm" | "nomad" | "bare-metal";
    existingCluster: boolean;
    airGapped: boolean;
    gitops?: "argocd" | "flux" | "none";
    observability: string[];
  };
  modelPlatform: {
    inferenceServer: "vllm" | "tgi" | "triton" | "tensorrt-llm" | "sglang";
    modelRegistry?: "mlflow" | "huggingface" | "s3" | "custom";
    multiModelServing: boolean;
    caching?: "redis" | "semantic" | "none";
    abTesting: boolean;
    optimizations: {
      speculativeDecoding: boolean;
      prefixCaching: boolean;
      fp8KvCache: boolean;
      chunkedPrefill: boolean;
      continuousBatching: boolean;
      flashAttention: boolean;
    };
  };
  application: {
    apiGateway: "kong" | "apisix" | "envoy" | "cloud-native" | "none";
    auth: "oidc" | "apikey" | "mtls" | "jwt" | "none";
    rateLimiting: boolean;
    uiRequired: boolean;
    auditLogging: boolean;
    metering: boolean;
  };
};

export type ExtractedRequirement = {
  id: string;
  text: string;
  layer: "hardware" | "infra" | "model-platform" | "application" | "general";
  mandatory: boolean;
  mapsToDiscoveryField?: string;
  extractedValue?: unknown;
};

export type RfiState = {
  source: "pasted" | "uploaded" | "none";
  rawText: string;
  uploadedFilePath?: string;
  extracted: {
    requirements: ExtractedRequirement[];
    timelines: { milestone: string; date?: string }[];
    evaluationCriteria: string[];
    mandatoryItems: string[];
  };
  qualification: {
    fitScore: number;
    risks: string[];
    strengths: string[];
    winProbability: "low" | "medium" | "high";
    goNoGo?: "go" | "no-go" | "undecided";
  };
  draftResponse?: string;
};

export type BuildDerived = {
  hardware: {
    gpu: { model: string; count: number; vramPerGpuGb: number };
    server: { model: string; count: number; gpusPerServer: number };
    cpu: { cores: number; memoryGb: number };
    storage: { type: "nvme" | "ssd"; capacityTb: number };
    networking: { fabric: string; linksPerNode: number };
  };
  infra: {
    orchestrator: string;
    nodePools: { role: string; nodes: number }[];
    loadBalancer: string;
    monitoring: string[];
  };
  modelPlatform: {
    server: string;
    replicas: number;
    tensorParallelism: number;
    pipelineParallelism: number;
    expertParallelism: number;
    kvCacheGb: number;
    maxBatchSize: number;
    latencyEstimates: {
      ttftMs: number;
      itlMs: number;
      endToEndMs: number;
      prefillTokensPerSec: number;
      decodeTokensPerSec: number;
    };
    interconnectRecommendation: {
      intraNode: "nvlink" | "infinity-fabric" | "pcie";
      interNode:
        | "infiniband-400g"
        | "infiniband-200g"
        | "roce-100g"
        | "ethernet-100g"
        | "none";
    };
  };
  application: {
    gateway: string;
    authMethod: string;
    rateLimits: { rps: number; burst: number };
    metering: boolean;
  };
};

export type BomItem = {
  category: "gpu" | "server" | "network" | "storage" | "software" | "service";
  name: string;
  quantity: number;
  unitPriceUsd?: number;
  totalPriceUsd?: number;
  vendor?: string;
  notes?: string;
};

export type BuildState = {
  derived: BuildDerived;
  overrides: Partial<BuildDerived>;
  final: BuildDerived;
  bom: BomItem[];
  totals: {
    gpuCount: number;
    serverCount: number;
    powerKw: number;
    rackUnits: number;
    capexUsd: number;
    opexMonthlyUsd: number;
  };
  notes: string[];
};

export type ExplainContent = {
  fieldId: string;
  explain: string;
  example: string;
  customerFriendlyHint?: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  customer: string;
  createdAt: string;
  updatedAt: string;
  workloadType: "inference";
  deploymentPattern: DeploymentPattern;
  deploymentTarget: DeploymentTarget;
  discovery: DiscoveryState;
  rfi: RfiState;
  build: BuildState;
  explainOverrides: Record<string, ExplainContent>;
};

// ---------------------------------------------------------------------------
// Default state factories
// ---------------------------------------------------------------------------

export function defaultDiscovery(): DiscoveryState {
  return {
    model: {
      family: "",
      name: "",
      params: 0,
      quantization: "FP16",
      contextLength: 4096,
      architecture: "dense",
    },
    load: {
      concurrentUsers: 0,
      requestsPerSecond: 0,
      targetLatencyP50Ms: 0,
      targetLatencyP95Ms: 0,
      targetTTFTMs: 0,
      targetITLMs: 0,
      avgInputTokens: 0,
      avgOutputTokens: 0,
      peakBurstMultiplier: 1,
      uptimeSla: 99.9,
      streaming: true,
    },
    constraints: { compliance: [] },
    hardware: {
      preferredVendor: "either",
      cooling: "either",
      networking: "100G",
    },
    infra: {
      orchestrator: "kubernetes",
      existingCluster: false,
      airGapped: false,
      observability: [],
    },
    modelPlatform: {
      inferenceServer: "vllm",
      multiModelServing: false,
      abTesting: false,
      optimizations: {
        speculativeDecoding: false,
        prefixCaching: false,
        fp8KvCache: false,
        chunkedPrefill: true,
        continuousBatching: true,
        flashAttention: true,
      },
    },
    application: {
      apiGateway: "none",
      auth: "none",
      rateLimiting: false,
      uiRequired: false,
      auditLogging: false,
      metering: false,
    },
  };
}

export function defaultBuildDerived(): BuildDerived {
  return {
    hardware: {
      gpu: { model: "", count: 0, vramPerGpuGb: 0 },
      server: { model: "", count: 0, gpusPerServer: 0 },
      cpu: { cores: 0, memoryGb: 0 },
      storage: { type: "nvme", capacityTb: 0 },
      networking: { fabric: "", linksPerNode: 0 },
    },
    infra: {
      orchestrator: "",
      nodePools: [],
      loadBalancer: "",
      monitoring: [],
    },
    modelPlatform: {
      server: "",
      replicas: 0,
      tensorParallelism: 1,
      pipelineParallelism: 1,
      expertParallelism: 1,
      kvCacheGb: 0,
      maxBatchSize: 0,
      latencyEstimates: {
        ttftMs: 0,
        itlMs: 0,
        endToEndMs: 0,
        prefillTokensPerSec: 0,
        decodeTokensPerSec: 0,
      },
      interconnectRecommendation: {
        intraNode: "nvlink",
        interNode: "none",
      },
    },
    application: {
      gateway: "",
      authMethod: "",
      rateLimits: { rps: 0, burst: 0 },
      metering: false,
    },
  };
}

export function defaultProject(id: string, name: string): Project {
  const now = new Date().toISOString();
  return {
    id,
    name,
    customer: "",
    createdAt: now,
    updatedAt: now,
    workloadType: "inference",
    deploymentPattern: "internal-inference",
    deploymentTarget: "on-prem",
    discovery: defaultDiscovery(),
    rfi: {
      source: "none",
      rawText: "",
      extracted: {
        requirements: [],
        timelines: [],
        evaluationCriteria: [],
        mandatoryItems: [],
      },
      qualification: {
        fitScore: 0,
        risks: [],
        strengths: [],
        winProbability: "medium",
      },
    },
    build: {
      derived: defaultBuildDerived(),
      overrides: {},
      final: defaultBuildDerived(),
      bom: [],
      totals: {
        gpuCount: 0,
        serverCount: 0,
        powerKw: 0,
        rackUnits: 0,
        capexUsd: 0,
        opexMonthlyUsd: 0,
      },
      notes: [],
    },
    explainOverrides: {},
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type ProjectStore = {
  projects: Project[];
  activeProject: Project | null;

  loadProject: (project: Project) => void;
  setProjects: (projects: Project[]) => void;
  saveProject: () => void;
  updateField: (path: string, value: unknown) => void;
  // Set a build override (key = arbitrary label, value = override value)
  setBuildOverride: (key: string, value: unknown) => void;
  // Clear one override by key
  clearBuildOverride: (key: string) => void;
  // Clear all overrides
  clearAllBuildOverrides: () => void;
};

function setDeep(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const result = { ...obj };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = result;
  for (let i = 0; i < keys.length - 1; i++) {
    cursor[keys[i]] = { ...cursor[keys[i]] };
    cursor = cursor[keys[i]];
  }
  cursor[keys[keys.length - 1]] = value;
  return result;
}

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  projects: [],
  activeProject: null,

  loadProject: (project) => set({ activeProject: project }),

  setProjects: (projects) => set({ projects }),

  saveProject: () => {
    // DB write is driven by useAutosave hook (debounced 500 ms).
    // This method exists so updateField can signal a save without
    // importing server-only code into the client store.
  },

  updateField: (path, value) => {
    const { activeProject } = get();
    if (!activeProject) return;
    const updated = setDeep(
      activeProject as unknown as Record<string, unknown>,
      path,
      value
    ) as unknown as Project;
    updated.updatedAt = new Date().toISOString();
    set({ activeProject: updated });
    get().saveProject();
  },

  setBuildOverride: (key, value) => {
    const { activeProject } = get();
    if (!activeProject) return;
    get().updateField(`build.overrides.${key}`, value);
  },

  clearBuildOverride: (key) => {
    const { activeProject } = get();
    if (!activeProject) return;
    const overrides = { ...activeProject.build.overrides };
    delete (overrides as Record<string, unknown>)[key];
    get().updateField("build.overrides", overrides);
  },

  clearAllBuildOverrides: () => {
    get().updateField("build.overrides", {});
  },
}));
