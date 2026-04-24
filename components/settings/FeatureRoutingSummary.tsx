"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { ALL_FEATURES, FEATURE_LABELS } from "@/lib/settings/feature-ids";
import type { LlmFeatureId } from "@/lib/settings/feature-ids";
import type { ConfiguredModelDTO } from "@/lib/settings/models";

interface FeatureRoutingSummaryProps {
  routing: Record<LlmFeatureId, string | null>;
  models: ConfiguredModelDTO[];
}

export function FeatureRoutingSummary({ routing, models }: FeatureRoutingSummaryProps) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
      <div className="px-4 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
        <h3 className="text-sm font-semibold">Feature Routing Summary</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Each feature uses one configured model. Unassigned features are disabled.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-xs text-[var(--text-secondary)]">
            <th className="px-4 py-2 text-left font-medium">Feature</th>
            <th className="px-4 py-2 text-left font-medium">Assigned Model</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {ALL_FEATURES.map((feature) => {
            const modelId = routing[feature];
            const model = models.find((m) => m.id === modelId);
            return (
              <tr key={feature} className="border-b border-[var(--border-muted)] last:border-0">
                <td className="px-4 py-2.5 text-sm">{FEATURE_LABELS[feature]}</td>
                <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)]">
                  {model ? model.label : <span className="italic">None</span>}
                </td>
                <td className="px-4 py-2.5">
                  {model ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--success)]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Assigned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--danger)]">
                      <XCircle className="h-3.5 w-3.5" /> Disabled
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
