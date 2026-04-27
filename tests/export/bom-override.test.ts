import { describe, it, expect } from "vitest";
import { buildBomExport } from "@/lib/export/build-bom-export";
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

const DGX_H100: Server = {
  id: "dgx-h100", vendor: "nvidia", model: "DGX H100",
  max_gpus: 8, supported_gpu_ids: ["h100-sxm"],
  rack_units: 10, tdp_watts: 10200, list_price_usd: 300000,
};

const LLAMA_70B: ModelCatalogEntry = {
  id: "llama-3-70b", family: "llama-3", name: "Llama 3 70B",
  params_b: 70, layers: 80, hidden_size: 8192, num_kv_heads: 8,
  head_dim: 128, architecture: "dense", context_length_max: 8192,
};

const TEST_CATALOG: CatalogSnapshot = {
  getGpuById: (id) => id === "h100-sxm" ? H100 : undefined,
  getBestServer: (gpuId) => gpuId === "h100-sxm" ? DGX_H100 : undefined,
  resolveServer: (gpuId) => ({ server: gpuId === "h100-sxm" ? DGX_H100 : undefined, incompatibilityNote: null }),
  modelCatalog: [LLAMA_70B],
};

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
    const baseline = buildBomExport(p, TEST_CATALOG);
    const gpuItem = baseline.items.find((i) => i.category === "gpu");
    expect(gpuItem).toBeDefined();
    expect(gpuItem!.name).toBeTruthy();

    const overrideKey = `gpu:${gpuItem!.name}`;
    const newUnitPrice = 99999;

    // Inject the override the same way setBomOverride does
    p.build.bomOverrides = {
      [overrideKey]: { unitPriceUsd: newUnitPrice, totalPriceUsd: newUnitPrice * gpuItem!.quantity },
    };

    const overridden = buildBomExport(p, TEST_CATALOG);
    const overriddenGpu = overridden.items.find((i) => i.category === "gpu");

    expect(overriddenGpu).toBeDefined();
    expect(overriddenGpu!.unitPriceUsd).toBe(newUnitPrice);
    expect(overriddenGpu!.totalPriceUsd).toBe(newUnitPrice * gpuItem!.quantity);
    expect(overridden.hasOverrides).toBe(true);
  });

  it("applies server price override", () => {
    const p = makeProject70B();
    const baseline = buildBomExport(p, TEST_CATALOG);
    const serverItem = baseline.items.find((i) => i.category === "server");
    expect(serverItem).toBeDefined();

    const overrideKey = `server:${serverItem!.name}`;
    const newUnitPrice = 123456;

    p.build.bomOverrides = {
      [overrideKey]: { unitPriceUsd: newUnitPrice, totalPriceUsd: newUnitPrice * serverItem!.quantity },
    };

    const overridden = buildBomExport(p, TEST_CATALOG);
    const overriddenServer = overridden.items.find((i) => i.category === "server");

    expect(overriddenServer!.unitPriceUsd).toBe(newUnitPrice);
  });

  it("logs GPU item name so key format can be verified", () => {
    const p = makeProject70B();
    const bom = buildBomExport(p, TEST_CATALOG);
    const gpuItem = bom.items.find((i) => i.category === "gpu");
    // This lets you see the exact key stored in bomOverrides when you run the test
    console.log("GPU item name (key format: gpu:<name>):", `gpu:${gpuItem?.name}`);
    expect(gpuItem?.name).toBeTruthy();
  });
});
