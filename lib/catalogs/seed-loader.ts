import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

function readSeed<T>(filename: string): T {
  const p = path.join(process.cwd(), "data", "seed", filename);
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

interface GpuSeedEntry {
  id: string;
  vendor?: string;
  family?: string;
  model?: string;
  vram_gb?: number;
  memory_type?: string;
  memory_bandwidth_gbps?: number;
  fp16_tflops?: number;
  bf16_tflops?: number;
  fp8_tflops?: number;
  int8_tops?: number;
  int4_tops?: number;
  tdp_watts?: number;
  interconnect?: unknown;
  supported_features?: unknown;
  list_price_usd?: number;
  availability?: string;
  notes?: string;
  sources?: unknown;
}

interface GpuConfigSeedEntry {
  id: string;
  gpu_id: string;
  gpu_count: number;
  is_default?: number;
  interconnect?: string;
  list_price_usd?: number | null;
}

interface ServerSeedEntry {
  id: string;
  vendor?: string;
  model?: string;
  cpu?: string;
  memory_gb?: number;
  storage?: string;
  network?: string;
  tdp_watts?: number;
  rack_units?: number;
  release_year?: number;
  spec_sheet_url?: string;
  notes?: string;
  gpu_configs: GpuConfigSeedEntry[];
}

interface ModelSeedEntry {
  id: string;
  family?: string;
  name?: string;
  params_b?: number;
  architecture?: string;
  active_params_b?: number;
  layers?: number;
  hidden_size?: number;
  num_kv_heads?: number;
  head_dim?: number;
  context_length_max?: number;
  quantizations_supported?: unknown;
  release_date?: string;
  huggingface_id?: string;
  notes?: string;
}

interface WorkloadRefSeedEntry {
  id: string;
  label?: string;
  url?: string;
  description?: string;
  sort_order?: number;
}

export function runSeedLoader(db: Db): void {
  const now = new Date().toISOString();

  try {
    const { gpus: gpuEntries } = readSeed<{ gpus: GpuSeedEntry[] }>("gpus.seed.json");
    for (const g of gpuEntries) {
      const exists = db.select({ id: schema.gpus.id }).from(schema.gpus).where(eq(schema.gpus.id, g.id)).get();
      if (!exists) {
        db.insert(schema.gpus).values({
          id: g.id,
          vendor: g.vendor ?? null,
          family: g.family ?? null,
          model: g.model ?? null,
          vramGb: g.vram_gb ?? null,
          memoryType: g.memory_type ?? null,
          memoryBandwidthGbps: g.memory_bandwidth_gbps ?? null,
          fp16Tflops: g.fp16_tflops ?? null,
          bf16Tflops: g.bf16_tflops ?? null,
          fp8Tflops: g.fp8_tflops ?? null,
          int8Tops: g.int8_tops ?? null,
          int4Tops: g.int4_tops ?? null,
          tdpWatts: g.tdp_watts ?? null,
          interconnectJson: g.interconnect != null ? JSON.stringify(g.interconnect) : null,
          supportedFeaturesJson: g.supported_features != null ? JSON.stringify(g.supported_features) : null,
          listPriceUsd: g.list_price_usd ?? null,
          availability: g.availability ?? null,
          notes: g.notes ?? null,
          sourcesJson: g.sources != null ? JSON.stringify(g.sources) : null,
          isDeprecated: 0,
          origin: "seed",
          createdAt: now,
          updatedAt: now,
        }).run();
      }
    }
  } catch (err) {
    console.warn("[seed-loader] gpus:", err instanceof Error ? err.message : err);
  }

  try {
    const { servers: serverEntries } = readSeed<{ servers: ServerSeedEntry[] }>("servers.seed.json");
    for (const s of serverEntries) {
      const exists = db.select({ id: schema.servers.id }).from(schema.servers).where(eq(schema.servers.id, s.id)).get();
      if (!exists) {
        db.insert(schema.servers).values({
          id: s.id,
          vendor: s.vendor ?? null,
          model: s.model ?? null,
          cpu: s.cpu ?? null,
          memoryGb: s.memory_gb ?? null,
          storage: s.storage ?? null,
          network: s.network ?? null,
          tdpWatts: s.tdp_watts ?? null,
          rackUnits: s.rack_units ?? null,
          releaseYear: s.release_year ?? null,
          specSheetUrl: s.spec_sheet_url ?? null,
          notes: s.notes ?? null,
          isDeprecated: 0,
          origin: "seed",
          createdAt: now,
          updatedAt: now,
        }).run();

        for (const cfg of s.gpu_configs) {
          db.insert(schema.serverGpuConfigs).values({
            id: cfg.id,
            serverId: s.id,
            gpuId: cfg.gpu_id,
            gpuCount: cfg.gpu_count,
            interconnect: cfg.interconnect ?? null,
            listPriceUsd: cfg.list_price_usd ?? null,
            isDefault: cfg.is_default ?? 0,
          }).run();
        }
      }
    }
  } catch (err) {
    console.warn("[seed-loader] servers:", err instanceof Error ? err.message : err);
  }

  try {
    const { models: modelEntries } = readSeed<{ models: ModelSeedEntry[] }>("models.seed.json");
    for (const m of modelEntries) {
      const exists = db.select({ id: schema.llmModels.id }).from(schema.llmModels).where(eq(schema.llmModels.id, m.id)).get();
      if (!exists) {
        db.insert(schema.llmModels).values({
          id: m.id,
          family: m.family ?? null,
          name: m.name ?? null,
          paramsB: m.params_b ?? null,
          architecture: m.architecture ?? null,
          activeParamsB: m.active_params_b ?? null,
          layers: m.layers ?? null,
          hiddenSize: m.hidden_size ?? null,
          numKvHeads: m.num_kv_heads ?? null,
          headDim: m.head_dim ?? null,
          contextLengthMax: m.context_length_max ?? null,
          quantizationsSupportedJson: m.quantizations_supported != null ? JSON.stringify(m.quantizations_supported) : null,
          releaseDate: m.release_date ?? null,
          huggingfaceId: m.huggingface_id ?? null,
          notes: m.notes ?? null,
          isDeprecated: 0,
          origin: "seed",
          createdAt: now,
          updatedAt: now,
        }).run();
      }
    }
  } catch (err) {
    console.warn("[seed-loader] models:", err instanceof Error ? err.message : err);
  }

  try {
    const { workload_references: refEntries } = readSeed<{ workload_references: WorkloadRefSeedEntry[] }>("workload-references.seed.json");
    for (const r of refEntries) {
      const exists = db.select({ id: schema.workloadReferences.id }).from(schema.workloadReferences).where(eq(schema.workloadReferences.id, r.id)).get();
      if (!exists) {
        db.insert(schema.workloadReferences).values({
          id: r.id,
          label: r.label ?? null,
          url: r.url ?? null,
          description: r.description ?? null,
          sortOrder: r.sort_order ?? null,
          isDeprecated: 0,
          origin: "seed",
          createdAt: now,
          updatedAt: now,
        }).run();
      }
    }
  } catch (err) {
    console.warn("[seed-loader] workload_references:", err instanceof Error ? err.message : err);
  }

  console.log("[seed-loader] catalog seed complete");
}
