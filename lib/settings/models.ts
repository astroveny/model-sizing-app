import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getDb } from "@/lib/db/client";
import { configuredModels } from "@/lib/db/schema";
import { encrypt, decrypt, maskApiKey } from "@/lib/utils/crypto";
import { getLlmProviderFromConfig } from "@/lib/llm/factory";
import type { LlmFeatureId } from "@/lib/settings/routing";

export type ProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  model: string;
};

export type ConfiguredModelDTO = {
  id: string;
  label: string;
  provider: "anthropic" | "openai-compatible";
  providerConfig: {
    apiKeyMasked?: string; // never plaintext
    baseUrl?: string;
    model: string;
  };
  assignedFeatures: LlmFeatureId[];
  createdAt: string;
  updatedAt: string;
  isValid: boolean | null;
  lastValidatedAt: string | null;
};

export type CreateModelInput = {
  label: string;
  provider: "anthropic" | "openai-compatible";
  providerConfig: ProviderConfig;
};

type ModelRow = typeof configuredModels.$inferSelect;

function rowToDto(row: ModelRow): ConfiguredModelDTO {
  let providerConfig: ProviderConfig = { model: "" };
  let apiKeyMasked: string | undefined;
  try {
    providerConfig = JSON.parse(decrypt(row.providerConfigEncrypted)) as ProviderConfig;
    if (providerConfig.apiKey) {
      apiKeyMasked = maskApiKey(providerConfig.apiKey);
    }
  } catch {
    // decryption failure — return partial DTO; caller surfaces the error
  }

  return {
    id: row.id,
    label: row.label,
    provider: row.provider as "anthropic" | "openai-compatible",
    providerConfig: {
      apiKeyMasked,
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.model,
    },
    assignedFeatures: JSON.parse(row.assignedFeaturesJson) as LlmFeatureId[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isValid: row.isValid === null ? null : row.isValid === 1,
    lastValidatedAt: row.lastValidatedAt ?? null,
  };
}

export function listModels(): ConfiguredModelDTO[] {
  const rows = getDb().select().from(configuredModels).all();
  return rows.map(rowToDto);
}

export function getModel(id: string): ConfiguredModelDTO | null {
  const row = getDb().select().from(configuredModels).where(eq(configuredModels.id, id)).get();
  return row ? rowToDto(row) : null;
}

/** Returns the plaintext ProviderConfig — for internal use only (provider instantiation). */
export function getModelConfig(id: string): (ProviderConfig & { provider: string }) | null {
  const row = getDb().select().from(configuredModels).where(eq(configuredModels.id, id)).get();
  if (!row) return null;
  try {
    const config = JSON.parse(decrypt(row.providerConfigEncrypted)) as ProviderConfig;
    return { ...config, provider: row.provider };
  } catch {
    return null;
  }
}

export function createModel(input: CreateModelInput): ConfiguredModelDTO {
  const id = uuid();
  const encrypted = encrypt(JSON.stringify(input.providerConfig));
  const now = new Date().toISOString();
  getDb().insert(configuredModels).values({
    id,
    label: input.label,
    provider: input.provider,
    providerConfigEncrypted: encrypted,
    assignedFeaturesJson: "[]",
    createdAt: now,
    updatedAt: now,
  }).run();
  return getModel(id)!;
}

export type UpdateModelInput = {
  label?: string;
  provider?: "anthropic" | "openai-compatible";
  /** Pass undefined to leave API key unchanged; pass a new key to rotate it. */
  providerConfig?: Partial<ProviderConfig>;
};

export function updateModel(id: string, patch: UpdateModelInput): ConfiguredModelDTO {
  const row = getDb().select().from(configuredModels).where(eq(configuredModels.id, id)).get();
  if (!row) throw new Error(`Model ${id} not found`);

  let encrypted = row.providerConfigEncrypted;
  if (patch.providerConfig) {
    const existing = JSON.parse(decrypt(row.providerConfigEncrypted)) as ProviderConfig;
    const merged: ProviderConfig = {
      ...existing,
      ...patch.providerConfig,
      // Don't overwrite key if caller passes empty string
      apiKey: patch.providerConfig.apiKey?.trim()
        ? patch.providerConfig.apiKey
        : existing.apiKey,
    };
    encrypted = encrypt(JSON.stringify(merged));
  }

  getDb().update(configuredModels).set({
    ...(patch.label && { label: patch.label }),
    ...(patch.provider && { provider: patch.provider }),
    providerConfigEncrypted: encrypted,
    updatedAt: new Date().toISOString(),
  }).where(eq(configuredModels.id, id)).run();

  return getModel(id)!;
}

export function deleteModel(id: string): void {
  getDb().delete(configuredModels).where(eq(configuredModels.id, id)).run();
}

export type TestResult = { ok: true } | { ok: false; error: string };

export async function testModel(id: string): Promise<TestResult> {
  const config = getModelConfig(id);
  if (!config) return { ok: false, error: "Model not found or credentials unreadable" };

  try {
    const provider = getLlmProviderFromConfig({
      provider: config.provider as "anthropic" | "openai-compatible",
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
    });
    await provider.complete({
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 5,
    });
    const now = new Date().toISOString();
    getDb().update(configuredModels).set({ isValid: 1, lastValidatedAt: now, updatedAt: now })
      .where(eq(configuredModels.id, id)).run();
    return { ok: true };
  } catch (err) {
    const now = new Date().toISOString();
    getDb().update(configuredModels).set({ isValid: 0, lastValidatedAt: now, updatedAt: now })
      .where(eq(configuredModels.id, id)).run();
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
