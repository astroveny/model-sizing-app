import { describe, it, expect } from "vitest";
import { extractBuildReport } from "@/lib/export/build-report-extract";
import { defaultProject, defaultDiscovery, defaultBuildDerived } from "@/lib/store";
import type { Project } from "@/lib/store";

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
  // Populate build.final so hardware/infra/mp/app fields are readable
  p.build.final = defaultBuildDerived();
  p.build.final.hardware.gpu = { model: "H100 SXM5", count: 8, vramPerGpuGb: 80 };
  p.build.final.hardware.server = { model: "DGX H100", count: 1, gpusPerServer: 8 };
  p.build.final.hardware.storage = { type: "nvme", capacityTb: 30 };
  p.build.final.hardware.networking = { fabric: "infiniband-400g", linksPerNode: 2 };
  p.build.final.infra = { orchestrator: "kubernetes", nodePools: [], loadBalancer: "nginx", monitoring: ["prometheus"] };
  p.build.final.modelPlatform.server = "vllm";
  p.build.final.modelPlatform.replicas = 2;
  p.build.final.modelPlatform.tensorParallelism = 4;
  p.build.final.modelPlatform.latencyEstimates = { ttftMs: 180, itlMs: 17, endToEndMs: 3580, prefillTokensPerSec: 10000, decodeTokensPerSec: 420 };
  p.build.final.modelPlatform.interconnectRecommendation = { intraNode: "nvlink", interNode: "infiniband-400g" };
  p.build.final.application = { gateway: "kong", authMethod: "oidc", rateLimits: { rps: 50, burst: 100 }, metering: false };
  p.build.notes = ["[INFO] TP=4 chosen"];
  return p;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("extractBuildReport — incomplete project", () => {
  it("returns null when model params is 0", () => {
    const p = makeProject();
    p.discovery.load.concurrentUsers = 50;
    expect(extractBuildReport(p)).toBeNull();
  });

  it("returns null when concurrentUsers is 0", () => {
    const p = makeProject();
    p.discovery.model.params = 70;
    expect(extractBuildReport(p)).toBeNull();
  });
});

describe("extractBuildReport — dense 70B project", () => {
  it("returns a BuildReport with correct version and project fields", () => {
    const report = extractBuildReport(denseProject70B());
    expect(report).not.toBeNull();
    expect(report!.version).toBe("1.0.0");
    expect(report!.project.name).toBe("Test Project");
    expect(report!.project.customer).toBe("Acme");
    expect(report!.project.deploymentPattern).toBe("internal-inference");
  });

  it("includes hardware fields from build.final", () => {
    const report = extractBuildReport(denseProject70B())!;
    expect(report.hardware.gpuModel).toBe("H100 SXM5");
    expect(report.hardware.serverModel).toBe("DGX H100");
    expect(report.hardware.gpuCount).toBe(8);
  });

  it("includes model platform fields from build.final", () => {
    const report = extractBuildReport(denseProject70B())!;
    expect(report.modelPlatform.inferenceServer).toBe("vllm");
    expect(report.modelPlatform.tensorParallelism).toBe(4);
    expect(report.modelPlatform.ttftMs).toBe(180);
  });

  it("includes sizing-derived totals", () => {
    const report = extractBuildReport(denseProject70B())!;
    expect(report.totals.totalGpus).toBeGreaterThan(0);
    expect(report.totals.serverCount).toBeGreaterThan(0);
  });

  it("populates bom with at least GPU and server rows", () => {
    const report = extractBuildReport(denseProject70B())!;
    expect(report.bom.length).toBeGreaterThanOrEqual(2);
    const categories = report.bom.map((r) => r.category);
    expect(categories).toContain("gpu");
    expect(categories).toContain("server");
  });

  it("includes assumptions with correct sources", () => {
    const report = extractBuildReport(denseProject70B())!;
    const quant = report.assumptions.find((a) => a.label === "Quantization");
    expect(quant?.value).toBe("FP16");
    expect(quant?.source).toBe("derived");
  });

  it("has no overrides when build.overrides is empty", () => {
    const report = extractBuildReport(denseProject70B())!;
    expect(report.hasOverrides).toBe(false);
  });

  it("includes engine notes from build.notes", () => {
    const report = extractBuildReport(denseProject70B())!;
    expect(report.engineNotes).toContain("[INFO] TP=4 chosen");
  });
});

describe("extractBuildReport — with BoM price overrides", () => {
  it("applies price override and marks row as overridden", () => {
    const p = denseProject70B();
    // Find what the GPU item name will be (H100 SXM5 from catalog)
    (p.build.overrides as Record<string, unknown>)["bom:price:H100 SXM5"] = 28000;

    const report = extractBuildReport(p)!;
    const gpuRow = report.bom.find((r) => r.name === "H100 SXM5");
    expect(gpuRow?.overridden).toBe(true);
    expect(gpuRow?.unitPriceUsd).toBe(28000);
    expect(gpuRow?.totalPriceUsd).toBe(28000 * (gpuRow?.quantity ?? 0));
  });

  it("sets hasOverrides = true when any override exists", () => {
    const p = denseProject70B();
    (p.build.overrides as Record<string, unknown>)["bom:price:H100 SXM5"] = 28000;
    const report = extractBuildReport(p)!;
    expect(report.hasOverrides).toBe(true);
  });

  it("recalculates capexUsd using overridden prices", () => {
    const p = denseProject70B();
    const gpuCount = extractBuildReport(p)!.bom.find((r) => r.category === "gpu")?.quantity ?? 8;
    (p.build.overrides as Record<string, unknown>)["bom:price:H100 SXM5"] = 1000;

    const report = extractBuildReport(p)!;
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
    p.build.final = defaultBuildDerived();
    p.build.notes = [];

    const report = extractBuildReport(p);
    expect(report).not.toBeNull();
    expect(report!.totals.totalGpus).toBeGreaterThan(0);
  });
});
