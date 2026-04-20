// Ref: PRD §6.4 — JSON BoM schema

export const BOM_SCHEMA_VERSION = "1.0.0";

export const BOM_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://ml-sizer/schemas/bom/v1",
  title: "ML Sizer Bill of Materials",
  type: "object",
  required: ["schemaVersion", "generatedAt", "project", "items", "totals"],
  properties: {
    schemaVersion: { type: "string" },
    generatedAt:   { type: "string", format: "date-time" },
    project: {
      type: "object",
      required: ["id", "name"],
      properties: {
        id:          { type: "string" },
        name:        { type: "string" },
        customer:    { type: "string" },
        description: { type: "string" },
      },
    },
    sizing: {
      type: "object",
      properties: {
        totalGpus:    { type: "number" },
        serverCount:  { type: "number" },
        replicas:     { type: "number" },
        powerKw:      { type: "number" },
        rackUnits:    { type: "number" },
        ttftMs:       { type: "number" },
        itlMs:        { type: "number" },
        endToEndMs:   { type: "number" },
        gpuModel:     { type: "string" },
        inferenceServer: { type: "string" },
      },
    },
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["category", "name", "quantity"],
        properties: {
          category:      { type: "string", enum: ["gpu", "server", "network", "storage", "software", "service"] },
          name:          { type: "string" },
          quantity:      { type: "number" },
          unitPriceUsd:  { type: "number" },
          totalPriceUsd: { type: "number" },
          vendor:        { type: "string" },
          notes:         { type: "string" },
        },
      },
    },
    totals: {
      type: "object",
      properties: {
        itemCount:    { type: "number" },
        capexUsd:     { type: "number" },
      },
    },
  },
};

export type BomExport = {
  schemaVersion: string;
  generatedAt: string;
  project: { id: string; name: string; customer?: string; description?: string };
  sizing?: {
    totalGpus: number; serverCount: number; replicas: number;
    powerKw: number; rackUnits: number;
    ttftMs: number; itlMs: number; endToEndMs: number;
    gpuModel: string; inferenceServer: string;
  };
  items: {
    category: string; name: string; quantity: number;
    unitPriceUsd?: number; totalPriceUsd?: number;
    vendor?: string; notes?: string;
  }[];
  totals: { itemCount: number; capexUsd: number };
};
