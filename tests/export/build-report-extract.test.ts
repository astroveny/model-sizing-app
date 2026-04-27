import { describe, it, expect } from "vitest";
import { extractBuildReport } from "@/lib/export/build-report-extract";
import { defaultProject } from "@/lib/store";
import type { Project } from "@/lib/store";
import type { CatalogSnapshot } from "@/lib/sizing/catalog";
import type { Gpu, Server, ModelCatalogEntry } from "@/lib/sizing/types";

const H100: Gpu = {
  id: "h100-sxm", vendor: "nvidia", family: "hopper", model: "H100 SXM5",
  vram_gb: 80, memory_bandwidth_gbps: 3350, fp16_tflops: 989, bf16_tflops: 989,
  fp8_tflops: 1979, int8_tops: 1979, int4_tops: 3958, tdp_watts: 700,
  interconnect: { intra_node: "nvlink-4", intra_node_bandwidth_gbps: 900, form_factor: "sxm5" },
  supported_features: ["flash-attention-3", "transformer-engine", "fp8-native", "mig"],
  list_price_usd: 30000, availability: "available",
};

const MI300X: Gpu = {
  id: "mi300x", vendor: "amd", family: "mi300", model: "Instinct MI300X",
  vram_gb: 192, memory_bandwidth_gbps: 5300, fp16_tflops: 1307, bf16_tflops: 1307,
  fp8_tflops: 2614, int8_tops: 2614, int4_tops: 5227, tdp_watts: 750,
  interconnect: { intra_node: "infinity-fabric", intra_node_bandwidth_gbps: 896, form_factor: "oam" },
  supported_features: ["flash-attention-3", "fp8-native", "sr-iov"],
  list_price_usd: 15000, availability: "available",
};

const DGX_H100: Server = {
  id: "dgx-h100", vendor: "nvidia", model: "DGX H100",
  max_gpus: 8, supported_gpu_ids: ["h100-sxm"],
  rack_units: 10, tdp_watts: 10200, list_price_usd: 300000,
};

const MI300X_SERVER: Server = {
  id: "instinct-mi300x-server", vendor: "amd", model: "AMD Instinct MI300X Server",
  max_gpus: 8, supported_gpu_ids: ["mi300x"],
  rack_units: 4, tdp_watts: 7000, list_price_usd: 180000,
};

const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    id: "llama-3-70b", family: "llama-3", name: "Llama 3 70B",
    params_b: 70, layers: 80, hidden_size: 8192, num_kv_heads: 8,
    head_dim: 128, architecture: "dense", context_length_max: 8192,
  },
  {
    id: "mixtral-8x22b", family: "mixtral", name: "Mixtral 8x22B",
    params_b: 141, active_params_b: 39, layers: 56, hidden_size: 6144, num_kv_heads: 8,
    head_dim: 128, architecture: "moe", context_length_max: 65536,
  },
];

function makeTestCatalog(gpus: Gpu[], servers: Server[]): CatalogSnapshot {
  return {
    getGpuById: (id) => gpus.find((g) => g.id === id),
    getBestServer: (gpuId) => servers.find((s) => s.supported_gpu_ids.includes(gpuId)),
    resolveServer: (gpuId) => ({
      server: servers.find((s) => s.supported_gpu_ids.includes(gpuId)),
      incompatibilityNote: null,
    }),
    modelCatalog: MODEL_CATALOG,
  };
}

const DEFAULT_CATALOG = makeTestCatalog([H100, MI300X], [DGX_H100, MI300X_SERVER]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<Project> = {}): Project {
  const p = defaultProject("test-id", "Test Project");
  return { ...p, ...overrides };
}

