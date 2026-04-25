import { describe, it, expect } from "vitest";
import { buildBomExport } from "@/lib/export/build-bom-export";
import { defaultProject } from "@/lib/store";
import type { Project } from "@/lib/store";

function makeProject70B(): Project {
  const p = defaultProject("test-id", "Test Project");
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

describe("buildBomExport – GPU price override", () => {
  it("applies GPU unit price override", () => {
    const p = makeProject70B();
    const baseline = buildBomExport(p);
    const gpuItem = baseline.items.find((i) => i.category === "gpu");
    expect(gpuItem).toBeDefined();
    expect(gpuItem!.name).toBeTruthy();

    const overrideKey = `gpu:${gpuItem!.name}`;
    const newUnitPrice = 99999;

    // Inject the override the same way setBomOverride does
    p.build.bomOverrides = {
      [overrideKey]: { unitPriceUsd: newUnitPrice, totalPriceUsd: newUnitPrice * gpuItem!.quantity },
    };

    const overridden = buildBomExport(p);
    const overriddenGpu = overridden.items.find((i) => i.category === "gpu");

    expect(overriddenGpu).toBeDefined();
    expect(overriddenGpu!.unitPriceUsd).toBe(newUnitPrice);
    expect(overriddenGpu!.totalPriceUsd).toBe(newUnitPrice * gpuItem!.quantity);
    expect(overridden.hasOverrides).toBe(true);
  });

  it("applies server price override", () => {
    const p = makeProject70B();
    const baseline = buildBomExport(p);
    const serverItem = baseline.items.find((i) => i.category === "server");
    expect(serverItem).toBeDefined();

    const overrideKey = `server:${serverItem!.name}`;
    const newUnitPrice = 123456;

    p.build.bomOverrides = {
      [overrideKey]: { unitPriceUsd: newUnitPrice, totalPriceUsd: newUnitPrice * serverItem!.quantity },
    };

    const overridden = buildBomExport(p);
    const overriddenServer = overridden.items.find((i) => i.category === "server");

    expect(overriddenServer!.unitPriceUsd).toBe(newUnitPrice);
  });

  it("logs GPU item name so key format can be verified", () => {
    const p = makeProject70B();
    const bom = buildBomExport(p);
    const gpuItem = bom.items.find((i) => i.category === "gpu");
    // This lets you see the exact key stored in bomOverrides when you run the test
    console.log("GPU item name (key format: gpu:<name>):", `gpu:${gpuItem?.name}`);
    expect(gpuItem?.name).toBeTruthy();
  });
});
