import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { configuredModels } from "@/lib/db/schema";

import type { LlmFeatureId } from "./feature-ids";
// Re-export for convenience
export type { LlmFeatureId };
export { ALL_FEATURES, FEATURE_LABELS } from "./feature-ids";

/** Returns a map of featureId → modelId (or null if unassigned). */
export function getRouting(): Record<LlmFeatureId, string | null> {
  const rows = getDb().select().from(configuredModels).all();
  const result: Record<LlmFeatureId, string | null> = {
    "rfp-extract": null,
    "rfi-draft-response": null,
    "explain-field": null,
    "explain-sizing": null,
    "build-report-summary": null,
    "quick-sizing-assist": null,
  };
  for (const row of rows) {
    const features = JSON.parse(row.assignedFeaturesJson) as LlmFeatureId[];
    for (const f of features) {
      result[f] = row.id;
    }
  }
  return result;
}

/** Returns the modelId assigned to a feature, or null. */
export function getAssignedModelId(feature: LlmFeatureId): string | null {
  return getRouting()[feature];
}

/**
 * Assigns a feature to a model. Enforces exclusive assignment:
 * removes the feature from any other model that currently owns it.
 */
export function assign(feature: LlmFeatureId, modelId: string): void {
  const rows = getDb().select().from(configuredModels).all();

  for (const row of rows) {
    const features = JSON.parse(row.assignedFeaturesJson) as LlmFeatureId[];
    const hadFeature = features.includes(feature);
    const isTarget = row.id === modelId;

    if (isTarget && !hadFeature) {
      const next = JSON.stringify([...features, feature]);
      getDb().update(configuredModels)
        .set({ assignedFeaturesJson: next, updatedAt: new Date().toISOString() })
        .where(eq(configuredModels.id, row.id)).run();
    } else if (!isTarget && hadFeature) {
      const next = JSON.stringify(features.filter((f) => f !== feature));
      getDb().update(configuredModels)
        .set({ assignedFeaturesJson: next, updatedAt: new Date().toISOString() })
        .where(eq(configuredModels.id, row.id)).run();
    }
  }
}

/** Removes a feature assignment from whichever model currently owns it. */
export function unassign(feature: LlmFeatureId): void {
  const rows = getDb().select().from(configuredModels).all();
  for (const row of rows) {
    const features = JSON.parse(row.assignedFeaturesJson) as LlmFeatureId[];
    if (features.includes(feature)) {
      const next = JSON.stringify(features.filter((f) => f !== feature));
      getDb().update(configuredModels)
        .set({ assignedFeaturesJson: next, updatedAt: new Date().toISOString() })
        .where(eq(configuredModels.id, row.id)).run();
    }
  }
}

/** Removes all feature assignments for a given model. */
export function clearAssignments(modelId: string): void {
  getDb().update(configuredModels)
    .set({ assignedFeaturesJson: "[]", updatedAt: new Date().toISOString() })
    .where(eq(configuredModels.id, modelId)).run();
}
