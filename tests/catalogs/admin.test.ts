/**
 * P13.5 — Catalog write API tests.
 * Covers origin transitions, delete guards, reset-to-seed, and GPU config replacement.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import * as schema from "@/lib/db/schema";
import { runSeedLoader } from "@/lib/catalogs/seed-loader";
import { listGpus, listServers, listLlmModels, listWorkloadReferences, invalidateCatalogCache } from "@/lib/catalogs/index";
import {
  createGpu, updateGpu, deprecateGpu, deleteGpu, resetGpuToSeed,
  createServer, updateServer, deprecateServer, deleteServer, resetServerToSeed,
  createLlmModel, updateLlmModel, deprecateLlmModel, deleteLlmModel, resetLlmModelToSeed,
  createWorkloadReference, updateWorkloadReference, deprecateWorkloadReference,
  deleteWorkloadReference, resetWorkloadReferenceToSeed,
} from "@/lib/catalogs/admin";

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

// ============================================================================
// GPU
// ============================================================================

describe("GPU admin", () => {
  it("createGpu inserts with origin='user' and appears in list", () => {
    const id = createGpu({ model: "Test GPU", vramGb: 24, vendor: "nvidia", family: "test" });
    const gpus = listGpus(true);
    const g = gpus.find((g) => g.id === id);
    expect(g).toBeDefined();
    expect(g!.origin).toBe("user");
    expect(g!.vramGb).toBe(24);
  });

  it("updateGpu on a user row keeps origin='user'", () => {
    const id = createGpu({ model: "Update Test", vendor: "amd" });
    updateGpu(id, { model: "Updated Name" });
    const g = listGpus(true).find((g) => g.id === id);
    expect(g!.model).toBe("Updated Name");
    expect(g!.origin).toBe("user");
  });

  it("updateGpu on a seed row transitions origin to 'seed-edited'", () => {
    const seedGpu = listGpus().find((g) => g.origin === "seed");
    expect(seedGpu).toBeDefined();
    updateGpu(seedGpu!.id, { notes: "custom note" });
    const g = listGpus(true).find((g) => g.id === seedGpu!.id);
    expect(g!.origin).toBe("seed-edited");
    expect(g!.notes).toBe("custom note");
  });

  it("deprecateGpu hides the row from default list but keeps it in full list", () => {
    const id = createGpu({ model: "Deprecation Target", vendor: "nvidia" });
    deprecateGpu(id);
    expect(listGpus().find((g) => g.id === id)).toBeUndefined();
    expect(listGpus(true).find((g) => g.id === id)).toBeDefined();
  });

  it("deleteGpu removes a user row", () => {
    const id = createGpu({ model: "To Delete", vendor: "amd" });
    deleteGpu(id);
    expect(listGpus(true).find((g) => g.id === id)).toBeUndefined();
  });

  it("deleteGpu throws for seed rows", () => {
    const seedGpu = listGpus().find((g) => g.origin === "seed");
    expect(seedGpu).toBeDefined();
    // pick a different seed row that hasn't been edited above
    const untouched = listGpus().filter((g) => g.origin === "seed");
    expect(untouched.length).toBeGreaterThan(0);
    expect(() => deleteGpu(untouched[0].id)).toThrow(/deprecate/);
  });

  it("deleteGpu throws for seed-edited rows", () => {
    const edited = listGpus(true).find((g) => g.origin === "seed-edited");
    expect(edited).toBeDefined();
    expect(() => deleteGpu(edited!.id)).toThrow(/deprecate/);
  });

  it("resetGpuToSeed restores original values and sets origin='seed'", () => {
    const seedGpu = listGpus().find((g) => g.id === "h100-sxm");
    expect(seedGpu).toBeDefined();
    updateGpu("h100-sxm", { notes: "OVERRIDDEN" });
    expect(listGpus(true).find((g) => g.id === "h100-sxm")!.origin).toBe("seed-edited");
    resetGpuToSeed("h100-sxm");
    const restored = listGpus(true).find((g) => g.id === "h100-sxm");
    expect(restored!.origin).toBe("seed");
    expect(restored!.notes).not.toBe("OVERRIDDEN");
  });
});

// ============================================================================
// Server
// ============================================================================

describe("Server admin", () => {
  it("createServer inserts server + gpu configs with origin='user'", () => {
    const id = createServer({
      model: "Test Server", vendor: "dell", rackUnits: 2,
      gpuConfigs: [
        { gpuId: "h100-sxm", gpuCount: 8, isDefault: true, listPriceUsd: 350000 },
      ],
    });
    const servers = listServers(true);
    const s = servers.find((s) => s.id === id);
    expect(s).toBeDefined();
    expect(s!.origin).toBe("user");
    expect(s!.gpuConfigs.length).toBe(1);
    expect(s!.gpuConfigs[0].gpuCount).toBe(8);
    expect(s!.gpuConfigs[0].isDefault).toBe(true);
  });

  it("updateServer on a seed row transitions to 'seed-edited'", () => {
    const seedServer = listServers().find((s) => s.origin === "seed");
    expect(seedServer).toBeDefined();
    updateServer(seedServer!.id, { notes: "custom server note" });
    const s = listServers(true).find((s) => s.id === seedServer!.id);
    expect(s!.origin).toBe("seed-edited");
  });

  it("updateServer replaces gpu configs when provided", () => {
    const id = createServer({
      model: "Config Replace Test", vendor: "supermicro",
      gpuConfigs: [{ gpuId: "h100-sxm", gpuCount: 4, isDefault: true }],
    });
    updateServer(id, {
      gpuConfigs: [
        { gpuId: "h100-sxm", gpuCount: 8, isDefault: true },
        { gpuId: "l40s", gpuCount: 4, isDefault: false },
      ],
    });
    const s = listServers(true).find((s) => s.id === id);
    expect(s!.gpuConfigs.length).toBe(2);
    expect(s!.gpuConfigs.find((c) => c.gpuId === "l40s")).toBeDefined();
  });

  it("updateServer preserves configs when gpuConfigs not provided", () => {
    const id = createServer({
      model: "Preserve Config Test", vendor: "nvidia",
      gpuConfigs: [{ gpuId: "h100-sxm", gpuCount: 8, isDefault: true }],
    });
    updateServer(id, { notes: "just notes" });
    const s = listServers(true).find((s) => s.id === id);
    expect(s!.gpuConfigs.length).toBe(1);
  });

  it("deprecateServer hides from default list", () => {
    const id = createServer({ model: "Deprecate Me", vendor: "amd" });
    deprecateServer(id);
    expect(listServers().find((s) => s.id === id)).toBeUndefined();
  });

  it("deleteServer removes a user row and its configs", () => {
    const id = createServer({
      model: "Delete Me", vendor: "intel",
      gpuConfigs: [{ gpuId: "h100-sxm", gpuCount: 4, isDefault: true }],
    });
    deleteServer(id);
    expect(listServers(true).find((s) => s.id === id)).toBeUndefined();
  });

  it("deleteServer throws for seed rows", () => {
    const seedServer = listServers().find((s) => s.origin === "seed");
    expect(seedServer).toBeDefined();
    expect(() => deleteServer(seedServer!.id)).toThrow(/deprecate/);
  });

  it("resetServerToSeed restores server and its configs", () => {
    const firstSeed = listServers().find((s) => s.origin === "seed" || s.origin === "seed-edited");
    expect(firstSeed).toBeDefined();
    const sid = firstSeed!.id;
    updateServer(sid, { notes: "OVERRIDDEN" });
    resetServerToSeed(sid);
    const restored = listServers(true).find((s) => s.id === sid);
    expect(restored!.origin).toBe("seed");
    expect(restored!.notes).not.toBe("OVERRIDDEN");
    expect(restored!.gpuConfigs.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// LLM Model
// ============================================================================

describe("LLM Model admin", () => {
  it("createLlmModel inserts with origin='user'", () => {
    const id = createLlmModel({ name: "Test Model", paramsB: 7, architecture: "dense", family: "test" });
    const m = listLlmModels(true).find((m) => m.id === id);
    expect(m).toBeDefined();
    expect(m!.origin).toBe("user");
    expect(m!.paramsB).toBe(7);
  });

  it("updateLlmModel on seed row transitions to 'seed-edited'", () => {
    const seedModel = listLlmModels().find((m) => m.origin === "seed");
    expect(seedModel).toBeDefined();
    updateLlmModel(seedModel!.id, { notes: "custom" });
    const m = listLlmModels(true).find((m) => m.id === seedModel!.id);
    expect(m!.origin).toBe("seed-edited");
  });

  it("deprecateLlmModel hides from default list", () => {
    const id = createLlmModel({ name: "Deprecate Model", paramsB: 3 });
    deprecateLlmModel(id);
    expect(listLlmModels().find((m) => m.id === id)).toBeUndefined();
  });

  it("deleteLlmModel removes a user row", () => {
    const id = createLlmModel({ name: "Delete Model", paramsB: 1 });
    deleteLlmModel(id);
    expect(listLlmModels(true).find((m) => m.id === id)).toBeUndefined();
  });

  it("deleteLlmModel throws for seed rows", () => {
    const seedModel = listLlmModels().find((m) => m.origin === "seed");
    expect(seedModel).toBeDefined();
    expect(() => deleteLlmModel(seedModel!.id)).toThrow(/deprecate/);
  });

  it("resetLlmModelToSeed restores original values", () => {
    const m = listLlmModels().find((m) => m.id === "llama-3.1-70b");
    expect(m).toBeDefined();
    updateLlmModel("llama-3.1-70b", { notes: "OVERRIDDEN" });
    resetLlmModelToSeed("llama-3.1-70b");
    const restored = listLlmModels(true).find((m) => m.id === "llama-3.1-70b");
    expect(restored!.origin).toBe("seed");
    expect(restored!.notes).not.toBe("OVERRIDDEN");
  });
});

// ============================================================================
// Workload Reference
// ============================================================================

describe("Workload Reference admin", () => {
  it("createWorkloadReference inserts with origin='user'", () => {
    const id = createWorkloadReference({ label: "Test Ref", url: "https://example.com", sortOrder: 99 });
    const r = listWorkloadReferences(true).find((r) => r.id === id);
    expect(r).toBeDefined();
    expect(r!.origin).toBe("user");
    expect(r!.label).toBe("Test Ref");
  });

  it("updateWorkloadReference on seed row transitions to 'seed-edited'", () => {
    const seedRef = listWorkloadReferences().find((r) => r.origin === "seed");
    expect(seedRef).toBeDefined();
    updateWorkloadReference(seedRef!.id, { description: "custom desc" });
    const r = listWorkloadReferences(true).find((r) => r.id === seedRef!.id);
    expect(r!.origin).toBe("seed-edited");
  });

  it("deprecateWorkloadReference hides from default list", () => {
    const id = createWorkloadReference({ label: "Deprecate Me" });
    deprecateWorkloadReference(id);
    expect(listWorkloadReferences().find((r) => r.id === id)).toBeUndefined();
  });

  it("deleteWorkloadReference removes a user row", () => {
    const id = createWorkloadReference({ label: "Delete Me" });
    deleteWorkloadReference(id);
    expect(listWorkloadReferences(true).find((r) => r.id === id)).toBeUndefined();
  });

  it("deleteWorkloadReference throws for seed rows", () => {
    const seedRef = listWorkloadReferences().find((r) => r.origin === "seed");
    expect(seedRef).toBeDefined();
    expect(() => deleteWorkloadReference(seedRef!.id)).toThrow(/deprecate/);
  });

  it("resetWorkloadReferenceToSeed restores original values", () => {
    const seedRef = listWorkloadReferences().find((r) => r.origin === "seed" || r.origin === "seed-edited");
    expect(seedRef).toBeDefined();
    updateWorkloadReference(seedRef!.id, { label: "OVERRIDDEN" });
    resetWorkloadReferenceToSeed(seedRef!.id);
    const restored = listWorkloadReferences(true).find((r) => r.id === seedRef!.id);
    expect(restored!.origin).toBe("seed");
    expect(restored!.label).not.toBe("OVERRIDDEN");
  });
});
