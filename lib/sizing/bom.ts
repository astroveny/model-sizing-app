// Ref: PRD §5.1 BomItem; PRD §6.3 BoM generation

import type { BomItem } from "@/lib/store";
import type { SizingInput, CapacityResult } from "./types";
import type { CatalogSnapshot } from "./catalog";

/**
 * Transform sizing results into a flat Bill of Materials.
 * Pricing comes from catalog list_price_usd; zero when unknown.
 */
export function buildBom(input: SizingInput, capacity: CapacityResult, catalog: CatalogSnapshot): BomItem[] {
  const items: BomItem[] = [];

  const { server } = catalog.resolveServer(input.gpu.id, input.preferredServerId);

  // GPUs
  items.push({
    category: "gpu",
    name: input.gpu.model,
    quantity: capacity.totalGpus,
    unitPriceUsd: input.gpu.list_price_usd ?? 0,
    totalPriceUsd: (input.gpu.list_price_usd ?? 0) * capacity.totalGpus,
    vendor: input.gpu.vendor === "nvidia" ? "NVIDIA" : "AMD",
    notes: `${input.gpu.vram_gb} GB VRAM, ${input.gpu.memory_bandwidth_gbps} GB/s`,
  });

  // Servers / chassis
  if (server) {
    items.push({
      category: "server",
      name: server.model,
      quantity: capacity.serverCount,
      unitPriceUsd: server.list_price_usd ?? 0,
      totalPriceUsd: (server.list_price_usd ?? 0) * capacity.serverCount,
      vendor: server.vendor,
      notes: `${server.rack_units}U, ${server.max_gpus} GPU slots`,
    });
  }

  // Networking (if multi-node)
  if (capacity.serverCount > 1) {
    const needsInfiniband = capacity.serverCount > 8 ||
      input.gpu.interconnect.intra_node.startsWith("nvlink");
    items.push({
      category: "network",
      name: needsInfiniband ? "InfiniBand 400G Switch" : "100G Ethernet Switch",
      quantity: Math.ceil(capacity.serverCount / 36),
      notes: needsInfiniband ? "HDR/NDR InfiniBand for inter-node TP/PP" : "100G RoCE fabric",
    });
  }

  // Storage (NVMe for model weights + checkpoints)
  items.push({
    category: "storage",
    name: "NVMe SSD (model storage)",
    quantity: capacity.serverCount,
    notes: `${Math.ceil(input.paramsB * 2 + 50)} GB per server (weights + runtime)`,
  });

  return items;
}
