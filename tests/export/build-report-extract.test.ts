import { describe, it, expect } from "vitest";
import { extractBuildReport } from "@/lib/export/build-report-extract";
import { defaultProject } from "@/lib/store";
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

  it("derives hardware fields from sizing engine", () => {
    const report = extractBuildReport(denseProject70B())!;
    // GPU model comes from catalog (h100-sxm → "H100 SXM5")
    expect(report.hardware.gpuModel).toBe("H100 SXM5");
    expect(report.hardware.vramPerGpuGb).toBe(80);
    expect(report.hardware.gpuCount).toBeGreaterThan(0);
    expect(report.hardware.serverModel).toBeTruthy();
  });

  it("derives model platform fields from sizing engine", () => {
    const report = extractBuildReport(denseProject70B())!;
    expect(report.modelPlatform.inferenceServer).toBe("vllm");
    expect(report.modelPlatform.tensorParallelism).toBeGreaterThan(0);
    expect(report.modelPlatform.ttftMs).toBeGreaterThan(0);
    expect(report.modelPlatform.itlMs).toBeGreaterThan(0);
    expect(report.modelPlatform.endToEndMs).toBeGreaterThan(0);
  });

  it("includes sizing-derived totals", () => {
    const report = extractBuildReport(denseProject70B())!;
    expect(report.totals.totalGpus).toBeGreaterThan(0);
    expect(report.totals.serverCount).toBeGreaterThan(0);
  });

  it("derives infra fields from discovery.infra", () => {
    const report = extractBuildReport(denseProject70B())!;
    expect(report.infra.orchestrator).toBe("kubernetes");
    expect(report.infra.loadBalancer).toBe("K8s Service + Ingress");
    expect(report.infra.airGapped).toBe(false);
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

  it("populates engine notes from computeSizing", () => {
    const report = extractBuildReport(denseProject70B())!;
    // Engine notes come from the sizing engine, always an array
    expect(Array.isArray(report.engineNotes)).toBe(true);
  });
});

describe("extractBuildReport — with BoM price overrides", () => {
  it("applies price override and marks row as overridden", () => {
    const p = denseProject70B();
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

    const report = extractBuildReport(p);
    expect(report).not.toBeNull();
    expect(report!.totals.totalGpus).toBeGreaterThan(0);
  });
});
