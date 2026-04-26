import { describe, it, expect, afterAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import path from "path";
import * as schema from "@/lib/db/schema";
import { runSeedLoader } from "@/lib/catalogs/seed-loader";

function buildTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "lib/db/migrations") });
  return { db, sqlite };
}

describe("runSeedLoader", () => {
  const { db, sqlite } = buildTestDb();
  afterAll(() => sqlite.close());

  it("seeds all 4 catalog tables on first boot", () => {
    runSeedLoader(db);

    const gpus = db.select().from(schema.gpus).all();
    const servers = db.select().from(schema.servers).all();
    const configs = db.select().from(schema.serverGpuConfigs).all();
    const models = db.select().from(schema.llmModels).all();
    const refs = db.select().from(schema.workloadReferences).all();

    expect(gpus.length).toBeGreaterThan(0);
    expect(servers.length).toBeGreaterThan(0);
    expect(configs.length).toBeGreaterThan(servers.length); // each server has ≥1 config
    expect(models.length).toBeGreaterThan(0);
    expect(refs.length).toBeGreaterThan(0);
  });

  it("all seed rows have origin='seed'", () => {
    const gpus = db.select({ origin: schema.gpus.origin }).from(schema.gpus).all();
    const servers = db.select({ origin: schema.servers.origin }).from(schema.servers).all();
    const models = db.select({ origin: schema.llmModels.origin }).from(schema.llmModels).all();
    const refs = db.select({ origin: schema.workloadReferences.origin }).from(schema.workloadReferences).all();

    expect(gpus.every((r) => r.origin === "seed")).toBe(true);
    expect(servers.every((r) => r.origin === "seed")).toBe(true);
    expect(models.every((r) => r.origin === "seed")).toBe(true);
    expect(refs.every((r) => r.origin === "seed")).toBe(true);
  });

  it("is idempotent — second call inserts nothing new", () => {
    const before = db.select().from(schema.gpus).all().length;
    runSeedLoader(db);
    const after = db.select().from(schema.gpus).all().length;
    expect(after).toBe(before);
  });

  it("each server has at least one default gpu_config", () => {
    const servers = db.select({ id: schema.servers.id }).from(schema.servers).all();
    for (const s of servers) {
      const defaults = db
        .select()
        .from(schema.serverGpuConfigs)
        .where(eq(schema.serverGpuConfigs.serverId, s.id))
        .all()
        .filter((c) => c.isDefault === 1);
      expect(defaults.length, `server ${s.id} has no default config`).toBeGreaterThanOrEqual(1);
    }
  });
});
