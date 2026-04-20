"use client";

import { useProjectStore } from "@/lib/store";
import type { ExtractedRequirement } from "@/lib/store";
import { CheckCircle2, Circle, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const LAYER_COLOR: Record<string, string> = {
  hardware:        "bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-300",
  infra:           "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300",
  "model-platform":"bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  application:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  general:         "bg-muted       text-muted-foreground",
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
          ? <CheckCircle2 className="h-4 w-4 text-amber-500" />
          : <Circle className="h-4 w-4 text-muted-foreground" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{req.text}</p>
        <div className="mt-1 flex flex-wrap gap-1.5 items-center">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", LAYER_COLOR[req.layer] ?? LAYER_COLOR.general)}>
            <Tag className="h-2.5 w-2.5" />{req.layer}
          </span>
          {req.mandatory && (
            <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 text-xs font-medium">
              mandatory
            </span>
          )}
          {req.extractedValue != null && (
            <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-mono">
              {String(req.extractedValue)}
            </span>
          )}
        </div>
      </div>
      {canApply && (
        <button
          onClick={applyToDiscovery}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
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
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Extracted Requirements</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{requirements.length} found · {applyable} can auto-populate Discovery</p>
        </div>
        {applyable > 0 && (
          <button
            onClick={applyAll}
            className="text-xs font-medium text-primary hover:underline"
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
