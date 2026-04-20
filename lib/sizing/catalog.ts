import type { Gpu, Server, CloudInstance, ModelCatalogEntry, ThroughputTable } from "./types";

import gpusRaw from "@/data/gpus.json";
import serversRaw from "@/data/servers.json";
import instancesRaw from "@/data/instances.json";
import modelsRaw from "@/data/models.json";
import throughputRaw from "@/data/throughput.json";

export const gpus: Gpu[] = (gpusRaw as { gpus: Gpu[] }).gpus;
export const servers: Server[] = (serversRaw as { servers: Server[] }).servers;
export const instances: CloudInstance[] = (instancesRaw as { instances: CloudInstance[] }).instances;
export const modelCatalog: ModelCatalogEntry[] = (modelsRaw as { models: ModelCatalogEntry[] }).models;
export const throughputTable: ThroughputTable = throughputRaw as unknown as ThroughputTable;

export function getGpuById(id: string): Gpu | undefined {
  return gpus.find((g) => g.id === id);
}

export function getModelById(id: string): ModelCatalogEntry | undefined {
  return modelCatalog.find((m) => m.id === id);
}

/** Best-match server for a given GPU id */
export function getBestServer(gpuId: string): Server | undefined {
  return servers.find((s) => s.supported_gpu_ids.includes(gpuId));
}

/**
 * Look up empirical throughput (output tokens/sec per replica) for a given
 * GPU, model size bucket, quantization, and batch size.
 * Returns null when no data is available.
 */
export function lookupThroughput(
  gpuId: string,
  modelSizeBucket: string,
  quantization: string,
  batchSize: 1 | 8 | 32
): number | null {
  const quant = quantization.toLowerCase().replace(/[^a-z0-9]/g, "");
  const gpuData = (throughputTable as Record<string, Record<string, Record<string, Record<string, number | null> | null>>>)[gpuId];
  if (!gpuData) return null;
  const modelData = gpuData[modelSizeBucket];
  if (!modelData) return null;
  const quantData = modelData[quant];
  if (!quantData) return null;
  const key = `batch_${batchSize}` as "batch_1" | "batch_8" | "batch_32";
  return quantData[key] ?? null;
}

/** Map parameter count (billions) to a model size bucket key */
export function paramsToSizeBucket(paramsB: number): string {
  if (paramsB <= 10) return "7b";
  if (paramsB <= 16) return "13b";
  if (paramsB <= 45) return "34b";
  if (paramsB <= 100) return "70b";
  if (paramsB <= 200) return "140b";
  return "405b";
}
