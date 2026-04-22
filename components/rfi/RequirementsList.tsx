"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import type { ExtractedRequirement } from "@/lib/store";
import { saveProjectAction } from "@/lib/actions/projects";
import { CheckCircle2, Circle, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const LAYER_COLOR: Record<string, string> = {
  hardware:         "bg-[var(--warning)]/10  text-[var(--warning)]",
  infra:            "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  "model-platform": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  application:      "bg-[var(--success)]/10 text-[var(--success)]",
  general:          "bg-[var(--bg-subtle)] text-[var(--text-secondary)]",
};

type ApplyStatus = "unapplied" | "applied" | "conflict";

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, key) => {
    if (cur && typeof cur === "object") return (cur as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function isMeaningfulValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return v !== 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function RequirementRow({
  req,
  status,
  onApply,
}: {
  req: ExtractedRequirement;
  status: ApplyStatus;
  onApply: (req: ExtractedRequirement, force?: boolean) => void;
}) {
  const canApply = !!req.mapsToDiscoveryField && req.extractedValue != null;

  const statusPill: Record<ApplyStatus, string> = {
    unapplied: "bg-[var(--bg-subtle)] text-[var(--text-secondary)]",
    applied:   "bg-[var(--success)]/10 text-[var(--success)]",
    conflict:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };

  const statusLabel: Record<ApplyStatus, string> = {
    unapplied: "Unapplied",
    applied: "Applied",
    conflict: "Conflict",
  };

  return (
    <li className="flex items-start gap-3 py-3 border-b last:border-0">
      <span className="mt-0.5 shrink-0">
        {req.mandatory
          ? <CheckCircle2 className="h-4 w-4 text-[var(--warning)]" />
          : <Circle className="h-4 w-4 text-[var(--text-secondary)]" />}
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
          {canApply && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusPill[status])}>
              {statusLabel[status]}
            </span>
          )}
          {req.extractedValue != null && (
            <span className="rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] px-2 py-0.5 text-xs font-mono">
              {String(req.extractedValue)}
            </span>
          )}
        </div>
      </div>
      {canApply && status !== "applied" && (
        <button
          onClick={() => onApply(req)}
          className={cn(
            "shrink-0 text-xs font-medium hover:underline",
            status === "conflict"
              ? "text-amber-600 dark:text-amber-400"
              : "text-[var(--accent-primary)]"
          )}
        >
          Apply
        </button>
      )}
    </li>
  );
}

export function RequirementsList() {
  const requirements = useProjectStore((s) => s.activeProject?.rfi.extracted.requirements ?? []);
  const discovery    = useProjectStore((s) => s.activeProject?.discovery);
  const updateField  = useProjectStore((s) => s.updateField);

  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [conflictReq, setConflictReq] = useState<ExtractedRequirement | null>(null);

  function getStatus(req: ExtractedRequirement): ApplyStatus {
    if (!req.mapsToDiscoveryField || req.extractedValue == null) return "unapplied";
    if (appliedIds.has(req.id)) return "applied";
    if (!discovery) return "unapplied";
    const current = getNestedValue(discovery as unknown as Record<string, unknown>, req.mapsToDiscoveryField);
    if (isMeaningfulValue(current) && current !== req.extractedValue) return "conflict";
    return "unapplied";
  }

  async function doApply(req: ExtractedRequirement) {
    if (!req.mapsToDiscoveryField) return;
    updateField(`discovery.${req.mapsToDiscoveryField}`, req.extractedValue);
    setAppliedIds((prev) => new Set([...prev, req.id]));
    const project = useProjectStore.getState().activeProject;
    if (project) await saveProjectAction(project);
  }

  function handleApply(req: ExtractedRequirement, force?: boolean) {
    const status = force ? "unapplied" : getStatus(req);
    if (status === "conflict" && !force) {
      setConflictReq(req);
    } else {
      doApply(req);
    }
  }

  async function applyAllUnapplied() {
    const unapplied = requirements.filter((r) => {
      const s = getStatus(r);
      return s === "unapplied" && r.mapsToDiscoveryField && r.extractedValue != null;
    });
    for (const req of unapplied) {
      updateField(`discovery.${req.mapsToDiscoveryField}`, req.extractedValue);
    }
    setAppliedIds((prev) => new Set([...prev, ...unapplied.map((r) => r.id)]));
    const project = useProjectStore.getState().activeProject;
    if (project) await saveProjectAction(project);
  }

  if (requirements.length === 0) return null;

  const applyableCount = requirements.filter(
    (r) => r.mapsToDiscoveryField && r.extractedValue != null && getStatus(r) === "unapplied"
  ).length;
  const appliedCount = appliedIds.size;
  const conflictCount = requirements.filter((r) => getStatus(r) === "conflict").length;

  return (
    <>
      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Extracted Requirements</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {requirements.length} found
              {appliedCount > 0 && ` · ${appliedCount} applied`}
              {conflictCount > 0 && ` · ${conflictCount} conflict${conflictCount > 1 ? "s" : ""}`}
            </p>
          </div>
          {applyableCount > 0 && (
            <button
              onClick={applyAllUnapplied}
              className="shrink-0 text-xs font-medium text-[var(--accent-primary)] hover:underline"
            >
              Apply All Unapplied ({applyableCount})
            </button>
          )}
        </div>
        <ul className="px-4">
          {requirements.map((req) => (
            <RequirementRow
              key={req.id}
              req={req}
              status={getStatus(req)}
              onApply={handleApply}
            />
          ))}
        </ul>
      </div>

      {/* Conflict resolution dialog */}
      <AlertDialog open={!!conflictReq} onOpenChange={(open: boolean) => !open && setConflictReq(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite existing value?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block space-y-2 text-sm">
                <p>Discovery already has a value for <strong className="font-mono">{conflictReq?.mapsToDiscoveryField}</strong>.</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-md border border-[var(--border-default)] px-3 py-2 bg-[var(--bg-subtle)]">
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Current</p>
                    <p className="font-mono text-xs text-[var(--text-primary)]">
                      {String(conflictReq?.mapsToDiscoveryField
                        ? getNestedValue(discovery as unknown as Record<string, unknown>, conflictReq.mapsToDiscoveryField)
                        : "—")}
                    </p>
                  </div>
                  <div className="rounded-md border border-[var(--accent-primary)]/40 px-3 py-2 bg-[var(--accent-primary)]/5">
                    <p className="text-xs text-[var(--text-secondary)] mb-1">From RFP</p>
                    <p className="font-mono text-xs text-[var(--text-primary)]">{String(conflictReq?.extractedValue ?? "—")}</p>
                  </div>
                </div>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConflictReq(null)}>Keep current</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (conflictReq) {
                  handleApply(conflictReq, true);
                  setConflictReq(null);
                }
              }}
            >
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
