import type { Gpu, Server, CloudInstance, ModelCatalogEntry, ThroughputTable } from "./types";

import instancesRaw from "@/data/instances.json";
import throughputRaw from "@/data/throughput.json";
import { listGpus, listServers, listLlmModels } from "@/lib/catalogs/index";
import { adaptGpu, adaptServer, adaptModel } from "@/lib/catalogs/adapters";

// Cloud instances and throughput remain static JSON (not migrated in P13.4)
export const instances: CloudInstance[] = (instancesRaw as { instances: CloudInstance[] }).instances;
export const throughputTable: ThroughputTable = throughputRaw as unknown as ThroughputTable;

// Catalog getters — lazy, read from DB via lib/catalogs/index (server-side only)
export function getGpus(): Gpu[] {
  return listGpus().map(adaptGpu);
}

export function getServers(): Server[] {
  return listServers().map(adaptServer);
}

export function getModelCatalog(): ModelCatalogEntry[] {
  return listLlmModels().map(adaptModel);
}


export function getGpuById(id: string): Gpu | undefined {
  return getGpus().find((g) => g.id === id);
}

export function getModelById(id: string): ModelCatalogEntry | undefined {
  return getModelCatalog().find((m) => m.id === id);
}

export function getServerById(id: string): Server | undefined {
  return getServers().find((s) => s.id === id);
}

export function getBestServer(gpuId: string): Server | undefined {
  return getServers().find((s) => s.supported_gpu_ids.includes(gpuId));
}

export function resolveServer(
  gpuId: string,
  preferredServerId?: string
): { server: Server | undefined; incompatibilityNote: string | null } {
  if (preferredServerId) {
    const preferred = getServerById(preferredServerId);
    if (preferred) {
      if (preferred.supported_gpu_ids.includes(gpuId)) {
        return { server: preferred, incompatibilityNote: null };
      }
      const auto = getBestServer(gpuId);
      const note = `Preferred server "${preferred.model}" doesn't support ${gpuId}; auto-selected "${auto?.model ?? "unknown"}" instead.`;
      return { server: auto, incompatibilityNote: note };
    }
  }
  return { server: getBestServer(gpuId), incompatibilityNote: null };
}

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

/** Build a CatalogSnapshot from the DB (server-side only). */
export function buildServerCatalogSnapshot(): CatalogSnapshot {
  const gpus = getGpus();
  const servers = getServers();
  const models = getModelCatalog();
  return {
    getGpuById: (id) => gpus.find((g) => g.id === id),
    getBestServer: (gpuId) => servers.find((s) => s.supported_gpu_ids.includes(gpuId)),
    resolveServer: (gpuId, preferred) => {
      if (preferred) {
        const s = servers.find((sv) => sv.id === preferred);
        if (s) {
          if (s.supported_gpu_ids.includes(gpuId)) return { server: s, incompatibilityNote: null };
          const auto = servers.find((sv) => sv.supported_gpu_ids.includes(gpuId));
          return {
            server: auto,
            incompatibilityNote: `Preferred server "${s.model}" doesn't support ${gpuId}; auto-selected "${auto?.model ?? "unknown"}" instead.`,
          };
        }
      }
      return { server: servers.find((s) => s.supported_gpu_ids.includes(gpuId)), incompatibilityNote: null };
    },
    modelCatalog: models,
  };
}
