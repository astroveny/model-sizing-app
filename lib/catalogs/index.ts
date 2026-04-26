import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

// Module-level cache, invalidated by any write via invalidateCatalogCache()
let _cache: CatalogCache | null = null;

interface CatalogCache {
  gpus: GpuRow[];
  servers: ServerRow[];
  llmModels: LlmModelRow[];
  workloadReferences: WorkloadReferenceRow[];
}

export interface GpuRow {
  id: string;
  vendor: string | null;
  family: string | null;
  model: string | null;
  vramGb: number | null;
  memoryType: string | null;
  memoryBandwidthGbps: number | null;
  fp16Tflops: number | null;
  bf16Tflops: number | null;
  fp8Tflops: number | null;
  int8Tops: number | null;
  int4Tops: number | null;
  tdpWatts: number | null;
  interconnect: Record<string, unknown> | null;
  supportedFeatures: string[] | null;
  listPriceUsd: number | null;
  availability: string | null;
  notes: string | null;
  sources: string[] | null;
  isDeprecated: boolean;
  origin: string;
}

export interface ServerGpuConfigRow {
  id: string;
  serverId: string;
  gpuId: string;
  gpuCount: number;
  interconnect: string | null;
  listPriceUsd: number | null;
  isDefault: boolean;
}

export interface ServerRow {
  id: string;
  vendor: string | null;
  model: string | null;
  cpu: string | null;
  memoryGb: number | null;
  storage: string | null;
  network: string | null;
  tdpWatts: number | null;
  rackUnits: number | null;
  releaseYear: number | null;
  specSheetUrl: string | null;
  notes: string | null;
  isDeprecated: boolean;
  origin: string;
  gpuConfigs: ServerGpuConfigRow[];
}

export interface LlmModelRow {
  id: string;
  family: string | null;
  name: string | null;
  paramsB: number | null;
  architecture: string | null;
  activeParamsB: number | null;
  layers: number | null;
  hiddenSize: number | null;
  numKvHeads: number | null;
  headDim: number | null;
  contextLengthMax: number | null;
  quantizationsSupported: string[] | null;
  releaseDate: string | null;
  huggingfaceId: string | null;
  notes: string | null;
  isDeprecated: boolean;
  origin: string;
}

export interface WorkloadReferenceRow {
  id: string;
  label: string | null;
  url: string | null;
  description: string | null;
  sortOrder: number | null;
  isDeprecated: boolean;
  origin: string;
}

export function invalidateCatalogCache(): void {
  _cache = null;
}

function getCache(): CatalogCache {
  if (_cache) return _cache;

  const db = getDb();

  const rawGpus = db
    .select()
    .from(schema.gpus)
    .orderBy(asc(schema.gpus.vendor), asc(schema.gpus.model))
    .all();

  const rawServers = db
    .select()
    .from(schema.servers)
    .orderBy(asc(schema.servers.vendor), asc(schema.servers.model))
    .all();

  const rawConfigs = db.select().from(schema.serverGpuConfigs).all();

  const rawModels = db
    .select()
    .from(schema.llmModels)
    .orderBy(asc(schema.llmModels.family), asc(schema.llmModels.paramsB))
    .all();

  const rawRefs = db
    .select()
    .from(schema.workloadReferences)
    .orderBy(asc(schema.workloadReferences.sortOrder), asc(schema.workloadReferences.label))
    .all();

  const configsByServer = new Map<string, ServerGpuConfigRow[]>();
  for (const c of rawConfigs) {
    const list = configsByServer.get(c.serverId) ?? [];
    list.push({
      id: c.id,
      serverId: c.serverId,
      gpuId: c.gpuId,
      gpuCount: c.gpuCount,
      interconnect: c.interconnect,
      listPriceUsd: c.listPriceUsd,
      isDefault: c.isDefault === 1,
    });
    configsByServer.set(c.serverId, list);
  }

  _cache = {
    gpus: rawGpus.map((g) => ({
      id: g.id,
      vendor: g.vendor,
      family: g.family,
      model: g.model,
      vramGb: g.vramGb,
      memoryType: g.memoryType,
      memoryBandwidthGbps: g.memoryBandwidthGbps,
      fp16Tflops: g.fp16Tflops,
      bf16Tflops: g.bf16Tflops,
      fp8Tflops: g.fp8Tflops,
      int8Tops: g.int8Tops,
      int4Tops: g.int4Tops,
      tdpWatts: g.tdpWatts,
      interconnect: g.interconnectJson ? (JSON.parse(g.interconnectJson) as Record<string, unknown>) : null,
      supportedFeatures: g.supportedFeaturesJson ? (JSON.parse(g.supportedFeaturesJson) as string[]) : null,
      listPriceUsd: g.listPriceUsd,
      availability: g.availability,
      notes: g.notes,
      sources: g.sourcesJson ? (JSON.parse(g.sourcesJson) as string[]) : null,
      isDeprecated: g.isDeprecated === 1,
      origin: g.origin,
    })),
    servers: rawServers.map((s) => ({
      id: s.id,
      vendor: s.vendor,
      model: s.model,
      cpu: s.cpu,
      memoryGb: s.memoryGb,
      storage: s.storage,
      network: s.network,
      tdpWatts: s.tdpWatts,
      rackUnits: s.rackUnits,
      releaseYear: s.releaseYear,
      specSheetUrl: s.specSheetUrl,
      notes: s.notes,
      isDeprecated: s.isDeprecated === 1,
      origin: s.origin,
      gpuConfigs: configsByServer.get(s.id) ?? [],
    })),
    llmModels: rawModels.map((m) => ({
      id: m.id,
      family: m.family,
      name: m.name,
      paramsB: m.paramsB,
      architecture: m.architecture,
      activeParamsB: m.activeParamsB,
      layers: m.layers,
      hiddenSize: m.hiddenSize,
      numKvHeads: m.numKvHeads,
      headDim: m.headDim,
      contextLengthMax: m.contextLengthMax,
      quantizationsSupported: m.quantizationsSupportedJson
        ? (JSON.parse(m.quantizationsSupportedJson) as string[])
        : null,
      releaseDate: m.releaseDate,
      huggingfaceId: m.huggingfaceId,
      notes: m.notes,
      isDeprecated: m.isDeprecated === 1,
      origin: m.origin,
    })),
    workloadReferences: rawRefs.map((r) => ({
      id: r.id,
      label: r.label,
      url: r.url,
      description: r.description,
      sortOrder: r.sortOrder,
      isDeprecated: r.isDeprecated === 1,
      origin: r.origin,
    })),
  };

  return _cache;
}

export function listGpus(includeDeprecated = false): GpuRow[] {
  const { gpus } = getCache();
  return includeDeprecated ? gpus : gpus.filter((g) => !g.isDeprecated);
}

export function listServers(includeDeprecated = false): ServerRow[] {
  const { servers } = getCache();
  return includeDeprecated ? servers : servers.filter((s) => !s.isDeprecated);
}

export function listLlmModels(includeDeprecated = false): LlmModelRow[] {
  const { llmModels } = getCache();
  return includeDeprecated ? llmModels : llmModels.filter((m) => !m.isDeprecated);
}

export function listWorkloadReferences(includeDeprecated = false): WorkloadReferenceRow[] {
  const { workloadReferences } = getCache();
  return includeDeprecated ? workloadReferences : workloadReferences.filter((r) => !r.isDeprecated);
}