function denseProject70B(): Project {
  const p = makeProject({ customer: "Acme", deploymentPattern: "internal-inference" });
  p.discovery.model.params = 70;
  p.discovery.model.quantization = "FP16";
  p.discovery.model.architecture = "dense";
  p.discovery.model.contextLength = 8192;
  p.discovery.load.concurrentUsers = 50;
  p.discovery.load.avgInputTokens = 512;
  p.discovery.load.avgOutputTokens = 256;
  p.discovery.hardware.preferredGpu = "h100-sxm";
  return p;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("extractBuildReport — incomplete project", () => {
  it("returns null when model params is 0", () => {
    const p = makeProject();
    p.discovery.load.concurrentUsers = 50;
    expect(extractBuildReport(p, DEFAULT_CATALOG)).toBeNull();
  });

  it("returns null when concurrentUsers is 0", () => {
    const p = makeProject();
    p.discovery.model.params = 70;
    expect(extractBuildReport(p, DEFAULT_CATALOG)).toBeNull();
  });
});

describe("extractBuildReport — dense 70B project", () => {
  it("returns a BuildReport with correct version and project fields", () => {
    const report = extractBuildReport(denseProject70B(), DEFAULT_CATALOG);
    expect(report).not.toBeNull();
    expect(report!.version).toBe("1.0.0");
    expect(report!.project.name).toBe("Test Project");
    expect(report!.project.customer).toBe("Acme");
    expect(report!.project.deploymentPattern).toBe("internal-inference");
  });

  it("derives hardware fields from sizing engine", () => {
    const report = extractBuildReport(denseProject70B(), DEFAULT_CATALOG)!;
    // GPU model comes from catalog (h100-sxm → "H100 SXM5")
    expect(report.hardware.gpuModel).toBe("H100 SXM5");
    expect(report.hardware.vramPerGpuGb).toBe(80);
    expect(report.hardware.gpuCount).toBeGreaterThan(0);
    expect(report.hardware.serverModel).toBeTruthy();
  });

  it("derives model platform fields from sizing engine", () => {
    const report = extractBuildReport(denseProject70B(), DEFAULT_CATALOG)!;
    expect(report.modelPlatform.inferenceServer).toBe("vllm");
    expect(report.modelPlatform.tensorParallelism).toBeGreaterThan(0);
    expect(report.modelPlatform.ttftMs).toBeGreaterThan(0);
    expect(report.modelPlatform.itlMs).toBeGreaterThan(0);
    expect(report.modelPlatform.endToEndMs).toBeGreaterThan(0);
  });

  it("includes sizing-derived totals", () => {
    const report = extractBuildReport(denseProject70B(), DEFAULT_CATALOG)!;
    expect(report.totals.totalGpus).toBeGreaterThan(0);
    expect(report.totals.serverCount).toBeGreaterThan(0);
  });

  it("derives infra fields from discovery.infra", () => {
    const report = extractBuildReport(denseProject70B(), DEFAULT_CATALOG)!;
    expect(report.infra.orchestrator).toBe("kubernetes");
    expect(report.infra.loadBalancer).toBe("K8s Service + Ingress");
    expect(report.infra.airGapped).toBe(false);
  });

  it("populates bom with at least GPU and server rows", () => {
    const report = extractBuildReport(denseProject70B(), DEFAULT_CATALOG)!;
    expect(report.bom.length).toBeGreaterThanOrEqual(2);
    const categories = report.bom.map((r) => r.category);
    expect(categories).toContain("gpu");
    expect(categories).toContain("server");
  });

  it("includes assumptions with correct sources", () => {
    const report = extractBuildReport(denseProject70B(), DEFAULT_CATALOG)!;
    const quant = report.assumptions.find((a) => a.label === "Quantization");
    expect(quant?.value).toBe("FP16");
    expect(quant?.source).toBe("derived");
  });

  it("has no overrides when build.overrides is empty", () => {
    const report = extractBuildReport(denseProject70B(), DEFAULT_CATALOG)!;
    expect(report.hasOverrides).toBe(false);
  });

  it("populates engine notes from computeSizing", () => {
    const report = extractBuildReport(denseProject70B(), DEFAULT_CATALOG)!;
    // Engine notes come from the sizing engine, always an array
    expect(Array.isArray(report.engineNotes)).toBe(true);
  });
});

describe("extractBuildReport — with BoM price overrides", () => {
  it("applies price override and marks row as overridden", () => {
    const p = denseProject70B();
    (p.build.overrides as Record<string, unknown>)["bom:price:H100 SXM5"] = 28000;

    const report = extractBuildReport(p, DEFAULT_CATALOG)!;
    const gpuRow = report.bom.find((r) => r.name === "H100 SXM5");
    expect(gpuRow?.overridden).toBe(true);
    expect(gpuRow?.unitPriceUsd).toBe(28000);
    expect(gpuRow?.totalPriceUsd).toBe(28000 * (gpuRow?.quantity ?? 0));
  });

  it("sets hasOverrides = true when any override exists", () => {
    const p = denseProject70B();
    (p.build.overrides as Record<string, unknown>)["bom:price:H100 SXM5"] = 28000;
    const report = extractBuildReport(p, DEFAULT_CATALOG)!;
    expect(report.hasOverrides).toBe(true);
  });

  it("recalculates capexUsd using overridden prices", () => {
    const p = denseProject70B();
    const gpuCount = extractBuildReport(p, DEFAULT_CATALOG)!.bom.find((r) => r.category === "gpu")?.quantity ?? 8;
    (p.build.overrides as Record<string, unknown>)["bom:price:H100 SXM5"] = 1000;

    const report = extractBuildReport(p, DEFAULT_CATALOG)!;
    const gpuRow = report.bom.find((r) => r.category === "gpu")!;
    expect(gpuRow.totalPriceUsd).toBe(1000 * gpuCount);
  });
});

describe("extractBuildReport — MoE project", () => {
  it("handles MoE architecture without throwing", () => {
    const p = makeProject();
    p.discovery.model.params = 141;
    p.discovery.model.architecture = "moe";
    p.discovery.model.moeActiveParams = 39;
    p.discovery.model.quantization = "FP8";
    p.discovery.model.contextLength = 4096;
    p.discovery.load.concurrentUsers = 20;
    p.discovery.load.avgInputTokens = 256;
    p.discovery.load.avgOutputTokens = 128;
    p.discovery.hardware.preferredGpu = "mi300x";

    const report = extractBuildReport(p, DEFAULT_CATALOG);
    expect(report).not.toBeNull();
    expect(report!.totals.totalGpus).toBeGreaterThan(0);
  });
});
