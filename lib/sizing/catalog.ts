import type { Gpu, Server, CloudInstance, ModelCatalogEntry, ThroughputTable } from "./types";

import instancesRaw from "@/data/instances.json";
import throughputRaw from "@/data/throughput.json";

// Cloud instances and throughput remain static JSON (not migrated in P13.4)
export const instances: CloudInstance[] = (instancesRaw as { instances: CloudInstance[] }).instances;
export const throughputTable: ThroughputTable = throughputRaw as unknown as ThroughputTable;

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

export function paramsToSizeBucket(paramsB: number): string {
  if (paramsB <= 10) return "7b";
  if (paramsB <= 16) return "13b";
  if (paramsB <= 45) return "34b";
  if (paramsB <= 100) return "70b";
  if (paramsB <= 200) return "140b";
  return "405b";
}

/** Snapshot of catalog used to make export functions isomorphic (server + client). */
export interface CatalogSnapshot {
  getGpuById(id: string): Gpu | undefined;
  getBestServer(gpuId: string): Server | undefined;
  resolveServer(
    gpuId: string,
    preferredServerId?: string
  ): { server: Server | undefined; incompatibilityNote: string | null };
  modelCatalog: ModelCatalogEntry[];
}

