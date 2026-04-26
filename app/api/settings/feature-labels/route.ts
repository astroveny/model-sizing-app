export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getRouting } from "@/lib/settings/routing";
import { listModels } from "@/lib/settings/models";
import type { LlmFeatureId } from "@/lib/settings/feature-ids";

/**
 * Returns a map of featureId → model label (string) | null.
 * Used by client components (ExplainBox, etc.) to show the assigned model's
 * name on buttons and to disable buttons when no model is assigned.
 * Never returns API keys or sensitive config.
 */
export function GET() {
  const routing = getRouting();
  const models = listModels();
  const labelById = new Map(models.map((m) => [m.id, m.label]));

  const labels = Object.fromEntries(
    (Object.keys(routing) as LlmFeatureId[]).map((feature) => {
      const modelId = routing[feature];
      const label = modelId ? (labelById.get(modelId) ?? null) : null;
      return [feature, label];
    })
  ) as Record<LlmFeatureId, string | null>;

  return NextResponse.json(labels);
}
