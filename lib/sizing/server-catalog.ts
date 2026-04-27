// Server-only — imports from lib/catalogs/index which uses getDb (better-sqlite3).
// Never import this from client components or hooks.

import { listGpus, listServers, listLlmModels } from "@/lib/catalogs/index";
import { adaptGpu, adaptServer, adaptModel } from "@/lib/catalogs/adapters";
import type { Gpu, Server, ModelCatalogEntry } from "./types";
import type { CatalogSnapshot } from "./catalog";

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
