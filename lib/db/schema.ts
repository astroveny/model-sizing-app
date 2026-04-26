import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  customer: text("customer").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  dataJson: text("data_json").notNull().default("{}"),
});

export const rfpUploads = sqliteTable("rfp_uploads", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  uploadedAt: text("uploaded_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const explainCustom = sqliteTable("explain_custom", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  fieldId: text("field_id").notNull(),
  explain: text("explain").notNull(),
  example: text("example").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  projectId: text("project_id"),
  event: text("event").notNull(),
  payloadJson: text("payload_json").notNull().default("{}"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const configuredModels = sqliteTable("configured_models", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  provider: text("provider").notNull(), // 'anthropic' | 'openai-compatible'
  providerConfigEncrypted: text("provider_config_encrypted").notNull(),
  assignedFeaturesJson: text("assigned_features_json").notNull().default("[]"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  lastValidatedAt: text("last_validated_at"),
  isValid: integer("is_valid"), // 0 | 1 | null
});

export const settingsKv = sqliteTable("settings_kv", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// --- v0.5: dynamic catalogs ---

export const gpus = sqliteTable("gpus", {
  id: text("id").primaryKey(),
  vendor: text("vendor"),
  family: text("family"),
  model: text("model"),
  vramGb: real("vram_gb"),
  memoryType: text("memory_type"),
  memoryBandwidthGbps: real("memory_bandwidth_gbps"),
  fp16Tflops: real("fp16_tflops"),
  bf16Tflops: real("bf16_tflops"),
  fp8Tflops: real("fp8_tflops"),
  int8Tops: real("int8_tops"),
  int4Tops: real("int4_tops"),
  tdpWatts: integer("tdp_watts"),
  interconnectJson: text("interconnect_json"),
  supportedFeaturesJson: text("supported_features_json"),
  listPriceUsd: real("list_price_usd"),
  availability: text("availability"),
  notes: text("notes"),
  sourcesJson: text("sources_json"),
  isDeprecated: integer("is_deprecated").default(0),
  origin: text("origin").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const servers = sqliteTable("servers", {
  id: text("id").primaryKey(),
  vendor: text("vendor"),
  model: text("model"),
  cpu: text("cpu"),
  memoryGb: real("memory_gb"),
  storage: text("storage"),
  network: text("network"),
  tdpWatts: integer("tdp_watts"),
  rackUnits: integer("rack_units"),
  releaseYear: integer("release_year"),
  specSheetUrl: text("spec_sheet_url"),
  notes: text("notes"),
  isDeprecated: integer("is_deprecated").default(0),
  origin: text("origin").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const serverGpuConfigs = sqliteTable("server_gpu_configs", {
  id: text("id").primaryKey(),
  serverId: text("server_id")
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  gpuId: text("gpu_id").notNull(),
  gpuCount: integer("gpu_count").notNull(),
  interconnect: text("interconnect"),
  listPriceUsd: real("list_price_usd"),
  isDefault: integer("is_default").default(0),
});

export const llmModels = sqliteTable("llm_models", {
  id: text("id").primaryKey(),
  family: text("family"),
  name: text("name"),
  paramsB: real("params_b"),
  architecture: text("architecture"),
  activeParamsB: real("active_params_b"),
  layers: integer("layers"),
  hiddenSize: integer("hidden_size"),
  numKvHeads: integer("num_kv_heads"),
  headDim: integer("head_dim"),
  contextLengthMax: integer("context_length_max"),
  quantizationsSupportedJson: text("quantizations_supported_json"),
  releaseDate: text("release_date"),
  huggingfaceId: text("huggingface_id"),
  notes: text("notes"),
  isDeprecated: integer("is_deprecated").default(0),
  origin: text("origin").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const workloadReferences = sqliteTable("workload_references", {
  id: text("id").primaryKey(),
  label: text("label"),
  url: text("url"),
  description: text("description"),
  sortOrder: integer("sort_order"),
  isDeprecated: integer("is_deprecated").default(0),
  origin: text("origin").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
