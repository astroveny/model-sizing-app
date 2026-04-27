import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { invalidateCatalogCache } from "./index";

type Origin = "seed" | "seed-edited" | "user";

function nextOrigin(current: string): Origin {
  return current === "seed" ? "seed-edited" : (current as Origin);
}

function seedDir(): string {
  const baked = "/app/catalog-seed";
  return fs.existsSync(baked) ? baked : path.join(process.cwd(), "data", "seed");
}

function readSeed<T>(filename: string): T {
  const p = path.join(seedDir(), filename);
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

// ============================================================================
// GPU admin
// ============================================================================

export interface GpuWriteInput {
  id?: string;
  vendor?: string | null;
  family?: string | null;
  model?: string | null;
  vramGb?: number | null;
  memoryType?: string | null;
  memoryBandwidthGbps?: number | null;
  fp16Tflops?: number | null;
  bf16Tflops?: number | null;
  fp8Tflops?: number | null;
  int8Tops?: number | null;
  int4Tops?: number | null;
  tdpWatts?: number | null;
  interconnect?: Record<string, unknown> | null;
  supportedFeatures?: string[] | null;
  listPriceUsd?: number | null;
  availability?: string | null;
  notes?: string | null;
  sources?: string[] | null;
}

export function createGpu(input: GpuWriteInput): string {
  const db = getDb();
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  db.insert(schema.gpus).values({
    id,
    vendor: input.vendor ?? null,
    family: input.family ?? null,
    model: input.model ?? null,
    vramGb: input.vramGb ?? null,
    memoryType: input.memoryType ?? null,
    memoryBandwidthGbps: input.memoryBandwidthGbps ?? null,
    fp16Tflops: input.fp16Tflops ?? null,
    bf16Tflops: input.bf16Tflops ?? null,
    fp8Tflops: input.fp8Tflops ?? null,
    int8Tops: input.int8Tops ?? null,
    int4Tops: input.int4Tops ?? null,
    tdpWatts: input.tdpWatts ?? null,
    interconnectJson: input.interconnect != null ? JSON.stringify(input.interconnect) : null,
    supportedFeaturesJson: input.supportedFeatures != null ? JSON.stringify(input.supportedFeatures) : null,
    listPriceUsd: input.listPriceUsd ?? null,
    availability: input.availability ?? null,
    notes: input.notes ?? null,
    sourcesJson: input.sources != null ? JSON.stringify(input.sources) : null,
    isDeprecated: 0,
    origin: "user",
    createdAt: now,
    updatedAt: now,
  }).run();
  invalidateCatalogCache();
  return id;
}

export function updateGpu(id: string, patch: Omit<GpuWriteInput, "id">): void {
  const db = getDb();
  const row = db.select({ origin: schema.gpus.origin }).from(schema.gpus).where(eq(schema.gpus.id, id)).get();
  if (!row) throw new Error(`GPU not found: ${id}`);
  db.update(schema.gpus)
    .set({
      ...(patch.vendor !== undefined && { vendor: patch.vendor }),
      ...(patch.family !== undefined && { family: patch.family }),
      ...(patch.model !== undefined && { model: patch.model }),
      ...(patch.vramGb !== undefined && { vramGb: patch.vramGb }),
      ...(patch.memoryType !== undefined && { memoryType: patch.memoryType }),
      ...(patch.memoryBandwidthGbps !== undefined && { memoryBandwidthGbps: patch.memoryBandwidthGbps }),
      ...(patch.fp16Tflops !== undefined && { fp16Tflops: patch.fp16Tflops }),
      ...(patch.bf16Tflops !== undefined && { bf16Tflops: patch.bf16Tflops }),
      ...(patch.fp8Tflops !== undefined && { fp8Tflops: patch.fp8Tflops }),
      ...(patch.int8Tops !== undefined && { int8Tops: patch.int8Tops }),
      ...(patch.int4Tops !== undefined && { int4Tops: patch.int4Tops }),
      ...(patch.tdpWatts !== undefined && { tdpWatts: patch.tdpWatts }),
      ...(patch.interconnect !== undefined && {
        interconnectJson: patch.interconnect != null ? JSON.stringify(patch.interconnect) : null,
      }),
      ...(patch.supportedFeatures !== undefined && {
        supportedFeaturesJson: patch.supportedFeatures != null ? JSON.stringify(patch.supportedFeatures) : null,
      }),
      ...(patch.listPriceUsd !== undefined && { listPriceUsd: patch.listPriceUsd }),
      ...(patch.availability !== undefined && { availability: patch.availability }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
      ...(patch.sources !== undefined && {
        sourcesJson: patch.sources != null ? JSON.stringify(patch.sources) : null,
      }),
      origin: nextOrigin(row.origin),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.gpus.id, id))
    .run();
  invalidateCatalogCache();
}

export function deprecateGpu(id: string): void {
  const db = getDb();
  db.update(schema.gpus)
    .set({ isDeprecated: 1, updatedAt: new Date().toISOString() })
    .where(eq(schema.gpus.id, id))
    .run();
  invalidateCatalogCache();
}

export function deleteGpu(id: string): void {
  const db = getDb();
  const row = db.select({ origin: schema.gpus.origin }).from(schema.gpus).where(eq(schema.gpus.id, id)).get();
  if (!row) throw new Error(`GPU not found: ${id}`);
  if (row.origin !== "user") throw new Error(`Cannot delete GPU with origin='${row.origin}'; deprecate it instead.`);
  db.delete(schema.gpus).where(eq(schema.gpus.id, id)).run();
  invalidateCatalogCache();
}

export function resetGpuToSeed(id: string): void {
  const db = getDb();
  type GpuSeed = { id: string; vendor?: string; family?: string; model?: string; vram_gb?: number; memory_type?: string; memory_bandwidth_gbps?: number; fp16_tflops?: number; bf16_tflops?: number; fp8_tflops?: number; int8_tops?: number; int4_tops?: number; tdp_watts?: number; interconnect?: unknown; supported_features?: unknown; list_price_usd?: number; availability?: string; notes?: string; sources?: unknown };
  const { gpus: entries } = readSeed<{ gpus: GpuSeed[] }>("gpus.seed.json");
  const entry = entries.find((g) => g.id === id);
  if (!entry) throw new Error(`GPU '${id}' not found in seed file.`);
  db.update(schema.gpus)
    .set({
      vendor: entry.vendor ?? null,
      family: entry.family ?? null,
      model: entry.model ?? null,
      vramGb: entry.vram_gb ?? null,
      memoryType: entry.memory_type ?? null,
      memoryBandwidthGbps: entry.memory_bandwidth_gbps ?? null,
      fp16Tflops: entry.fp16_tflops ?? null,
      bf16Tflops: entry.bf16_tflops ?? null,
      fp8Tflops: entry.fp8_tflops ?? null,
      int8Tops: entry.int8_tops ?? null,
      int4Tops: entry.int4_tops ?? null,
      tdpWatts: entry.tdp_watts ?? null,
      interconnectJson: entry.interconnect != null ? JSON.stringify(entry.interconnect) : null,
      supportedFeaturesJson: entry.supported_features != null ? JSON.stringify(entry.supported_features) : null,
      listPriceUsd: entry.list_price_usd ?? null,
      availability: entry.availability ?? null,
      notes: entry.notes ?? null,
      sourcesJson: entry.sources != null ? JSON.stringify(entry.sources) : null,
      isDeprecated: 0,
      origin: "seed",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.gpus.id, id))
    .run();
  invalidateCatalogCache();
}

// ============================================================================
// Server admin
// ============================================================================

export interface ServerGpuConfigInput {
  id?: string;
  gpuId: string;
  gpuCount: number;
  interconnect?: string | null;
  listPriceUsd?: number | null;
  isDefault?: boolean;
}

export interface ServerWriteInput {
  id?: string;
  vendor?: string | null;
  model?: string | null;
  cpu?: string | null;
  memoryGb?: number | null;
  storage?: string | null;
  network?: string | null;
  tdpWatts?: number | null;
  rackUnits?: number | null;
  releaseYear?: number | null;
  specSheetUrl?: string | null;
  notes?: string | null;
  gpuConfigs?: ServerGpuConfigInput[];
}

export function createServer(input: ServerWriteInput): string {
  const db = getDb();
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  db.insert(schema.servers).values({
    id,
    vendor: input.vendor ?? null,
    model: input.model ?? null,
    cpu: input.cpu ?? null,
    memoryGb: input.memoryGb ?? null,
    storage: input.storage ?? null,
    network: input.network ?? null,
    tdpWatts: input.tdpWatts ?? null,
    rackUnits: input.rackUnits ?? null,
    releaseYear: input.releaseYear ?? null,
    specSheetUrl: input.specSheetUrl ?? null,
    notes: input.notes ?? null,
    isDeprecated: 0,
    origin: "user",
    createdAt: now,
    updatedAt: now,
  }).run();
  for (const cfg of input.gpuConfigs ?? []) {
    db.insert(schema.serverGpuConfigs).values({
      id: cfg.id ?? crypto.randomUUID(),
      serverId: id,
      gpuId: cfg.gpuId,
      gpuCount: cfg.gpuCount,
      interconnect: cfg.interconnect ?? null,
      listPriceUsd: cfg.listPriceUsd ?? null,
      isDefault: cfg.isDefault ? 1 : 0,
    }).run();
  }
  invalidateCatalogCache();
  return id;
}

export function updateServer(id: string, patch: Omit<ServerWriteInput, "id">): void {
  const db = getDb();
  const row = db.select({ origin: schema.servers.origin }).from(schema.servers).where(eq(schema.servers.id, id)).get();
  if (!row) throw new Error(`Server not found: ${id}`);
  db.update(schema.servers)
    .set({
      ...(patch.vendor !== undefined && { vendor: patch.vendor }),
      ...(patch.model !== undefined && { model: patch.model }),
      ...(patch.cpu !== undefined && { cpu: patch.cpu }),
      ...(patch.memoryGb !== undefined && { memoryGb: patch.memoryGb }),
      ...(patch.storage !== undefined && { storage: patch.storage }),
      ...(patch.network !== undefined && { network: patch.network }),
      ...(patch.tdpWatts !== undefined && { tdpWatts: patch.tdpWatts }),
      ...(patch.rackUnits !== undefined && { rackUnits: patch.rackUnits }),
      ...(patch.releaseYear !== undefined && { releaseYear: patch.releaseYear }),
      ...(patch.specSheetUrl !== undefined && { specSheetUrl: patch.specSheetUrl }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
      origin: nextOrigin(row.origin),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.servers.id, id))
    .run();
  if (patch.gpuConfigs !== undefined) {
    db.delete(schema.serverGpuConfigs).where(eq(schema.serverGpuConfigs.serverId, id)).run();
    for (const cfg of patch.gpuConfigs) {
      db.insert(schema.serverGpuConfigs).values({
        id: cfg.id ?? crypto.randomUUID(),
        serverId: id,
        gpuId: cfg.gpuId,
        gpuCount: cfg.gpuCount,
        interconnect: cfg.interconnect ?? null,
        listPriceUsd: cfg.listPriceUsd ?? null,
        isDefault: cfg.isDefault ? 1 : 0,
      }).run();
    }
  }
  invalidateCatalogCache();
}

export function deprecateServer(id: string): void {
  const db = getDb();
  db.update(schema.servers)
    .set({ isDeprecated: 1, updatedAt: new Date().toISOString() })
    .where(eq(schema.servers.id, id))
    .run();
  invalidateCatalogCache();
}

export function deleteServer(id: string): void {
  const db = getDb();
  const row = db.select({ origin: schema.servers.origin }).from(schema.servers).where(eq(schema.servers.id, id)).get();
  if (!row) throw new Error(`Server not found: ${id}`);
  if (row.origin !== "user") throw new Error(`Cannot delete server with origin='${row.origin}'; deprecate it instead.`);
  db.delete(schema.servers).where(eq(schema.servers.id, id)).run();
  invalidateCatalogCache();
}

export function resetServerToSeed(id: string): void {
  const db = getDb();
  type CfgSeed = { id: string; gpu_id: string; gpu_count: number; interconnect?: string; list_price_usd?: number | null; is_default?: number };
  type ServerSeed = { id: string; vendor?: string; model?: string; cpu?: string; memory_gb?: number; storage?: string; network?: string; tdp_watts?: number; rack_units?: number; release_year?: number; spec_sheet_url?: string; notes?: string; gpu_configs: CfgSeed[] };
  const { servers: entries } = readSeed<{ servers: ServerSeed[] }>("servers.seed.json");
  const entry = entries.find((s) => s.id === id);
  if (!entry) throw new Error(`Server '${id}' not found in seed file.`);
  db.update(schema.servers)
    .set({
      vendor: entry.vendor ?? null,
      model: entry.model ?? null,
      cpu: entry.cpu ?? null,
      memoryGb: entry.memory_gb ?? null,
      storage: entry.storage ?? null,
      network: entry.network ?? null,
      tdpWatts: entry.tdp_watts ?? null,
      rackUnits: entry.rack_units ?? null,
      releaseYear: entry.release_year ?? null,
      specSheetUrl: entry.spec_sheet_url ?? null,
      notes: entry.notes ?? null,
      isDeprecated: 0,
      origin: "seed",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.servers.id, id))
    .run();
  db.delete(schema.serverGpuConfigs).where(eq(schema.serverGpuConfigs.serverId, id)).run();
  for (const cfg of entry.gpu_configs) {
    db.insert(schema.serverGpuConfigs).values({
      id: cfg.id,
      serverId: id,
      gpuId: cfg.gpu_id,
      gpuCount: cfg.gpu_count,
      interconnect: cfg.interconnect ?? null,
      listPriceUsd: cfg.list_price_usd ?? null,
      isDefault: cfg.is_default ?? 0,
    }).run();
  }
  invalidateCatalogCache();
}

// ============================================================================
// LLM Model admin
// ============================================================================

export interface LlmModelWriteInput {
  id?: string;
  family?: string | null;
  name?: string | null;
  paramsB?: number | null;
  architecture?: string | null;
  activeParamsB?: number | null;
  layers?: number | null;
  hiddenSize?: number | null;
  numKvHeads?: number | null;
  headDim?: number | null;
  contextLengthMax?: number | null;
  quantizationsSupported?: string[] | null;
  releaseDate?: string | null;
  huggingfaceId?: string | null;
  notes?: string | null;
}

export function createLlmModel(input: LlmModelWriteInput): string {
  const db = getDb();
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  db.insert(schema.llmModels).values({
    id,
    family: input.family ?? null,
    name: input.name ?? null,
    paramsB: input.paramsB ?? null,
    architecture: input.architecture ?? null,
    activeParamsB: input.activeParamsB ?? null,
    layers: input.layers ?? null,
    hiddenSize: input.hiddenSize ?? null,
    numKvHeads: input.numKvHeads ?? null,
    headDim: input.headDim ?? null,
    contextLengthMax: input.contextLengthMax ?? null,
    quantizationsSupportedJson: input.quantizationsSupported != null ? JSON.stringify(input.quantizationsSupported) : null,
    releaseDate: input.releaseDate ?? null,
    huggingfaceId: input.huggingfaceId ?? null,
    notes: input.notes ?? null,
    isDeprecated: 0,
    origin: "user",
    createdAt: now,
    updatedAt: now,
  }).run();
  invalidateCatalogCache();
  return id;
}

export function updateLlmModel(id: string, patch: Omit<LlmModelWriteInput, "id">): void {
  const db = getDb();
  const row = db.select({ origin: schema.llmModels.origin }).from(schema.llmModels).where(eq(schema.llmModels.id, id)).get();
  if (!row) throw new Error(`LLM model not found: ${id}`);
  db.update(schema.llmModels)
    .set({
      ...(patch.family !== undefined && { family: patch.family }),
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.paramsB !== undefined && { paramsB: patch.paramsB }),
      ...(patch.architecture !== undefined && { architecture: patch.architecture }),
      ...(patch.activeParamsB !== undefined && { activeParamsB: patch.activeParamsB }),
      ...(patch.layers !== undefined && { layers: patch.layers }),
      ...(patch.hiddenSize !== undefined && { hiddenSize: patch.hiddenSize }),
      ...(patch.numKvHeads !== undefined && { numKvHeads: patch.numKvHeads }),
      ...(patch.headDim !== undefined && { headDim: patch.headDim }),
      ...(patch.contextLengthMax !== undefined && { contextLengthMax: patch.contextLengthMax }),
      ...(patch.quantizationsSupported !== undefined && {
        quantizationsSupportedJson: patch.quantizationsSupported != null ? JSON.stringify(patch.quantizationsSupported) : null,
      }),
      ...(patch.releaseDate !== undefined && { releaseDate: patch.releaseDate }),
      ...(patch.huggingfaceId !== undefined && { huggingfaceId: patch.huggingfaceId }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
      origin: nextOrigin(row.origin),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.llmModels.id, id))
    .run();
  invalidateCatalogCache();
}

export function deprecateLlmModel(id: string): void {
  const db = getDb();
  db.update(schema.llmModels)
    .set({ isDeprecated: 1, updatedAt: new Date().toISOString() })
    .where(eq(schema.llmModels.id, id))
    .run();
  invalidateCatalogCache();
}

export function deleteLlmModel(id: string): void {
  const db = getDb();
  const row = db.select({ origin: schema.llmModels.origin }).from(schema.llmModels).where(eq(schema.llmModels.id, id)).get();
  if (!row) throw new Error(`LLM model not found: ${id}`);
  if (row.origin !== "user") throw new Error(`Cannot delete LLM model with origin='${row.origin}'; deprecate it instead.`);
  db.delete(schema.llmModels).where(eq(schema.llmModels.id, id)).run();
  invalidateCatalogCache();
}

export function resetLlmModelToSeed(id: string): void {
  const db = getDb();
  type ModelSeed = { id: string; family?: string; name?: string; params_b?: number; architecture?: string; active_params_b?: number; layers?: number; hidden_size?: number; num_kv_heads?: number; head_dim?: number; context_length_max?: number; quantizations_supported?: unknown; release_date?: string; huggingface_id?: string; notes?: string };
  const { models: entries } = readSeed<{ models: ModelSeed[] }>("models.seed.json");
  const entry = entries.find((m) => m.id === id);
  if (!entry) throw new Error(`LLM model '${id}' not found in seed file.`);
  db.update(schema.llmModels)
    .set({
      family: entry.family ?? null,
      name: entry.name ?? null,
      paramsB: entry.params_b ?? null,
      architecture: entry.architecture ?? null,
      activeParamsB: entry.active_params_b ?? null,
      layers: entry.layers ?? null,
      hiddenSize: entry.hidden_size ?? null,
      numKvHeads: entry.num_kv_heads ?? null,
      headDim: entry.head_dim ?? null,
      contextLengthMax: entry.context_length_max ?? null,
      quantizationsSupportedJson: entry.quantizations_supported != null ? JSON.stringify(entry.quantizations_supported) : null,
      releaseDate: entry.release_date ?? null,
      huggingfaceId: entry.huggingface_id ?? null,
      notes: entry.notes ?? null,
      isDeprecated: 0,
      origin: "seed",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.llmModels.id, id))
    .run();
  invalidateCatalogCache();
}

// ============================================================================
// Workload Reference admin
// ============================================================================

export interface WorkloadReferenceWriteInput {
  id?: string;
  label?: string | null;
  url?: string | null;
  description?: string | null;
  sortOrder?: number | null;
}

export function createWorkloadReference(input: WorkloadReferenceWriteInput): string {
  const db = getDb();
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  db.insert(schema.workloadReferences).values({
    id,
    label: input.label ?? null,
    url: input.url ?? null,
    description: input.description ?? null,
    sortOrder: input.sortOrder ?? null,
    isDeprecated: 0,
    origin: "user",
    createdAt: now,
    updatedAt: now,
  }).run();
  invalidateCatalogCache();
  return id;
}

export function updateWorkloadReference(id: string, patch: Omit<WorkloadReferenceWriteInput, "id">): void {
  const db = getDb();
  const row = db.select({ origin: schema.workloadReferences.origin }).from(schema.workloadReferences).where(eq(schema.workloadReferences.id, id)).get();
  if (!row) throw new Error(`Workload reference not found: ${id}`);
  db.update(schema.workloadReferences)
    .set({
      ...(patch.label !== undefined && { label: patch.label }),
      ...(patch.url !== undefined && { url: patch.url }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.sortOrder !== undefined && { sortOrder: patch.sortOrder }),
      origin: nextOrigin(row.origin),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.workloadReferences.id, id))
    .run();
  invalidateCatalogCache();
}

export function deprecateWorkloadReference(id: string): void {
  const db = getDb();
  db.update(schema.workloadReferences)
    .set({ isDeprecated: 1, updatedAt: new Date().toISOString() })
    .where(eq(schema.workloadReferences.id, id))
    .run();
  invalidateCatalogCache();
}

export function deleteWorkloadReference(id: string): void {
  const db = getDb();
  const row = db.select({ origin: schema.workloadReferences.origin }).from(schema.workloadReferences).where(eq(schema.workloadReferences.id, id)).get();
  if (!row) throw new Error(`Workload reference not found: ${id}`);
  if (row.origin !== "user") throw new Error(`Cannot delete workload reference with origin='${row.origin}'; deprecate it instead.`);
  db.delete(schema.workloadReferences).where(eq(schema.workloadReferences.id, id)).run();
  invalidateCatalogCache();
}

export function resetWorkloadReferenceToSeed(id: string): void {
  const db = getDb();
  type RefSeed = { id: string; label?: string; url?: string; description?: string; sort_order?: number };
  const { workload_references: entries } = readSeed<{ workload_references: RefSeed[] }>("workload-references.seed.json");
  const entry = entries.find((r) => r.id === id);
  if (!entry) throw new Error(`Workload reference '${id}' not found in seed file.`);
  db.update(schema.workloadReferences)
    .set({
      label: entry.label ?? null,
      url: entry.url ?? null,
      description: entry.description ?? null,
      sortOrder: entry.sort_order ?? null,
      isDeprecated: 0,
      origin: "seed",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.workloadReferences.id, id))
    .run();
  invalidateCatalogCache();
}
