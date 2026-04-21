"use client";

import { useProjectStore } from "@/lib/store";
import type { ExtractedRequirement } from "@/lib/store";
import { CheckCircle2, Circle, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const LAYER_COLOR: Record<string, string> = {
  hardware:        "bg-[var(--warning)]/10  text-[var(--warning)]",
  infra:           "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  "model-platform":"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  application:     "bg-[var(--success)]/10 text-[var(--success)]",
  general:         "bg-[var(--bg-subtle)] text-[var(--text-muted)]",
};

function RequirementRow({ req }: { req: ExtractedRequirement }) {
  const updateField = useProjectStore((s) => s.updateField);
  const discovery = useProjectStore((s) => s.activeProject?.discovery);

  function applyToDiscovery() {
    if (!req.mapsToDiscoveryField || !req.extractedValue) return;
    updateField(`discovery.${req.mapsToDiscoveryField}`, req.extractedValue);
  }

  const canApply = !!req.mapsToDiscoveryField && !!req.extractedValue;

  return (
    <li className="flex items-start gap-3 py-3 border-b last:border-0">
      <span className="mt-0.5 shrink-0">
        {req.mandatory
          ? <CheckCircle2 className="h-4 w-4 text-[var(--warning)]" />
          : <Circle className="h-4 w-4 text-[var(--text-muted)]" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{req.text}</p>
        <div className="mt-1 flex flex-wrap gap-1.5 items-center">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", LAYER_COLOR[req.layer] ?? LAYER_COLOR.general)}>
            <Tag className="h-2.5 w-2.5" />{req.layer}
          </span>
          {req.mandatory && (
            <span className="rounded-full bg-[var(--warning)]/10 text-[var(--warning)] px-2 py-0.5 text-xs font-medium">
              mandatory
            </span>
          )}
          {req.extractedValue != null && (
            <span className="rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] px-2 py-0.5 text-xs font-mono">
              {String(req.extractedValue)}
            </span>
          )}
        </div>
      </div>
      {canApply && (
        <button
          onClick={applyToDiscovery}
          className="shrink-0 text-xs font-medium text-[var(--accent-primary)] hover:underline"
        >
          Apply
        </button>
      )}
    </li>
  );
}

export function RequirementsList() {
  const requirements = useProjectStore((s) => s.activeProject?.rfi.extracted.requirements ?? []);
  const updateField = useProjectStore((s) => s.updateField);

  function applyAll() {
    for (const req of requirements) {
      if (req.mapsToDiscoveryField && req.extractedValue) {
        updateField(`discovery.${req.mapsToDiscoveryField}`, req.extractedValue);
      }
    }
  }

  if (requirements.length === 0) return null;

  const applyable = requirements.filter((r) => r.mapsToDiscoveryField && r.extractedValue).length;

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Extracted Requirements</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{requirements.length} found · {applyable} can auto-populate Discovery</p>
        </div>
        {applyable > 0 && (
          <button
            onClick={applyAll}
            className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
          >
            Apply all ({applyable})
          </button>
        )}
      </div>
      <ul className="px-4">
        {requirements.map((req) => <RequirementRow key={req.id} req={req} />)}
      </ul>
    </div>
  );
}
