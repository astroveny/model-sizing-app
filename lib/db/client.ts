import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

// Lazy singleton — avoids opening the file during next build when data/ doesn't exist
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const dbPath = path.join(process.cwd(), "data", "ml-sizer.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite, { schema });
    runStartupMigrations(_db);
  }
  return _db;
}

// Convenience re-export for callers that prefer `db.select()...` style
export { getDb as db };

/**
 * P10.7 — Backward-compat migration.
 * If configured_models is empty AND .env has LLM_PROVIDER set,
 * auto-create a default ConfiguredModel and assign it to all features.
 * Idempotent — safe to run on every boot.
 */
function runStartupMigrations(db: ReturnType<typeof drizzle<typeof schema>>) {
  try {
    const count = db.select().from(schema.configuredModels).all().length;
    if (count > 0) return; // already configured

    const provider = process.env.LLM_PROVIDER;
    if (!provider) return; // nothing to migrate

    const { v4: uuid } = require("uuid") as typeof import("uuid");
    const { encrypt } = require("../utils/crypto") as typeof import("../utils/crypto");

    let providerConfig: Record<string, string> = { model: "claude-sonnet-4-6" };
    if (provider === "anthropic") {
      providerConfig = {
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
        ...(process.env.ANTHROPIC_API_KEY ? { apiKey: process.env.ANTHROPIC_API_KEY } : {}),
      };
    } else if (provider === "openai-compatible") {
      providerConfig = {
        model: process.env.OPENAI_COMPATIBLE_MODEL ?? "",
        baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL ?? "",
        ...(process.env.OPENAI_COMPATIBLE_API_KEY ? { apiKey: process.env.OPENAI_COMPATIBLE_API_KEY } : {}),
      };
    }

    const allFeatures = [
      "rfp-extract", "rfi-draft-response", "explain-field",
      "explain-sizing", "build-report-summary", "quick-sizing-assist",
    ];

    const id = uuid();
    const now = new Date().toISOString();
    db.insert(schema.configuredModels).values({
      id,
      label: "Default (from .env)",
      provider,
      providerConfigEncrypted: encrypt(JSON.stringify(providerConfig)),
      assignedFeaturesJson: JSON.stringify(allFeatures),
      createdAt: now,
      updatedAt: now,
    }).run();

    console.log(`[ml-sizer] Migrated .env LLM config to configured_models (id: ${id}). All features assigned.`);
  } catch (err) {
    // Non-fatal — app still works with .env fallback
    console.warn("[ml-sizer] Startup migration skipped:", err instanceof Error ? err.message : err);
  }
}
