import type { GpuRow, ServerRow, LlmModelRow } from "./index";
import type { Gpu, Server, ModelCatalogEntry } from "@/lib/sizing/types";

export function adaptGpu(g: GpuRow): Gpu {
  return {
    id: g.id,
    vendor: (g.vendor ?? "nvidia") as Gpu["vendor"],
    family: g.family ?? "",
    model: g.model ?? "",
    vram_gb: g.vramGb ?? 0,
    memory_type: g.memoryType ?? undefined,
    memory_bandwidth_gbps: g.memoryBandwidthGbps ?? 0,
    fp32_tflops: undefined,
    fp16_tflops: g.fp16Tflops ?? 0,
    bf16_tflops: g.bf16Tflops ?? undefined,
    fp8_tflops: g.fp8Tflops ?? undefined,
    int8_tops: g.int8Tops ?? undefined,
    int4_tops: g.int4Tops ?? undefined,
    tdp_watts: g.tdpWatts ?? 0,
    interconnect: (g.interconnect as Gpu["interconnect"]) ?? {
      intra_node: "pcie",
      intra_node_bandwidth_gbps: 64,
      form_factor: "pcie",
    },
    supported_features: g.supportedFeatures ?? [],
    list_price_usd: g.listPriceUsd ?? undefined,
    availability: (g.availability as Gpu["availability"]) ?? undefined,
    notes: g.notes ?? undefined,
  };
}

export function adaptServer(s: ServerRow): Server {
  const supported_gpu_ids = [...new Set(s.gpuConfigs.map((c) => c.gpuId))];
  const max_gpus = s.gpuConfigs.reduce((m, c) => Math.max(m, c.gpuCount), 0);
  const defaultConfig = s.gpuConfigs.find((c) => c.isDefault) ?? s.gpuConfigs[0];
  return {
    id: s.id,
    vendor: s.vendor ?? "",
    model: s.model ?? "",
    max_gpus,
    supported_gpu_ids,
    rack_units: s.rackUnits ?? 0,
    tdp_watts: s.tdpWatts ?? 0,
    list_price_usd: defaultConfig?.listPriceUsd ?? undefined,
    notes: s.notes ?? undefined,
  };
}

export function adaptModel(m: LlmModelRow): ModelCatalogEntry {
  return {
    id: m.id,
    family: m.family ?? "",
    name: m.name ?? "",
    params_b: m.paramsB ?? 0,
    active_params_b: m.activeParamsB ?? undefined,
    layers: m.layers ?? 0,
    hidden_size: m.hiddenSize ?? 0,
    num_kv_heads: m.numKvHeads ?? 8,
    head_dim: m.headDim ?? 128,
    architecture: (m.architecture ?? "dense") as "dense" | "moe",
    context_length_max: m.contextLengthMax ?? 8192,
    notes: m.notes ?? undefined,
  };
}
