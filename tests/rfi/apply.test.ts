import { describe, it, expect, beforeEach } from "vitest";
import { defaultProject } from "@/lib/store";
import type { Project, ExtractedRequirement } from "@/lib/store";

// Unit test for the store-level Apply mechanism.
// The RequirementsList component calls updateField("discovery.<path>", value),
// which uses setDeep to write into the nested project state.

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

function simulateApply(project: Project, req: ExtractedRequirement): Project {
  if (!req.mapsToDiscoveryField || req.extractedValue == null) return project;
  return setDeep(
    project as unknown as Record<string, unknown>,
    `discovery.${req.mapsToDiscoveryField}`,
    req.extractedValue
  ) as unknown as Project;
}

describe("RFI Apply to Discovery", () => {
  let project: Project;

  beforeEach(() => {
    project = defaultProject("test-id", "Test");
  });

  it("applies concurrentUsers from extracted requirement", () => {
    const req: ExtractedRequirement = {
      id: "r1",
      text: "System must support 100 concurrent users",
      layer: "general",
      mandatory: true,
      mapsToDiscoveryField: "load.concurrentUsers",
      extractedValue: 100,
    };
    const updated = simulateApply(project, req);
    expect(updated.discovery.load.concurrentUsers).toBe(100);
  });

  it("applies model.params from extracted requirement", () => {
    const req: ExtractedRequirement = {
      id: "r2",
      text: "Must use 70B parameter model",
      layer: "model-platform",
      mandatory: true,
      mapsToDiscoveryField: "model.params",
      extractedValue: 70,
    };
    const updated = simulateApply(project, req);
    expect(updated.discovery.model.params).toBe(70);
  });

  it("applies infra.orchestrator from extracted requirement", () => {
    const req: ExtractedRequirement = {
      id: "r3",
      text: "Must run on Kubernetes",
      layer: "infra",
      mandatory: true,
      mapsToDiscoveryField: "infra.orchestrator",
      extractedValue: "kubernetes",
    };
    const updated = simulateApply(project, req);
    expect(updated.discovery.infra.orchestrator).toBe("kubernetes");
  });

  it("skips apply when mapsToDiscoveryField is missing", () => {
    const req: ExtractedRequirement = {
      id: "r4",
      text: "Must comply with SOC2",
      layer: "general",
      mandatory: false,
      mapsToDiscoveryField: undefined,
      extractedValue: undefined,
    };
    const updated = simulateApply(project, req);
    expect(updated).toBe(project); // unchanged
  });

  it("skips apply when extractedValue is null", () => {
    const req: ExtractedRequirement = {
      id: "r5",
      text: "Must use enterprise-grade hardware",
      layer: "hardware",
      mandatory: true,
      mapsToDiscoveryField: "hardware.preferredVendor",
      extractedValue: null,
    };
    const updated = simulateApply(project, req);
    expect(updated).toBe(project); // unchanged
  });

  it("applies multiple requirements in sequence", () => {
    const requirements: ExtractedRequirement[] = [
      { id: "r1", text: "100 concurrent users", layer: "general", mandatory: true, mapsToDiscoveryField: "load.concurrentUsers", extractedValue: 100 },
      { id: "r2", text: "70B model", layer: "model-platform", mandatory: true, mapsToDiscoveryField: "model.params", extractedValue: 70 },
      { id: "r3", text: "FP8 quantization", layer: "model-platform", mandatory: false, mapsToDiscoveryField: "model.quantization", extractedValue: "FP8" },
    ];

    let updated = project;
    for (const req of requirements) {
      updated = simulateApply(updated, req);
    }

    expect(updated.discovery.load.concurrentUsers).toBe(100);
    expect(updated.discovery.model.params).toBe(70);
    expect(updated.discovery.model.quantization).toBe("FP8");
  });
});
