"use client";

import { useState, useEffect, useMemo } from "react";
import { adaptGpu, adaptServer, adaptModel } from "./adapters";
import type { GpuRow, ServerRow, LlmModelRow } from "./index";
import type { Gpu, Server, ModelCatalogEntry } from "@/lib/sizing/types";
import type { CatalogSnapshot } from "@/lib/sizing/catalog";

interface RawCatalog {
  gpus: GpuRow[];
  servers: ServerRow[];
  llmModels: LlmModelRow[];
}

// Module-level Promise + resolved cache: shared across all hook instances, fetched only once
let _catalogPromise: Promise<RawCatalog> | null = null;
let _resolvedRaw: RawCatalog | null = null;

function fetchCatalogOnce(): Promise<RawCatalog> {
  if (!_catalogPromise) {
    _catalogPromise = fetch("/api/catalogs").then((r) => {
      if (!r.ok) throw new Error(`/api/catalogs returned ${r.status}`);
      return r.json() as Promise<RawCatalog>;
    }).then((raw) => {
      _resolvedRaw = raw;
      return raw;
    });
  }
  return _catalogPromise;
}

function buildSnapshot(raw: RawCatalog): ClientCatalogSnapshot {
  const gpus = raw.gpus.map(adaptGpu);
  const servers = raw.servers.map(adaptServer);
  const modelCatalog = raw.llmModels.map(adaptModel);
  return {
    gpus,
    servers,
    llmModels: raw.llmModels,
    modelCatalog,
    getGpuById: (id: string) => gpus.find((g) => g.id === id),
    getBestServer: (gpuId: string) => servers.find((s) => s.supported_gpu_ids.includes(gpuId)),
    resolveServer: (gpuId: string, preferred?: string) => {
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
      return {
        server: servers.find((s) => s.supported_gpu_ids.includes(gpuId)),
        incompatibilityNote: null,
      };
    },
  };
}

export interface ClientCatalogSnapshot extends CatalogSnapshot {
  gpus: Gpu[];
  servers: Server[];
  llmModels: LlmModelRow[];
  modelCatalog: ModelCatalogEntry[];
}

export function useCatalog(): ClientCatalogSnapshot | null {
  const [raw, setRaw] = useState<RawCatalog | null>(_resolvedRaw);

  useEffect(() => {
    if (_resolvedRaw) return; // already loaded
    fetchCatalogOnce().then(setRaw).catch((err) => {
      console.error("[useCatalog] Failed to load catalog:", err);
    });
  }, []);

  return useMemo(() => (raw ? buildSnapshot(raw) : null), [raw]);
}

/**
 * Synchronously returns the catalog snapshot if already fetched, or null.
 * Useful inside event handlers that can't call hooks (e.g. download handlers
 * that also read from useProjectStore.getState()).
 */
export function getCatalogSnapshotSync(): ClientCatalogSnapshot | null {
  return _resolvedRaw ? buildSnapshot(_resolvedRaw) : null;
}
