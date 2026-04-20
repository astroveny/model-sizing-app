import type { ExplainContent } from "@/lib/store";

// JSON files are bundled at build time — safe to import on both server and client
import workloadRaw from "@/data/explain/workload.json";
import hardwareRaw from "@/data/explain/hardware.json";
import infraRaw from "@/data/explain/infra.json";
import modelPlatformRaw from "@/data/explain/model-platform.json";
import applicationRaw from "@/data/explain/application.json";

export type ExplainEntry = ExplainContent & {
  title?: string;
  customerFriendlyHint?: string;
  relatedFields?: string[];
  commonMistakes?: string[];
};

type ExplainFile = { entries: ExplainEntry[] };

const allFiles: ExplainFile[] = [
  workloadRaw as ExplainFile,
  hardwareRaw as ExplainFile,
  infraRaw as ExplainFile,
  modelPlatformRaw as ExplainFile,
  applicationRaw as ExplainFile,
];

// Merged index built once at module init
const catalog: Record<string, ExplainEntry> = {};
for (const file of allFiles) {
  if (!Array.isArray(file.entries)) continue;
  for (const entry of file.entries) {
    if (entry.fieldId) catalog[entry.fieldId] = entry;
  }
}

export function getExplainEntry(
  fieldId: string,
  overrides?: Record<string, ExplainContent>
): ExplainEntry | null {
  const override = overrides?.[fieldId];
  if (override) return { ...catalog[fieldId], ...override };
  return catalog[fieldId] ?? null;
}

export function getAllEntries(): Record<string, ExplainEntry> {
  return catalog;
}
