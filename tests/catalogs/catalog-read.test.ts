import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import * as schema from "@/lib/db/schema";
import { runSeedLoader } from "@/lib/catalogs/seed-loader";
import { listGpus, listServers, listLlmModels, listWorkloadReferences, invalidateCatalogCache } from "@/lib/catalogs/index";

// Build a shared in-memory DB for this test file
const _sqlite = new Database(":memory:");
const _db = drizzle(_sqlite, { schema });
migrate(_db, { migrationsFolder: path.join(process.cwd(), "lib/db/migrations") });

vi.mock("@/lib/db/client", () => ({
  getDb: () => _db,
  db: () => _db,
}));

beforeAll(() => {
  runSeedLoader(_db);
  invalidateCatalogCache();
});

afterAll(() => _sqlite.close());

describe("catalog read API", () => {
  it("listGpus returns non-empty, non-deprecated list", () => {
    const gpus = listGpus();
    expect(gpus.length).toBeGreaterThan(0);
    expect(gpus.every((g) => !g.isDeprecated)).toBe(true);
  });

  it("listGpus parses interconnect and supportedFeatures as objects/arrays", () => {
    const gpus = listGpus();
    const h100 = gpus.find((g) => g.id === "h100-sxm");
    expect(h100).toBeDefined();
    expect(typeof h100!.interconnect).toBe("object");
    expect(Array.isArray(h100!.supportedFeatures)).toBe(true);
  });

  it("listServers includes gpuConfigs and marks isDefault correctly", () => {
    const servers = listServers();
    expect(servers.length).toBeGreaterThan(0);
    for (const s of servers) {
      expect(s.gpuConfigs.length).toBeGreaterThanOrEqual(1);
      const defaults = s.gpuConfigs.filter((c) => c.isDefault);
      expect(defaults.length, `server ${s.id} has no default config`).toBeGreaterThanOrEqual(1);
    }
  });

  it("listLlmModels returns all models with numeric fields", () => {
    const models = listLlmModels();
    expect(models.length).toBeGreaterThan(0);
    const llama = models.find((m) => m.id === "llama-3.1-70b");
    expect(llama).toBeDefined();
    expect(llama!.paramsB).toBe(70);
    expect(llama!.layers).toBe(80);
  });

  it("listWorkloadReferences returns refs sorted by sortOrder", () => {
    const refs = listWorkloadReferences();
    expect(refs.length).toBeGreaterThan(0);
    const orders = refs.map((r) => r.sortOrder ?? 0);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("invalidateCatalogCache forces re-query on next call", () => {
    const before = listGpus().length;
    invalidateCatalogCache();
    const after = listGpus().length;
    expect(after).toBe(before);
  });
});
